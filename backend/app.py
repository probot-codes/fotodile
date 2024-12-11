import os
from flask import Flask, request, jsonify
import numpy as np
import instaloader
import pickle
from flask_cors import CORS  # Import CORS
import pandas as pd  # Import pandas for DataFrame
import cv2  # Import OpenCV for image comparison
import requests  # For fetching images from URLs
import tempfile  # For temporary file handling
import requests
import json
from datetime import datetime
from bs4 import BeautifulSoup


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the model and scaler
with open('./model/model.pkl', 'rb') as f:
    model = pickle.load(f)
with open('./model/scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

# Create the Instaloader instance once
loader = instaloader.Instaloader()
COOKIES_PATH = "cookies.txt"

try:
    if os.path.exists(COOKIES_PATH):
        loader.load_session_from_file("username", COOKIES_PATH)  # Load session from file
        print("Loaded session from cookies.")
    else:
        loader.login("username", "passwd")  # Replace with your actual credentials
        loader.save_session_to_file(COOKIES_PATH)  # Save session to file
        print("Logged in and saved session to cookies.")
except Exception as e:
    print(f"Error during login or cookie handling: {e}")

# Global variable to store the prediction result
is_default_profile_pic = False

def has_custom_profile_pic(profile):
    """Checks if the profile has a custom profile picture."""
    global is_default_profile_pic
    try:
        # Load default profile pictures
        default_pics = [cv2.imread("igdefault.jpg"), cv2.imread("ig2.jpg")]
        if any(pic is None for pic in default_pics):
            raise FileNotFoundError("Default profile picture files are missing or corrupted.")

        # Fetch the profile picture
        response = requests.get(profile.profile_pic_url, stream=True)
        if response.status_code != 200:
            print(f"Failed to download profile picture. HTTP status: {response.status_code}")
            return True  # Assume custom picture on failure

        # Save the profile picture temporarily
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            for chunk in response.iter_content(1024):  # Stream content to avoid memory overflow
                tmp_file.write(chunk)
            tmp_file_path = tmp_file.name

        # Load the saved profile picture
        profile_pic = cv2.imread(tmp_file_path)
        os.remove(tmp_file_path)  # Clean up the temporary file

        if profile_pic is None:
            print("Error: Failed to load profile picture with OpenCV.")
            return True  # Assume custom picture on error

        # Compare the profile picture with default pictures
        is_default_profile_pic = any(
            pic.shape == profile_pic.shape and not np.bitwise_xor(pic, profile_pic).any()
            for pic in default_pics if pic is not None
        )
        return not is_default_profile_pic  # Return True if custom, False if default

    except Exception as e:
        print(f"Error comparing profile pictures: {e}")
        return True  # Assume custom picture on failure


def extract_features_instaloader(username):
    """Extracts features and profile information from an Instagram profile."""
    try:
        profile = instaloader.Profile.from_username(loader.context, username)

        # Extract feature vector
        profile_pic = 1 if has_custom_profile_pic(profile) else 0
        nums_length_username = sum(c.isdigit() for c in profile.username) / len(profile.username)
        fullname_words = len(profile.full_name.split())
        nums_length_fullname = sum(c.isdigit() for c in profile.full_name) / max(len(profile.full_name), 1)
        name_equals_username = 1 if profile.full_name.replace(" ", "").lower() == profile.username.lower() else 0
        description_length = len(profile.biography)
        external_url = 1 if profile.external_url else 0
        private = 1 if profile.is_private else 0
        num_posts = profile.mediacount
        num_followers = profile.followers
        num_follows = profile.followees

        activity_ratio = np.round(num_posts / num_followers, 2) if num_followers else 0
        followers_gt_follows = 1 if num_followers > num_follows else 0

        features = [
            profile_pic, nums_length_username, fullname_words,
            nums_length_fullname, name_equals_username, description_length,
            external_url, private, num_posts, num_followers,
            num_follows, activity_ratio, followers_gt_follows
        ]

        profile_info = {
            "username": profile.username,
            "full_name": profile.full_name,
            "biography": profile.biography,
            "profile_pic_url": profile.profile_pic_url,
            "is_private": profile.is_private,
            "num_posts": profile.mediacount,
            "num_followers": profile.followers,
            "num_follows": profile.followees,
            "external_url": profile.external_url,
        }

        return features, profile_info

    except instaloader.exceptions.ProfileNotExistsException:
        print("Error: Profile does not exist.")
        return None, None
    except Exception as e:
        print(f"Error: {e}")
        return None, None

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get username from the request
        data = request.get_json()
        username = data.get('username')

        if not username:
            return jsonify({'error': 'Username is required'}), 400

        # Extract features using instaloader
        features, profile_info = extract_features_instaloader(username)
        if profile_info is None:
            return jsonify({'error': 'Failed to fetch profile information'}), 500

        # Prepare features for the model
        feature_names = ['profile pic', 'nums/length username', 'fullname words',
                         'nums/length fullname', 'name==username', 'description length',
                         'external URL', 'private', '#posts', '#followers', '#follows',
                         'activity ratio', '#followers > #follows?']
        input_data = pd.DataFrame([features], columns=feature_names)
        scaled_input_data = scaler.transform(input_data)

        # Predict using the model
        prediction = model.predict(scaled_input_data)
        fake_probability = float(model.predict_proba(scaled_input_data)[:, 1])

        response_data = {
            'fake_probability': fake_probability,
            'is_fake': bool(prediction[0]),
            'profile_info': profile_info
        }
        print("Sent data:", response_data)
        return jsonify(response_data)

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500
    
def fetch_url_content(url, save_path):
    """
    Fetch the HTML content from the given URL and save it to a file.
    """
    try:
        response = requests.get(url)
        response.raise_for_status()

        with open(save_path, "w", encoding="utf-8") as file:
            file.write(response.text)
        print(f"HTML content saved to {save_path}")

        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL content: {e}")
        return None

def extract_features_twitter(html_content, thtml_content, username):
    """
    Extract specified features from the HTML content.
    """
    soup = BeautifulSoup(html_content, "html.parser")

    def safe_find(selector):
        """
        Safely find an element by CSS selector and return its text or None if not found.
        """
        element = soup.select_one(selector)
        return element.text.strip() if element else None

    def extract_stat(label):
        """
        Extract numerical stats like followers, friends, likes, and tweets.
        """
        stat_label = soup.find("span", string=label)
        if stat_label:
            stat_value = stat_label.find_next("span", class_="profile-stat-num")
            return int(stat_value.text.replace(",", "")) if stat_value else None
        return None

    # Find the most recent tweet
    recent_tweet = soup.find("div", class_="timeline-item")

    # Extract features
    profile_data = {
        "id": None,
        "id_str": None,
        "screen_name": safe_find(".profile-card-username"),
        "location": safe_find(".profile-location span:last-child"),  # Updated selector
        "description": safe_find(".profile-bio p"),
        "url": "https://x.com/" + safe_find(".profile-card-username") if safe_find(".profile-card-username") else None,  # Construct URL dynamically
        "followers_count": extract_stat("Followers"),
        "friends_count": extract_stat("Following"),
        "listed_count": None,
        "created_at": datetime.strptime(
            soup.find("div", class_="profile-joindate").find("span", title=True)["title"], 
            "%I:%M %p - %d %b %Y"
        ).strftime("%a %b %d %H:%M") if soup.find("div", class_="profile-joindate") else None,  # Format datetime
        "favorites_count": extract_stat("Likes"),
        "verified": bool(soup.find("span", class_="verified-icon")),
        "statuses_count": extract_stat("Tweets"),
        "lang": "en", 
        "status": recent_tweet.find('div', class_='tweet-content media-body').get_text(strip=True) if recent_tweet else None,  # Extract recent tweet content
        "avatar_image": soup.select_one(".profile-card-avatar img")['src'] if soup.select_one(".profile-card-avatar img") else None,
        "default_profile": None,
        "default_profile_image": (
            soup.select_one(".profile-card-avatar img")['src'] == "/pic/abs.twimg.com%2Fsticky%2Fdefault_profile_images%2Fdefault_profile_400x400.png"
            if soup.select_one(".profile-card-avatar img")
            else False
        ),
        "banner_image": soup.select_one(".profile-banner img")['src'] if soup.select_one(".profile-banner img") else None,
        "first_tweet_date": str(recent_tweet.find('span', class_='tweet-date')) if recent_tweet else None,
        "has_extended_profile": None,
        "name": safe_find(".profile-card-fullname"),
        # Corrected values
        "tweet_content": recent_tweet.find('div', class_='tweet-content media-body').get_text(strip=True) if recent_tweet else None,
        "tweet_date_element": str(recent_tweet.find('span', class_='tweet-date')) if recent_tweet else None,  # Already converted to string
        "tweet_timestamp": recent_tweet.find('span', class_='tweet-date a')['title'] if recent_tweet and recent_tweet.find('span', class_='tweet-date a') else "Unknown time",
    }

    return profile_data

@app.route('/predict_twitter', methods=['POST'])
def predict_twitter():
    try:
        # Get username from the request
        data = request.get_json()
        username = data.get('username')

        if not username:
            return jsonify({'error': 'Username is required'}), 400

        # Construct URLs
        url = "https://nitter.privacydev.net/" + username
        turl = "https://x.com/" + username

        # Fetch HTML content
        html_content = fetch_url_content(url, "./output.html")
        thtml_content = fetch_url_content(turl, "./toutput.html")

        if html_content:
            # Extract features
            profile_info = extract_features_twitter(html_content, thtml_content, username)

            # ---  No model prediction for Twitter yet ---
            # For now, just return the profile information
            response_data = {
                'profile_info': profile_info
            }
            return jsonify(response_data)
        else:
            return jsonify({'error': 'Failed to fetch profile information'}), 500

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

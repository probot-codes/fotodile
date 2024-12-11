from flask import Flask, request, jsonify
import numpy as np
import instaloader
import pickle
from flask_cors import CORS  # Import CORS
import pandas as pd  # Import pandas for DataFrame

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the model and scaler
with open('./model/model.pkl', 'rb') as f:
    model = pickle.load(f)
with open('./model/scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

# Create the Instaloader instance once
loader = instaloader.Instaloader() 
loader.login("priyanshuchandra2003", "abcd#@1234")  # Replace with your actual credentials

def extract_features_instaloader(username):
    """
    Extracts features and profile information from an 
    Instagram profile using Instaloader.
    """
    try:
        profile = instaloader.Profile.from_username(loader.context, username)

        # Extract feature vector
        profile_pic = 1 if profile.profile_pic_url else 0
        nums_length_username = sum(c.isdigit() for c in profile.username) / len(profile.username)
        fullname_words = len(profile.full_name.split())
        nums_length_fullname = sum(c.isdigit() for c in profile.full_name) / max(len(profile.full_name), 1)
        name_equals_username = 1 if profile.full_name.replace(" ", "").lower() == profile.username.lower() else 0
        description_length = len(profile.biography)
        external_url = 1 if profile.external_url else 0
        private = 1 if profile.is_private else 0  # Use 'private' consistently
        num_posts = profile.mediacount
        num_followers = profile.followers
        num_follows = profile.followees

        # Calculate 'activity ratio' and '#followers > #follows?'
        activity_ratio = np.round(num_posts / num_followers, 2) if num_followers else 0
        followers_gt_follows = 1 if num_followers > num_follows else 0

        features = [
            profile_pic,
            nums_length_username,
            fullname_words,
            nums_length_fullname,
            name_equals_username,
            description_length,
            external_url,
            private,  # Use 'private' consistently
            num_posts,
            num_followers,
            num_follows,
            activity_ratio,  # Add 'activity ratio'
            followers_gt_follows  # Add '#followers > #follows?'
        ]

        # Extract profile information
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

        # Check if profile_info is None
        if profile_info is None:  
            return jsonify({'error': 'Failed to fetch profile information'}), 500

        # Apply the scaler before prediction
        # --- Use a DataFrame with CORRECT feature names ---
        feature_names = ['profile pic', 'nums/length username', 'fullname words', 
                        'nums/length fullname', 'name==username', 'description length', 
                        'external URL', 'private', '#posts', '#followers', '#follows', 
                        'activity ratio', '#followers > #follows?']  # Add new features
        input_data = pd.DataFrame([features], columns=feature_names)  # Create DataFrame
        scaled_input_data = scaler.transform(input_data)

        # Make prediction using CatBoost model
        prediction = model.predict(scaled_input_data)  
        fake_probability = float(model.predict_proba(scaled_input_data)[:, 1])  # Get probability for class 1 (fake)

        response_data = {
            'fake_probability': fake_probability,
            'is_fake': bool(prediction[0]),  # Convert to boolean
            'profile_info': profile_info  
        }
        print("Sent data:", response_data)  
        return jsonify(response_data)

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

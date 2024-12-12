import asyncio
import aiohttp
from itertools import combinations
from difflib import SequenceMatcher
from bs4 import BeautifulSoup
import random
import time

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:53.0) Gecko/20100101 Firefox/53.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/603.3.8 (KHTML, like Gecko) Version/10.1.2 Safari/603.3.8",
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36",
    # ... add more user agents
]

async def fetch_url(session, url):
    """Asynchronously fetches the content of a URL with a random User-Agent."""
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    async with session.get(url, headers=headers) as response:
        return await response.text()

async def search_yandex(query):
    """Asynchronously performs a Yandex search with exponential backoff."""
    delay = 5  # Initial delay of 5 seconds
    for attempt in range(5):  # Retry up to 5 times
        await asyncio.sleep(delay)
        try:
            # Construct the Yandex search URL
            yandex_url = f"https://yandex.com/search/?text={query}"
            async with aiohttp.ClientSession() as session:
                async with session.get(yandex_url) as response:
                    response.raise_for_status()  # Raise HTTPError for bad responses
                    html = await response.text()

                    # Parse the HTML content with Beautiful Soup
                    soup = BeautifulSoup(html, "html.parser")

                    # Extract search result links (this may need adjustment 
                    # depending on the actual structure of Yandex results)
                    search_results = []
                    for link in soup.find_all('a', href=True):
                        href = link['href']
                        if href.startswith('https://') and 'instagram.com' in href:
                            search_results.append(href)
                            
                    return search_results[:20]  # Return top 20 results

        except aiohttp.ClientError as e:
            print(f"Error during Yandex search: {e}")
            delay *= 2  # Double the delay for the next attempt
    print("Failed to get results after multiple retries.")
    return []  # Return an empty list if all retries fail

async def process_variation(variation, search_results, max_results):
    """Processes a single variation of the username."""
    query1 = f"site:instagram.com inurl:/{variation}"
    query2 = f"site:instagram.com {variation}"
    tasks = [search_yandex(query1), search_yandex(query2)]  # Use search_yandex
    results = await asyncio.gather(*tasks)

    async with aiohttp.ClientSession() as session:
        for result_list in results:
            for result in result_list:
                result_username = result.split('/')[-2]
                matcher = SequenceMatcher(None, variation, result_username)
                ratio = matcher.ratio()
                if (ratio > 0.7 and not result.endswith(f"/{variation}/")
                        and result not in search_results):
                    search_results.append(result)
                if len(search_results) >= max_results:
                    return

async def search_instagram_profiles(words):
    """
    Efficiently searches for Instagram profiles on Yandex using asynchronous 
    requests and SequenceMatcher for flexible string matching.
    Limits the total results fetched from Yandex to 20.
    """
    search_results = []
    max_results = 20

    async with aiohttp.ClientSession() as session:
        tasks = []
        for r in range(1, len(words) + 1):
            for combination in combinations(words, r):
                username = ''.join(combination)
                variations = [
                    username,
                    f"{username}_",
                    f"_{username}",
                    f"{username}.",
                    f".{username}",
                    f"{username}official",
                    f"{username}daily",
                ]
                for variation in variations:
                    tasks.append(process_variation(variation, search_results, max_results))
        await asyncio.gather(*tasks)

    return search_results[:max_results]

if __name__ == "__main__":
    input_words = input("Enter the words to search for (separated by spaces): ").split()
    profile_urls = asyncio.run(search_instagram_profiles(input_words))

    if profile_urls:
        print("\nMatching Instagram profiles:")
        for i, url in enumerate(profile_urls):
            print(f"{i+1}. {url}")
    else:
        print(f"No Instagram profiles found for the given words.")
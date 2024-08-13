import requests
import time
import sys

def fetch(url):
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

try:
    # Fetch the list of Pokemon
    pokemon_list = fetch('https://pokeapi.co/api/v2/pokemon/')
    pokemon = pokemon_list['results']

    for p in pokemon:
        time.sleep(0.01)  # Wait for 10 milliseconds
        print('Loading', p['name'])

        try:
            details = fetch(p['url'])
            # We're not storing or using 'details', just fetching it as in the original script
        except requests.RequestException as e:
            print(f"\n!!! Unexpected {e.response.status_code if e.response else 'N/A'} response loading data for {p['name']} !!!\n")
            sys.exit(1)

except requests.RequestException as e:
    print(f"Unexpected {e.response.status_code if e.response else 'N/A'} response")
    sys.exit(1)
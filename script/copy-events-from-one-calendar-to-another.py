import argparse

import requests

def get_access_token(email, password):
    login_url = "https://api.cms.footlight.io/login"
    headers = {
        'Content-Type': 'application/json',
        'Referer': 'https://api.cms.footlight.io/api/'
    }
    data = {'email': email, 'password': password}

    try:
        response = requests.post(login_url, headers=headers, json=data)
        response.raise_for_status()
        return response.json().get('accessToken')
    except requests.exceptions.RequestException as e:
        print(f"Error retrieving access token: {e}")
        return None


def import_events(access_token, source_calendar_id, destination_calendar_id, mapping_file_url):
    headers = {
        'Authorization': f'Bearer {access_token}',
        'calendar-id': destination_calendar_id,
        'Referer': 'https://api.cms.footlight.io/api/'
    }

    try:
        put_url = "https://api.cms.footlight.io/entities/import/SOURCE_CALENDAR_ID"  # Replace with your actual PUT API endpoint
        put_url = put_url.replace('SOURCE_CALENDAR_ID', source_calendar_id)
        put_url = put_url + "?mapping-file-url=" + mapping_file_url

        response = requests.put(put_url, headers=headers, json=None)
        response.raise_for_status()
        print("Import successfully started. Please see footlight-admin-api logs to see the progress")
        return response
    except requests.exceptions.RequestException as e:
        print(f"Error calling PUT API: {e}")
        raise


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Process input arguments")
    parser.add_argument("-u", "--username", required=True, help="Username")
    parser.add_argument("-p", "--password", required=True, help="Password")
    parser.add_argument("-s", "--source", required=True, help="Source")
    parser.add_argument("-d", "--destination", required=True, help="Destination")
    parser.add_argument("-m", "--mapping", required=True, help="Mapping file URL")
    args = parser.parse_args()

    source_calendar_id = args.source
    destination_calendar_id = args.destination
    mapping_file_url = args.mapping
    email = args.username
    password = args.password
    access_token = get_access_token(email, password)

    if access_token:
        print("Authentication Success.")
        response = import_events(access_token, source_calendar_id, destination_calendar_id, mapping_file_url)
        print(f"PUT API response: {response.text}")
    else:
        print("Authentication Failed.")

    response = import_events(access_token, source_calendar_id, destination_calendar_id, mapping_file_url)
    print(response)

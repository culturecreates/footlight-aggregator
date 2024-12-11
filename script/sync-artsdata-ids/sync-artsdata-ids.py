from pymongo import MongoClient
from requests import post
import json
import urllib.parse
import sys
from bson import ObjectId

from datadog_api_client import ApiClient, Configuration
from datadog_api_client.v2.api.logs_api import LogsApi
from datadog_api_client.v2.model.content_encoding import ContentEncoding
from datadog_api_client.v2.model.http_log import HTTPLog
from datadog_api_client.v2.model.http_log_item import HTTPLogItem

def load_query(file_path):
    with open(file_path, 'r') as file:
        return file.read()

def append_ids(results):
    ids = ''
    for result in results:
        ids = ids + "resource:" + str(result['_id']) + "\n"
    return ids

def get_entity_ids(client, collection):
    db = client['footlight-calendar']
    results = db[collection].aggregate([
        {"$match": {"sameAs.type": {"$ne": "ArtsdataIdentifier"}}},
        {"$project": {"_id": 1}}
    ])
    return results

def unlink_entities(client, headers):
    db = client['footlight-calendar']
    query = load_query('./sparql/unlink-entities.sparql')
    data = {'query': query}
    data_encoded = urllib.parse.urlencode(data)
    response = post('https://db.artsdata.ca/repositories/artsdata', headers=headers, data=data_encoded)
    result = json.loads(response.text)
    data = result['results']['bindings']
    event_ids = [item['event']['value'].split('/')[-1] for item in data]
    repository = "events"
    log_message("Unlinking Events in CMS to Artsdata entities has started!")
    for event_id in event_ids:
        id = ObjectId(event_id)
        db[repository].update_one(
            {"_id": id},
            {"$pull": {"sameAs": {"type": "ArtsdataIdentifier"}}}
        )
        log_message(f"Event {event_id} unlinked")
    log_message("Unlinking Events in CMS to Artsdata entities has completed!")
    return event_ids

def reconcile_entities(client, ids, entity_type, headers):
    db = client['footlight-calendar']
    formatted_ids = append_ids(ids)
    query = load_query('./sparql/reconcile-entities.sparql')
    query = query.replace("<entity-ids-placeholder>", formatted_ids)
    data = {'query': query}
    data_encoded = urllib.parse.urlencode(data)

    response = post('https://db.artsdata.ca/repositories/artsdata', headers=headers, data=data_encoded)
    result = json.loads(response.text)

    data_dict = result['results']['bindings']
    result_dict = {}
    for item in data_dict:
        entity_value = item['entity']['value']
        sameAs_value = item['sameAs']['value']

        result_dict[entity_value] = sameAs_value

    for key, value in result_dict.items():
        id = ObjectId(key.split(",")[0].split("/")[-1])
        update_result = db[entity_type].update_one({"_id": id, "sameAs.type": {"$ne": "ArtsdataIdentifier"}},
                                                   {"$addToSet": {
                                                       "sameAs": {"uri": value, "type": "ArtsdataIdentifier"}}})
        if update_result.raw_result['updatedExisting']:
            log_message(f"Linked {entity_type} with id {id} to {value}")
    return list(result_dict.keys())


def log_message(message):
    print(message)
    log_body = HTTPLog(
        [
            HTTPLogItem(
                ddsource="aggregator",
                ddtags="sync-ids",
                hostname="production-server-7",
                message=message,
                service="footlight-aggregator",
            ),
        ]
    )
    configuration = Configuration()
    with ApiClient(configuration) as api_client:
        api_instance = LogsApi(api_client)
        api_instance.submit_log(content_encoding=ContentEncoding.DEFLATE, body=log_body)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        client = MongoClient(sys.argv[1])
    else:
        client = MongoClient("mongodb://localhost:27017")

    headers = {
        'Accept': 'application/x-sparqlstar-results+json, application/sparql-results+json;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': 'https://db.artsdata.ca',
        'Referer': 'https://db.artsdata.ca/',
    }

    collections = ["organizations", "places", "events", "people"]
    linked_entities = []
    for collection in collections:
        log_message(f"Linking {collection} CMS to Artsdata entities has started!")
        ids = get_entity_ids(client, collection)
        linked_cms_ids = reconcile_entities(client, ids, collection, headers)
        linked_entities.extend(linked_cms_ids)
        log_message(f"Linking {collection} CMS to Artsdata entities has completed!")

    unlinked_entity_ids = unlink_entities(client, headers)
    log_message(f"Import statistics: Linked entities: {len(linked_entities)} Unlinked entities: {len(unlinked_entity_ids)}")
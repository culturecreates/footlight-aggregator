from pymongo import MongoClient
from requests import post
import json
import urllib.parse
import sys
from bson import ObjectId

def load_query(file_path):
    with open(file_path, 'r') as file:
        return file.read()

def append_ids( results):
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
    data = {'query' : query}
    data_encoded = urllib.parse.urlencode(data)
    response = post('https://db.artsdata.ca/repositories/artsdata', headers=headers, data=data_encoded)
    result = json.loads(response.text)
    data = result['results']['bindings']
    event_ids = [item['event']['value'].split('/')[-1] for item in data]
    repository = "events"
    for event_id in event_ids:
        id = ObjectId(event_id)
        db[repository].update_one(
            {"_id": id},
            {"$pull": {"sameAs": {"type": "ArtsdataIdentifier"}}}
        )
        print(f"Event {event_id} unlinked")


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
        if (update_result.raw_result['updatedExisting']):
            print(f"Updated entity {id}")

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
    for collection in collections:
        print(f"Updating {collection} started!")
        ids = get_entity_ids(client, collection)
        reconcile_entities(client, ids,collection, headers)
        print(f"Updating {collection} completed!\n")

    unlink_entities(client, headers)

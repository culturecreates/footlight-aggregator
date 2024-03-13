from pymongo import MongoClient
from requests import post
import json
import urllib.parse
import sys
from bson import ObjectId

def append_ids(ids, results, collection):
    for result in results:
        ids = ids + collection + ":" + str(result['_id']) + "\n"
    return ids

def get_entity_ids(client):
    db = client['footlight-calendar']
    ids = ''
    collections = ["organizations", "places", "events", "people"]
    for collection in collections:
        results = db[collection].aggregate([
            {"$match": {"sameAs.type": {"$ne": "ArtsdataIdentifier"}}},
            {"$project": {"_id": 1}}
        ])
        ids = append_ids(ids, results, collection)
    return ids

def reconcile_entities(client, ids):
    db = client['footlight-calendar']

    headers = {
        'Accept': 'application/x-sparqlstar-results+json, application/sparql-results+json;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': 'https://db.artsdata.ca',
        'Referer': 'https://db.artsdata.ca/',
    }

    query = """
               PREFIX schema: <http://schema.org/>
               PREFIX events: <http://api.footlight.io/events/>
               PREFIX places: <http://api.footlight.io/places/>
               PREFIX people: <http://api.footlight.io/people/>
               PREFIX organizations: <http://api.footlight.io/organizations/>
               PREFIX concepts: <http://api.footlight.io/concepts/>
               SELECT DISTINCT ?entity ?sameAs
                 WHERE {
	                   VALUES ?entity {
	                           <entity-ids-placeholder>
                       }
                        OPTIONAL {
                           ?entity ^schema:sameAs ?sameAsReverse .
                        }
                         OPTIONAL {
                            ?entity schema:sameAs ?sameAsForward.
                        }
                       BIND (COALESCE(?sameAsReverse,?sameAsForward) AS ?sameAs)
                       FILTER(STRSTARTS(STR(?sameAs),'http://kg.artsdata.ca/resource/K'))
                       }
               """


    query = query.replace("<entity-ids-placeholder>", ids)
    data = {'query' : query}
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
        repository = key.split(",")[0].split("/")[-2]
        id = ObjectId(key.split(",")[0].split("/")[-1])
        update_result = db[repository]
        .update_one({"_id": id, "sameAs.type":{"$ne":"ArtsdataIdentifier"}},
        {"$addToSet": {"sameAs": {"uri": value, "type": "ArtsdataIdentifier"}}})
        print(update_result)

if len(sys.argv) > 1:
    client = MongoClient(sys.argv[1])
else:
    client = MongoClient("mongodb://localhost:27017")

ids = get_entity_ids(client)
reconcile_entities(client, ids)

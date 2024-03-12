from pymongo import MongoClient
from requests import post
import json
import urllib.parse
import sys
from bson import ObjectId

def reconcile_entities(client):
    db = client['footlight-calendar']

    headers = {
        'Accept': 'application/x-sparqlstar-results+json, application/sparql-results+json;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': 'https://db.artsdata.ca',
        'Referer': 'https://db.artsdata.ca/',
    }
    data = {'query' : """PREFIX schema: <http://schema.org/>
                         SELECT DISTINCT ?entity ?sameAs 
                         WHERE {
	                           VALUES ?GRAPHS {
	                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/tout-culture-cms-events>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/tout-culture-cms-people>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/tout-culture-cms-organizations>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/tout-culture-cms-places>

		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/signe-laval-cms-events>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/signe-laval-cms-people>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/signe-laval-cms-organizations>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/signe-laval-cms-places>

		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/culture-mauricie-cms-events>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/culture-mauricie-cms-people>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/culture-mauricie-cms-organizations>
		                                 <http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/culture-mauricie-cms-places>
                                }
	                    GRAPH ?GRAPHS
	                    {
		                   ?entity a ?o;
                           FILTER(STRSTARTS(STR(?entity),'http://api.footlight.io/'))
                        }
                        OPTIONAL {
                           ?entity ^schema:sameAs ?sameAsReverse .
                        }
                         OPTIONAL {
                            ?entity schema:sameAs ?sameAsForward.
                        }
                       BIND (COALESCE(?sameAsReverse,?sameAsForward) AS ?sameAs)
                       FILTER(STRSTARTS(STR(?sameAs),'http://kg.artsdata.ca/resource/K'))
                       }"""
            }
    data_encoded = urllib.parse.urlencode(data)

    response = post('https://db.artsdata.ca/repositories/artsdata', headers=headers, data=data_encoded)
    result = json.loads(response.text)


    data_dict = result['results']['bindings']
    result_dict = {}
    for item in data_dict:
        entity_value = item['entity']['value']
        sameAs_value = item['sameAs']['value']

        result_dict[entity_value] = sameAs_value

    collection = None
    
    for key, value in result_dict.items():
        repository = key.split(",")[0].split("/")[-2]
        id = ObjectId(key.split(",")[0].split("/")[-1])
        if(repository == "organizations"):
            collection = db.organizations
        elif(repository == "person"):
            collection = db.people
        elif(repository == "places"):
            collection = db.places
        update_result = collection.update_one({"_id": id, "sameAs.type":{"$ne":"ArtsdataIdentifier"}}, {"$addToSet": {"sameAs": {"uri": value, "type": "ArtsdataIdentifier"}}})
        print(update_result)

client = MongoClient(sys.argv[1])
reconcile_entities(client)

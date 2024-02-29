from pymongo import MongoClient
from requests import get
from bson import ObjectId

def reconcile_entities(client):
    db = client['footlight-calendar']

    response = get('https://db.artsdata.ca/repositories/artsdata?query=PREFIX%20schema%3A%20%3Chttp%3A%2F%2Fschema.org%2F%3E%20select%20DISTINCT%20%3Fentity%20%3FsameAs%20where%20%7B%20VALUES%20%3FGRAPHS%20%7B%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Fsigne-laval-cms-people%3E%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Fsigne-laval-cms-organizations%3E%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Fsigne-laval-cms-places%3E%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Ftout-culture-cms-people%3E%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Ftout-culture-cms-organizations%3E%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Ftout-culture-cms-places%3E%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Fculture-mauricie-cms-people%3E%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Fculture-mauricie-cms-organizations%3E%20%3Chttp%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Fartsdata-planet-footlight%2Fculture-mauricie-cms-places%3E%20%7D%20graph%20%3FGRAPHS%20%7B%20%3Fentity%20a%20%3Fo%3B%20filter(strstarts(str(%3Fentity)%2C%27http%3A%2F%2Fapi.footlight.io%2F%27))%20%7D%20optional%20%7B%20%3Fentity%20%5Eschema%3AsameAs%20%3FsameAsReverse%20.%20filter(strstarts(str(%3FsameAsReverse)%2C%27http%3A%2F%2Fkg.artsdata.ca%2Fresource%2FK%27))%20%7D%20optional%20%7B%20%3Fentity%20schema%3AsameAs%20%3FsameAsForward.%20filter(strstarts(str(%3FsameAsForward)%2C%27http%3A%2F%2Fkg.artsdata.ca%2Fresource%2FK%27))%20%7D%20BIND%20(COALESCE(%3FsameAsReverse%2C%3FsameAsForward)%20AS%20%3FsameAs)%20%7D&infer=true&sameAs=true&offset=0')
    response = response.text[len("entity,sameAs"):].split("\r\n")[1:-1]

    collection = None
    
    for line in response:
        if line.split(",")[1] != "":
            repository = line.split(",")[0].split("/")[-2]
            id = ObjectId(line.split(",")[0].split("/")[-1])
            artsdata_url = line.split(",")[1]
            if(repository == "organizations"):
                collection = db.organizations
            elif(repository == "person"):
                collection = db.people
            elif(repository == "places"):
                collection = db.places
            update_result = collection.update_one({"_id": id, "sameAs.type":{"$ne":"ArtsdataIdentifier"}}, {"$addToSet": {"sameAs": {"uri": artsdata_url, "type": "ArtsdataIdentifier"}}})
            print(update_result)

# client = MongoClient('mongodb://footlight:footdsfdscalendar@3.96.80.223:27019/footlight-calendar')
client = MongoClient('mongodb://footlight:fottlightdshoi@15.156.34.23:27018/footlight-calendar')

# client = MongoClient('mongodb://localhost:27017')
reconcile_entities(client)

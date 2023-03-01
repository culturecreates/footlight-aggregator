export const ArtsDataUrls = {
    PEOPLE: 'https://api.artsdata.ca/person?format=json&source=http://kg.artsdata.ca/culture-creates/footlight/gatineau-cloud',
    PLACES: 'https://api.artsdata.ca/place?format=json&source=http://kg.artsdata.ca/culture-creates/footlight/gatineau-cloud',
    ORGANIZATIONS: 'http://api.artsdata.ca/organizations?format=json&source=http://kg.artsdata.ca/culture-creates/footlight/gatineau-cloud',
    EVENTS: 'http://api.artsdata.ca/events?startDate=2023-01-01&frame=event_footlight&format=json&source=http%3A%2F%2Fkg.artsdata.ca%2Fculture-creates%2Ffootlight%2Ftoutculture-ca',

    PERSON_BY_ID: 'http://api.artsdata.ca/ranked/ARTSDATA_ID?format=json&frame=ranked_person_footlight',
    PLACE_BY_ID: 'http://api.artsdata.ca/ranked/ARTSDATA_ID?format=json&frame=ranked_place_footlight',
    ORGANIZATION_BY_ID: 'http://api.artsdata.ca/ranked/ARTSDATA_ID?format=json&frame=ranked_org_footlight',
    EVENT_BY_ID: 'http://api.artsdata.ca/ranked/ARTSDATA_ID?format=json&frame=ranked_events_footlight',
};

export const Artsdata = {
    ARTSDATA_ID: 'ARTSDATA_ID',
    RESOURCE_URI_PREFIX: 'http://kg.artsdata.ca/resource/'
};
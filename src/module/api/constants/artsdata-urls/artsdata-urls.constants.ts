export const ArtsDataUrls = {
    PEOPLE: 'https://api.artsdata.ca/person?format=json',
    PLACES: 'https://api.artsdata.ca/place?format=json',
    ORGANIZATIONS: 'https://api.artsdata.ca/organizations?format=json',
    EVENTS: 'https://api.artsdata.ca/events?startDate=2023-01-01&frame=event_footlight&format=json',

    PERSON_BY_ID: 'http://api.artsdata.ca/ranked/ARTSDATA_ID?format=json&frame=ranked_person_footlight',
    PLACE_BY_ID: 'http://api.artsdata.ca/ranked/ARTSDATA_ID?format=json&frame=ranked_place_footlight',
    ORGANIZATION_BY_ID: 'http://api.artsdata.ca/ranked/ARTSDATA_ID?format=json&frame=ranked_org_footlight',
    EVENT_BY_ID: 'http://api.artsdata.ca/ranked/ARTSDATA_ID?format=json&frame=ranked_events_footlight',
};

export const Artsdata = {
    ARTSDATA_ID: 'ARTSDATA_ID',
    RESOURCE_URI_PREFIX: 'http://kg.artsdata.ca/resource/'
};
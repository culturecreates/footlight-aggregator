export const ArtsDataUrls = {
  EVENTS: "http://api.artsdata.ca/query?sparql=query_footlight_events&frame=event_footlight&format=json",
  PLACE_BY_ID: "http://api.artsdata.ca/query?adid=ARTS_DATA_ID&format=json&frame=ranked_place_footlight&sparql=ranked_place_footlight",
  PERSON_ORGANIZATION_BY_ID: "http://api.artsdata.ca/query?adid=ARTS_DATA_ID&format=json&frame=ranked_org_person_footlight&sparql=ranked_org_person_footlight",

  // PEOPLE: 'https://api.artsdata.ca/person?format=json',
  // PLACES: 'https://api.artsdata.ca/place?format=json',
  // ORGANIZATIONS: 'https://api.artsdata.ca/organizations?format=json',
  // PERSON_BY_ID: 'http://api.artsdata.ca/ranked/ARTS_DATA_ID?format=json&frame=ranked_person_footlight',
  // ORGANIZATION_BY_ID: 'http://api.artsdata.ca/ranked/ARTS_DATA_ID?format=json&frame=ranked_org_footlight',
  ARTSDATA_SPARQL_ENDPOINT: "https://db.artsdata.ca/repositories/artsdata"
};

export const ArtsDataConstants = {
  ARTS_DATA_ID: "ARTS_DATA_ID",
  RESOURCE_URI_PREFIX: "http://kg.artsdata.ca/resource/",
  RESOURCE_URI_PREFIX_HTTPS: "https://kg.artsdata.ca/resource/",
  SPARQL_QUERY_FOR_ORGANIZATION: `PREFIX schema: <http://schema.org/>select ?adid where { graph <GRAPH_NAME> { ?s a schema:Organization .} ?adid schema:sameAs ?s. filter(contains(str(?adid), \"kg.artsdata.ca\"))} `,
  SPARQL_QUERY_FOR_PLACES: `PREFIX schema: <http://schema.org/>select ?adid where { graph <GRAPH_NAME> { ?s a schema:Place .} ?adid schema:sameAs ?s. filter(contains(str(?adid), \"kg.artsdata.ca\"))} `
};
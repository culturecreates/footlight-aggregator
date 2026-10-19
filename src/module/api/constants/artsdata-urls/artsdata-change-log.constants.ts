export const ArtsDataChangeLogConstants = {
  // Graph where the Footlight CMS publishes a calendar's events to Artsdata (one graph per calendar slug).
  FOOTLIGHT_CALENDAR_GRAPH: "http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/CALENDAR_SLUG",
  // Events created in the Footlight CMS are published under this prefix followed by their CMS id.
  FOOTLIGHT_EVENT_URI_PREFIX: "http://lod.footlight.io/resource/",
  SPARQL_QUERY_FOR_EVENT_CHANGES: `
PREFIX schema: <http://schema.org/>
PREFIX prov:   <http://www.w3.org/ns/prov#>
PREFIX xsd:    <http://www.w3.org/2001/XMLSchema#>

SELECT ?changedAt ?activity ?event ?src ?property ?change ?value ?valueName
WHERE {
  # Upcoming Footlight events of the calendar that are also linked from the aggregator's source graph
  { SELECT DISTINCT ?src ?event WHERE {
      GRAPH <CALENDAR_GRAPH> {
        ?src a schema:Event ; schema:startDate ?startDate .
        FILTER(?startDate > NOW())
        FILTER(STRSTARTS(STR(?src), "FOOTLIGHT_EVENT_URI_PREFIX"))
      }
      ?src schema:sameAs ?event .
      FILTER(STRSTARTS(STR(?event), "http://kg.artsdata.ca/resource/K"))
      GRAPH <SOURCE_GRAPH> { ?sourceRecord schema:sameAs ?event }
  } }

  VALUES ?property { schema:name schema:startDate schema:endDate schema:location schema:eventStatus }
  VALUES (?ann ?change) { (prov:wasGeneratedBy "added") (prov:wasInvalidatedBy "removed") }

  # Change log: quoted triples annotated with the refresh activity that added/removed them
  GRAPH <http://kg.artsdata.ca/logs> {
    << ?event ?property ?value >> ?ann ?activity .
    ?activity prov:startedAtTime ?changedAt .
  }
  FILTER(?changedAt >= "SINCE"^^xsd:dateTime)

  OPTIONAL { GRAPH <http://kg.artsdata.ca/core> { ?value schema:name ?valueName } }
}
ORDER BY DESC(?changedAt) ?event ?property ?change
LIMIT 5000`
};

import * as fs from 'fs';
import * as path from 'path';

export const ArtsDataChangeLogConstants = {
  FOOTLIGHT_CALENDAR_GRAPH: "http://kg.artsdata.ca/culture-creates/artsdata-planet-footlight/CALENDAR_SLUG",
  FOOTLIGHT_EVENT_URI_PREFIX: "http://lod.footlight.io/resource/",
  SPARQL_QUERY_FOR_EVENT_CHANGES: fs.readFileSync(
    path.join(__dirname, 'event-changes.sparql'), 'utf-8'
  ),
};

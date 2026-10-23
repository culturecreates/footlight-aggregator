import * as fs from 'fs';
import * as path from 'path';

export const ArtsDataChangeLogConstants = {
  SPARQL_QUERY_FOR_EVENT_CHANGES: fs.readFileSync(
    path.join(__dirname, 'event-changes.sparql'), 'utf-8'
  ),
};

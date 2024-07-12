import { EntityType } from "../enum";

export class FilterCondition {
  "entityType": EntityType;
  "inputProperty": string[];
  "includePattern": string[];
  "excludePattern": String[];
}

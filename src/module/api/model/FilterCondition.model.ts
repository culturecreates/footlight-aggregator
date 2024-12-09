import { EntityType } from "../enum";

export class FilterConditions {
  inputProperty?: string[];
  includePatterns?: string[];
  includeExactProperties?: string[];
  excludePatterns?: string[];
  excludeExactProperties?: string[];
}

export class Filters {
  entityType: EntityType;
  artsdataFilters: FilterConditions[];
  footlightFilters: FilterConditions[];
}
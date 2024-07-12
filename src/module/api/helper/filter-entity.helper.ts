import { EntityType } from "../enum";
import { FilterCondition } from "../model/FilterCondition.model";

export class FilterEntityHelper {

  static validateEntity(entityType: EntityType, entity: any, condition: FilterCondition[]): boolean {
    if (!entity) {
      return false;
    }
    for (const filterCondition of condition) {
      if (filterCondition.entityType === entityType) {
        for (const property of filterCondition.inputProperty) {
          const rawValue = entity[property];
          const value = rawValue.en || rawValue.fr || rawValue["@none"];
          if (filterCondition.includePattern?.length) {
            if (!rawValue) {
              return false;
            }
            for (const pattern of filterCondition.includePattern) {

              if (!value.includes(pattern)) {
                return false;
              }
            }
            ;
          }
          if (filterCondition.excludePattern?.length) {
            filterCondition.excludePattern.forEach(pattern => {
              if (value.includes(pattern)) {
                return false;
              }
            });
          }
        }
        ;
      }
    }
    ;
    return true;
  }


}
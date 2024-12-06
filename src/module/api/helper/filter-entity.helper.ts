import { EntityType } from "../enum";
import { FilterConditions, Filters } from "../model/FilterCondition.model";

export class FilterEntityHelper {

  static validateEntity(entity: any, conditions: FilterConditions[]): boolean {
    if (!entity) {
      return false;
    }
    for (const filterCondition of conditions) {
      const {inputProperty, includePatterns, excludePatterns} = filterCondition;
      for(const property of inputProperty){
        const formattedProperty = property.split('.');
        let rawValue;
        for(const prop of formattedProperty){
          rawValue = rawValue ? rawValue[prop] : entity[prop];
        }
        const value = rawValue.en || rawValue.fr || rawValue["@none"];
        for(const includePattern of includePatterns){
          if (!value.includes(includePattern)) {
            return false;
          }
        }
        for(const excludePattern of excludePatterns){
          if (value.includes(excludePattern)) {
            return false;
          }
        }
      }
    }
    ;
    return true;
  }


}
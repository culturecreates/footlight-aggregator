import { EntityType } from "../enum";
import { FilterConditions, Filters } from "../model/FilterCondition.model";

export class FilterEntityHelper {

  static validateEntity(entity: any, filterConditions: FilterConditions[]): boolean {
    if (!entity) {
      return false;
    }
    if(filterConditions?.length){
      for (const filterCondition of filterConditions) {
        const {inputProperty, includePatterns, excludePatterns, includeExactProperties, excludeExactProperties} = filterCondition;
        for(const property of inputProperty){
          const formattedProperty = property.split('.');
          let rawValue;
          for(const prop of formattedProperty){
            rawValue = rawValue ? rawValue[prop] : entity[prop];
          }
          const value = rawValue.en || rawValue.fr || rawValue["@none"];
          if (
            includePatterns?.some(pattern => !value?.includes(pattern)) ||
            includeExactProperties?.some(property => value !== property) ||
            excludeExactProperties?.some(property => value === property) ||
            excludePatterns?.some(pattern => value?.includes(pattern))
          ) {
            return false;
          }          
        }
      }
    }
    return true;
  }


}
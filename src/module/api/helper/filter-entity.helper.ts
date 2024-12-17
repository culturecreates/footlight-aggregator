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
          const value = this.getRawValue(formattedProperty, entity);
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


  static getRawValue(formattedProperty: string[], entity: any): any {
    let rawValue;
    for (const prop of formattedProperty) {
      if(Array.isArray(rawValue)){
        rawValue = rawValue.flatMap((value) => value?.[prop]);
      }
      else{
        rawValue = rawValue ? rawValue?.[prop] : entity?.[prop];
      }
    }
    return rawValue;
  }

}
import { EventStatusConstants } from "../constants/artsdata-urls/rdf-types.constants";
import { EventStatus } from "../enum";
import { MultilingualString } from "../model";

export class JsonLdParseHelper{

    static formatMultilingualField(fields): MultilingualString {
        const multilingualField = new MultilingualString();
        if(!fields){
            return undefined
        }
        fields = Array.isArray(fields) ? fields : [fields];
        
        fields.forEach(field => multilingualField[field["@language"]] = field["@value"]);
        return multilingualField;
    }

    static formatEventStatus(eventStatus): EventStatus{
        switch (eventStatus['@id']){
            case EventStatusConstants.SCHEDULED:
                return EventStatus.SCHEDULED
            case EventStatusConstants.POSTPONED:
                return EventStatus.POSTPONED
            case EventStatusConstants.CANCELLED:
                return EventStatus.CANCELLED
        }
    }



}
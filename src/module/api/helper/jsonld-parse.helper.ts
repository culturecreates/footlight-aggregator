import { RdfEventStatus } from "../constants/artsdata-urls/rdf-types.constants";
import { EventStatus } from "../enum";
import { MultilingualString } from "../model";

export class JsonLdParseHelper{

    static formatMultilingualField(fields): MultilingualString {
        const multilingualField = new MultilingualString();
        fields = Array.isArray(fields) ? fields : [fields];
        
        fields.forEach(field => multilingualField[field["@language"]] = field["@value"]);
        return multilingualField;
    }

    static formatEventStatus(eventStatus): EventStatus{
        switch (eventStatus['@id']){
            case RdfEventStatus.SCHEDULED:
                return EventStatus.SCHEDULED
            case RdfEventStatus.POSTPONED:
                return EventStatus.POSTPONED
            case RdfEventStatus.CANCELLED:
                return EventStatus.CANCELLED
        }
    }



}
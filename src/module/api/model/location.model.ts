import {IdentifierString} from "./identifierString.model";
import {MultilingualString} from "./multilingualString.model";
import {UriString} from "./uriString.model";

export class VirtualLocationDTO {
    name: MultilingualString;
    description: MultilingualString;
    url: UriString;
}

export class Location {
    place: IdentifierString;
    virtualLocation?: VirtualLocationDTO;
}

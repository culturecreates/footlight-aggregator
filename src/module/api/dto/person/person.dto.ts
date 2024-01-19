import {MultilingualString, SameAs, UriString} from "../../model";
import {Image} from "../shared";

export class PersonDTO {

    name: MultilingualString;
    alternateName: MultilingualString[];
    description: MultilingualString;
    disambiguatingDescription: MultilingualString;
    url: UriString;
    sameAs: SameAs[];
    image: Image;
    uri?:string;
}

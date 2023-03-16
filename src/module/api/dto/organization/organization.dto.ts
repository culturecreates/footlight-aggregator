import {IdentifierString, MultilingualString, SameAs, UriString} from "../../model";
import {Image} from "../shared";

export class OrganizationDTO {

    name: MultilingualString;
    alternateName: MultilingualString[];
    description: MultilingualString;
    disambiguatingDescription: MultilingualString;
    url: UriString;
    sameAs: SameAs[];
    address: IdentifierString;
    // contactPoint: ContactPointDTO;
    place: IdentifierString;
    type: UriString[];
    image: Image;
    logo: Image;
}

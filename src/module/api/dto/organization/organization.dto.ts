import {IdentifierString, MultilingualString, SameAs, UriString} from "../../model";

export class OrganizationDTO {

    constructor(
        name: MultilingualString,
        alternateName: MultilingualString[],
        description: MultilingualString,
        disambiguatingDescription: MultilingualString,
        url: UriString,
        sameAs: SameAs[],
        address?: IdentifierString,
        place?: IdentifierString,
        type?: UriString[]
    ) {
        this.name = name;
        this.alternateName = alternateName;
        this.description = description;
        this.disambiguatingDescription = disambiguatingDescription;
        this.url = url;
        this.sameAs = sameAs;
        this.address = address;
        this.place = place;
        this.type = type;
    }

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
    // image?: Image;
    // logo?: Image;
}

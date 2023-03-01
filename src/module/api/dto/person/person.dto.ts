import {MultilingualString, SameAs, UriString} from "../../model";

export class PersonDTO {

    constructor(
        name: MultilingualString,
        alternateName: MultilingualString[],
        description: MultilingualString,
        disambiguatingDescription: MultilingualString,
        url: UriString,
        sameAs: SameAs[]) {
        this.name = name;
        this.alternateName = alternateName;
        this.description = description;
        this.disambiguatingDescription = disambiguatingDescription;
        this.url = url;
        this.sameAs = sameAs;
    }

    name: MultilingualString;
    alternateName: MultilingualString[];
    description: MultilingualString;
    disambiguatingDescription: MultilingualString;
    url: UriString;
    sameAs: SameAs[];
}

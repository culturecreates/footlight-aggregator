import {MultilingualString, SameAs} from "../../model";

export class PostalAddressDTO {
  addressCountry: MultilingualString;
  addressLocality: MultilingualString;
  addressRegion: MultilingualString;
  postalCode: string;
  streetAddress: MultilingualString;
  sameAs: SameAs[];
}

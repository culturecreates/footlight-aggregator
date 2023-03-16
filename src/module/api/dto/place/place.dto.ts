import {IdentifierString, MultilingualString, SameAs, UriString} from "../../model";
import {Geo} from "./geo.model";
import {ContactPointDTO} from "../contact-point";

export class PlaceDTO {

  name: MultilingualString;
  description: MultilingualString;
  disambiguatingDescription: MultilingualString;
  url: UriString;
  alternateName: MultilingualString[];
  accessibility: IdentifierString[];
  regions: IdentifierString[];
  accessibilityNote: MultilingualString;
  postalAddressId: IdentifierString;
  containedInPlace: IdentifierString;
  image: UriString;
  geo: Geo;
  sameAs: SameAs[];
  additionalType: IdentifierString[];
  contactPoint: ContactPointDTO;
  openingHours: UriString;
}

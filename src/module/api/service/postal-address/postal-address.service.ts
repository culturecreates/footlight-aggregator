import { SharedService } from "../../service";
import { PostalAddressDTO } from "../../dto";
import { Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
import { JsonLdParseHelper } from "../../helper";
import { PostalAddressPredicates } from "../../constants/artsdata-urls/rdf-types.constants";
import { CaligramUrls } from "../../constants";

@Injectable()
export class PostalAddressService {

  private async _pushPostalAddressToFootlight(footlightBaseUrl: string, calendarId: string, token: string,
                                              postalAddressToAdd: PostalAddressDTO, currentUserId: string) {
    const url = footlightBaseUrl + FootlightPaths.ADD_POSTAL_ADDRESS;
    return await SharedService.syncEntityWithFootlight(calendarId, token, url, postalAddressToAdd, currentUserId);
  }

  async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string,
                               postalAddressToAdd: PostalAddressDTO, currentUserId: string) {
    return await this._pushPostalAddressToFootlight(footlightBaseUrl, calendarId, token, postalAddressToAdd, currentUserId);
  }

  async formatAndPushJsonLdPostalAddress(postalAddress: any, footlightBaseUrl: string, calendarId: string, token: string, currentUserId: string) {
    const formattedPostallAddress = new PostalAddressDTO();

    formattedPostallAddress.addressCountry = postalAddress[PostalAddressPredicates.ADDRESS_COUNTRY]
    ? JsonLdParseHelper.formatMultilingualField(postalAddress[PostalAddressPredicates.ADDRESS_COUNTRY])
    : undefined;
    formattedPostallAddress.addressLocality = postalAddress[PostalAddressPredicates.ADDRESS_LOCALITY]
      ? JsonLdParseHelper.formatMultilingualField(postalAddress[PostalAddressPredicates.ADDRESS_LOCALITY])
      : undefined;
    formattedPostallAddress.addressRegion = postalAddress[PostalAddressPredicates.ADDRESS_REGION]
      ? JsonLdParseHelper.formatMultilingualField(postalAddress[PostalAddressPredicates.ADDRESS_REGION])
      : undefined;
    formattedPostallAddress.streetAddress = postalAddress[PostalAddressPredicates.STREET_ADDRESS]
      ? JsonLdParseHelper.formatMultilingualField(postalAddress[PostalAddressPredicates.STREET_ADDRESS])
      : undefined;
    formattedPostallAddress.postalCode = postalAddress[PostalAddressPredicates.POSTAL_CODE] || undefined;
    formattedPostallAddress.uri = postalAddress['@id']
    formattedPostallAddress.sameAs = [{uri: postalAddress['@id'], type: "ExternalSourceIdentifier"}] 
    return {entityId: await this._pushPostalAddressToFootlight(footlightBaseUrl, calendarId, token, formattedPostallAddress, currentUserId)};
  }

  async formatAndPushCaligramPostalAddress(place: any, token: any, footlightBaseUrl: string, calendarId: string, currentUserId: string) {
    const formattedPostalAddress = new PostalAddressDTO();
    formattedPostalAddress.addressCountry = {fr: place.country != null? place.country : "Canada"};
    formattedPostalAddress.postalCode = place.zip;
    formattedPostalAddress.streetAddress = {fr: place.address};
    formattedPostalAddress.uri = CaligramUrls.VENUE_URL + place.id
    formattedPostalAddress.sameAs = [{uri: formattedPostalAddress.uri, type: "ExternalSourceIdentifier"}]
    return {entityId: await this._pushPostalAddressToFootlight(footlightBaseUrl, calendarId, token, formattedPostalAddress, currentUserId)};
  }
}
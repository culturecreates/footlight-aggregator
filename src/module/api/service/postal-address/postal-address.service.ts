import { SharedService } from "../../service";
import { PostalAddressDTO } from "../../dto";
import { Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
import { JsonLdParseHelper } from "../../helper";
import { RdfPostalAddressTypes } from "../../constants/artsdata-urls/rdf-types.constants";

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

    formattedPostallAddress.addressCountry = postalAddress[RdfPostalAddressTypes.ADDRESS_COUNTRY]
    ? JsonLdParseHelper.formatMultilingualField(postalAddress[RdfPostalAddressTypes.ADDRESS_COUNTRY])
    : undefined;
    formattedPostallAddress.addressLocality = postalAddress[RdfPostalAddressTypes.ADDRESS_LOCALITY]
      ? JsonLdParseHelper.formatMultilingualField(postalAddress[RdfPostalAddressTypes.ADDRESS_LOCALITY])
      : undefined;
    formattedPostallAddress.addressRegion = postalAddress[RdfPostalAddressTypes.ADDRESS_REGION]
      ? JsonLdParseHelper.formatMultilingualField(postalAddress[RdfPostalAddressTypes.ADDRESS_REGION])
      : undefined;
    formattedPostallAddress.streetAddress = postalAddress[RdfPostalAddressTypes.STREET_ADDRESS]
      ? JsonLdParseHelper.formatMultilingualField(postalAddress[RdfPostalAddressTypes.STREET_ADDRESS])
      : undefined;
    formattedPostallAddress.postalCode = postalAddress[RdfPostalAddressTypes.POSTAL_CODE] || undefined;
    formattedPostallAddress.uri = postalAddress['@id']
    formattedPostallAddress.sameAs = [{uri: postalAddress['@id'], type: "ExternalSourceIdentifier"}] 
    return this._pushPostalAddressToFootlight(footlightBaseUrl, calendarId, token, formattedPostallAddress, currentUserId)
  }
}
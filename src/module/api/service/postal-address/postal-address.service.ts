import { SharedService } from "../../service";
import { PostalAddressDTO } from "../../dto";
import { Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";

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

}
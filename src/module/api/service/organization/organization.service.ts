import { OrganizationDTO } from "../../dto";
import { SharedService } from "../shared";
import { Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";

@Injectable()
export class OrganizationService {

  async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string,
                               organizationDetails: OrganizationDTO, currentUserId: string) {
    return await this._pushOrganizationToFootlight(footlightBaseUrl, calendarId, token, organizationDetails, currentUserId);
  }

  private async _pushOrganizationToFootlight(footlightUrl: string, calendarId: string, token: string,
                                             organizationToAdd: OrganizationDTO, currentUserId: string) {
    const url = footlightUrl + FootlightPaths.ADD_ORGANIZATION;
    return await SharedService.syncEntityWithFootlight(calendarId, token, url, organizationToAdd, currentUserId);
  }

}
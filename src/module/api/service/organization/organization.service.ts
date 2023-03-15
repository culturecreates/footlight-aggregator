import {OrganizationDTO} from "../../dto";
import {FootlightPaths} from "../../constants";
import {SharedService} from "../shared";
import {Injectable} from "@nestjs/common";

@Injectable()
export class OrganizationService {

    async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string,
                                 organizationDetails: OrganizationDTO) {
        return await this._pushOrganizationToFootlight(footlightBaseUrl, calendarId, token, organizationDetails);
    }

    private async _pushOrganizationToFootlight(footlightUrl: string, calendarId: string, token: string,
                                               organizationToAdd: OrganizationDTO) {
        const url = footlightUrl + FootlightPaths.ADD_ORGANIZATION;
        return await SharedService.syncEntityWithFootlight(calendarId, token, url, organizationToAdd);
    }

}
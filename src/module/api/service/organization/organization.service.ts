import { OrganizationDTO } from "../../dto";
import { SharedService } from "../shared";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
import { ArtsDataConstants, ArtsDataUrls } from "../../constants";
import { PlaceService } from "../place";

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(forwardRef(() => SharedService))
    private readonly _sharedService: SharedService,
    @Inject(forwardRef(() => PlaceService))
    private readonly _placeService: PlaceService) {
  }

  async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string,
                               organizationDetails: OrganizationDTO, currentUserId: string) {
    return await this._pushOrganizationToFootlight(footlightBaseUrl, calendarId, token, organizationDetails, currentUserId);
  }

  private async _pushOrganizationToFootlight(footlightUrl: string, calendarId: string, token: string,
                                             organizationToAdd: OrganizationDTO, currentUserId: string) {
    const url = footlightUrl + FootlightPaths.ADD_ORGANIZATION;
    return await SharedService.syncEntityWithFootlight(calendarId, token, url, organizationToAdd, currentUserId);
  }

  async syncOrganizations(token: any, calendarId: string, source: string, footlightBaseUrl: string) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    const organizations = await this._fetchOrganizationsFromArtsData(source);
    const fetchedOrganizationCount = organizations.length;
    let syncCount = 0;
    for (const organization of organizations) {
      syncCount++;
      try {
        const organizationFormatted = await this.formatOrganization(calendarId, token, organization, footlightBaseUrl, currentUser.id);
        await this._pushOrganizationToFootlight(calendarId, token, footlightBaseUrl, organizationFormatted, currentUser.id);
        console.log(`(${syncCount}/${fetchedOrganizationCount}) Synchronised event with id: ${JSON.stringify(fetchedOrganizationCount.sameAs)}`);
      } catch (e) {
        console.log(`(${syncCount}/${fetchedOrganizationCount}) Error while adding Event ${organization.url}` + e);
      }
    }
  }

  private async _fetchOrganizationsFromArtsData(source: string) {
    console.log(`Fetching events from Artsdata. Source: ${source}`);
    const limit = 300;
    // const url = ArtsDataUrls.ORGANIZATIONS + "&source=" + source + "&limit=" + limit;
    const url = ArtsDataUrls.ORGANIZATIONS + "&limit=" + limit;
    const artsDataResponse = await SharedService.fetchUrl(url);
    return artsDataResponse.data.data?.filter(event => event.uri.startsWith(ArtsDataConstants.RESOURCE_URI_PREFIX));
  }

  private async formatOrganization(calendarId: string, token: any, organization: any, footlightUrl: string, currentUserId: string) {
    const place = organization.place;
    if (organization.place) {
      const placeId: string = await this._placeService.getFootlightIdentifier(calendarId, token,
        footlightUrl, place, currentUserId);
      organization.place = { entityId: placeId };
    }
    return organization;
  }
}
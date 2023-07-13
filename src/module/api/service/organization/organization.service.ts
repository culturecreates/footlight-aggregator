import { OrganizationDTO } from "../../dto";
import { SharedService } from "../shared";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
import { ArtsDataConstants, ArtsDataUrls } from "../../constants";
import { PlaceService } from "../place";
import { PersonOrganizationService } from "../person-organization";
import { DataDogLoggerService } from "..";

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(forwardRef(() => SharedService))
    private readonly _sharedService: SharedService,
    @Inject(forwardRef(() => PlaceService))
    private readonly _placeService: PlaceService,
    @Inject(forwardRef(() => PersonOrganizationService))
    private readonly _personOrganizationService: PersonOrganizationService,
    @Inject(forwardRef (()=> DataDogLoggerService))
    private readonly _datadogLoggerService:DataDogLoggerService ) {
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
        let id = organization.url.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, "");
        id = organization.url.replace(ArtsDataConstants.RESOURCE_URI_PREFIX_HTTPS, "");
        const entityFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PERSON_ORGANIZATION_BY_ID);
        const { alternateName } = entityFetched;
        entityFetched.alternateName = alternateName?.length
          ? SharedService.formatAlternateNames(alternateName) : undefined;
        await this._pushOrganizationToFootlight(footlightBaseUrl,calendarId, token, entityFetched, currentUser.id);
        this._datadogLoggerService.infoLogs(OrganizationService.name, 'info',`(${syncCount}/${fetchedOrganizationCount}) Synchronised event with id: ${JSON.stringify(fetchedOrganizationCount.sameAs)}`);
      } catch (e) {
        this._datadogLoggerService.errorLogs(OrganizationService.name, 'error',`(${syncCount}/${fetchedOrganizationCount}) Error while adding Event ${organization.url}` + e);
      }
    }
  }

  private async _fetchOrganizationsFromArtsData(source: string) {
    this._datadogLoggerService.infoLogs(OrganizationService.name, 'info',`Fetching organizations from Artsdata. Source: ${source}`);
    const query = encodeURI(ArtsDataConstants.SPARQL_QUERY_FOR_ORGANIZATION.replace("GRAPH_NAME", source));
    const url = ArtsDataUrls.ARTSDATA_SPARQL_ENDPOINT;
    const artsDataResponse = await SharedService.postUrl(url, "query=" + query, {});
    return artsDataResponse.data.results.bindings.map(adid => {
      return { url: adid.adid.value };
    });
  }

}
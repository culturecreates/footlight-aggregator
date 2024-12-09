import { OrganizationDTO } from "../../dto";
import { SharedService } from "../shared";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
import { ArtsDataConstants, ArtsDataUrls, CaligramUrls } from "../../constants";
import { PlaceService } from "../place";
import { PersonOrganizationService } from "../person-organization";
import { LoggerService } from "..";
import { JsonLdParseHelper } from "../../helper";
import { EventPredicates } from "../../constants/artsdata-urls/rdf-types.constants";
import { FilterConditions } from "../../model/FilterCondition.model";

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(forwardRef(() => SharedService))
    private readonly _sharedService: SharedService,
    @Inject(forwardRef(() => PlaceService))
    private readonly _placeService: PlaceService,
    @Inject(forwardRef(() => PersonOrganizationService))
    private readonly _personOrganizationService: PersonOrganizationService,
    @Inject(forwardRef (()=> LoggerService))
    private readonly _loggerService:LoggerService ) {
  }

  async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string,
                               organizationDetails: OrganizationDTO, currentUserId: string, filterConditions?: FilterConditions[] ) {
    return await this._pushOrganizationToFootlight(footlightBaseUrl, calendarId, token, organizationDetails, currentUserId, filterConditions);
  }

  private async _pushOrganizationToFootlight(footlightUrl: string, calendarId: string, token: string,
                                             organizationToAdd: OrganizationDTO, currentUserId: string, filterConditions?: FilterConditions[]) {
    const url = footlightUrl + FootlightPaths.ADD_ORGANIZATION;
    return await SharedService.syncEntityWithFootlight(calendarId, token, url, organizationToAdd, currentUserId, filterConditions);
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
        this._loggerService.infoLogs(`(${syncCount}/${fetchedOrganizationCount}) Synchronised event with id: ${JSON.stringify(fetchedOrganizationCount.sameAs)}`);
      } catch (e) {
        this._loggerService.errorLogs(`(${syncCount}/${fetchedOrganizationCount}) Error while adding Event ${organization.url}` + e);
      }
    }
  }

  private async _fetchOrganizationsFromArtsData(source: string) {
    this._loggerService.infoLogs(`Fetching organizations from Artsdata. Source: ${source}`);
    const query = encodeURI(ArtsDataConstants.SPARQL_QUERY_FOR_ORGANIZATION.replace("GRAPH_NAME", source));
    const url = ArtsDataUrls.ARTSDATA_SPARQL_ENDPOINT;
    const artsDataResponse = await SharedService.postUrl(url, "query=" + query, {});
    return artsDataResponse.data.results.bindings.map(adid => {
      return { url: adid.adid.value };
    });
  }

  async formatAndPushJsonLdOrganization(organization: any, token: string, calendarId: string, footlightBaseUrl: string, currentUserId: string, context: any) {
    const formattedOrganization = new OrganizationDTO();
    formattedOrganization.name = JsonLdParseHelper.formatMultilingualField(organization[EventPredicates.NAME]);
    formattedOrganization.sameAs = SharedService.formatSameAsForRdf(organization);
    const artsdataUri = SharedService.checkIfSameAsHasArtsdataIdentifier(formattedOrganization.sameAs)
    const uri = JsonLdParseHelper.formatEntityUri(context, organization['@id']);
    if(artsdataUri){
      formattedOrganization.uri = artsdataUri
    }
    else{
      formattedOrganization.uri = uri

    }
    return await this._pushOrganizationToFootlight(footlightBaseUrl, calendarId, token, formattedOrganization, currentUserId)

  }


  async formatAndPushCaligramOrganization(organization: any, token: string, calendarId: string, footlightBaseUrl: string, currentUserId: string) {
    const formattedOrganization = new OrganizationDTO();
    formattedOrganization.name = {fr: organization.name};
    const uri = CaligramUrls.ORGANIZATION_URL + organization.id;
    formattedOrganization.sameAs = [{uri: uri, type: "ExternalSourceIdentifier"}];
    formattedOrganization.uri = uri;
    return await this._pushOrganizationToFootlight(footlightBaseUrl, calendarId, token, formattedOrganization, currentUserId)

  }

}
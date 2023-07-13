import { PostalAddressService, SharedService } from "../../service";
import { PlaceDTO } from "../../dto";
import { ArtsDataConstants, ArtsDataUrls } from "../../constants";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
const {log, error} = require("../../config");

@Injectable()
export class PlaceService {
  constructor(
    @Inject(forwardRef(() => PostalAddressService))
    private readonly _postalAddressService: PostalAddressService,
    @Inject(forwardRef(() => SharedService))
    private readonly _sharedService: SharedService) {
  }

  async getPlaceDetailsFromArtsData(calendarId: string, footlightBaseUrl: string, token: string, artsDataId: string,
                                    currentUserId: string) {
    const placeFetched = await SharedService.fetchFromArtsDataById(artsDataId, ArtsDataUrls.PLACE_BY_ID);
    if (!placeFetched) {
      return undefined;
    }
    return await this._formatPlaceFetched(calendarId, token, footlightBaseUrl, currentUserId, placeFetched);
  }

  private async _pushPlaceToFootlight(footlightBaseUrl: string, calendarId: string, token: string,
                                      placeToAdd: PlaceDTO, currentUserId: string) {
    const url = footlightBaseUrl + FootlightPaths.ADD_PLACE;
    return await SharedService.syncEntityWithFootlight(calendarId, token, url, placeToAdd, currentUserId);
  }

  async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, artsDataUri: string, currentUserId: string) {
    const artsDataId = artsDataUri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, "");
    const placeDetails = await this.getPlaceDetailsFromArtsData(calendarId, footlightBaseUrl, token, artsDataId, currentUserId);
    return placeDetails ? await this._pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeDetails, currentUserId)
      : undefined;
  }

  async syncPlaces(token: any, calendarId: string, source: string, footlightBaseUrl: string) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    const places = await this._fetchPlacesFromArtsData(source);
    const fetchedPlacesCount = places.length;
    let syncCount = 0;
    for (const place of places) {
      syncCount++;
      try {
        let id = place.url.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, "");
        id = place.url.replace(ArtsDataConstants.RESOURCE_URI_PREFIX_HTTPS, "");
        const placeFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PLACE_BY_ID);
        const placeFormatted = await this._formatPlaceFetched(calendarId, token, footlightBaseUrl, currentUser.id, placeFetched);
        await this._pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeFormatted, currentUser.id);
        log(PlaceService.name, 'info',`(${syncCount}/${fetchedPlacesCount}) Synchronised place with id: ${JSON.stringify(placeFormatted.sameAs)}`);
      } catch (e) {
        error(PlaceService.name, 'error',`(${syncCount}/${fetchedPlacesCount}) Error while adding Place ${place.url}` + e);
      }
    }
  }

  private async _fetchPlacesFromArtsData(source: string) {
    log(PlaceService.name, 'info',`Fetching places from Arts data. Source: ${source}`);
    const query = encodeURI(ArtsDataConstants.SPARQL_QUERY_FOR_PLACES.replace("GRAPH_NAME", source));
    const url = ArtsDataUrls.ARTSDATA_SPARQL_ENDPOINT;
    const artsDataResponse = await SharedService.postUrl(url, "query=" + query, {});
    return artsDataResponse.data.results.bindings.map(adid => {
      return { url: adid.adid.value };
    });
  }

  private async _formatPlaceFetched(calendarId: string, token: string, footlightBaseUrl: string, currentUserId, placeFetched: any) {
    const { address, alternateName } = placeFetched;
    delete placeFetched.address;
    const postalAddressId = await this._postalAddressService
      .getFootlightIdentifier(calendarId, token, footlightBaseUrl, address, currentUserId);
    const placeToAdd: PlaceDTO = placeFetched;
    placeToAdd.alternateName = alternateName?.length
      ? SharedService.formatAlternateNames(alternateName) : undefined;

    placeToAdd.postalAddressId = postalAddressId ? { entityId: postalAddressId } : undefined;
    return placeToAdd;
  }
}
import { PostalAddressService, SharedService } from "../../service";
import { PlaceDTO } from "../../dto";
import { ArtsDataConstants, ArtsDataUrls, CaligramUrls } from "../../constants";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
import { LoggerService } from "../logger";
import { EventPredicates, PlacePredicates } from "../../constants/artsdata-urls/rdf-types.constants";
import { JsonLdParseHelper } from "../../helper";
import { FilterConditions, Filters } from "../../model/FilterCondition.model";
import { EntityType } from "../../enum";
import { FilterEntityHelper } from "../../helper/filter-entity.helper";
import { EntityFetcherResult } from "../../model/artsdataResultModel";

@Injectable()
export class PlaceService {
  constructor(
    @Inject(forwardRef(() => PostalAddressService))
    private readonly _postalAddressService: PostalAddressService,
    @Inject(forwardRef(() => SharedService))
    private readonly _sharedService: SharedService,
    @Inject(forwardRef(() => LoggerService))
    private readonly _loggerService: LoggerService
  ) {
  }

  private synchronisedPlaceMap = new Map();

  async getPlaceDetailsFromArtsData(calendarId: string, footlightBaseUrl: string, token: string, artsDataId: string,
                                    currentUserId: string, conditions?: FilterConditions[]) {
    let result: EntityFetcherResult;
    if (artsDataId.startsWith("K")) {
      artsDataId = "http://kg.artsdata.ca/resource/" + artsDataId;
    }
    const placeFetched = await SharedService.fetchFromArtsDataById(artsDataId, ArtsDataUrls.PLACE_BY_ID);
    if (!placeFetched) {
      return undefined;
    }

    // const { address } = placeFetched;
    const placeConditions = conditions
      ?.filter(condition => condition.entityType === EntityType.PLACE);
    const validatedPlace = placeConditions?.length ?
      FilterEntityHelper.validateEntity(placeFetched, conditions) : true;

    // const postalAddressConditions = conditions
    //   ?.filter(condition => condition.entityType === EntityType.POSTAL_ADDRESS);
    // const validatedPostalAddress = postalAddressConditions?.length ? FilterEntityHelper
    //   .validateEntity(address, conditions.find(condition => condition.entityType == EntityType.POSTAL_ADDRESS)?.artsdataFilters) : true;
    // if (!validatedPlace || !validatedPostalAddress) {
    //   return null;
    // }

    if(!validatedPlace) {
       result = {
        success: false,
        message: "Place or Postal Address not validated",
        data: null
      }
    }
    else{
      const formattedPlace =  await this._formatPlaceFetched(calendarId, token, footlightBaseUrl, currentUserId, placeFetched);
      result = {
        success: true,
        message: "Place fetched successfully",
        data: formattedPlace
      }
    }
    return result;
  }

  async pushPlaceToFootlight(footlightBaseUrl: string, calendarId: string, token: string, placeToAdd: PlaceDTO,
                             currentUserId: string, filters?: FilterConditions[] ) : Promise<EntityFetcherResult> {
    const url = footlightBaseUrl + FootlightPaths.ADD_PLACE;
    return await SharedService.syncEntityWithFootlight(calendarId, token, url, placeToAdd, currentUserId, filters);
  }

  async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, artsDataUri: string,
                               currentUserId: string, filters?: Filters[]) {
    let result: EntityFetcherResult;
    artsDataUri = typeof artsDataUri != "string" ? artsDataUri[0] : artsDataUri;
    const artsDataId = artsDataUri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, "");
    const placeIdFromMap = this.synchronisedPlaceMap.get(artsDataId);

    if (placeIdFromMap) {
      this._loggerService.infoLogs(`\tThe Place with Artsdata id :${artsDataId} is already synced during this process.`);
      result = {
        success: true,
        message: "Place fetched from map",
        data: placeIdFromMap
      }
    }

    // const placeConditions = FilterEntityHelper.fetchFiltersByEntities([EntityType.PLACE], filters)
    const placeConditions = filters.find(filter => filter.entityType === EntityType.PLACE)?.artsdataFilters;

    // const placeDetails = await this.getPlaceDetailsFromArtsData(calendarId, footlightBaseUrl, token,
    //   artsDataId, currentUserId, placeAndPostalAddressConditions);

    const artadataResult = await this.getPlaceDetailsFromArtsData(calendarId, footlightBaseUrl, token,
      artsDataId, currentUserId, placeConditions);
    if(!artadataResult.success){
      result = {
        success: false,
        message: `Place not fetched from Artsdata as ${artadataResult.message}`,
        data: null
      }
    }

    else {
      const placeDetails = artadataResult.data;
      const placePushResult = await this.pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeDetails, currentUserId, placeConditions);
      if(!placePushResult.success){
        return placePushResult;
      }
      const placeId = placePushResult.data;
      this.synchronisedPlaceMap.set(artsDataId, placeId);
      result = {
        success: true,
        message: "Place fetched successfully",
        data: placeId
      }
    }
    return result;
    // if (placeDetails) {
    //   const placeId = await this.pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeDetails, currentUserId);
    //   this.synchronisedPlaceMap.set(artsDataId, placeId);
    //   return placeId;
    // }
    // return placeDetails;
  }

  async syncPlaces(token: any, calendarId: string, source: string, footlightBaseUrl: string) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    const places = await this._fetchPlacesFromArtsData(source);
    const fetchedPlacesCount = places.length;
    let syncCount = 0;
    for (const place of places) {
      syncCount++;
      try {
        let id = place.url;
        this._loggerService.infoLogs(`Treating syncPlace ${id}`);
        const placeFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PLACE_BY_ID);
        const placeFormatted = await this._formatPlaceFetched(calendarId, token, footlightBaseUrl,
          currentUser.id, placeFetched);
        await this.pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeFormatted, currentUser.id);
        this._loggerService.infoLogs(`(${syncCount}/${fetchedPlacesCount}) 
        Synchronised place with id:${JSON.stringify(placeFormatted.sameAs)}`);
      } catch (e) {
        this._loggerService.errorLogs(`(${syncCount}/${fetchedPlacesCount}) Error while adding Place ${place.url}` + e);
      }
    }
  }

  private async _fetchPlacesFromArtsData(source: string) {
    this._loggerService.infoLogs(`Fetching places from Arts data. Source: ${source}`);
    const query = encodeURI(ArtsDataConstants.SPARQL_QUERY_FOR_PLACES.replace("GRAPH_NAME", source));
    const url = ArtsDataUrls.ARTSDATA_SPARQL_ENDPOINT;
    const artsDataResponse = await SharedService.postUrl(url, "query=" + query, {});
    return artsDataResponse.data.results.bindings.map((adid) => {
      return { url: adid.adid.value };
    });
  }

  private async _formatPlaceFetched(calendarId: string, token: string, footlightBaseUrl: string, currentUserId,
                                    placeFetched: any) {
    const { address, alternateName } = placeFetched;
    delete placeFetched.address;

    const postalAddressId = !!address ? await this._postalAddressService.getFootlightIdentifier(calendarId, token,
      footlightBaseUrl, address, currentUserId) : undefined;
    const placeToAdd: PlaceDTO = placeFetched;
    placeToAdd.alternateName = alternateName?.length ? SharedService.formatAlternateNames(alternateName) : undefined;

    placeToAdd.postalAddressId = postalAddressId ? { entityId: postalAddressId } : undefined;
    return placeToAdd;
  }

  async formatAndPushJsonLdPlaces(place: any, token: string, calendarId: string, footlightBaseUrl: string,
                                  currentUserId: string, postalAddresses: any, context: any) {
    const formattedPlace = new PlaceDTO();
    formattedPlace.name = JsonLdParseHelper.formatMultilingualField(place[EventPredicates.NAME]);
    formattedPlace.geo =
      place[PlacePredicates.LONGITUDE] && place[PlacePredicates.LATITUDE]
        ? {
          latitude: place[PlacePredicates.LATITUDE],
          longitude: place[PlacePredicates.LONGITUDE]
        }
        : undefined;
    formattedPlace.sameAs = SharedService.formatSameAsForRdf(place);
    const artsdataUri = SharedService.checkIfSameAsHasArtsdataIdentifier(formattedPlace.sameAs);
    const uri = JsonLdParseHelper.formatEntityUri(context, place["@id"]);
    if (artsdataUri) {
      formattedPlace.uri = artsdataUri;
    } else {
      formattedPlace.uri = uri;
    }
    if (place[PlacePredicates.ADDRESS]) {
      const postalAddressDetails = postalAddresses.find(
        (postalAddress) =>
          postalAddress["@id"] === place[PlacePredicates.ADDRESS]["@id"]
      );
      formattedPlace.postalAddressId =
        await this._postalAddressService.formatAndPushJsonLdPostalAddress(postalAddressDetails, footlightBaseUrl,
          calendarId, token, currentUserId);
    }
    return await this.pushPlaceToFootlight(footlightBaseUrl, calendarId, token, formattedPlace, currentUserId);
  }

  async formatAndPushCaligramPlaces(place: any, token: any, footlightBaseUrl: string, calendarId: string,
                                    currentUserId: string) {
    const formattedPlace = new PlaceDTO();
    formattedPlace.name = { fr: place.name };
    formattedPlace.description = { fr: place.description };
    formattedPlace.geo = {
      latitude: place.latitude,
      longitude: place.longitude
    };
    formattedPlace.contactPoint = {
      telephone: place.telephone,
      url: place.website_url
    };
    formattedPlace.postalAddressId =
      await this._postalAddressService.formatAndPushCaligramPostalAddress(place, token, footlightBaseUrl, calendarId,
        currentUserId);
    formattedPlace.uri = CaligramUrls.VENUE_URL + place.id;
    formattedPlace.sameAs = [
      { uri: formattedPlace.uri, type: "ExternalSourceIdentifier" }
    ];
    return await this.pushPlaceToFootlight(footlightBaseUrl, calendarId, token, formattedPlace, currentUserId);
  }
}

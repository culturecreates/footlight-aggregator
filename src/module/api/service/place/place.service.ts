import {SharedService} from "../shared/shared.service";
import {PlaceDTO} from "../../dto/place";
import {ArtsDataConstants, ArtsDataUrls} from "../../constants/artsdata-urls";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

export class PlaceService {

    async getPlaceDetailsFromArtsData(calendarId: string, footlightBaseUrl: string, token: string, artsDataId: string) {
        const placeFetched = await SharedService.fetchFromArtsDataById(artsDataId, ArtsDataUrls.PLACE_BY_ID);
        const address = placeFetched.address;
        delete placeFetched.address;
        const postalAddressUrl = footlightBaseUrl + FootlightPaths.ADD_POSTAL_ADDRESS;
        const postalAddressId = await SharedService.syncEntityWithFootlight(calendarId, token, postalAddressUrl, address);
        const placeToAdd: PlaceDTO = placeFetched;
        placeToAdd.postalAddressId = postalAddressId ? {entityId: postalAddressId} : undefined;
        return placeToAdd
    }

    private async _pushPlaceToFootlight(footlightBaseUrl: string, calendarId: string, token: string,
                                        placeToAdd: PlaceDTO) {
        const url = footlightBaseUrl + FootlightPaths.ADD_PLACE;
        return await SharedService.syncEntityWithFootlight(calendarId, token, url, placeToAdd);
    }

    async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, artsDataUri: string) {
        const artsDataId = artsDataUri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, '');
        const placeDetails = await this.getPlaceDetailsFromArtsData(calendarId, footlightBaseUrl, token, artsDataId);
        return placeDetails ? await this._pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeDetails) : undefined;
    }

    // async syncPlaces(calendarId: string, token: string, source: string, footlightBaseUrl: string) {
    //     const placeIds = await this._fetchAllPlaceIdsFromArtsData(source);
    //     console.log('Places :: count:' + placeIds.length + ', Artsdata ids: ' + placeIds)
    //     let count = 0;
    //     for (const id of placeIds) {
    //         await new Promise(r => setTimeout(r, 500));
    //         await this.addPlaceToFootlight(id, calendarId, token, footlightBaseUrl);
    //         count++;
    //     }
    //     console.log(`Successfully synchronised ${count} Places.`);
    // }

    // async _fetchAllPlaceIdsFromArtsData(source: string) {
    //     const url = ArtsDataUrls.PLACES + '&source=' + source;
    //     const artsDataResponse = await SharedService.fetchUrl(url);
    //     return artsDataResponse.filter(place => place.id.value.startsWith(Artsdata.RESOURCE_URI_PREFIX))
    //         .map(place => place.id.value.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    // }

    // async addPlaceToFootlight(id: string, calendarId: string, token: string, footlightBaseUrl: string) {
    //     const placeToAdd = await this.getPlaceDetailsFromArtsData(id);
    //     await this._pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeToAdd)
    // }
}
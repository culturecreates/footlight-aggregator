import {SharedService} from "../shared/shared.service";
import {PlaceDTO} from "../../dto/place";
import {ArtsDataConstants, ArtsDataUrls} from "../../constants/artsdata-urls";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

export class PlaceService {

    async getPlaceDetailsFromArtsData(artsDataId: string) {
        const placeFetched = await SharedService.fetchFromArtsDataById(artsDataId, ArtsDataUrls.PLACE_BY_ID);
        const {
            id: artsDataUri, name, alternateName, description, disambiguatingDescription, url,
            sameAs: sameAsValues, address
        } = placeFetched;
        const sameAs = sameAsValues ? sameAsValues.map(val => ({uri: val})) : [];
        sameAs.push({uri: artsDataUri});
        const placeToAdd = new PlaceDTO(name, alternateName, description, disambiguatingDescription, url, sameAs);
        return placeToAdd;
    }

    private async _pushPlaceToFootlight(footlightBaseUrl: string, calendarId: string, token: string,
                                        placeToAdd: PlaceDTO) {
        const url = footlightBaseUrl + FootlightPaths.ADD_PLACE;
        const response = await SharedService.addEntityToFootlight(calendarId, token, url, placeToAdd);
        return response;
    }

    async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, artsDataUri: string) {
        const artsDataId = artsDataUri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, '');
        const placeDetails = await this.getPlaceDetailsFromArtsData(artsDataId);
        const pushResponse = await this._pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeDetails);
        return pushResponse.id;
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
import {SharedService} from "../shared/shared.service";
import {PlaceDTO} from "../../dto/place";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";
import {PersonDTO} from "../../dto/person";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

export class PlaceService {

    async syncPlaces(calendarId: string, token: string, source: string, footlightBaseUrl: string) {
        const placeIds = await this._fetchAllPlaceIdsFromArtsData(source);
        console.log('Places :: count:' + placeIds.length + ', Artsdata ids: ' + placeIds)
        let count = 0;
        for (const id of placeIds) {
            await new Promise(r => setTimeout(r, 500));
            await this.addPlaceToFootlight(id, calendarId, token, footlightBaseUrl);
            count++;
        }
        console.log(`Successfully synchronised ${count} Places.`);
    }

    async _fetchAllPlaceIdsFromArtsData(source: string) {
        const url = ArtsDataUrls.PLACES + '&source=' + source;
        const artsDataResponse = await SharedService.fetchUrl(url);
        return artsDataResponse.filter(place => place.id.value.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(place => place.id.value.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }

    async addPlaceToFootlight(id: string, calendarId: string, token: string, footlightBaseUrl: string) {
        const placeFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PLACE_BY_ID);
        const {
            id: artsDataId,
            name,
            alternateName,
            description,
            disambiguatingDescription,
            url,
            sameAs: sameAsValues,
            address
        } = placeFetched;
        const sameAs = sameAsValues ? sameAsValues.map(val => ({uri: val})) : [];
        sameAs.push({uri: artsDataId});
        const placeToAdd = new PlaceDTO(name, alternateName, description, disambiguatingDescription, url, sameAs);
        await this._pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeToAdd)
    }


    private async _pushPlaceToFootlight(footlightBaseUrl: string, calendarId: string, token: string, personToAdd: PersonDTO) {
        const url = footlightBaseUrl + FootlightPaths.ADD_PLACE;
        await SharedService.postToFootlight(calendarId, token, url, personToAdd);
    }
}
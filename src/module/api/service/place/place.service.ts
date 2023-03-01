import {SharedService} from "../shared/shared.service";
import {PlaceDTO} from "../../dto/place";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";

export class PlaceService {

    async syncPlaces() {
        const placeIds = await this._fetchAllPlaceIdsFromArtsData();
        console.log('Places :: count:' + placeIds.length + ', Artsdata ids: ' + placeIds)
        const places = [];
        let count = 0;
        for (const id of placeIds) {
            await new Promise(r => setTimeout(r, 500));
            places.push(await this.addPlaceToFootlight(id));
            count++;
        }
        console.log(places);
        console.log(`Successfully synchronised ${count} Places.`);
    }

    async _fetchAllPlaceIdsFromArtsData() {
        const url = ArtsDataUrls.PLACES;
        const artsDataResponse = await SharedService.fetchUrl(url);
        return artsDataResponse.filter(place => place.id.value.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(place => place.id.value.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }

    async addPlaceToFootlight(id: string) {
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
        //TODO
        //Add place to footlight-admin POST
        console.log(placeToAdd);
    }


}
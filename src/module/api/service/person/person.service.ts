import {PersonDTO} from "../../dto/person";
import {SharedService} from "../shared";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

export class PersonService {

    constructor() {
    }

    async syncPeople(calendarId: string, token: string, source: string, footlightUrl: string) {
        const peopleIds = await this._fetchAllPersonIdsFromArtsData(source);
        console.log('People :: count:' + peopleIds.length + ', Artsdata ids: ' + peopleIds)
        let count = 0;
        for (const id of peopleIds) {
            await new Promise(r => setTimeout(r, 500));
            await this.addPersonToFootlight(id, calendarId, token, footlightUrl);
            count++;
        }
        console.log(`Successfully synchronised ${count} People.`);
    }

    async _fetchAllPersonIdsFromArtsData(source: string) {
        const url = ArtsDataUrls.PEOPLE + '&source=' + source;
        const artsDatResponse = await SharedService.fetchUrl(url);
        return artsDatResponse.filter(person => person.id.value?.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(person => person.id.value.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }


    async addPersonToFootlight(id: string, calendarId: string, token: string, footlightUrl: string) {
        const personFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PERSON_BY_ID);
        const {
            id: artsDataId,
            name,
            alternateName,
            description,
            disambiguatingDescription,
            url,
            sameAs: sameAsValues
        } = personFetched;
        const sameAs = sameAsValues ? sameAsValues?.map(val => ({uri: val})) : [];
        sameAs.push({uri: artsDataId});
        const personToAdd = new PersonDTO(name, alternateName, description, disambiguatingDescription, url, sameAs);
        await this._pushPersonToFootlight(footlightUrl, calendarId, token, personToAdd);
    }

    private async _pushPersonToFootlight(footlightUrl: string, calendarId: string, token: string,
                                         personToAdd: PersonDTO) {
        const url = footlightUrl + FootlightPaths.ADD_PEOPLE;
        await SharedService.postToFootlight(calendarId, token, url, personToAdd);
    }
}
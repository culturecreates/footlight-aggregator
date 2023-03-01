import {PersonDTO} from "../../dto/person";
import {SharedService} from "../shared";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";
import {SERVER} from "../../config";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

export class PersonService {

    constructor() {
    }

    async syncPeople(calendarId: string, token: string) {
        const peopleIds = await this._fetchAllPersonIdsFromArtsData();
        console.log('People :: count:' + peopleIds.length + ', Artsdata ids: ' + peopleIds)
        let count = 0;
        for (const id of peopleIds) {
            await new Promise(r => setTimeout(r, 500));
            await this.addPersonToFootlight(id, calendarId, token);
            count++;
        }
        console.log(`Successfully synchronised ${count} People.`);
    }

    async _fetchAllPersonIdsFromArtsData() {
        const url = ArtsDataUrls.PEOPLE;
        const artsDatResponse = await SharedService.fetchUrl(url);
        return artsDatResponse.filter(person => person.id.value?.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(person => person.id.value.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }


    async addPersonToFootlight(id: string, calendarId: string, token: string) {
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
        await this._pushPersonToFootlight(calendarId, token, personToAdd);
        console.log(personToAdd);
    }

    private async _pushPersonToFootlight(calendarId: string, token: string, personToAdd: PersonDTO) {
        const url = SERVER.FOOTLIGHT_API_BASE_URL + FootlightPaths.ADD_PEOPLE;
        await SharedService.postToFootlight(calendarId, token, url, personToAdd);
    }
}
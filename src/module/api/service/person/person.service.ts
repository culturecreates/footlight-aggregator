import {PersonDTO} from "../../dto/person";
import {SharedService} from "../shared";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";

export class PersonService {

    constructor() {
    }

    async syncPeople() {
        const peopleIds = await this._fetchAllPersonIdsFromArtsData();
        console.log('Places :: count:' + peopleIds.length + ', Artsdata ids: ' + peopleIds)
        const people = [];
        let count = 0;
        for (const id of peopleIds) {
            await new Promise(r => setTimeout(r, 500));
            people.push(await this.addPersonToFootlight(id));
            count++;
        }
        console.log(people);
        console.log(`Successfully synchronised ${count} People.`);
    }

    async _fetchAllPersonIdsFromArtsData() {
        const url = ArtsDataUrls.PEOPLE;
        const artsDatResponse = await SharedService.fetchUrl(url);
        return artsDatResponse.filter(person => person.id.value?.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(person => person.id.value.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }


    async addPersonToFootlight(id: string) {
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
        console.log(personToAdd);
    }
}
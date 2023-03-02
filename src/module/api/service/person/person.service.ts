import {PersonDTO} from "../../dto/person";
import {SharedService} from "../shared";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

export class PersonService {

    async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, personDetails: PersonDTO) {
        const pushResponse = await this._pushPersonToFootlight(footlightBaseUrl, calendarId, token, personDetails);
        return pushResponse.id;
    }

    private async _pushPersonToFootlight(footlightUrl: string, calendarId: string, token: string,
                                         personToAdd: PersonDTO) {
        const url = footlightUrl + FootlightPaths.ADD_PEOPLE;
        const response = await SharedService.addEntityToFootlight(calendarId, token, url, personToAdd);
        //TODO if conflict, update;
        return response;
    }

    // async syncPeople(calendarId: string, token: string, source: string, footlightUrl: string) {
    //     const peopleIds = await this._fetchAllPersonIdsFromArtsData(source);
    //     console.log('People :: count:' + peopleIds.length + ', Artsdata ids: ' + peopleIds)
    //     let count = 0;
    //     for (const id of peopleIds) {
    //         await new Promise(r => setTimeout(r, 500));
    //         await this.getAndAddPersonToFootlight(id, calendarId, token, footlightUrl);
    //         count++;
    //     }
    //     console.log(`Successfully synchronised ${count} People.`);
    // }

    // async _fetchAllPersonIdsFromArtsData(source: string) {
    //     const url = ArtsDataUrls.PEOPLE + '&source=' + source;
    //     const artsDatResponse = await SharedService.fetchUrl(url);
    //     return artsDatResponse.filter(person => person.id.value?.startsWith(Artsdata.RESOURCE_URI_PREFIX))
    //         .map(person => person.id.value.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    // }

    // async getAndAddPersonToFootlight(id: string, calendarId: string, token: string, footlightUrl: string) {
    //     const personToAdd = await this.getPersonDetailsFromArtsData(id);
    //     await this._pushPersonToFootlight(footlightUrl, calendarId, token, personToAdd);
    // }

    // async getPersonDetailsFromArtsData(id: string) {
    //     const personFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PERSON_BY_ID);
    //     const {
    //         id: artsDataId,
    //         name,
    //         alternateName,
    //         description,
    //         disambiguatingDescription,
    //         url,
    //         sameAs: sameAsValues
    //     } = personFetched;
    //     const sameAs = sameAsValues ? sameAsValues?.map(val => ({uri: val})) : [];
    //     sameAs.push({uri: artsDataId});
    //     const person = new PersonDTO(name, alternateName, description, disambiguatingDescription, url, sameAs);
    //     return person;
    // }
}
import {PersonService} from "../person/person.service";
import {Injectable} from "@nestjs/common";
import {PlaceService} from "../place/place.service";
import {OrganizationService} from "../organization/organization.service";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";
import {SharedService} from "../shared";

@Injectable()

export class EventService {

    constructor(
        private readonly _personService: PersonService,
        private readonly _organizationService: OrganizationService,
        private readonly _placeService: PlaceService) {
    }

    async syncEntities(token: string, calendarId: string) {
        //Sync Organizations
        await this._organizationService.syncOrganizations(calendarId, token);
        //Sync People
        // await this._personService.syncPeople(calendarId, token);
        // //Sync Places
        // await this._placeService.syncPlaces(calendarId, token);
        //Sync Events
        // await this._syncEvents(calendarId, token);

        console.log('Successfully synchronised Entities.');
    }

    async addEventToFootlight(id: string) {
        const eventFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.EVENT_BY_ID);
        const {
            id: artsDataId,
            name,
            alternateName,
            description,
            disambiguatingDescription,
            url,
            sameAs: sameAsValues,
            address
        } = eventFetched;
        const sameAs = sameAsValues ? sameAsValues.map(val => ({uri: val})) : [];
        sameAs.push({uri: artsDataId});
        // const eventToAdd = new EventDTO(name, alternateName, description, disambiguatingDescription, url, sameAs);
        //TODO
        //Add place to footlight-admin POST
        // console.log(placeToAdd);
    }

    private async _fetchEventIdsFromArtsData() {
        const url = ArtsDataUrls.EVENTS;
        const artsDataResponse = await SharedService.fetchUrl(url);
        return artsDataResponse.data?.filter(event => event.id.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(event => event.id.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }


    private async _syncEvents(calendarId: string,token:string) {
        const eventIds = await this._fetchEventIdsFromArtsData();
        console.log("Event Ids:" + eventIds);
        const promises = []
        for (const id of eventIds) {
            promises.push(this.addEventToFootlight(id));
        }
        await Promise.all(promises);
    }
}
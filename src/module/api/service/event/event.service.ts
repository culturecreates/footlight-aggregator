import {PersonService} from "../person/person.service";
import {Injectable} from "@nestjs/common";
import {PlaceService} from "../place/place.service";
import {OrganizationService} from "../organization/organization.service";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";
import {SharedService} from "../shared";
import {SERVER} from "../../config";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

@Injectable()

export class EventService {

    constructor(
        private readonly _personService: PersonService,
        private readonly _organizationService: OrganizationService,
        private readonly _placeService: PlaceService) {
    }

    async syncEntities(token: string, calendarId: string, source: string) {
        //Sync Organizations
        await this._organizationService.syncOrganizations(calendarId, token, source);
        //Sync People
        await this._personService.syncPeople(calendarId, token, source);
        // //Sync Places
        await this._placeService.syncPlaces(calendarId, token, source);
        //Sync Events
        await this._syncEvents(calendarId, token, source);

        console.log('Successfully synchronised Entities.');
    }

    async addEventToFootlight(calendarId: string, token: string, id: string) {
        //TODO the URL is incorrect
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
        //TODO
        // const eventToAdd = new EventDTO(name, alternateName, description, disambiguatingDescription, url, sameAs);
        // await this._pushEventsToFootlight(calendarId, token, eventToAdd);
    }

    private async _fetchEventIdsFromArtsData(source: string) {
        const url = ArtsDataUrls.EVENTS + '&source=' + source;
        const artsDataResponse = await SharedService.fetchUrl(url);
        return artsDataResponse.data?.filter(event => event.id.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(event => event.id.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }


    private async _syncEvents(calendarId: string, token: string, source: string) {
        const eventIds = await this._fetchEventIdsFromArtsData(source);
        console.log("Event Ids:" + eventIds);
        const promises = []
        for (const id of eventIds) {
            promises.push(this.addEventToFootlight(calendarId, token, id));
        }
        await Promise.all(promises);
    }

    private async _pushEventsToFootlight(calendarId: string, token: string, eventToAdd: any) {
        const url = SERVER.FOOTLIGHT_API_BASE_URL + FootlightPaths.ADD_EVENT;
        await SharedService.postToFootlight(calendarId, token, url, eventToAdd);
    }
}
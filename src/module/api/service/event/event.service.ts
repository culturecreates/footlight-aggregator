import {PersonService} from "../person/person.service";
import {Injectable} from "@nestjs/common";
import {PlaceService} from "../place/place.service";
import {OrganizationService} from "../organization/organization.service";
import {ArtsDataConstants, ArtsDataUrls} from "../../constants/artsdata-urls";
import {SharedService} from "../shared";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";
import {EventDTO} from "../../dto/event/event.dto";
import {PersonOrganizationService} from "../person-organization/person-organization.service";

@Injectable()

export class EventService {

    constructor(
        private readonly _personService: PersonService,
        private readonly _organizationService: OrganizationService,
        private readonly _placeService: PlaceService,
        private readonly _personOrganizationService: PersonOrganizationService) {
    }

    private async _syncEvents(calendarId: string, token: string, source: string, footlightBaseUrl: string) {
        const events = await this._fetchEventsFromArtsData(source);
        console.log("Event::  count:" + events.length);
        for (const event of events) {
            await this.addEventToFootlight(calendarId, token, event, footlightBaseUrl);
        }
        console.log('Successfully synchronised Events and linked entities.');
    }

    async syncEntities(token: string, calendarId: string, source: string, footlightBaseUrl: string) {
        await this._syncEvents(calendarId, token, source, footlightBaseUrl);
    }

    async addEventToFootlight(calendarId: string, token: string, event: any, footlightBaseUrl: string) {
        const {location: locations, performer, organizer, sponsor} = event;
        const location = locations?.[0];
        const locationId: string = location ? await this._placeService.getFootlightIdentifier(calendarId, token,
            footlightBaseUrl, location) : undefined;
        const performers = performer?.length ? await this._personOrganizationService
            .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, performer) : undefined;
        const organizers = organizer?.length ? await this._personOrganizationService
            .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, organizer) : undefined;
        const collaborators = sponsor?.length ? await this._personOrganizationService
            .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, sponsor) : undefined;

        const eventToAdd = event;
        eventToAdd.locationId = locationId ? {place: {entityId: locationId}} : locationId;
        eventToAdd.performers = performers;
        eventToAdd.organizers = organizers;
        eventToAdd.collaborators = collaborators;

        const eventId = await this. _pushEventsToFootlight(calendarId, token, footlightBaseUrl, eventToAdd);
        console.log(`Created event with id: ${eventId}`)
    }

    private async _fetchEventsFromArtsData(source: string) {
        const url = ArtsDataUrls.EVENTS + '&source=' + source;
        const artsDataResponse = await SharedService.fetchUrl(url);
        return artsDataResponse.data?.filter(event => event.uri.startsWith(ArtsDataConstants.RESOURCE_URI_PREFIX));
    }

    private async _pushEventsToFootlight(calendarId: string, token: string, footlightBaseUrl: string,
                                         eventToAdd: EventDTO) {
        const url = footlightBaseUrl + FootlightPaths.ADD_EVENT;
        const postResponse = await SharedService.syncEntityWithFootlight(calendarId, token, url, eventToAdd);
        return postResponse.id;
    }
}
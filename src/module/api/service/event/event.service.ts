import {OrganizationService, PersonOrganizationService, PersonService, PlaceService} from "../../service";
import {forwardRef, Inject, Injectable} from "@nestjs/common";
import {ArtsDataConstants, ArtsDataUrls, FootlightPaths} from "../../constants";
import {SharedService} from "../shared";
import {EventDTO} from "../../dto";
import {PostalAddressService} from "../postal-address";

@Injectable()

export class EventService {

    constructor(
        @Inject(forwardRef(() => PersonService))
        private readonly _personService: PersonService,
        @Inject(forwardRef(() => OrganizationService))
        private readonly _organizationService: OrganizationService,
        @Inject(forwardRef(() => PostalAddressService))
        private readonly _postalAddressService: PostalAddressService,
        @Inject(forwardRef(() => PlaceService))
        private readonly _placeService: PlaceService,
        @Inject(forwardRef(() => PersonOrganizationService))
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
        const {location: locations, performer, organizer, sponsor, alternateName} = event;
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
        delete eventToAdd.location;
        eventToAdd.locationId = locationId ? {place: {entityId: locationId}} : locationId;
        eventToAdd.performers = performers;
        eventToAdd.organizers = organizers;
        eventToAdd.collaborators = collaborators;
        eventToAdd.alternateName = alternateName?.length ? SharedService.formatAlternateNames(alternateName) : undefined
        

        const eventId = await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, eventToAdd);
        console.log(`Synchronised event with id: ${JSON.stringify(eventToAdd.sameAs)}`)
    }

    private async _fetchEventsFromArtsData(source: string) {
        const limit = 300;
        const url = ArtsDataUrls.EVENTS + '&source=' + source + '&limit=' + limit;
        const artsDataResponse = await SharedService.fetchUrl(url);
        return artsDataResponse.data?.filter(event => event.uri.startsWith(ArtsDataConstants.RESOURCE_URI_PREFIX));
    }

    private async _pushEventsToFootlight(calendarId: string, token: string, footlightBaseUrl: string,
                                         eventToAdd: EventDTO) {
        const url = footlightBaseUrl + FootlightPaths.ADD_EVENT;
        if (eventToAdd) {
            return await SharedService.syncEntityWithFootlight(calendarId, token, url, eventToAdd);
        }
    }
}
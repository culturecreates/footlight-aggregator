import {OrganizationService, PersonOrganizationService, PersonService, PlaceService} from "../../service";
import {forwardRef, Inject, Injectable} from "@nestjs/common";
import {ArtsDataConstants, ArtsDataUrls, FootlightPaths} from "../../constants";
import {SharedService} from "../shared";
import {EventDTO} from "../../dto";
import {PostalAddressService} from "../postal-address";
import {TaxonomyService} from "../taxonomy";
import {MultilingualString} from "../../model";

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
        private readonly _personOrganizationService: PersonOrganizationService,
        @Inject(forwardRef(() => TaxonomyService))
        private readonly _taxonomyService: TaxonomyService) {
    }

    private taxonomies;
    private eventTypeConceptMap;
    private audienceConceptMap;

    private async _syncEvents(calendarId: string, token: string, source: string, footlightBaseUrl: string) {
        const events = await this._fetchEventsFromArtsData(source);
        console.log("Event count:" + events.length);

        this.taxonomies = await this._taxonomyService.getTaxonomy(calendarId, token, footlightBaseUrl, "EVENT");

        if (this.taxonomies) {
            this._extractEventTypeAndAudienceType(this.taxonomies);
        }
        for (const event of events) {
            try {
                await this.addEventToFootlight(calendarId, token, event, footlightBaseUrl);
            } catch (e) {
                console.log(`Error while adding Event ${event.url}` + e);
            }
        }
        console.log('Successfully synchronised Events and linked entities.');
    }

    async syncEntities(token: string, calendarId: string, source: string, footlightBaseUrl: string) {
        await this._syncEvents(calendarId, token, source, footlightBaseUrl);
    }

    async addEventToFootlight(calendarId: string, token: string, event: any, footlightBaseUrl: string) {
        const {location: locations, performer, organizer, sponsor, alternateName, keywords, audience} = event;
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
        eventToAdd.alternateName = alternateName?.length ? SharedService.formatAlternateNames(alternateName) : [];
        eventToAdd.additionalType = keywords?.length ? this._findMatchingConcepts(keywords, this.eventTypeConceptMap) : [];
        eventToAdd.audience = audience?.length ? this._findMatchingConcepts(audience, this.audienceConceptMap) : [];
        await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, eventToAdd);
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

    private _extractEventTypeAndAudienceType(taxonomies) {
        const eventTypeTaxonomy = taxonomies.find(taxonomy => taxonomy.mappedToField === 'EventType');
        this.eventTypeConceptMap = eventTypeTaxonomy?.concept?.map(concept => {
            return {id: concept.id, name: concept.name}
        });
        const audienceTaxonomy = taxonomies.find(taxonomy => taxonomy.mappedToField === 'Audience');
        this.audienceConceptMap = audienceTaxonomy?.concept?.map(concept => {
            return {id: concept.id, name: concept.name}
        });
    }

    private _findMatchingConcepts(keywords: string[], conceptMap: { id: string, name: MultilingualString }[]) {
        const matchingConcepts = conceptMap
            ?.filter(concept => keywords.includes(concept.name.en) || keywords.includes(concept.name.fr))
        return matchingConcepts?.map(concept => {
            return {entityId: concept.id}
        });
    }
}
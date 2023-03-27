import { OrganizationService, PersonOrganizationService, PersonService, PlaceService } from "../../service";
import { forwardRef, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ArtsDataConstants, ArtsDataUrls, FootlightPaths } from "../../constants";
import { SharedService } from "../shared";
import { EventDTO } from "../../dto";
import { PostalAddressService } from "../postal-address";
import { TaxonomyService } from "../taxonomy";
import { MultilingualString } from "../../model";
import { OfferCategory } from "../../enum";
import { Exception } from "../../helper";

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
    await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    console.log("Fetched Event Count :" + events.length);
    for (const event of events) {
      try {
        const eventFormatted = await this.formatEvent(calendarId, token, event, footlightBaseUrl);
        await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, eventFormatted);
        console.log(`Synchronised event with id: ${JSON.stringify(eventFormatted.sameAs)}`);
      } catch (e) {
        console.log(`Error while adding Event ${event.url}` + e);
      }
    }
    console.log("Successfully synchronised Events and linked entities.");
  }

  async syncEntities(token: string, calendarId: string, source: string, footlightBaseUrl: string) {
    await this._syncEvents(calendarId, token, source, footlightBaseUrl);
  }

  async formatEvent(calendarId: string, token: string, event: any, footlightBaseUrl: string) {
    const {
      location: locations,
      performer,
      organizer,
      sponsor,
      alternateName,
      keywords,
      audience,
      offerConfiguration
    } = event;
    const location = locations?.[0];
    const locationId: string = location ? await this._placeService.getFootlightIdentifier(calendarId, token,
      footlightBaseUrl, location) : undefined;
    const performers = performer?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, performer) : undefined;
    const organizers = organizer?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, organizer) : undefined;
    const collaborators = sponsor?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, sponsor) : undefined;
    delete event?.image?.uri;
    const formattedKeywords = [];
    keywords.forEach(keyword => {
      if (keyword.startsWith("[")) {
        formattedKeywords.push(JSON.parse(keyword));
      } else {
        formattedKeywords.push(keyword);
      }
    });

    const eventToAdd = event;
    delete eventToAdd.location;
    eventToAdd.locationId = locationId ? { place: { entityId: locationId } } : locationId;
    eventToAdd.performers = performers;
    eventToAdd.organizers = organizers;
    eventToAdd.collaborators = collaborators;
    eventToAdd.keywords = formattedKeywords;
    eventToAdd.alternateName = alternateName?.length ? SharedService.formatAlternateNames(alternateName) : [];
    eventToAdd.additionalType = this._findMatchingConcepts(formattedKeywords, this.eventTypeConceptMap);
    eventToAdd.audience = this._findMatchingConcepts(audience, this.audienceConceptMap);
    eventToAdd.offerConfiguration = offerConfiguration ? this._formatOfferConfiguration(offerConfiguration) : undefined;
    return eventToAdd;
  }

  private async _fetchEventsFromArtsData(source: string) {
    const limit = 300;
    const url = ArtsDataUrls.EVENTS + "&source=" + source + "&limit=" + limit;
    const artsDataResponse = await SharedService.fetchUrl(url);
    return artsDataResponse.data.data?.filter(event => event.uri.startsWith(ArtsDataConstants.RESOURCE_URI_PREFIX));
  }

  private async _fetchEventFromFootlight(token: string, calendarId: string, eventId: string, footlightBaseUrl: string) {
    const url = footlightBaseUrl + FootlightPaths.ADD_EVENT + `/${eventId}`;
    const headers = {
      Accept: "*/*",
      Authorization: `Bearer ${token}`,
      "calendar-id": calendarId,
      "Content-Type": "application/json"
    };
    const footlightResponse = await SharedService.fetchUrl(url, headers);
    const { status, data } = footlightResponse;
    if (status !== HttpStatus.OK) {
      Exception.badRequest("Some thing wrong");
    }
    return data;
  }

  private async _pushEventsToFootlight(calendarId: string, token: string, footlightBaseUrl: string,
                                       eventToAdd: EventDTO) {
    const url = footlightBaseUrl + FootlightPaths.ADD_EVENT;
    if (eventToAdd) {
      return await SharedService.syncEntityWithFootlight(calendarId, token, url, eventToAdd);
    }
  }

  private _extractEventTypeAndAudienceType(taxonomies) {
    const eventTypeTaxonomy = taxonomies.find(taxonomy => taxonomy.mappedToField === "EventType");
    this.eventTypeConceptMap = eventTypeTaxonomy?.concept?.map(concept => {
      return { id: concept.id, name: concept.name };
    });
    const audienceTaxonomy = taxonomies.find(taxonomy => taxonomy.mappedToField === "Audience");
    this.audienceConceptMap = audienceTaxonomy?.concept?.map(concept => {
      return { id: concept.id, name: concept.name };
    });
  }

  private _formatOfferConfiguration(offerConfiguration) {
    const { url, price, type } = offerConfiguration;
    let name;
    if (price !== "0") {
      name = { en: price, fr: price };
    }
    return {
      url: { uri: url },
      category: price === "0" ? OfferCategory.FREE : OfferCategory.PAYING,
      name: price !== "0" ? name : undefined,
      type
    };
  }

  private _findMatchingConcepts(keywords: string[], conceptMap: { id: string, name: MultilingualString }[]) {
    let matchingConcepts;

    matchingConcepts = keywords?.length ? conceptMap
      ?.filter(concept => keywords?.includes(concept.name.en) || keywords?.includes(concept.name.fr)) : [];
    if (!matchingConcepts?.length) {
      matchingConcepts = conceptMap
        ?.filter(concept => "not specified" === concept.name.en.toLowerCase() ||
          "indéterminé" === concept.name.fr.toLowerCase());
    }
    return matchingConcepts?.map(concept => {
      return { entityId: concept.id };
    });
  }

  async syncEventById(token: any, calendarId: string, eventId: string, source: string, footlightBaseUrl: string) {
    await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    const existingEvent = await this._fetchEventFromFootlight(token, calendarId, eventId, footlightBaseUrl);
    const sameAs = existingEvent.sameAs;
    const artsDataUrl = sameAs.find(sameAs => sameAs?.uri?.includes(ArtsDataConstants.RESOURCE_URI_PREFIX))?.uri;
    if (!artsDataUrl) {
      Exception.badRequest("The event is not linked to Artsdata.");
    }
    const eventsFromArtsData = await this._fetchEventsFromArtsData(source);
    const eventMatching = eventsFromArtsData.find(event => event.uri === artsDataUrl);
    const eventFormatted = await this.formatEvent(calendarId, token, eventMatching, footlightBaseUrl);
    return await SharedService.patchEventInFootlight(calendarId, token, footlightBaseUrl, eventId, eventFormatted);
  }

  private async _fetchTaxonomies(calendarId: string, token: string, footlightBaseUrl: string, className: string) {
    this.taxonomies = await this._taxonomyService.getTaxonomy(calendarId, token, footlightBaseUrl, className);
    if (this.taxonomies) {
      this._extractEventTypeAndAudienceType(this.taxonomies);
    }
  }
}
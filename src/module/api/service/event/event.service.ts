import {
  OrganizationService,
  PersonOrganizationService,
  PersonService,
  PlaceService,
  SharedService
} from "../../service";
import { forwardRef, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ArtsDataConstants, ArtsDataUrls } from "../../constants";
import { EventDTO } from "../../dto";
import { PostalAddressService } from "../postal-address";
import { TaxonomyService } from "../taxonomy";
import { MultilingualString } from "../../model";
import { EventProperty, HttpMethodsEnum, OfferCategory } from "../../enum";
import { Exception } from "../../helper";
import { Concept, FacebookConstants, FootlightPaths, SameAsTypes } from "../../constants/footlight-urls";
import * as moment from "moment-timezone";
import { LoggerService } from "../logger";

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
    private readonly _taxonomyService: TaxonomyService,
    @Inject(forwardRef(() => SharedService))
    private readonly _sharedService: SharedService,
    @Inject (forwardRef(()=> LoggerService))
    private readonly _loggerService: LoggerService) {
  }

  private taxonomies;
  private eventTypeConceptMap;
  private audienceConceptMap;

  private async _syncEvents(calendarId: string, token: string, source: string, footlightBaseUrl: string, batchSize: number, mappingUrl: string) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    let offset = 0, hasNext = true, batch = 1, totalCount = 0;
    await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    do {
      let events = await this._fetchEventsFromArtsData(source, batchSize, offset);
      if (events?.length !== batchSize) {
        hasNext = false;
      }
      const fetchedEventCount = events.length;
      let syncCount = 0;
      for (const event of events) {
        syncCount++;
        totalCount++;
        try {
          const eventFormatted = await this.formatEvent(calendarId, token, event, footlightBaseUrl, currentUser.id, mappingUrl);
          await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, eventFormatted, currentUser.id);
          this._loggerService.infoLogs(`Batch ${batch} :: (${syncCount}/${fetchedEventCount}) Synchronised event with id: ${JSON.stringify(eventFormatted.sameAs)}`);
        } catch (e) {
          this._loggerService.errorLogs(`Batch ${batch} :: (${syncCount}/${fetchedEventCount}) Error while adding Event ${event.url}` + e);
        }
      }
      offset = offset + batchSize;
      batch = batch + 1;
    } while (hasNext);
    this._loggerService.infoLogs(`Successfully synchronised ${totalCount} Events and linked entities.`);
  }

  async syncEntities(token: string, calendarId: string, source: string, footlightBaseUrl: string, batchSize: number, mappingUrl: string) {
    await this._syncEvents(calendarId, token, source, footlightBaseUrl, batchSize, mappingUrl);
  }

  async formatEvent(calendarId: string, token: string, event: any, footlightBaseUrl: string, currentUserId: string, mappingUrl:string) {
    const {
      location: locations, performer, organizer, sponsor, alternateName, keywords, audience,
      offerConfiguration, startDate, startDateTime, endDate, endDateTime, sameAs, subEvent
    } = event;
    if (subEvent) {
      const dates = subEvent.map(event => event.startDateTime);
      const customDates = [];
      const timezone = "Canada/Eastern";
      dates.forEach(date => {
        const momentFormatted = moment.tz(date, timezone);
        const startDate = momentFormatted.format("YYYY-MM-DD");
        const time = momentFormatted.format("HH:mm");
        customDates.push({ startDate, customTimes: [{ startTime: time }] });
      });
      event.recurringEvent = { customDates, frequency: "CUSTOM" };
      this._loggerService.infoLogs(event.recurringEvent);
    }
    const location = locations?.[0];
    const locationId: string = location ? await this._placeService.getFootlightIdentifier(calendarId, token,
      footlightBaseUrl, location, currentUserId) : undefined;
    const performers = performer?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, performer, currentUserId) : undefined;
    const organizers = organizer?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, organizer, currentUserId) : undefined;
    const collaborators = sponsor?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, sponsor, currentUserId) : undefined;
    delete event?.image?.uri;
    const isSingleDayEvent = this._findIfSingleDayEvent(startDate, startDateTime, endDate, endDateTime);

    const eventToAdd = event;
    delete eventToAdd.location;
    eventToAdd.locationId = locationId ? { place: { entityId: locationId } } : locationId;
    eventToAdd.performers = performers;
    eventToAdd.organizers = organizers;
    eventToAdd.collaborators = collaborators;
    eventToAdd.keywords = this._formattedValues(keywords);
    eventToAdd.alternateName = alternateName?.length ? SharedService.formatAlternateNames(alternateName) : [];
    eventToAdd.additionalType = await this._findMatchingConcepts(event, EventProperty.ADDITIONAL_TYPE, mappingUrl);
    eventToAdd.audience = await this._findMatchingConcepts(event,EventProperty.AUDIENCE, mappingUrl);
    eventToAdd.offerConfiguration = offerConfiguration ? this._formatOfferConfiguration(offerConfiguration) : undefined;
    eventToAdd.sameAs = sameAs ? this._formatSameAs(sameAs) : [];
    if (isSingleDayEvent) {
      delete eventToAdd.endDate;
      delete eventToAdd.endDateTime;
    }
    return eventToAdd;
  }

  private async _fetchEventsFromArtsData(source: string, batchSize: number, offset: number) {
    this._loggerService.infoLogs(`Fetching events from Artsdata. Source: ${source}`);
    const limit = batchSize ? batchSize : 300;
    const url = ArtsDataUrls.EVENTS + "&source=" + source + "&limit=" + limit + "&offset=" + offset;
    this._loggerService.infoLogs(`Fetch Events From ArtsData: ${url}.`);
    const artsDataResponse = await SharedService.fetchUrl(url);
    return artsDataResponse.data.data?.filter(event => event.uri.startsWith(ArtsDataConstants.RESOURCE_URI_PREFIX));
  }

  private async _fetchEventFromFootlight(token: string, calendarId: string, eventId: string, footlightBaseUrl: string) {
    const url = footlightBaseUrl + FootlightPaths.ADD_EVENT + `/${eventId}`;
    const headers = SharedService.createHeaders(token, calendarId);
    const footlightResponse = await SharedService.fetchUrl(url, headers);
    const { status, data } = footlightResponse;
    if (status !== HttpStatus.OK) {
      Exception.badRequest("Some thing wrong");
    }
    return data;
  }

  private async _pushEventsToFootlight(calendarId: string, token: string, footlightBaseUrl: string,
                                       eventToAdd: EventDTO, currentUserId: string) {
    const url = footlightBaseUrl + FootlightPaths.ADD_EVENT;
    if (eventToAdd) {
      return await SharedService.syncEntityWithFootlight(calendarId, token, url, eventToAdd, currentUserId);
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

  private _findMatchingConcept(keywords: string[], conceptMap: { id: string, name: MultilingualString }[]) {
    let matchingConcepts;
    if (keywords) {
      const keywordsFormatted = [];
      for (const keyword of keywords) {
        if (keyword.startsWith("[") && keyword.endsWith("]")) {
          keywordsFormatted.push(...JSON.parse(keyword));
        } else {
          keywordsFormatted.push(keyword);
        }
      }
      matchingConcepts = keywordsFormatted?.length ? conceptMap
        ?.filter(concept => keywordsFormatted?.includes(concept.name?.en) || keywordsFormatted?.includes(concept.name?.fr)) : [];
    }
    if (!matchingConcepts?.length) {
      matchingConcepts = conceptMap
        ?.filter(concept => Concept.NOT_SPECIFIED.en === concept.name?.en?.toLowerCase() ||
          Concept.NOT_SPECIFIED.fr === concept.name?.fr?.toLowerCase());
    }
    return matchingConcepts?.map(concept => {
      return { entityId: concept.id };
    });
  }

  private async _filterEventTypeAndAudienceType(fieldName: string, entityIds: string[]){
    if(entityIds.length < 1){
      return [];
    }
    const conceptMap = fieldName === "additionalType" ? this.eventTypeConceptMap : this.audienceConceptMap;
    return entityIds.filter((entityId) => {
      const id = conceptMap.some((mapObject) => mapObject.id.toString() === entityId);
      if(!id){
        this._loggerService.infoLogs(`Entity Id ${entityId} is not present in concepts ids in the CMS`);
      }
      return id;
    })
  }

  private _findMatchingConceptProperties(inputProperty:  string[], event: any){
    const eventPropertyValues = inputProperty?.length > 1 ? inputProperty.map(property => event[property]).flat(): [];
    return this._formattedValues(eventPropertyValues, true);
  }

  private async _findMatchingConcepts(event: any, fieldName: string, mappingUrl: string) {
    const mappingUrlResponse = await SharedService.fetchJsonFromUrl(mappingUrl);
    if(mappingUrlResponse == null) {
      return [];
    }
    let conceptMapping = mappingUrlResponse.data.find(concept => concept.fieldName === fieldName);
    let entityId: string[] = [];
    let defaultEntityId : string;
    let defaultEntityKey = "DEFAULT";
    if(conceptMapping){
      const eventPropertyValues = this._findMatchingConceptProperties(conceptMapping.inputProperty, event);
      if(eventPropertyValues.length > 0){
        for(const conceptMappingKey in conceptMapping.mapping){
          if(eventPropertyValues.includes(conceptMappingKey.toLowerCase())) {
            entityId.push(conceptMapping.mapping[conceptMappingKey][0]); 
            entityId = Array.from(new Set(entityId));
          }
        }
      }
      defaultEntityId = conceptMapping.mapping[defaultEntityKey] ? conceptMapping.mapping[defaultEntityKey][0] : [];
    }
    const entityIds = await this._filterEventTypeAndAudienceType(fieldName, entityId);
    if(entityIds.length < 1){
      entityIds.push(defaultEntityId);
    }
    return entityIds;
  }

  async syncEventById(token: any, calendarId: string, eventId: string, source: string, footlightBaseUrl: string, mappingUrl:string ) {
    await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    const existingEvent = await this._fetchEventFromFootlight(token, calendarId, eventId, footlightBaseUrl);
    if (!existingEvent.modifiedByUserId || existingEvent.modifiedByUserId === currentUser.id) {
      const sameAs = existingEvent.sameAs;
      const artsDataUrl = sameAs.find(sameAs => sameAs?.uri?.includes(ArtsDataConstants.RESOURCE_URI_PREFIX))?.uri;
      if (!artsDataUrl) {
        Exception.badRequest("The event is not linked to Artsdata.");
      }
      //TODO
      const eventsFromArtsData = await this._fetchEventsFromArtsData(source, 300, 0);
      const eventMatching = eventsFromArtsData.find(event => event.uri === artsDataUrl);
      const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
      const eventFormatted = await this.formatEvent(calendarId, token, eventMatching, footlightBaseUrl, currentUser.id, mappingUrl);
      return await SharedService.patchEventInFootlight(calendarId, token, footlightBaseUrl, eventId, eventFormatted);
    } else {
      this._loggerService.infoLogs("Entity cannot be modified. Since this entity is updated latest by a different user.");
    }


  }

  private async _fetchTaxonomies(calendarId: string, token: string, footlightBaseUrl: string, className: string) {
    this._loggerService.infoLogs("Fetching taxonomies");
    this.taxonomies = await this._taxonomyService.getTaxonomy(calendarId, token, footlightBaseUrl, className);
    if (this.taxonomies) {
      this._extractEventTypeAndAudienceType(this.taxonomies);
    }
  }

  private _findIfSingleDayEvent(startDate: any, startDateTime: any, endDate: any, endDateTime: any) {
    const eventStartDate = startDateTime ? startDateTime?.trim().split("T")[0] : startDate?.trim();
    const eventEndDate = endDateTime ? endDateTime?.trim()?.split("T")[0] : endDate?.trim();
    return eventEndDate === eventStartDate;
  }

  async reloadEventImages(token: any, calendarId: string, source: string, footlightBaseUrl: string) {
    //TODO
    const events = await this._fetchEventsFromArtsData(source, 300, 0);
    const fetchedEventCount = events.length;
    let syncCount = 0;
    for (const event of events) {
      syncCount++;
      try {
        const eventFormatted = await this._formatEventForImageReload(event);
        const url = footlightBaseUrl + FootlightPaths.ADD_EVENT;
        const addResponse = await SharedService.addEntityToFootlight(calendarId, token, url, eventFormatted);
        const { status, response } = addResponse;
        if (status === HttpStatus.CREATED) {
          this._loggerService.infoLogs(`Added Entity (${response.id} : ${eventFormatted.uri}) to Footlight!`);
          return response.id;
        } else if (status === HttpStatus.CONFLICT) {
          const existingEntityId = await response.error;
          const url = footlightBaseUrl + /events/ + existingEntityId + "/reload-image";
          await SharedService.callFootlightAPI(HttpMethodsEnum.PATCH, calendarId, token, url, { imageUrl: event.image?.url?.uri });
        }
        this._loggerService.infoLogs(`(${syncCount}/${fetchedEventCount}) Synchronised event with id: ${JSON.stringify(eventFormatted.sameAs)}`);
      } catch (e) {
        this._loggerService.errorLogs(`(${syncCount}/${fetchedEventCount}) Error while adding Event ${event.url}` + e);
      }
    }
    this._loggerService.infoLogs("Successfully synchronised Events and linked entities.");
  }

  private _formatSameAs(elements: { uri: string }[]) {
    return elements.map(element => {
      if (element.uri.startsWith(FacebookConstants.HTTPS) || element.uri.startsWith(FacebookConstants.HTTP)) {
        return {
          uri: element.uri,
          type: SameAsTypes.FACEBOOK_LINK
        };
      }
      return element;
    });
  }

  private async _formatEventForImageReload(event: any) {
    delete event?.image?.uri;
    const { uri, name, startDate, startDateTime, endDate, endDateTime, image, sameAs } = event;
    const formattedEvent = { name, image, startDate, startDateTime, endDate, endDateTime, sameAs, uri };

    const isSingleDayEvent = this._findIfSingleDayEvent(startDate, startDateTime, endDate, endDateTime);

    if (isSingleDayEvent) {
      delete formattedEvent.endDate;
      delete formattedEvent.endDateTime;
    }
    return formattedEvent;
  }

  private _formattedValues(values: any, convertToLowerCase? : Boolean){
    const formattedValues = [];
    values?.forEach(value => {
      value = convertToLowerCase? value.toLowerCase() : value;
      if (value.startsWith("[")) {
        formattedValues.push(...JSON.parse(value));
      } else {
        formattedValues.push(value);
      }
    });
    return formattedValues;
  }

}
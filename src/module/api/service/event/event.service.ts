import {
  OrganizationService,
  PersonOrganizationService,
  PersonService,
  PlaceService,
  SharedService
} from "../../service";
import { forwardRef, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ArtsDataConstants, ArtsDataUrls, CaligramUrls } from "../../constants";
import { ContactPointDTO, CustomDates, EventDTO, OfferDTO, OfferPrice } from "../../dto";
import { PostalAddressService } from "../postal-address";
import { TaxonomyService } from "../taxonomy";
import {
  AggregateOfferType,
  EventProperty,
  EventType,
  HttpMethodsEnum,
  OfferCategory,
  PersonOrganizationType,
  PriceCurrency,
  RecurringEventFrequency
} from "../../enum";
import { Exception, JsonLdParseHelper } from "../../helper";
import { FacebookConstants, FootlightPaths, OfferConstants, SameAsTypes } from "../../constants/footlight-urls";
import * as moment from "moment-timezone";
import { LoggerService } from "../logger";
import * as fs from "fs";
import { parse } from "@frogcat/ttl2jsonld";
import { EntityPredicates, EventPredicates } from "../../constants/artsdata-urls/rdf-types.constants";
import axios from "axios";

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
    @Inject(forwardRef(() => LoggerService))
    private readonly _loggerService: LoggerService) {
  }

  private taxonomies;
  private eventTypeConceptMap;
  private audienceConceptMap;

  private async _syncEvents(calendarId: string, token: string, source: string, footlightBaseUrl: string,
                            batchSize: number, mappingUrl: string, eventType?: EventType) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    let offset = 0, hasNext = true, batch = 1, totalCount = 0, tries = 0,
      maxTry = 3;
    await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    const patternToConceptIdMapping = (await SharedService.fetchJsonFromUrl(mappingUrl))?.data;
    const existingEventTypeConceptIDs = this._validateConceptIds(patternToConceptIdMapping,
      EventProperty.ADDITIONAL_TYPE, this.eventTypeConceptMap);
    const existingAudienceConceptIDs = this._validateConceptIds(patternToConceptIdMapping, EventProperty.AUDIENCE,
      this.audienceConceptMap);

    do {
      let events = await this._fetchEventsFromArtsData(source, batchSize, offset, eventType);
      if (events === null) {
        if (tries !== maxTry) {
          this._loggerService.errorLogs(`Unable to fetch Events from Arts Data for Batch ${batch}`);
          tries++;
          offset = offset + batchSize;
          batch = batch + 1;
          continue;
        }
        if (tries === maxTry) {
          this._loggerService.errorLogs(`Reached Maximum tries fetching Events from Arts Data`);
          break;
        }
      }
      if (!events?.length) {
        hasNext = false;
      }
      tries = 0;
      const fetchedEventCount = events.length;
      let syncCount = 0;
      for (const event of events) {
        syncCount++;
        totalCount++;
        try {
          this._loggerService.infoLogs(`Batch ${batch} :: (${syncCount}/${fetchedEventCount})`);
          this.checkExcludedValues(event, patternToConceptIdMapping, EventProperty.ADDITIONAL_TYPE)
          this.checkExcludedValues(event, patternToConceptIdMapping, EventProperty.AUDIENCE)
          const eventFormatted = await this.formatEvent(calendarId, token, event, footlightBaseUrl, currentUser.id,
            patternToConceptIdMapping, existingEventTypeConceptIDs, existingAudienceConceptIDs);
          await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, eventFormatted, currentUser.id);
          this._loggerService.infoLogs(`\t(${syncCount}/${fetchedEventCount}) Synchronised event with id: 
          ${JSON.stringify(eventFormatted.sameAs)}\n`);
        } catch (e) {
          this._loggerService
            .errorLogs(`Batch ${batch} :: (${syncCount}/${fetchedEventCount}). Error while adding Event 
            ${JSON.stringify(event.url)}` + e);
        }
      }
      offset = offset + batchSize;
      batch = batch + 1;
    } while (hasNext) ;
    this._loggerService.infoLogs(`Successfully synchronised ${totalCount} Events and linked entities.`);
  }


  checkExcludedValues(event: any, patternToConceptIdMapping: any, eventProperty: EventProperty){
    const patternToConceptIdMappingForTheField = patternToConceptIdMapping?.find(concept => concept.fieldName === eventProperty);
    const eventPropertyValuesForTheField = this._getPropertyValues(patternToConceptIdMappingForTheField?.inputProperty, event);
    for(const eventPropertyValueForAdditionalType of eventPropertyValuesForTheField){
      if(patternToConceptIdMappingForTheField.excludeValues?.some(excludedValue => excludedValue.toLowerCase() === eventPropertyValueForAdditionalType.toLowerCase())){
        Exception.badRequest("Excluded value found")
      }
    }
  }

  async syncEntities(token: string, calendarId: string, source: string, footlightBaseUrl: string, batchSize: number,
                     mappingUrl: string, eventType?: EventType) {
    await this._syncEvents(calendarId, token, source, footlightBaseUrl, batchSize, mappingUrl, eventType);
  }

  async formatEvent(calendarId: string, token: string, event: any, footlightBaseUrl: string, currentUserId: string,
                    patternToConceptIdMapping?: any, existingEventTypeConceptIDs?: any, existingAudienceConceptIDs?: any) {
    const {
      location: locations, performer, organizer, sponsor, alternateName, keywords, startDate, startDateTime, endDate,
      endDateTime, sameAs, subEvent, offers, contactPoint, type
    } = event;
    if (subEvent) {
      if(type == EventType.EVENT){
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
      if(type == EventType.EVENT_SERIES){
        const subEvents = []
        for (const sub of subEvent){
          let subEventToAdd = {
            startDate: sub?.startDateTime?.split("T")[0],
            startTime: sub?.startDateTime?.split("T")[1]?.slice(0,5),
            endDate: sub?.endDateTime?.split("T")[0],
            endTime: sub?.endDateTime?.split("T")[1]?.slice(0,5),
            name: sub.name,
            description: sub.description,
            sameAs: {uri: sub.uri, type: "ArtsdataIdentifier"},
            locationId: sub.location? {place: {entityId: await this._placeService.getFootlightIdentifier(calendarId, token, footlightBaseUrl, sub.location.Place, currentUserId)}} : undefined
          }
          subEvents.push(subEventToAdd)
        }
        event.subEventConfiguration = subEvents;
      }
    }
    // const offerArray = offers?.length ? offers : [offers];

    const location = locations?.Place;
    const virtualLocation = locations?.VirtualLocation;
    const virtualLocationName = virtualLocation ? virtualLocation.name : null;
    const virtualLocationDescription = virtualLocation ? virtualLocation.description : null;
    const virtualLocationUrl = virtualLocation ? virtualLocation.url : null;

    const locationId: string = location ? await this._placeService.getFootlightIdentifier(calendarId, token,
      footlightBaseUrl, location, currentUserId) : undefined;
    const performers = performer?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, performer, currentUserId) : undefined;
    const organizers = organizer?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, organizer, currentUserId) : undefined;
    const collaborators = sponsor?.length ? await this._personOrganizationService
      .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, sponsor, currentUserId) : undefined;
    delete event?.image?.uri;
    event.image = [event.image]
    const isSingleDayEvent = this._findIfSingleDayEvent(startDate, startDateTime, endDate, endDateTime);

    const eventToAdd = event;
    delete eventToAdd.location;
    eventToAdd.locationId = locationId ? { place: { entityId: locationId } } : locationId;
    if (virtualLocation) {
      eventToAdd.locationId.virtualLocation = {
        name: virtualLocationName,
        description: virtualLocationDescription,
        url: {
          uri: virtualLocationUrl
        }
      };
    }

    eventToAdd.performers = performers;
    eventToAdd.organizers = organizers;
    eventToAdd.collaborators = collaborators;
    eventToAdd.keywords = this._formattedValues(keywords);
    eventToAdd.alternateName = alternateName?.length ? SharedService.formatAlternateNames(alternateName) : [];
    eventToAdd.additionalType = await this._findMatchingConcepts(event, EventProperty.ADDITIONAL_TYPE,
      patternToConceptIdMapping, existingEventTypeConceptIDs);
    eventToAdd.audience = await this._findMatchingConcepts(event, EventProperty.AUDIENCE,
      patternToConceptIdMapping, existingAudienceConceptIDs);
    eventToAdd.offerConfiguration = offers ? this._formatOffers(offers) : undefined;
    eventToAdd.sameAs = sameAs ? this._formatSameAs(sameAs) : [];
    if (contactPoint) {
      eventToAdd.contactPoint = contactPoint?.length ? contactPoint[0] : contactPoint;
    }
    if (isSingleDayEvent) {
      delete eventToAdd.endDate;
      delete eventToAdd.endDateTime;
    }
    return eventToAdd;
  }

  private async _fetchEventsFromArtsData(source: string, batchSize: number, offset: number, eventType?: EventType) {
    const limit = batchSize ? batchSize : 300;
    const artsDataUrl = eventType? eventType == EventType.EVENT_SERIES ? ArtsDataUrls.EVENT_SERIES : ArtsDataUrls.EVENTS: ArtsDataUrls.EVENTS;
    const url = artsDataUrl + "&source=" + source + "&limit=" + limit + "&offset=" + offset;
    this._loggerService.infoLogs(`Fetching Events From ArtsData.\n\tSource: ${source}\n\tUrl: ${url}.\n`);
    const artsDataResponse = await SharedService.fetchUrl(url);
    if (artsDataResponse.status !== HttpStatus.OK) {
      return null;
    }
    return artsDataResponse.data.data?.filter(event => event.uri.startsWith(ArtsDataConstants.RESOURCE_URI_PREFIX));
  }

  private async _fetchEventSeriesFromArtsData(source: string, batchSize: number, offset: number) {
    const limit = batchSize ? batchSize : 300;
    const url = ArtsDataUrls.EVENT_SERIES + "&source=" + source + "&limit=" + limit + "&offset=" + offset;
    this._loggerService.infoLogs(`Fetching Events From ArtsData.\n\tSource: ${source}\n\tUrl: ${url}.\n`);
    const artsDataResponse = await SharedService.fetchUrl(url);
    if (artsDataResponse.status !== HttpStatus.OK) {
      return null;
    }
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

  private _getPropertyValues(lookupPropertyNames: string[], event: any) {
    const eventPropertyValues = lookupPropertyNames?.length
      ? lookupPropertyNames.map(property => event[property]?.length ? event[property] : []).flat() : [];
    return this._formattedValues(eventPropertyValues, true);
  }

  private async _findMatchingConcepts(event: any, fieldName: string, patternToConceptIdMapping: any,
                                      existingConceptIDs: any) {
    if (!patternToConceptIdMapping) {
      return [];
    }
    const patternToConceptIdMappingForTheField = patternToConceptIdMapping.find(concept => concept.fieldName === fieldName);
    let entityId = [];
    let defaultEntityId: string;
    const defaultEntityKey = "DEFAULT";
    if (patternToConceptIdMappingForTheField) {
      const eventPropertyValues = this._getPropertyValues(patternToConceptIdMappingForTheField.inputProperty, event);
      if (eventPropertyValues?.length) {
        for (const pattern in patternToConceptIdMappingForTheField.mapping) {
          let regexPattern;
          try {
            regexPattern = new RegExp(`^${pattern}$`, "gi");
          } catch (e) {
            this._loggerService.infoLogs(`Invalid Regex: ${e}`);
          }

          if (eventPropertyValues.some(eventPropertyValue => eventPropertyValue.toLowerCase() === pattern
            || (regexPattern && regexPattern.test(eventPropertyValue)))
          ) {
            const mappedUUIDs: string[] = patternToConceptIdMappingForTheField.mapping[pattern];
            const conceptIdToAdd = mappedUUIDs.filter(id => existingConceptIDs.includes(id));
            if (conceptIdToAdd?.length) {
              entityId.push(...conceptIdToAdd);
            }
          }
        }
      }
    }
    if (!entityId.length) {
      defaultEntityId = patternToConceptIdMappingForTheField.mapping[defaultEntityKey]
        ? patternToConceptIdMappingForTheField.mapping[defaultEntityKey] : [];
      entityId.push(...defaultEntityId);
    }
    const uniqueIds = Array.from(new Set(entityId));
    return uniqueIds.map(id => {
      return { entityId: id };
    });
  }

  async syncEventById(token: any, calendarId: string, eventId: string, source: string, footlightBaseUrl: string,
                      mappingUrl: string) {
    await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    const existingEvent = await this._fetchEventFromFootlight(token, calendarId, eventId, footlightBaseUrl);
    const patternToConceptIdMapping = (await SharedService.fetchJsonFromUrl(mappingUrl))?.data;
    const existingEventTypeConceptIDs = this._validateConceptIds(patternToConceptIdMapping,
      EventProperty.ADDITIONAL_TYPE, this.eventTypeConceptMap);
    const existingAudienceConceptIDs = this._validateConceptIds(patternToConceptIdMapping,
      EventProperty.AUDIENCE, this.audienceConceptMap);
    if (!existingEvent.modifiedByUserId || existingEvent.modifiedByUserId === currentUser.id) {
      const sameAs = existingEvent.sameAs;
      const artsDataUrl = sameAs.find(sameAs => sameAs?.uri?.includes(ArtsDataConstants.RESOURCE_URI_PREFIX))?.uri;
      if (!artsDataUrl) {
        Exception.badRequest("The event is not linked to Artsdata.");
      }
      const limit = 10;
      let offset = 0;
      let eventMatching = {};
      while (true) {
        const eventsFromArtsData = await this._fetchEventsFromArtsData(source, limit, offset);
        if (!eventsFromArtsData) {
          Exception.badRequest("The event is not found in Artsdata");
        }
        eventMatching = eventsFromArtsData.find(event => event.uri === artsDataUrl);
        offset += 10;
        if (eventMatching) {
          console.log("Event found");
          break;
        }
      }

      if (!Object.keys(eventMatching).length) {
        Exception.badRequest("The event is not found in Artsdata");
      }


      const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
      const eventFormatted = await this.formatEvent(calendarId, token, eventMatching, footlightBaseUrl, currentUser.id,
        patternToConceptIdMapping, existingEventTypeConceptIDs, existingAudienceConceptIDs);
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
        const addResponse = await SharedService.addEntityToFootlight(calendarId, token, url,
          eventFormatted);
        const { status, response } = addResponse;
        if (status === HttpStatus.CREATED) {
          this._loggerService.infoLogs(`Added Entity (${response.id} : ${eventFormatted.uri}) to Footlight!`);
          return response.id;
        } else if (status === HttpStatus.CONFLICT) {
          const existingEntityId = await response.error;
          const url = footlightBaseUrl + /events/ + existingEntityId + "/reload-image";
          await SharedService.callFootlightAPI(HttpMethodsEnum.PATCH, calendarId, token, url,
            { imageUrl: event.image?.url?.uri });
        }
        this._loggerService.infoLogs(`(${syncCount}/${fetchedEventCount}) Synchronised event with id: 
        ${JSON.stringify(eventFormatted.sameAs)}`);
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
    const formattedEvent = {
      name, image, startDate, startDateTime, endDate, endDateTime,
      sameAs, uri
    };

    const isSingleDayEvent = this._findIfSingleDayEvent(startDate, startDateTime, endDate, endDateTime);

    if (isSingleDayEvent) {
      delete formattedEvent.endDate;
      delete formattedEvent.endDateTime;
    }
    return formattedEvent;
  }

  private _formattedValues(values: any, convertToLowerCase?: Boolean) {
    const formattedValues = [];
    values?.forEach(value => {
      value = convertToLowerCase ? value.toLowerCase() : value;
      if (value.startsWith("[")) {
        formattedValues.push(...JSON.parse(value));
      } else {
        formattedValues.push(value);
      }
    });
    return formattedValues;
  }

  private _validateConceptIds(patternToConceptIdMapping: any, propertyName: string, existingConceptsMap: string[]) {
    let patternToConceptIdMappingForTheField = patternToConceptIdMapping?.find(concept => concept.fieldName === propertyName).mapping;
    const conceptIds = patternToConceptIdMappingForTheField? 
      Object.values(patternToConceptIdMappingForTheField).flat(): undefined;
    const existingConceptIds = this._getAllConceptIds(existingConceptsMap);
    this._loggerService.infoLogs(`Validating identifiers from the mapping file for ${propertyName}`);
    return conceptIds?.filter((entityId) => {
      const id = existingConceptIds.some((conceptId) => conceptId.includes(entityId));
      if (!id) {
        this._loggerService.infoLogs(`\tNo match found for the conceptId: ${entityId} from the mapping file in the CMS.`);
      }
      return id;
    });
  }

  private _getAllConceptIds(conceptMapIds: any) {
    return conceptMapIds?.map((ids) => ids.id);
  }

  private _formatOffers(offers: any) {
    offers = [].concat(offers);

    const aggregateOffer = offers.find(offer => offer.type === OfferConstants.AGGREGATE_OFFER);
    if(typeof aggregateOffer?.name?.fr == 'object'){
      aggregateOffer.name.fr = aggregateOffer.name.fr[0];
    }
    const offerConfiguration = {
      name: aggregateOffer?.name,
      description: aggregateOffer?.description,
      url: aggregateOffer?.url,
      category: undefined,
      priceCurrency: OfferConstants.CURRENCY_CAD,
      prices: undefined
    };
    const offersWithPrice = offers.filter(offer => offer.type === OfferConstants.OFFER);
    const prices = [];
    offersWithPrice?.forEach(offer => {
      prices.push({
        name: offer.name,
        price: offer.price,
        url: offer.url ? { uri: offer.url } : undefined
      });
    });

    if (aggregateOffer?.additionalType) {
      if (aggregateOffer?.additionalType == AggregateOfferType.PAID) {
        offerConfiguration.category = OfferCategory.PAYING;
        offerConfiguration.prices = prices;
      } else if (aggregateOffer?.additionalType == AggregateOfferType.FREE) {
        offerConfiguration.category = OfferCategory.FREE;
      } else if (aggregateOffer?.additionalType == AggregateOfferType.REGISTER) {
        offerConfiguration.category = OfferCategory.REGISTRATION;
      }
    } else {
      const priceExists = () => {
        return prices.some(price => price.price > 0);
      };

      if (priceExists) {
        offerConfiguration.category = OfferCategory.PAYING;
        offerConfiguration.prices = prices;
      } else {
        offerConfiguration.category = OfferCategory.FREE;
      }
    }

    return offerConfiguration;
  }

  async syncEntitiesUsingRdf(token: string, rdfFilePath: string, mappingFileUrl: string, footlightBaseUrl: string, calendarId: string) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    const currentUserId = currentUser.id;
    let rdfData = fs.readFileSync(rdfFilePath, "utf8");

    const jsonldData = parse(rdfData);
    await this.exportJsonLdData(jsonldData, token, calendarId, footlightBaseUrl, currentUserId, mappingFileUrl);
  }

  async exportJsonLdData(jsonLd: any, token: string, calendarId: string, footlightBaseUrl: string, currentUserId: string, mappingFiles: any) {
    const data = jsonLd["@graph"]
    const context = jsonLd["@context"];
    let jsonLdPlaces = data.filter(item => item["@type"] === EntityPredicates.PLACE);
    let jsonLdPostalAddresses = data.filter(item => item["@type"] === EntityPredicates.POSTAL_ADDRESS);
    let jsonLdOrganizations = data.filter(item => item["@type"] === EntityPredicates.ORGANIZATION);
    let jsonLdPeople = data.filter(item => item["@type"] === EntityPredicates.PERSON);
    let jsonLdOffers = data.filter(item => item["@type"] === EntityPredicates.AGGREGATE_OFFER);
    let jsonLdContactPoints = data.filter(item => item["@type"] === EntityPredicates.CONTACT_POINT);
    let events = [];
    await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    for (const node of data) {
      if (node["@type"] == EntityPredicates.EVENT) {
        await this.formatAndPushJsonLdEvents(node, jsonLdPlaces, token, calendarId, footlightBaseUrl,
          currentUserId, jsonLdPostalAddresses, jsonLdOrganizations, jsonLdPeople, jsonLdOffers, jsonLdContactPoints, mappingFiles, context);
      }
    }
    return events;
  }


  async formatAndPushJsonLdEvents(event: any, places: Object[], token: string, calendarId: string,
                                  footlightBaseUrl: string, currentUserId: string, jsonLdPostalAddresses: any, jsonLdOrganizations: any,
                                  jsonLdPeople: any, jsonLdOffers: any, jsonLdContactPoints, mappingFiles: any, context: any) {
    const formattedEvent = new EventDTO();

    const [name, description, eventStatus, attendanceMode, startDate, endDate, additionalType, videoUrl, location,
      offer, organizer, performer, collaborator, url, image, contactPoint] = [
      event[EventPredicates.NAME], event[EventPredicates.DESCRIPTION], event[EventPredicates.EVENT_STATUS],
      event[EventPredicates.EVENT_ATTENDANCE_MODE], event[EventPredicates.START_DATE], event[EventPredicates.END_DATE],
      event[EventPredicates.ADDITIONAL_TYPE], event[EventPredicates.VIDEO_URL], event[EventPredicates.LOCATION],
      event[EventPredicates.EVENT_OFFER], event[EventPredicates.ORGANIZER], event[EventPredicates.PERFORMER], event[EventPredicates.COLLABORATOR],
      event[EventPredicates.URL], event[EventPredicates.IMAGE], event[EventPredicates.EVENT_CONTACT_POINT]
    ];

    const patternToConceptIdMapping = (await SharedService.fetchJsonFromUrl(mappingFiles))?.data;
    const existingEventTypeConceptIDs = this._validateConceptIds(patternToConceptIdMapping, EventProperty.ADDITIONAL_TYPE, this.eventTypeConceptMap);
    if (name) {
      formattedEvent.name = JsonLdParseHelper.formatMultilingualField(name);
    }
    if (description) {
      formattedEvent.description = JsonLdParseHelper.formatMultilingualField(description);
    }
    if (eventStatus) {
      formattedEvent.eventStatus = JsonLdParseHelper.formatEventStatus(eventStatus);
    }
    if (attendanceMode) {
      formattedEvent.eventAttendanceMode = attendanceMode["@id"].replace("schema:", "");
    }
    if (startDate) {
      formattedEvent.startDateTime = this.convertDateToISO(startDate["@value"])
        || this.convertDateToISO(startDate[0]["@value"])
    }
    if (endDate) {
      formattedEvent.endDateTime = this.convertDateToISO(endDate["@value"])
        || this.convertDateToISO(endDate[0]["@value"])
    }
    if (image) {
      formattedEvent.image = { url: { uri: image } };
    }
    if (additionalType) {
      const additionalTypeIds = await this._getConceptIdByNameForRdf(additionalType, patternToConceptIdMapping, existingEventTypeConceptIDs, EventProperty.ADDITIONAL_TYPE);
      formattedEvent.additionalType = additionalTypeIds;
    }
    if (videoUrl) {
      formattedEvent.videoUrl = videoUrl["@id"];
    }
    if (contactPoint) {
      formattedEvent.contactPoint = this._formatJsonLdContactPoint(contactPoint, jsonLdContactPoints);
    }
    if (location) {
      let placeDetails = places.find(place => place["@id"] === location["@id"]);
      let placeEntityId = await this._placeService.formatAndPushJsonLdPlaces(placeDetails, token, calendarId, footlightBaseUrl, currentUserId, jsonLdPostalAddresses, context);
      formattedEvent.locationId = { place: { entityId: placeEntityId } };
    }
    if (offer) {
      formattedEvent.offerConfiguration = this._formatJsonLdOffers(offer, jsonLdOffers);
    }

    if (organizer || performer || collaborator) {
      if (organizer) {
        let {
          participantId,
          participantType
        } = await this._personOrganizationService.formatAndPushPersonOrganization(token, calendarId, footlightBaseUrl,
          currentUserId, jsonLdOrganizations, jsonLdPeople, event, EventPredicates.ORGANIZER, context);
        formattedEvent.organizers = [{ entityId: participantId, type: participantType }];
      }

      if (performer) {
        let {
          participantId,
          participantType
        } = await this._personOrganizationService.formatAndPushPersonOrganization(token, calendarId, footlightBaseUrl,
          currentUserId, jsonLdOrganizations, jsonLdPeople, event, EventPredicates.PERFORMER, context);
        formattedEvent.performers = [{ entityId: participantId, type: participantType }];
      }

      if (collaborator) {
        let {
          participantId,
          participantType
        } = await this._personOrganizationService.formatAndPushPersonOrganization(token, calendarId, footlightBaseUrl,
          currentUserId, jsonLdOrganizations, jsonLdPeople, event, EventPredicates.COLLABORATOR, context);
        formattedEvent.collaborators = [{ entityId: participantId, type: participantType }];
      }
    }
    const uri = JsonLdParseHelper.formatEntityUri(context, event["@id"])
    formattedEvent.sameAs = [{ uri: uri, type: "ExternalSourceIdentifier" }];
    formattedEvent.uri = uri;
    await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, formattedEvent, currentUserId);
  }

  private _formatJsonLdContactPoint(contactPoint: any, jsonLdContactPoints: any) {
    let contactPointData = jsonLdContactPoints
      .find(jsonLdContactPoint => jsonLdContactPoint["@id"] === contactPoint["@id"]);
    const formattedContactPoint: ContactPointDTO = {
      url: { uri: contactPointData[EventPredicates.URL]["@id"] },
      email: contactPoint[EventPredicates.EMAIL],
      telephone: contactPoint[EventPredicates.TELEPHONE]
    };
    return formattedContactPoint;
  }

  private _formatJsonLdOffers(offer: any, jsonLdOffers: any) {
    let offerData = jsonLdOffers.find(jsonLdOffer => jsonLdOffer["@id"] === offer["@id"])
      || jsonLdOffers.find(jsonLdOffer => jsonLdOffer["@id"] === offer[0]["@id"]);
    let offerPrice: OfferPrice = {
      name: JsonLdParseHelper.formatMultilingualField(offerData[EventPredicates.NAME]),
      price: offerData[EventPredicates.PRICE]
    };
    const uri = offerData[EventPredicates.URL];
    let offerConfiguration: OfferDTO = {
      url: { uri: uri },
      prices: [offerPrice],
      category: uri ? OfferCategory.PAYING : OfferCategory.FREE
    };
    return offerConfiguration;
  }

  private _getConceptIdByNameForRdf(
    conceptNames: string[],
    patternToConceptIdMapping: any,
    existingEventTypeConceptIDs: unknown[],
    eventPropertyValue: EventProperty
  ) {
    conceptNames = [].concat(conceptNames);
    const conceptIds = [];
    for (const mappingType of patternToConceptIdMapping) {
      const isMatchingField = mappingType.fieldName === eventPropertyValue;
      for (const conceptName of conceptNames) {
        if (isMatchingField && mappingType.mapping[conceptName]) {
          const conceptIdArray = mappingType.mapping[conceptName];
          for (let conceptId of conceptIdArray) {
            if (existingEventTypeConceptIDs.includes(conceptId)) {
              conceptIds.push(conceptId);
            }
          }
        }
      }
    }

    if (conceptIds.length) {
      let uniqueConceptIdsList = [...new Set(conceptIds)];
      const uniqueConceptIds = Array.from(uniqueConceptIdsList).map((conceptId) => ({
        entityId: conceptId
      }));
      return uniqueConceptIds;
    } else {
      return [];
    }
  }

  private convertDateToISO(date: string) {
    return moment.tz(date, 'YYYY-MM-DD HH:mm ', 'Canada/Eastern').toISOString();
  }

  async importCaligram(token: any, footlightBaseUrl: string, calendarId: string, mappingFileUrl: string) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    const currentUserId = currentUser.id;
    const eventIds = await this.getCaligramEventIds();
    let count = 1;
    let eventUrl;
    for (const eventId of eventIds) {
      try {
        this._loggerService.infoLogs(`(${count}/${eventIds.length})`);
        eventUrl = CaligramUrls.EVENT_URL + eventId;
        const data = (await (axios.get(eventUrl))).data;
        if (data.status == "published") {
          await this.formatAndPushCaligramEvents(data, token, footlightBaseUrl, calendarId, currentUserId, mappingFileUrl);
        }
        count++;
      } catch (e) {
        this._loggerService.errorLogs(`Error while adding/updating event ${eventUrl}`);
      }
    }
  }


  async getCaligramEventIds() {
    const eventIds = [];
    let pageNumber = 1;
    while (true) {
      let eventData;
      try {
        eventData = (await axios.get(CaligramUrls.PAGE_URL + pageNumber)).data.data;
        if (!eventData.length) {
          this._loggerService.infoLogs(`no more events found on page ${pageNumber}`);
          break;
        }
      } catch (error) {
        Exception.internalServerError("Unable to fetch from Caligram listing URL");
      }
      eventIds.push(...eventData.map(event => event.id));
      pageNumber++;
    }
    return eventIds;
  }

  async formatAndPushCaligramEvents(event: any, token: any, footlightBaseUrl: string,
                                    calendarId: string, currentUserId: string, mappingFileUrl: string) {
    let formattedEvent = new EventDTO();
        await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    const patternToConceptIdMapping = (await SharedService.fetchJsonFromUrl(mappingFileUrl))?.data;
    const existingEventTypeConceptIDs =
      this._validateConceptIds(patternToConceptIdMapping, EventProperty.ADDITIONAL_TYPE, this.eventTypeConceptMap);
    formattedEvent.name = { fr: event.title };
    formattedEvent.description = { fr: event.description };
    formattedEvent = this._formatDatesForCaligram(formattedEvent, event.start_date, event.end_date, event.dates);
    formattedEvent.isFeaturedEvent = event.featured == "true" ? true : false;
    formattedEvent.uri = event.url;
    formattedEvent.offerConfiguration =

  this._formatCaligramOffers(event.ticket_url, event.price_currency, event.prices, event.price_type);
    if (event.tags) {
      let additionalTypeNames = [];
      for (const tag of event.tags) {
        additionalTypeNames.push(tag.name);
      }
      formattedEvent.additionalType = await this._getConceptIdByNameForRdf(additionalTypeNames, patternToConceptIdMapping,
        existingEventTypeConceptIDs, EventProperty.ADDITIONAL_TYPE);
    }
    formattedEvent.image = { url: { uri: event.image.sizes.original } };
    formattedEvent.sameAs = [{ uri: event.url, type: "ExternalSourceIdentifier" }];
    if (event.venue) {
      const location = await this._placeService.formatAndPushCaligramPlaces(event.venue, token, footlightBaseUrl,
        calendarId, currentUserId);
      formattedEvent.locationId = { place: { entityId: location } };
    }
    if (event.organization) {
      const organizationId = await this._organizationService.formatAndPushCaligramOrganization(event.organization, token,
        calendarId, footlightBaseUrl, currentUserId);
      formattedEvent.organizers = [{ entityId: organizationId, type: PersonOrganizationType.ORGANIZATION }];
    }
    await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, formattedEvent, currentUserId);

  }

  private _formatDatesForCaligram(formattedEvent: EventDTO, start_date: any, end_date: any, dates: any): EventDTO {
    if (dates.length === 1) {
      formattedEvent.startDateTime = this.convertDateToISO(start_date);
      formattedEvent.endDateTime = this.convertDateToISO(end_date);
      return formattedEvent;
    }
    if (dates) {
      let customDate = new CustomDates();
      let customDates = [];
      for (const date of dates) {
        let dateAndTime = date.start_date.split(" ");
        customDate = {
          startDate: dateAndTime[0],
          customTimes: [{
            startTime: dateAndTime[1]
          }]
        };
        customDates.push(customDate);
      }
      formattedEvent.recurringEvent = {
        frequency: RecurringEventFrequency.CUSTOM,
        customDates: customDates
      };
      return formattedEvent;
    }
    return formattedEvent;
  }

  private _formatCaligramOffers(tickerUrl: string, currency: string, prices: any, priceType: string) {
    let priceCurrency = currency == "CAD" ? PriceCurrency.CAD : currency == "USD" ? PriceCurrency.USD : null;
    if (priceType == OfferCategory.FREE) {
      return {
        url: { uri: tickerUrl },
        category: OfferCategory.FREE,
        priceCurrency: priceCurrency
      };
    } else {
      let offerPrices = [];
      for (const price of prices) {
        const offerPrice = { price: price.value, name: { fr: price.description } };
        offerPrices.push(offerPrice);
      }
      return {
        url: { uri: tickerUrl },
        category: OfferCategory.PAYING,
        priceCurrency: priceCurrency,
        prices: offerPrices
      };
    }
  }
}
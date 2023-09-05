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
import { EventProperty, HttpMethodsEnum, OfferCategory } from "../../enum";
import { Exception } from "../../helper";
import { FacebookConstants, FootlightPaths, OfferConstants, SameAsTypes } from "../../constants/footlight-urls";
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
    @Inject(forwardRef(() => LoggerService))
    private readonly _loggerService: LoggerService) {
  }

  private taxonomies;
  private eventTypeConceptMap;
  private audienceConceptMap;

  private async _syncEvents(calendarId: string, token: string, source: string, footlightBaseUrl: string,
                            batchSize: number, mappingUrl: string) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token, calendarId);
    let offset = 0, hasNext = true, batch = 1, totalCount = 0, tries = 0, maxTry = 3;
    await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, "EVENT");
    const patternToConceptIdMapping = (await SharedService.fetchJsonFromUrl(mappingUrl))?.data;
    const existingEventTypeConceptIDs = this._validateConceptIds(patternToConceptIdMapping, EventProperty.ADDITIONAL_TYPE, this.eventTypeConceptMap);
    const existingAudienceConceptIDs = this._validateConceptIds(patternToConceptIdMapping, EventProperty.AUDIENCE, this.audienceConceptMap);

    do {
      let events = await this._fetchEventsFromArtsData(source, batchSize, offset);
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
          const eventFormatted = await this.formatEvent(calendarId, token, event, footlightBaseUrl, currentUser.id,
            patternToConceptIdMapping, existingEventTypeConceptIDs, existingAudienceConceptIDs);
          await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, eventFormatted, currentUser.id);
          this._loggerService.infoLogs(`\t(${syncCount}/${fetchedEventCount}) Synchronised event with id: ${JSON.stringify(eventFormatted.sameAs)}\n`);
        } catch (e) {
          this._loggerService.errorLogs(`Batch ${batch} :: (${syncCount}/${fetchedEventCount}). Error while adding Event ${event.url}` + e);
        }
      }
      offset = offset + batchSize;
      batch = batch + 1;
    } while (hasNext) ;
    this._loggerService.infoLogs(`Successfully synchronised ${totalCount} Events and linked entities.`);
  }

  async syncEntities(token: string, calendarId: string, source: string, footlightBaseUrl: string, batchSize: number,
                     mappingUrl: string) {
    await this._syncEvents(calendarId, token, source, footlightBaseUrl, batchSize, mappingUrl);
  }

  async formatEvent(calendarId: string, token: string, event: any, footlightBaseUrl: string, currentUserId: string,
                    patternToConceptIdMapping: any, existingEventTypeConceptIDs: any, existingAudienceConceptIDs: any) {
    const {
      location: locations, performer, organizer, sponsor, alternateName, keywords, startDate, startDateTime, endDate,
      endDateTime, sameAs, subEvent, offers, contactPoint
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
    const virtualLocation = locations?.[1];
    const virtualLocationName = virtualLocation? virtualLocation.name:null
    const virtualLocationDescription = virtualLocation? virtualLocation.description:null
    const virtualLocationUrl = virtualLocation? virtualLocation.url:null

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
    eventToAdd.locationId.virtualLocation = {}

    if (virtualLocationName) {
      eventToAdd.locationId.virtualLocation.name = virtualLocationName;
    }
    if (virtualLocationDescription) {
      eventToAdd.locationId.virtualLocation.description = virtualLocationDescription;
    }
    if (virtualLocationUrl) {
      eventToAdd.locationId.virtualLocation.url = virtualLocationUrl;
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
    eventToAdd.offerConfiguration = offers?.length ? this._formatOffers(offers) : undefined;
    eventToAdd.sameAs = sameAs ? this._formatSameAs(sameAs) : [];
    if(contactPoint){
      eventToAdd.contactPoint = contactPoint?.length ? contactPoint[0] : contactPoint
    }
    if (isSingleDayEvent) {
      delete eventToAdd.endDate;
      delete eventToAdd.endDateTime;
    }
    return eventToAdd;
  }

  private async _fetchEventsFromArtsData(source: string, batchSize: number, offset: number) {
    const limit = batchSize ? batchSize : 300;
    const url = ArtsDataUrls.EVENTS + "&source=" + source + "&limit=" + limit + "&offset=" + offset;
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
          const regexPattern = new RegExp(`^${pattern}$`, "gi");
          if (eventPropertyValues.some(eventPropertyValue => eventPropertyValue.toLowerCase() === pattern
            || regexPattern.test(eventPropertyValue))) {
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
      const eventsFromArtsData = await this._fetchEventsFromArtsData(source, 300, 0);
      const eventMatching = eventsFromArtsData.find(event => event.uri === artsDataUrl);
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
        const addResponse = await SharedService.addEntityToFootlight(calendarId, token, url, eventFormatted);
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
    const formattedEvent = { name, image, startDate, startDateTime, endDate, endDateTime, sameAs, uri };

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
    let patternToConceptIdMappingForTheField = patternToConceptIdMapping
      .find(concept => concept.fieldName === propertyName).mapping;
    const conceptIds = Object.values(patternToConceptIdMappingForTheField).flat();
    const existingConceptIds = this._getAllConceptIds(existingConceptsMap);
    this._loggerService.infoLogs(`Validating identifiers from the mapping file for ${propertyName}`);
    return conceptIds.filter((entityId) => {
      const id = existingConceptIds.some((conceptId) => conceptId.includes(entityId));
      if (!id) {
        this._loggerService.infoLogs(`\tNo match found for the conceptId: ${entityId} from the mapping file in the CMS.`);
      }
      return id;
    });
  }

  private _getAllConceptIds(conceptMapIds: any) {
    return conceptMapIds.map((ids) => ids.id);
  }

  private _formatOffers(offers: any) {

    const aggregateOffer = offers.find(offer => offer.type === OfferConstants.AGGREGATE_OFFER);
    const offerConfiguration = {
      name: aggregateOffer?.name,
      description: aggregateOffer?.description,
      url: aggregateOffer?.url,
      category: OfferCategory.FREE,
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

    if (prices?.length) {
      offerConfiguration.category = OfferCategory.PAYING;
      offerConfiguration.prices = prices;
    }

    return offerConfiguration;
  }

}
import {PersonOrganizationService, PlaceService, SharedService} from '../../service';
import {forwardRef, HttpStatus, Inject, Injectable} from '@nestjs/common';
import {ArtsDataAPIUrl, ArtsDataConstants} from '../../constants';
import {ContactPointDTO, EventDTO, OfferDTO, OfferPrice} from '../../dto';
import {TaxonomyService} from '../taxonomy';
import {
    AggregateOfferType,
    EntityType,
    EventProperty,
    EventPropertyMappedToField,
    EventType,
    HttpMethodsEnum,
    MessageType,
    OfferCategory,
    QueryVersion,
} from '../../enum';
import {Exception, JsonLdParseHelper} from '../../helper';
import {FacebookConstants, FootlightPaths, OfferConstants, SameAsTypes} from '../../constants/footlight-urls';
import * as moment from 'moment-timezone';
import {LoggerService} from '../logger';
import * as fs from 'fs';
import {parse} from '@frogcat/ttl2jsonld';
import {EntityPredicates, EventPredicates} from '../../constants/artsdata-urls/rdf-types.constants';
import {Filters} from '../../model/FilterCondition.model';
import {FilterEntityHelper} from '../../helper/filter-entity.helper';
import {EVENT_CONFIGURATIONS, HEADER} from '../../config';

@Injectable()
export class EventService {
    constructor(
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
    private disciplineConceptMap;
    private dynamicConceptMap;

    private async _syncEvents(calendarId: string, token: string, source: string, footlightBaseUrl: string,
                              batchSize: number, mappingUrl: string, queryVersion?: QueryVersion) {
        const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token);
        calendarId = await this._getCalendarId(calendarId, currentUser);
        const calendar = await this._sharedService.fetchCalendar(footlightBaseUrl, token, calendarId);
        const calendarTimezone = calendar.timezone;
        let offset = 0, hasNext = true, batch = 1, totalCount = 0, errorCount = 0, tries = 0,
            maxTry = 3, importedCount = 0, skippedCount = 0;
        let createdCount = 0;
        let updatedCount = 0;
        let createdIds = [];
        let updatedIds = [];
        let cannotUpdateCount = 0;
        await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, EntityType.EVENT);
        const mappingFile = (await SharedService.fetchJsonFromUrl(mappingUrl))?.data;
        const existingEventTypeConceptIDs = this._validateConceptIds(mappingFile,
            EventProperty.ADDITIONAL_TYPE, this.eventTypeConceptMap);
        const existingAudienceConceptIDs = this._validateConceptIds(mappingFile, EventProperty.AUDIENCE,
            this.audienceConceptMap);
        const existingDisciplineConceptIDs = this._validateConceptIds(mappingFile, EventProperty.DISCIPLINE,
            this.disciplineConceptMap);
        const existingDynamicConceptIDs = this._getAllConceptIds(this.dynamicConceptMap);
        const filters: Filters[] = mappingFile || [];
        const entitiesMap = {};
        for (const filter of filters) {
            entitiesMap[filter.entityType] = (await SharedService.getAllEntitiesFromFootlight(calendarId, footlightBaseUrl,
                token, filter.entityType))?.data?.data;
        }

        do {
            let events = await this._fetchEventsFromArtsData(source, batchSize, offset, queryVersion);
            if (events === null) {
                if (tries !== maxTry) {
                    await this._loggerService.errorLogs(`Unable to fetch Events from Arts Data for Batch ${batch}`);
                    tries++;
                    offset = offset + batchSize;
                    batch = batch + 1;
                    continue;
                }
                if (tries === maxTry) {
                    await this._loggerService.errorLogs(`Reached Maximum tries fetching Events from Arts Data`);
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
                    await this._loggerService.infoLogs(`Batch ${batch} :: (${syncCount}/${fetchedEventCount})`);
                    this.checkExcludedValues(event, mappingFile, EventProperty.ADDITIONAL_TYPE);
                    this.checkExcludedValues(event, mappingFile, EventProperty.AUDIENCE);
                    const eventsWithMultipleLocations = await this._checkForMultipleLocations(event);
                    for (const eventWithLocation of eventsWithMultipleLocations) {
                        const participants = [eventWithLocation.organizer, eventWithLocation.performer, eventWithLocation.sponsor].flat();
                        await this._filterEvent(filters, eventWithLocation.location, participants, entitiesMap);
                        const eventsFormatted = await this.formatEvent(calendarId, token, eventWithLocation, footlightBaseUrl, currentUser.id,
                            mappingFile, calendarTimezone, existingEventTypeConceptIDs, existingAudienceConceptIDs, existingDisciplineConceptIDs,
                            existingDynamicConceptIDs);
                        if (eventsFormatted) {
                            importedCount++;
                        }
                        const response = await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, eventsFormatted, currentUser.id);
                        switch (response.status) {
                            case HttpStatus.CREATED:
                                createdCount++;
                                createdIds.push(response.id);
                                break;
                            case HttpStatus.OK:
                                updatedCount++;
                                updatedIds.push(response.id);
                                break;
                            case HttpStatus.CONFLICT:
                            case HttpStatus.UNAUTHORIZED:
                                cannotUpdateCount++;
                                break;
                            default:
                                errorCount++;
                        }
                        await this._loggerService.infoLogs(`\t(${syncCount}/${fetchedEventCount}) Synchronised event with id: 
            ${JSON.stringify(eventsFormatted?.sameAs)}\n`);
                    }
                } catch (e) {
                    if (e.status == '412') {
                        await this._loggerService.infoLogs('\tSkipping event as it does not satisfy the filter conditions');
                        skippedCount++;
                    } else {
                        errorCount++;
                        await this._loggerService.errorLogs(`Batch ${batch} :: (${syncCount}/${fetchedEventCount}). 
            Error while adding Event ${JSON.stringify(event.url)}` + e);
                    }
                }
            }
            offset = offset + batchSize;
            batch = batch + 1;
        } while (hasNext) ;
        await this._loggerService.infoLogs(`Importing events successfully completed.`);
        await this._loggerService.logStatistics(calendar.slug, calendarId, source, totalCount, errorCount, skippedCount, createdCount, updatedCount, cannotUpdateCount);
        const senderName = currentUser.firstName + ' ' + currentUser.lastName;
        const messageMetaForCreatedNotification = {
            eventCount: createdCount.toString(),
            senderName: senderName,
            eventIds: createdIds,
        }
        const messageMetaForUpdatedNotification = {
            eventCount: updatedCount.toString(),
            senderName: senderName,
            eventIds: updatedIds,
        }
        await this._sendMessageToCms(token, calendarId, messageMetaForCreatedNotification, footlightBaseUrl, MessageType.AGGREGATOR_NEW_EVENTS);
        await this._sendMessageToCms(token, calendarId, messageMetaForUpdatedNotification, footlightBaseUrl, MessageType.AGGREGATOR_UPDATED_EVENTS);
    }

    private async _sendMessageToCms(token: string, calendarId: string, messageMeta: any, footlightBaseUrl: string, messageType: MessageType) {
        const message = {
            messageType: messageType,
            messageMeta: messageMeta
        };
        const headers = {
            "Authorization": `Bearer ${token}`,
            "calendar-id": calendarId,
            'Referer': HEADER.CMS_REFERER_HEADER
        }
        const url = footlightBaseUrl + FootlightPaths.PUBLISH_MESSAGE;
        try {
            await SharedService.postUrl(url, message, headers);
            await this._loggerService.infoLogs(`Message of type ${messageType} sent successfully to CMS.`);
        } catch (error) {
            await this._loggerService.errorLogs('Error while sending message to CMS: ' + error.message);
        }

    }

    private async _checkSubEventExists(subEvent: any, token: string, calendarId: string, footlightBaseUrl: string) {
        const {uri} = subEvent;
        const footlightResponse = await this._searchFootlightEntities(token, calendarId, uri, footlightBaseUrl);
        return !!footlightResponse?.length;
    }

    private async _searchFootlightEntities(token: string, calendarId: string, uri: string, footlightBaseUrl: string) {
        uri = encodeURIComponent(uri);
        const url = footlightBaseUrl + FootlightPaths.SEARCH + `?query=${uri}` + '&classes=Event';
        const headers = SharedService.createHeaders(token, calendarId);
        const footlightResponse = await SharedService.fetchUrl(url, headers);
        const {status, data} = footlightResponse;
        if (status !== HttpStatus.OK) {
            return null;
        }
        return data;
    }

    checkExcludedValues(event: any, patternToConceptIdMapping: any, eventProperty: EventProperty) {
        const patternToConceptIdMappingForTheField = patternToConceptIdMapping?.find(concept => concept.fieldName === eventProperty);
        const eventPropertyValuesForTheField = this._getPropertyValues(patternToConceptIdMappingForTheField?.inputProperty, event);
        for (const eventPropertyValueForAdditionalType of eventPropertyValuesForTheField) {
            if (patternToConceptIdMappingForTheField.excludeValues
                ?.some(excludedValue => excludedValue.toLowerCase() === eventPropertyValueForAdditionalType.toLowerCase())) {
                Exception.preconditionFailed('Event is excluded as it matching exclude condition');
            }
        }
    }

    async syncEntities(token: string, calendarId: string, source: string, footlightBaseUrl: string, batchSize: number,
                       mappingUrl: string, queryVersion: QueryVersion) {
        await this._syncEvents(calendarId, token, source, footlightBaseUrl, batchSize, mappingUrl, queryVersion);
    }

    async formatEvent(calendarId: string, token: string, event: any, footlightBaseUrl: string, currentUserId: string,
                      mappingFile: any, calendarTimezone: string, existingEventTypeConceptIDs?: any,
                      existingAudienceConceptIDs?: any, existingDisciplineConceptIDs?: any, existingDynamicConceptIDs?: any) {
        const {
            location: locations,
            performer,
            organizer,
            sponsor,
            alternateName,
            keywords,
            startDate,
            startDateTime,
            endDate,
            endDateTime,
            sameAs,
            subEvent,
            offers,
            contactPoint,
            type,
        } = event;
        if (subEvent?.length) {
            if (type == EventType.EVENT) {
                const dates = subEvent.map(event => event.startDateTime);
                const customDates = [];
                const timezone = calendarTimezone || EVENT_CONFIGURATIONS.DEFAULT_TIMEZONE;
                dates.forEach(date => {
                    const momentFormatted = moment.tz(date, timezone);
                    const startDate = momentFormatted.format('YYYY-MM-DD');
                    const time = momentFormatted.format('HH:mm');
                    customDates.push({startDate, customTimes: [{startTime: time}]});
                });
                event.recurringEvent = {customDates, frequency: 'CUSTOM'};
                await this._loggerService.infoLogs(event.recurringEvent);
            }
            if (type == EventType.EVENT_SERIES) {
                const subEventConfiguration = subEvent?.length
                    ? await Promise.all(subEvent.map(event => this._formatSubEventToAdd(event, calendarId, token,
                        footlightBaseUrl, currentUserId, mappingFile)))
                    : [await this._formatSubEventToAdd(subEvent, calendarId, token, footlightBaseUrl, currentUserId, mappingFile)];
                if (subEventConfiguration?.length) {
                    event.subEventConfiguration = subEventConfiguration;
                }
            }
        }

        const location = locations?.Place;
        const virtualLocation = locations?.VirtualLocation;
        const virtualLocationName = virtualLocation ? virtualLocation.name : null;
        const virtualLocationDescription = virtualLocation ? virtualLocation.description : null;
        const virtualLocationUrl = virtualLocation ? virtualLocation.url : null;

        const locationId = location ? await this._placeService.getFootlightIdentifier(calendarId, token,
            footlightBaseUrl, location, currentUserId, mappingFile) : undefined;

        const participantFilterErrors = [];

        const performers = await this._personOrganizationService
            .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, performer, currentUserId, mappingFile)
            .catch((err) => {
                if (err.status === 412) participantFilterErrors.push('performers');
                return undefined;
            });

        const organizers = await this._personOrganizationService
            .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, organizer, currentUserId, mappingFile)
            .catch((err) => {
                if (err.status === 412) participantFilterErrors.push('organizers');
                return undefined;
            });

        const collaborators = await this._personOrganizationService
            .fetchPersonOrganizationFromFootlight(calendarId, token, footlightBaseUrl, sponsor, currentUserId, mappingFile)
            .catch((err) => {
                if (err.status === 412) participantFilterErrors.push('collaborators');
                return undefined;
            });

        if (participantFilterErrors.length === 3) {
            Exception.preconditionFailed(`Event ${event.uri} does not satisfy the filter conditions`);
        }

        delete event?.image?.uri;
        if (event.image?.url) {
            if (Array.isArray(event.image.url)) {
                event.image.url = event.image.url[0];
            }
            event.image = [{url: event.image.url, isMain: true}];
        } else {
            delete event.image
        }
        const isSingleDayEvent = this._findIfSingleDayEvent(startDate, startDateTime, endDate, endDateTime);

        if (Array.isArray(event.url)) {
            event.url = event.url[0];
        }

        const eventToAdd = {...event};
        delete eventToAdd.location;
        eventToAdd.locationId = locationId ? {place: {entityId: locationId}} : locationId;
        if (virtualLocation) {
            eventToAdd.locationId.virtualLocation = {
                name: virtualLocationName,
                description: virtualLocationDescription,
                url: {
                    uri: virtualLocationUrl,
                },
            };
        }

        eventToAdd.performers = performers;
        eventToAdd.organizers = organizers;
        eventToAdd.collaborators = collaborators;
        eventToAdd.keywords = this._formattedValues(keywords);
        eventToAdd.alternateName = alternateName?.length ? SharedService.formatAlternateNames(alternateName) : [];
        eventToAdd.additionalType = await this._findMatchingConcepts(event, EventProperty.ADDITIONAL_TYPE,
            mappingFile, existingEventTypeConceptIDs);
        eventToAdd.audience = await this._findMatchingConcepts(event, EventProperty.AUDIENCE,
            mappingFile, existingAudienceConceptIDs);
        eventToAdd.discipline = await this._findMatchingConcepts(event, EventProperty.DISCIPLINE,
            mappingFile, existingDisciplineConceptIDs);
        eventToAdd.dynamicFields = await this._findMatchingDynamicConcepts(event,
            mappingFile, existingDynamicConceptIDs);
        eventToAdd.offerConfiguration = offers ? this._formatOffers(offers) : undefined;
        eventToAdd.sameAs = sameAs ? this._formatSameAs(sameAs) : [];
        if (contactPoint) {
            eventToAdd.contactPoint = contactPoint?.length ? contactPoint[0] : contactPoint;
        }
        if (isSingleDayEvent) {
            delete eventToAdd.endDate;
            delete eventToAdd.endDateTime;
        }

        if (startDateTime) {
            eventToAdd.startDateTime = this.convertDateToISO(startDateTime, calendarTimezone);
        }
        if (endDateTime) {
            eventToAdd.endDateTime = this.convertDateToISO(endDateTime, calendarTimezone);
        }
        return eventToAdd;
    }

    private async _filterEvent(filters: Filters[], locations: any, participants: any[], entitiesMap: any) {
        for (const filter of filters) {
            if (filter?.footlightFilters?.length) {
                const entities = entitiesMap[filter.entityType];
                const filteredEntities = entities?.filter(entity => FilterEntityHelper.validateEntity(entity, filter.footlightFilters));
                if (!filteredEntities.length) {
                    Exception.preconditionFailed(`Event does not satisfy the filter conditions`);
                }
                if (filter.entityType == EntityType.PLACE) {
                    const entity = filteredEntities?.find(entity => entity.sameAs.some(sameAs => sameAs.uri === locations?.Place?.uri));
                    if (!entity) {
                        Exception.preconditionFailed(`Event does not satisfy the filter conditions`);
                    }
                } else if (filter?.entityType === EntityType.PERSON || filter?.entityType === EntityType.ORGANIZATION) {
                    const hasMatchingEntity = participants.some(participant =>
                        filteredEntities?.some(entity =>
                            entity?.sameAs?.some(sameAsEntity => participant?.includes(sameAsEntity?.uri)),
                        ),
                    );

                    if (!hasMatchingEntity) {
                        Exception.preconditionFailed(`Event does not satisfy the filter conditions`);
                    }
                }
            }
        }
    }

    private async _fetchEventsFromArtsData(source: string, batchSize: number, offset: number, queryVersion?: QueryVersion) {
        const limit = batchSize ? batchSize : 300;
        let url, artsDataUrl;
        if (queryVersion == QueryVersion.V4) {
            artsDataUrl = ArtsDataAPIUrl.EVENTS_V4;
        } else {
            artsDataUrl = ArtsDataAPIUrl.EVENTS_V3;
        }
        url = artsDataUrl + '&source=' + source + '&limit=' + limit + '&offset=' + offset;

        this._loggerService.infoLogs(`Fetching Events From ArtsData.\n\tSource: ${source}\n\tUrl: ${url}.\n`);
        const artsDataResponse = await SharedService.fetchUrl(url);
        if (artsDataResponse?.status !== HttpStatus.OK) {
            return null;
        }
        return artsDataResponse.data.data?.filter(event => event.uri.startsWith(ArtsDataConstants.RESOURCE_URI_PREFIX));
    }

    private async _fetchEventSeriesFromArtsData(source: string, batchSize: number, offset: number) {
        const limit = batchSize ? batchSize : 300;
        const url = ArtsDataAPIUrl.EVENTS_V4 + '&source=' + source + '&limit=' + limit + '&offset=' + offset;
        await this._loggerService.infoLogs(`Fetching Events From ArtsData.\n\tSource: ${source}\n\tUrl: ${url}.\n`);
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
        const {status, data} = footlightResponse;
        if (status !== HttpStatus.OK) {
            Exception.badRequest('Some thing wrong');
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

    private _mapTaxonomyConcepts(taxonomies) {
        const mapConcepts = (field) => {
            const taxonomy = taxonomies.find(taxonomy => taxonomy.mappedToField === field);
            return taxonomy?.concept?.map(concept => ({id: concept.id, name: concept.name})) || [];
        };

        const mapDynamicConcepts = () =>
            taxonomies
                .filter(t => t.isDynamicField)
                .flatMap(t => t.concept?.map(c => ({id: c.id, name: c.name})) || []);

        this.eventTypeConceptMap = mapConcepts(EventPropertyMappedToField.ADDITIONAL_TYPE);
        this.audienceConceptMap = mapConcepts(EventPropertyMappedToField.AUDIENCE);
        this.disciplineConceptMap = mapConcepts(EventPropertyMappedToField.DISCIPLINE);
        this.dynamicConceptMap = mapDynamicConcepts();
    }

    private _getPropertyValues(lookupPropertyNames: string[], event: any) {
        const eventPropertyValues = lookupPropertyNames?.length
            ? lookupPropertyNames.map(property => event[property]?.length ? event[property] : []).flat() : [];
        return this._formattedValues(eventPropertyValues, true);
    }

    private async _findMatchingDynamicConcepts(event: any, patternToConceptIdMapping: any, existingConceptIDs: any) {
        const dynamicFields = [];
        if (!patternToConceptIdMapping) {
            return dynamicFields;
        }
        const dynamicPatterns = patternToConceptIdMapping?.filter(pattern => pattern.isDynamic);
        for (const dynamicPattern of dynamicPatterns) {
            const fieldName = dynamicPattern.fieldName;
            const conceptIds = (await this._findMatchingConcepts(event, fieldName, dynamicPatterns, existingConceptIDs))
                .map(concept => concept.entityId);
            if (conceptIds?.length) {
                dynamicFields.push({
                    taxonomyId: fieldName,
                    conceptIds: conceptIds,
                });
            }
        }
        return dynamicFields;
    }

    private async _findMatchingConcepts(event: any, fieldName: string, patternToConceptIdMapping: any,
                                        existingConceptIDs: any) {
        if (!patternToConceptIdMapping) {
            return [];
        }
        const patternToConceptIdMappingForTheField = patternToConceptIdMapping.find(concept => concept.fieldName === fieldName);
        let entityId = [];
        let defaultEntityId: string;
        const defaultEntityKey = 'DEFAULT';
        if (patternToConceptIdMappingForTheField) {
            const eventPropertyValues = this._getPropertyValues(patternToConceptIdMappingForTheField.inputProperty, event);
            if (eventPropertyValues?.length) {
                for (const pattern in patternToConceptIdMappingForTheField.mapping) {
                    let regexPattern: RegExp;
                    try {
                        regexPattern = new RegExp(`^${pattern}$`, 'gi');
                    } catch (e) {
                        await this._loggerService.infoLogs(`Invalid Regex: ${e}`);
                    }

                    if (eventPropertyValues.some(eventPropertyValue => eventPropertyValue.toLowerCase() === pattern
                        || (regexPattern && regexPattern.test(eventPropertyValue)))
                    ) {
                        const mappedUUIDs: string[] = patternToConceptIdMappingForTheField?.mapping[pattern];
                        const conceptIdToAdd = mappedUUIDs.filter(id => existingConceptIDs.includes(id));
                        if (conceptIdToAdd?.length) {
                            entityId.push(...conceptIdToAdd);
                        }
                    }
                }
            }
        }
        if (!entityId.length) {
            defaultEntityId = patternToConceptIdMappingForTheField?.mapping[defaultEntityKey]
                ? patternToConceptIdMappingForTheField.mapping[defaultEntityKey] : [];
            entityId.push(...defaultEntityId);
        }
        const uniqueIds = Array.from(new Set(entityId));
        return uniqueIds.map(id => {
            return {entityId: id};
        });
    }

    async syncEventById(token: any, calendarId: string, eventId: string, source: string, footlightBaseUrl: string,
                        mappingUrl: string) {
        const calendar = await this._sharedService.fetchCalendar(footlightBaseUrl, token, calendarId);
        const calendarTimezone = calendar.timezone;
        await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, EntityType.EVENT);
        const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token);
        const existingEvent = await this._fetchEventFromFootlight(token, calendarId, eventId, footlightBaseUrl);
        const mappingFile = (await SharedService.fetchJsonFromUrl(mappingUrl))?.data;
        const existingEventTypeConceptIDs = this._validateConceptIds(mappingFile,
            EventProperty.ADDITIONAL_TYPE, this.eventTypeConceptMap);
        const existingAudienceConceptIDs = this._validateConceptIds(mappingFile,
            EventProperty.AUDIENCE, this.audienceConceptMap);
        if (!existingEvent.modifiedByUserId || existingEvent.modifiedByUserId === currentUser.id) {
            const sameAs = existingEvent.sameAs;
            const artsDataUrl = sameAs.find(sameAs => sameAs?.uri?.includes(ArtsDataConstants.RESOURCE_URI_PREFIX))?.uri;
            if (!artsDataUrl) {
                Exception.badRequest('The event is not linked to Artsdata.');
            }
            const limit = 10;
            let offset = 0;
            let eventMatching = {};
            while (true) {
                const eventsFromArtsData = await this._fetchEventsFromArtsData(source, limit, offset);
                if (!eventsFromArtsData) {
                    Exception.badRequest('The event is not found in Artsdata');
                }
                eventMatching = eventsFromArtsData.find(event => event.uri === artsDataUrl);
                offset += 10;
                if (eventMatching) {
                    console.log('Event found');
                    break;
                }
            }

            if (!Object.keys(eventMatching).length) {
                Exception.badRequest('The event is not found in Artsdata');
            }

            const eventFormatted = await this.formatEvent(calendarId, token, eventMatching, footlightBaseUrl, currentUser.id,
                mappingFile, calendarTimezone, existingEventTypeConceptIDs, existingAudienceConceptIDs);
            return await SharedService.patchEventInFootlight(calendarId, token, footlightBaseUrl, eventId, eventFormatted);
        } else {
            await this._loggerService.infoLogs('Entity cannot be modified. Since this entity is updated latest by a different user.');
        }
    }

    private async _fetchTaxonomies(calendarId: string, token: string, footlightBaseUrl: string, className: string) {
        await this._loggerService.infoLogs('Fetching taxonomies');
        this.taxonomies = await this._taxonomyService.getTaxonomy(calendarId, token, footlightBaseUrl, className);
        if (this.taxonomies) {
            this._mapTaxonomyConcepts(this.taxonomies);
        }
    }

    private _findIfSingleDayEvent(startDate: any, startDateTime: any, endDate: any, endDateTime: any) {
        const eventStartDate = startDateTime ? startDateTime?.trim().split('T')[0] : startDate?.trim();
        const eventEndDate = endDateTime ? endDateTime?.trim()?.split('T')[0] : endDate?.trim();
        return eventEndDate === eventStartDate;
    }

    async reloadEventImages(token: any, calendarId: string, source: string, footlightBaseUrl: string) {
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
                const {status, response} = addResponse;
                if (status === HttpStatus.CREATED) {
                    await this._loggerService.infoLogs(`Added Entity (${response.id} : ${eventFormatted.uri}) to Footlight!`);
                    return response.id;
                } else if (status === HttpStatus.CONFLICT) {
                    const existingEntityId = await response.error;
                    const url = footlightBaseUrl + /events/ + existingEntityId + '/reload-image';
                    await SharedService.callFootlightAPI(HttpMethodsEnum.PATCH, calendarId, token, url,
                        {imageUrl: event.image?.url?.uri});
                }
                await this._loggerService.infoLogs(`(${syncCount}/${fetchedEventCount}) Synchronised event with id: 
        ${JSON.stringify(eventFormatted.sameAs)}`);
            } catch (e) {
                await this._loggerService.errorLogs(`(${syncCount}/${fetchedEventCount}) Error while adding Event ${event.url}` + e);
            }
        }
        await this._loggerService.infoLogs('Successfully synchronised Events and linked entities.');
    }

    private _formatSameAs(elements: { uri: string }[]) {
        return elements.map(element => {
            if (element.uri.startsWith(FacebookConstants.HTTPS) || element.uri.startsWith(FacebookConstants.HTTP)) {
                return {
                    uri: element.uri,
                    type: SameAsTypes.FACEBOOK_LINK,
                };
            }
            return element;
        });
    }

    private async _formatEventForImageReload(event: any) {
        delete event?.image?.uri;
        const {uri, name, startDate, startDateTime, endDate, endDateTime, image, sameAs} = event;
        const formattedEvent = {
            name, image, startDate, startDateTime, endDate, endDateTime,
            sameAs, uri,
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
            if (value.startsWith('[')) {
                formattedValues.push(...JSON.parse(value));
            } else {
                formattedValues.push(value);
            }
        });
        return formattedValues;
    }

    private _validateConceptIds(patternToConceptIdMapping: any, propertyName: string, existingConceptsMap: string[]) {
        let patternToConceptIdMappingForTheField = patternToConceptIdMapping
            ?.find(concept => concept.fieldName === propertyName)?.mapping;
        const conceptIds = patternToConceptIdMappingForTheField ?
            Object.values(patternToConceptIdMappingForTheField).flat() : undefined;
        const existingConceptIds = this._getAllConceptIds(existingConceptsMap);
        this._loggerService.infoLogs(`Validating identifiers from the mapping file for ${propertyName}`);
        return conceptIds?.filter((entityId) => {
            const id = existingConceptIds?.some((conceptId) => conceptId === entityId);
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
        const priceUrl = [];

        const aggregateOffer = offers.find(offer => offer.type === OfferConstants.AGGREGATE_OFFER);
        if (typeof aggregateOffer?.name?.fr == 'object') {
            aggregateOffer.name.fr = aggregateOffer.name.fr[0];
        }
        const offerConfiguration = {
            name: aggregateOffer?.name,
            description: aggregateOffer?.description,
            url: aggregateOffer?.url,
            category: undefined,
            priceCurrency: OfferConstants.CURRENCY_CAD,
            prices: undefined,
        };
        const offersWithPrice = offers.filter(offer => offer.type === OfferConstants.OFFER);
        const prices = [];
        offersWithPrice?.forEach(offer => {
            const priceValue = offer.price?.['@value'] || offer.price;
            if (priceValue) {
                prices.push({
                    name: offer.name,
                    price: offer.price ? parseInt(priceValue) : undefined,
                    url: offer.url ? {uri: offer.url} : undefined,
                });
            }
            if (offer.url) {
                priceUrl.push(offer.url);
            }
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
                return prices.some(price => price.price > 0 || price.url?.uri);
            };

            const allPricesAreZero = () => {
                return prices.every(price => price.price === 0);
            };

            //if price does not exist, set it as paid, only set the offer as free if price exists and all prices are 0.

            if (!priceExists()) {
                offerConfiguration.category = OfferCategory.PAYING;
            } else if (priceExists() && allPricesAreZero()) {
                offerConfiguration.category = OfferCategory.FREE;
            } else if (priceExists() && !allPricesAreZero()) {
                offerConfiguration.category = OfferCategory.PAYING;
                offerConfiguration.prices = prices;
            }
        }

        if (!offerConfiguration.url && priceUrl.length) {
            offerConfiguration.url = priceUrl.find(price => price);
        }

        return offerConfiguration;
    }

    async syncEntitiesUsingRdf(token: string, rdfFilePath: string, mappingFileUrl: string, footlightBaseUrl: string,
                               calendarId: string, source?: string) {
        const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl, token);
        calendarId = await this._getCalendarId(calendarId, currentUser);
        const currentUserId = currentUser.id;
        let rdfData = fs.readFileSync(rdfFilePath, 'utf8');

        const jsonldData = parse(rdfData);
        await this.exportJsonLdData(jsonldData, token, calendarId, footlightBaseUrl, currentUserId, mappingFileUrl, source);
    }

    async exportJsonLdData(jsonLd: any, token: string, calendarId: string, footlightBaseUrl: string,
                           currentUserId: string, mappingFiles: any, source?: string) {
        const calendar = await this._sharedService.fetchCalendar(footlightBaseUrl, token, calendarId);
        calendarId = calendar.id;
        const data = jsonLd['@graph'];
        const context = jsonLd['@context'];
        let jsonLdPlaces = data.filter(item => item['@type'] === EntityPredicates.PLACE);
        let jsonLdPostalAddresses = data.filter(item => item['@type'] === EntityPredicates.POSTAL_ADDRESS);
        let jsonLdOrganizations = data.filter(item => item['@type'] === EntityPredicates.ORGANIZATION);
        let jsonLdPeople = data.filter(item => item['@type'] === EntityPredicates.PERSON);
        let jsonLdOffers = data.filter(item => item['@type'] === EntityPredicates.AGGREGATE_OFFER);
        let jsonLdContactPoints = data.filter(item => item['@type'] === EntityPredicates.CONTACT_POINT);
        await this._fetchTaxonomies(calendarId, token, footlightBaseUrl, EntityType.EVENT);
        const totalCount = data?.length;
        let currentCount = 0;
        let errorCount = 0;
        for (const node of data) {
            try {
                if (node['@type'] == EntityPredicates.EVENT) {
                    await this.formatAndPushJsonLdEvents(node, jsonLdPlaces, token, calendarId, footlightBaseUrl,
                        currentUserId, jsonLdPostalAddresses, jsonLdOrganizations, jsonLdPeople, jsonLdOffers,
                        jsonLdContactPoints, mappingFiles, context);
                }
                await this._loggerService.infoLogs(`Importing ${currentCount++} out of (${totalCount}) events`);
            } catch (e) {
                await this._loggerService.errorLogs(`Error while importing  event with id ${node['@id']}`);
                errorCount++;
            }
        }
        await this._loggerService.infoLogs(`Importing events successfully completed.`);
        await this._loggerService.logStatistics(calendarId, calendar.slug, source, totalCount, errorCount);
    }


    async formatAndPushJsonLdEvents(event: any, places: Object[], token: string, calendarId: string,
                                    footlightBaseUrl: string, currentUserId: string, jsonLdPostalAddresses: any,
                                    jsonLdOrganizations: any, jsonLdPeople: any, jsonLdOffers: any, jsonLdContactPoints,
                                    mappingFiles: any, context: any) {
        const formattedEvent = new EventDTO();

        const [name, description, eventStatus, attendanceMode, startDate, endDate, additionalType, videoUrl, location,
            offer, organizer, performer, collaborator, image, contactPoint] = [
            event[EventPredicates.NAME], event[EventPredicates.DESCRIPTION], event[EventPredicates.EVENT_STATUS],
            event[EventPredicates.EVENT_ATTENDANCE_MODE], event[EventPredicates.START_DATE], event[EventPredicates.END_DATE],
            event[EventPredicates.ADDITIONAL_TYPE], event[EventPredicates.VIDEO_URL], event[EventPredicates.LOCATION],
            event[EventPredicates.EVENT_OFFER], event[EventPredicates.ORGANIZER], event[EventPredicates.PERFORMER],
            event[EventPredicates.COLLABORATOR],
            event[EventPredicates.IMAGE], event[EventPredicates.EVENT_CONTACT_POINT],
        ];

        const calendarTimezone = (await this._sharedService.fetchCalendar(footlightBaseUrl, token, calendarId))?.timezone;
        const timezone = calendarTimezone || EVENT_CONFIGURATIONS.DEFAULT_TIMEZONE;

        const patternToConceptIdMapping = (await SharedService.fetchJsonFromUrl(mappingFiles))?.data;
        const existingEventTypeConceptIDs = this._validateConceptIds(patternToConceptIdMapping,
            EventProperty.ADDITIONAL_TYPE, this.eventTypeConceptMap);
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
            formattedEvent.eventAttendanceMode = attendanceMode['@id'].replace('schema:', '');
        }
        if (startDate) {
            formattedEvent.startDateTime = this.convertDateToISO(startDate['@value'], timezone)
                || this.convertDateToISO(startDate[0]['@value'], timezone);
        }
        if (endDate) {
            formattedEvent.endDateTime = this.convertDateToISO(endDate['@value'], timezone)
                || this.convertDateToISO(endDate[0]['@value'], timezone);
        }
        if (image) {
            formattedEvent.image = [{url: {uri: image}, isMain: true}];
        }
        if (additionalType) {
            formattedEvent.additionalType = this._getConceptIdByNameForRdf(additionalType, patternToConceptIdMapping,
                existingEventTypeConceptIDs, EventProperty.ADDITIONAL_TYPE);
        }
        if (videoUrl) {
            formattedEvent.videoUrl = videoUrl['@id'];
        }
        if (contactPoint) {
            formattedEvent.contactPoint = this._formatJsonLdContactPoint(contactPoint, jsonLdContactPoints);
        }
        if (location) {
            let placeDetails = places.find(place => place['@id'] === location['@id']);
            let placeEntityId = await this._placeService.formatAndPushJsonLdPlaces(placeDetails, token, calendarId,
                footlightBaseUrl, currentUserId, jsonLdPostalAddresses, context);
            formattedEvent.locationId = {place: {entityId: placeEntityId}};
        }
        if (offer) {
            formattedEvent.offerConfiguration = this._formatJsonLdOffers(offer, jsonLdOffers);
        }

        if (organizer || performer || collaborator) {
            if (organizer) {
                let {
                    participantId,
                    participantType,
                } = await this._personOrganizationService.formatAndPushPersonOrganization(token, calendarId, footlightBaseUrl,
                    currentUserId, jsonLdOrganizations, jsonLdPeople, event, EventPredicates.ORGANIZER, context);
                formattedEvent.organizers = [{entityId: participantId, type: participantType}];
            }

            if (performer) {
                let {
                    participantId,
                    participantType,
                } = await this._personOrganizationService.formatAndPushPersonOrganization(token, calendarId, footlightBaseUrl,
                    currentUserId, jsonLdOrganizations, jsonLdPeople, event, EventPredicates.PERFORMER, context);
                formattedEvent.performers = [{entityId: participantId, type: participantType}];
            }

            if (collaborator) {
                let {
                    participantId,
                    participantType,
                } = await this._personOrganizationService.formatAndPushPersonOrganization(token, calendarId, footlightBaseUrl,
                    currentUserId, jsonLdOrganizations, jsonLdPeople, event, EventPredicates.COLLABORATOR, context);
                formattedEvent.collaborators = [{entityId: participantId, type: participantType}];
            }
        }
        const uri = JsonLdParseHelper.formatEntityUri(context, event['@id']);
        formattedEvent.sameAs = [{uri: uri, type: 'ExternalSourceIdentifier'}];
        formattedEvent.uri = uri;
        await this._pushEventsToFootlight(calendarId, token, footlightBaseUrl, formattedEvent, currentUserId);
    }

    private _formatJsonLdContactPoint(contactPoint: any, jsonLdContactPoints: any) {
        let contactPointData = jsonLdContactPoints
            .find(jsonLdContactPoint => jsonLdContactPoint['@id'] === contactPoint['@id']);
        if (contactPointData) {
            const formattedContactPoint: ContactPointDTO = {
                url: {uri: contactPointData[EventPredicates.URL]['@id']},
                email: contactPoint[EventPredicates.EMAIL],
                telephone: contactPoint[EventPredicates.TELEPHONE],
            };
            return formattedContactPoint;
        }
    }

    private _formatJsonLdOffers(offer: any, jsonLdOffers: any) {
        let offerData = jsonLdOffers.find(jsonLdOffer => jsonLdOffer['@id'] === offer['@id'])
            || jsonLdOffers.find(jsonLdOffer => jsonLdOffer['@id'] === offer[0]['@id']);
        let offerPrice: OfferPrice = {
            name: JsonLdParseHelper.formatMultilingualField(offerData[EventPredicates.NAME]),
            price: offerData[EventPredicates.PRICE] ? Number.parseFloat(offerData[EventPredicates.PRICE]) : undefined,
        };
        let uri = offerData[EventPredicates.URL];
        if (Array.isArray(uri)) {
            uri = uri[0];
        }
        let offerConfiguration: OfferDTO = {
            url: {uri: uri},
            prices: [offerPrice],
            category: uri ? OfferCategory.PAYING : OfferCategory.FREE,
        };
        return offerConfiguration;
    }

    private _getConceptIdByNameForRdf(
        conceptNames: string[],
        patternToConceptIdMapping: any,
        existingEventTypeConceptIDs: unknown[],
        eventPropertyValue: EventProperty,
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
            return Array.from(uniqueConceptIdsList).map((conceptId) => ({entityId: conceptId}));
        } else {
            return [];
        }
    }

    private convertDateToISO(date: string, timezone: string) {
        return moment.tz(date, 'YYYY-MM-DD HH:mm ', timezone).toISOString();
    }

    private async _formatSubEventToAdd(event: any, calendarId: string, token: string, footlightBaseUrl: string,
                                       currentUserId: string, mappingFile: any) {
        const subEventToReturn = {
            startDate: event.startDate ? event.startDate : event.startDateTime?.split('T')[0],
            startTime: event.startDateTime?.split('T')[1]?.slice(0, 5),
            endDate: event.endDate ? event.endDate : event.endDateTime?.split('T')[0],
            endTime: event.endDateTime?.split('T')[1]?.slice(0, 5),
            name: event.name,
            description: event.description,
            sameAs: {uri: event.uri, type: 'ArtsdataIdentifier'},
        };
        if (event.location) {
            const locationId = await this._placeService.getFootlightIdentifier(calendarId, token, footlightBaseUrl,
                event.location['@none'] || event.location['Place'], currentUserId, mappingFile);
            subEventToReturn['locationId'] = locationId ? {place: {entityId: locationId}} : locationId;
        }

        return subEventToReturn;
    }

    private _checkForMultipleLocations(event: any) {
        const {type} = event;
        let locations = [];
        let events = [];
        if (type == EventType.EVENT_SERIES) {
            const subEvents = event.subEvent;

            subEvents?.forEach(subEvent => {
                if (subEvent.location) {
                    locations.push(subEvent.location['@none'] || subEvent.location['Place']);
                }
            });
            locations = Array.from(new Set(locations));
            if (events.length) {
                locations?.forEach(location => {
                    let eventToAdd = {...event};
                    eventToAdd.derivedFrom = {uri: eventToAdd.uri + '#location:' + location.split('/').pop()};
                    delete eventToAdd.uri;
                    eventToAdd.sameAs = eventToAdd.sameAs
                        ?.filter(item => !item.uri.startsWith('http://kg.artsdata.ca/resource/K'));
                    eventToAdd.subEvent = subEvents
                        .filter(subEvent => subEvent.location['@none'] == location || subEvent.location['Place'] == location);
                    eventToAdd.location = {'Place': location};
                    events.push(eventToAdd);
                });
                return events;
            }
        }
        return [event];
    }

    private async _getCalendarId(calendarId: string, currentUser: any) {
        //Calendar id could be a slug or id.
        const filteredRole = currentUser.roles
            ?.find(role => role.calendarId === calendarId || role.calendarSlug === calendarId);
        if (!filteredRole) {
            await this._loggerService.errorLogs(`User ${currentUser.email} has no access to this calendar:: ${calendarId} 
      or the calendar does not exist.`);
            Exception.unauthorized(`User ${currentUser.email} has no access to this calendar:: ${calendarId} 
      or the calendar does not exist.`);
        }
        return filteredRole.calendarId;
    }
}
import { SharedService } from "../shared";
import { ArtsDataConstants, ArtsDataUrls } from "../../constants";
import { EntityType, PersonOrganizationType } from "../../enum";
import { OrganizationService, PersonService, PlaceService } from "../../service";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { LoggerService } from "../logger";
import { Filters } from "../../model/FilterCondition.model";
import { FilterEntityHelper } from "../../helper/filter-entity.helper";
import { Exception } from "../../helper";
import { PersonOrganizationWithRole } from "../../model/personOrganizationWithRole.model";


@Injectable()
export class PersonOrganizationService {
  private synchronisedPersonOrganizationMap = new Map();

  constructor(
    @Inject(forwardRef(() => PersonService))
    private readonly _personService: PersonService,
    @Inject(forwardRef(() => OrganizationService))
    private readonly _organizationService: OrganizationService,
    @Inject(forwardRef(() => PlaceService))
    private readonly _placeService: PlaceService,
    @Inject(forwardRef(() => LoggerService))
    private readonly _loggerService: LoggerService
  ) {
  }

  async fetchPersonOrganizationFromFootlight(calendarId: string, token: string, footlightUrl: string,
                                             entityUris: string[], currentUserId: string, filters?: Filters[]) : Promise<PersonOrganizationWithRole[]> {
    const personOrganizations = [];
    for (const uri of entityUris) {
      const id = uri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, "");
      const entityFetched = await this.getPersonOrganizationDetailsFromArtsdata(id, filters);
      const synchronisedPersonOrOrganization = this.synchronisedPersonOrganizationMap.get(id);
      if (synchronisedPersonOrOrganization) {
        this._loggerService.infoLogs(`\tThe Person/Organization with Artsdata id :${id} is already synced during this process.`);
        personOrganizations.push(synchronisedPersonOrOrganization);
        continue;
      }
      if (entityFetched) {
        const { alternateName, contactPoint } = entityFetched;

        const { type } = entityFetched;
        const filterConditionsForFootlightPeopleOrganizations = filters?.find(filter => filter?.entityType === type)?.footlightFilters;
        let entityId: string;
        if (type === PersonOrganizationType.PERSON) {
          entityId = await this._personService.getFootlightIdentifier(calendarId, token, footlightUrl,
            entityFetched, currentUserId, filterConditionsForFootlightPeopleOrganizations);
        } else if (type === PersonOrganizationType.ORGANIZATION) {
          const place = entityFetched.place;
          if (entityFetched.place) {
            const placeId = await this._placeService.getFootlightIdentifier(calendarId, token,
              footlightUrl, place, currentUserId);
            entityFetched.place = { entityId: placeId };
          }
          if (entityFetched.logo) {
            const logoUrl = entityFetched.logo.url;
            if (logoUrl instanceof Array) {
              entityFetched.logo.url = logoUrl?.[0];
            }
          }
          if (contactPoint) {
            entityFetched.contactPoint = contactPoint?.length ? contactPoint[0] : contactPoint;
          }
          entityId = await this._organizationService.getFootlightIdentifier(calendarId, token, footlightUrl,
            entityFetched, currentUserId, filterConditionsForFootlightPeopleOrganizations);
        }
        entityFetched.alternateName = alternateName?.length
        ? SharedService.formatAlternateNames(alternateName) : undefined;
        const personOrOrganization = { entityId, type };
        this.synchronisedPersonOrganizationMap.set(id, personOrOrganization);
        personOrganizations.push(personOrOrganization);
      } else {
        this._loggerService.infoLogs(`Could not fetch data for id: ${id}`);
      }
    }
    return personOrganizations;
  }

  async formatAndPushPersonOrganization(token, calendarId, footlightBaseUrl, currentUserId, jsonLdOrganizations,
                                        jsonLdPeople, event, organizationType, context) {
    let participantId, participantType;
    let participantInOrganizations = jsonLdOrganizations
      .find(organization => organization["@id"] === event[organizationType]["@id"]);
    let participantInPeople = jsonLdPeople.find(person => person["@id"] === event[organizationType]["@id"]);
    if (participantInOrganizations) {
      participantId = await this._organizationService.formatAndPushJsonLdOrganization(participantInOrganizations,
        token, calendarId, footlightBaseUrl, currentUserId, context);
      participantType = PersonOrganizationType.ORGANIZATION;
    }
    if (participantInPeople) {
      participantId = await this._personService.formatAndPushJsonLdPerson(participantInPeople, token, calendarId,
        footlightBaseUrl, currentUserId, context);
      participantType = PersonOrganizationType.PERSON;
    }
    return { participantId, participantType };
  }

  async getPersonOrganizationDetailsFromArtsdata(artsDataId: string, filters?: Filters[]){
    const personOrganizationFetched = await SharedService.fetchFromArtsDataById(artsDataId, ArtsDataUrls.PERSON_ORGANIZATION_BY_ID);
    if (!personOrganizationFetched) {
      return undefined;
    }

    const type = personOrganizationFetched.type;
    const personOrganizationCondition = filters
    ?.find(filter => filter?.entityType === type);
    const validatePersonOrganization = personOrganizationCondition?
    FilterEntityHelper.validateEntity(personOrganizationFetched, personOrganizationCondition.artsdataFilters) : true;
    if (!validatePersonOrganization) {
      Exception.preconditionFailed(`Person/Organization with id ${artsDataId} does not meet the filter conditions`);
    }
    return personOrganizationFetched
  }
}
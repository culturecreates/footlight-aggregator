import { SharedService } from "../shared";
import { ArtsDataConstants, ArtsDataUrls } from "../../constants";
import { PersonOrganizationType } from "../../enum";
import { OrganizationService, PersonService, PlaceService } from "../../service";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { LoggerService } from "../logger";
import { EventPredicates } from "../../constants/artsdata-urls/rdf-types.constants";


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
                                             entityUris: string[], currentUserId: string) {
    const personOrganizations = [];
    for (const uri of entityUris) {
      const id = uri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, "");
      const entityFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PERSON_ORGANIZATION_BY_ID);
      const synchronisedPersonOrOrganization = this.synchronisedPersonOrganizationMap.get(id);
      if (synchronisedPersonOrOrganization) {
        this._loggerService.infoLogs(`\tThe Person/Organization with Artsdata id :${id} is already synced during this process.`);
        personOrganizations.push(synchronisedPersonOrOrganization);
        continue;
      }
      if (entityFetched) {
        const { alternateName, contactPoint } = entityFetched;
        entityFetched.alternateName = alternateName?.length
          ? SharedService.formatAlternateNames(alternateName) : undefined;

        entityFetched.type = entityFetched.type.includes(PersonOrganizationType.PERSON) ? PersonOrganizationType.PERSON
          : entityFetched.type.includes(PersonOrganizationType.ORGANIZATION) ? PersonOrganizationType.ORGANIZATION
            : entityFetched.type;

        const { type } = entityFetched;
        let entityId: string;
        if (type === PersonOrganizationType.PERSON) {
          entityId = await this._personService.getFootlightIdentifier(calendarId, token, footlightUrl,
            entityFetched, currentUserId);
        } else if (type === PersonOrganizationType.ORGANIZATION) {
          const place = entityFetched.place;
          if (entityFetched.place) {
            const placeId: string = await this._placeService.getFootlightIdentifier(calendarId, token,
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
            entityFetched, currentUserId);
        }
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
}
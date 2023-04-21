import { SharedService } from "../shared";
import { ArtsDataConstants, ArtsDataUrls } from "../../constants";
import { PersonOrganizationType } from "../../enum";
import { OrganizationService, PersonService, PlaceService } from "../../service";
import { forwardRef, Inject, Injectable } from "@nestjs/common";

@Injectable()
export class PersonOrganizationService {

  constructor(
    @Inject(forwardRef(() =>PersonService))
    private readonly _personService: PersonService,
    @Inject(forwardRef(() =>OrganizationService))
    private readonly _organizationService: OrganizationService,
    @Inject(forwardRef(() => PlaceService))
    private readonly _placeService: PlaceService) {
  }

  async fetchPersonOrganizationFromFootlight(calendarId: string, token: string, footlightUrl: string,
                                             entityUris: string[], currentUserId: string) {
    const personOrganizations = [];
    for (const uri of entityUris) {
      const id = uri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, "");
      const entityFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PERSON_ORGANIZATION_BY_ID);
      const { alternateName } = entityFetched;
      entityFetched.alternateName = alternateName?.length
        ? SharedService.formatAlternateNames(alternateName) : undefined;

      if (entityFetched) {
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

          entityId = await this._organizationService.getFootlightIdentifier(calendarId, token, footlightUrl,
            entityFetched, currentUserId);
        }
        personOrganizations.push({ entityId, type });
      }
    }
    return personOrganizations;
  }
}
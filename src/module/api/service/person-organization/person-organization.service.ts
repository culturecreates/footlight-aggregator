import {SharedService} from "../shared";
import {ArtsDataConstants, ArtsDataUrls} from "../../constants/artsdata-urls";
import {PersonOrganizationType} from "../../enum/event.enum";
import {PersonService} from "../person/person.service";
import {OrganizationService} from "../organization/organization.service";
import {Injectable} from "@nestjs/common";

@Injectable()
export class PersonOrganizationService {

    constructor(
        private readonly _personService: PersonService,
        private readonly _organizationService: OrganizationService) {
    }

    async fetchPersonOrganizationFromFootlight(calendarId: string, token: string, footlightUrl: string,
                                               entityUris: string[]) {
        const personOrganizations = [];
        for (const uri of entityUris) {
            const id = uri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, '');
            const entityFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.PERSON_ORGANIZATION_BY_ID);
            if (entityFetched) {
                const {type} = entityFetched;
                let entityId: string;
                if (type === PersonOrganizationType.PERSON) {
                    entityId = await this._personService.getFootlightIdentifier(calendarId, token, footlightUrl,
                        entityFetched);
                } else if (type === PersonOrganizationType.ORGANIZATION) {
                    entityId = await this._organizationService.getFootlightIdentifier(calendarId, token, footlightUrl,
                        entityFetched);
                }
                personOrganizations.push({entityId, type});
            }
        }
        return personOrganizations;
    }
}
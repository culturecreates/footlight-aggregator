import {Module} from "@nestjs/common";
import {
    AuthenticationService,
    EventService,
    OrganizationService,
    PersonOrganizationService,
    PersonService,
    PlaceService,
    PostalAddressService
} from "./service";
import {AuthenticationController, EventController} from "./controller";
import {TaxonomyService} from "./service/taxonomy";
import { InvitationService } from "./service/invitation";
import { InvitationController } from "./controller/invitation";

@Module({
    imports: [],
    controllers: [AuthenticationController, EventController,InvitationController],
    providers: [PersonOrganizationService, EventService, PostalAddressService, PersonService, PlaceService,
        OrganizationService, AuthenticationService,TaxonomyService,InvitationService]
})
export class ApiModule {
}
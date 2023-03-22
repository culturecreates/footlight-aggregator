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

@Module({
    imports: [],
    controllers: [AuthenticationController, EventController],
    providers: [PersonOrganizationService, EventService, PostalAddressService, PersonService, PlaceService,
        OrganizationService, AuthenticationService,TaxonomyService]
})
export class ApiModule {
}
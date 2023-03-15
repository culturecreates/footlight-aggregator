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

@Module({
    imports: [],
    controllers: [AuthenticationController, EventController],
    providers: [PersonOrganizationService, EventService, PostalAddressService, PersonService, PlaceService,
        OrganizationService, AuthenticationService]
})
export class ApiModule {
}
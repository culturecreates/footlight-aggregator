import {Module} from "@nestjs/common";
import {EventService} from "./service/event/event.service";
import {OrganizationService} from "./service/organization/organization.service";
import {PlaceService} from "./service/place/place.service";
import {PersonService} from "./service/person/person.service";
import {EventController} from "./controller/event/event.controller";
import {AuthenticationController} from "./controller/authentication";
import {AuthenticationService} from "./service/authentication";

@Module({
    imports: [],
    controllers: [AuthenticationController, EventController],
    providers: [PersonService, PlaceService, OrganizationService, EventService, AuthenticationService],
    exports: []
})
export class ApiModule {
}
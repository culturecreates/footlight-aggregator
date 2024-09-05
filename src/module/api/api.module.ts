import { Module } from "@nestjs/common";
import {
  AuthenticationService,
  EventService,
  OrganizationService,
  PersonOrganizationService,
  PersonService,
  PlaceService,
  PostalAddressService,
  SharedService
} from "./service";
import { AuthenticationController, EventController } from "./controller";
import { TaxonomyService } from "./service/taxonomy";
import { InvitationService } from "./service/invitation";
import { InvitationController } from "./controller/invitation";
import { OrganizationController } from "./controller/organization";
import { PlaceController } from "./controller/place";
import { LoggerService } from "./service";

@Module({
  imports: [],
  controllers: [AuthenticationController, EventController, PlaceController, OrganizationController, InvitationController],
  providers: [PersonOrganizationService, EventService, PostalAddressService, PersonService, PlaceService,
    OrganizationService, AuthenticationService, TaxonomyService, InvitationService, SharedService, LoggerService]
})

export class ApiModule {
}
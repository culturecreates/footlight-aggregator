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

@Module({
  imports: [],
  controllers: [AuthenticationController, EventController, OrganizationController, InvitationController],
  providers: [PersonOrganizationService, EventService, PostalAddressService, PersonService, PlaceService,
    OrganizationService, AuthenticationService, TaxonomyService, InvitationService, SharedService]
})
export class ApiModule {
}
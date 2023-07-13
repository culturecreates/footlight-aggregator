import { Module } from "@nestjs/common";
import { ApiModule } from "./module/api/api.module";
import {
  AuthenticationService,
  EventService,
  OrganizationService,
  PersonOrganizationService,
  PersonService,
  PlaceService,
  PostalAddressService,
  SharedService,
  DataDogLoggerService
} from "./module/api/service";
import { TaxonomyService } from "./module/api/service/taxonomy";
import { ImportEntities } from "./module/api/script/import-entities-to-footlight";

@Module({
  controllers: [],
  imports: [ApiModule],
  providers: [AuthenticationService, EventService, PostalAddressService, PersonService, PlaceService,
    OrganizationService, TaxonomyService, PersonOrganizationService, SharedService, ImportEntities, DataDogLoggerService]
})
export class AppModule {
}

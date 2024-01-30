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
  LoggerService
} from "./module/api/service";
import { TaxonomyService } from "./module/api/service/taxonomy";
import { ImportEntities, ImportRdf, ImportCaligramEntities } from "./module/api/script";

@Module({
  controllers: [],
  imports: [ApiModule],
  providers: [AuthenticationService, EventService, PostalAddressService, PersonService, PlaceService,
    OrganizationService, TaxonomyService, PersonOrganizationService, SharedService, ImportEntities, ImportRdf, ImportCaligramEntities, LoggerService]
})
export class AppModule {
}

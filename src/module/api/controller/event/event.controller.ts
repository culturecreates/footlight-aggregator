import { Controller, Inject, Param, ParseIntPipe, Put, Query, Req, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ApiResponseEnum, ApiStatusCode } from "../../enum";
import { EventService } from "../../service";
import { AuthHeaderExtractor } from "../../helper";
import { Request } from "express";
import { Environment } from "../../enum/environments.enum";
import { Sources } from "../../enum/sources.enum";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";

@Controller("events")
@ApiTags("Event APIs")
@ApiBearerAuth("bearer")

export class EventController {
  constructor(@Inject(EventService)
              private readonly _eventService: EventService) {
  }

  @Put("sync")
  @ApiOperation({ summary: "Sync event from Arts data to footlight." })
  @ApiQuery({
    name: "footlight-base-url",
    description: "Select the environment",
    required: true,
    enum: Object.values(Environment)
  })
  @ApiQuery({
    name: "calendar-id",
    description: "**calendar-id (The calendar identifier)**",
    required: true,
    explode: true
  })
  @ApiQuery({
    name: "mapping-url",
    description: "**URL to fetch data for mapping keywords to event type taxonomy**",
    example: "https://culturecreates.github.io/footlight-aggregator/data/ville-de-gatineau-cms-mapping.json"
  })
  @ApiQuery({
    name: "source",
    description: "**source (Graph)**",
    required: true,
    explode: true,
    example: "http://kg.artsdata.ca/culture-creates/footlight/toutculture-ca"
  })
  async syncEvents(
    @Req() request: Request,
    @Query("footlight-base-url") footlightBaseUrl?: string,
    @Query("calendar-id") calendarId?: string,
    @Query("source") source?: string,
    @Query("batch-size", ParseIntPipe) batchSize?: number,
    @Query("mapping-url") mappingUrl?: string): Promise<ApiResponseEnum> {
    const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
    await this._eventService.syncEntities(token, calendarId, source, footlightBaseUrl, batchSize, mappingUrl);
    return { status: ApiStatusCode.SUCCESS, message: "Syncing Events and related entities completed." };
  }


  @Put(":id/sync")
  @ApiOperation({ summary: "Re-sync an event by id." })
  @ApiQuery({
    name: "footlight-base-url",
    description: "Select the environment",
    required: true,
    enum: Object.values(Environment)
  })
  @ApiQuery({
    name: "calendar-id",
    description: "**calendar-id (The calendar identifier)**",
    required: true,
    explode: true
  })
  @ApiQuery({
    name: "mapping-url",
    description: "**URL to fetch data for mapping keywords to event type taxonomy**",
    example: "https://culturecreates.github.io/footlight-aggregator/data/ville-de-gatineau-cms-mapping.json"
  })
  @ApiQuery({
    name: "source",
    description: "**source (Website graphs used by Tout Culture)**",
    required: true,
    explode: true,
    example: "http://kg.artsdata.ca/culture-creates/footlight/toutculture-ca"
  })
  async syncEventById(
    @Req() request: Request,
    @Param("id") id: string,
    @Query("footlight-base-url") footlightBaseUrl?: string,
    @Query("calendar-id") calendarId?: string,
    @Query("mapping-url") mappingUrl?: string,
    @Query("source") source?: string): Promise<ApiResponseEnum> {
    const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
    await this._eventService.syncEventById(token, calendarId, id, source, footlightBaseUrl, mappingUrl);
    return { status: ApiStatusCode.SUCCESS, message: "Re-syncing event completed.." };
  }

  @Put("reload-images")
  @ApiOperation({ summary: "Re-load images only." })
  @ApiQuery({
    name: "footlight-base-url",
    description: "Select the environment",
    required: true,
    enum: Object.values(Environment)
  })
  @ApiQuery({
    name: "calendar-id",
    description: "**calendar-id (The calendar identifier)**",
    required: true,
    explode: true
  })
  @ApiQuery({
    name: "source",
    description: "**source (Website graphs used by Tout Culture)**",
    required: true,
    explode: true,
    example: "http://kg.artsdata.ca/culture-creates/footlight/toutculture-ca"
  })
  async reloadEventImages(
    @Req() request: Request,
    @Query("footlight-base-url") footlightBaseUrl?: string,
    @Query("calendar-id") calendarId?: string,
    @Query("source") source?: string): Promise<ApiResponseEnum> {
    const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
    await this._eventService.reloadEventImages(token, calendarId, source, footlightBaseUrl);
    return { status: ApiStatusCode.SUCCESS, message: "Re-syncing event completed.." };
  }


  @Put("sync-using-rdf")
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'rdf_file', maxCount: 1 },
    { name: 'mapping_file', maxCount: 1 },
  ]))
  @ApiQuery({
    name: "calendar-id",
    description: "**calendar-id (The calendar identifier)**",
    required: true,
    explode: true
  })  
  @ApiQuery({
    name: "footlight-base-url",
    description: "Select the environment",
    required: true,
    enum: Object.values(Environment)
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        rdf_file: {
          type: "string",
          format: "binary"
        },
        mapping_file: {
          type: "string",
          format: "binary"
        },
      },
    },
    required: true,
  })
  async syncEntitiesUsingRdf(
    @Req() request: Request,
    @UploadedFiles() files: { rdf_file?: Express.Multer.File[], mapping_file?: Express.Multer.File[] },
    @Query("footlight-base-url") footlightBaseUrl?: string,
    @Query("calendar-id") calendarId?: string,
    ) {
    const {rdf_file, mapping_file} = files
    const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
    await this._eventService.syncEntitiesUsingRdf(token, rdf_file, mapping_file, footlightBaseUrl, calendarId)
  }
  
}

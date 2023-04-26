import { Controller, Inject, Put, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { PlaceService } from "../../service";
import { Environment } from "../../enum/environments.enum";
import { Request } from "express";
import { ApiResponseEnum, ApiStatusCode } from "../../enum";
import { AuthHeaderExtractor } from "../../helper";


@ApiTags("Place API")
@ApiBearerAuth("bearer")
@Controller('places/')
export class PlaceController {
  constructor(
    @Inject(PlaceService)
    private readonly _placeService: PlaceService) {
  }

  @Put("sync")
  @ApiOperation({ summary: "Sync places from Arts data to footlight." })
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
    description: "**source (Graph name)**",
    required: true,
    explode: true,
    example: "http://kg.artsdata.ca/culture-creates/footlight/signelaval-com"
  })
  async syncPlaces(
    @Req() request: Request,
    @Query("footlight-base-url") footlightBaseUrl?: string,
    @Query("calendar-id") calendarId?: string,
    @Query("source") source?: string): Promise<ApiResponseEnum> {
    const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
    await this._placeService.syncPlaces(token, calendarId, source, footlightBaseUrl);
    return { status: ApiStatusCode.SUCCESS, message: "Syncing Places completed." };
  }
}

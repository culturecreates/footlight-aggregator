import {Controller, Inject, Param, Put, Query, Req} from "@nestjs/common";
import {ApiBearerAuth, ApiOperation, ApiQuery, ApiTags} from "@nestjs/swagger";
import {ApiResponseEnum, ApiStatusCode} from "../../enum";
import {EventService} from "../../service";
import {AuthHeaderExtractor} from "../../helper";
import {Request} from "express";
import { Environment } from "../../enum/environments.enum";

@Controller('events')
@ApiTags('Event APIs')
@ApiBearerAuth('bearer')

export class EventController {
    constructor(@Inject(EventService)
                private readonly _eventService: EventService) {
    }

    @Put('sync')
    @ApiOperation({summary: 'Sync event from Arts data to footlight.'})
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
        example: 'http://kg.artsdata.ca/culture-creates/footlight/toutculture-ca'
    })
    @ApiQuery({
        name: "footlight-base-url",
        description: "Select the environment",
        required: true,
        enum: Object.values(Environment)
    })
    async syncEvents(
        @Req() request: Request,
        @Query("calendar-id") calendarId?: string,
        @Query("footlight-base-url") footlightBaseUrl?: string,
        @Query("source") source?: string): Promise<ApiResponseEnum> {
        const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
        await this._eventService.syncEntities(token, calendarId, source, footlightBaseUrl);
        return {status: ApiStatusCode.SUCCESS, message: 'Syncing Events and related entities completed.'};
    }


    @Put(':id/sync')
    @ApiOperation({summary: 'Re-sync an event by id.'})
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
        example: 'http://kg.artsdata.ca/culture-creates/footlight/toutculture-ca'
    })
    @ApiQuery({
        name: "footlight-base-url",
        description: "Select the environment",
        required: true,
        enum: Object.values(Environment)
    })
    async syncEventById(
        @Req() request: Request,
        @Param("id") id: string,
        @Query("calendar-id") calendarId?: string,
        @Query("footlight-base-url") footlightBaseUrl?: string,
        @Query("source") source?: string): Promise<ApiResponseEnum> {
        const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
        await this._eventService.syncEventById(token, calendarId, id, source, footlightBaseUrl);
        return {status: ApiStatusCode.SUCCESS, message: 'Re-syncing event completed..'};
    }
}

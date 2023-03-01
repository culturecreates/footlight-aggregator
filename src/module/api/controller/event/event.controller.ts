import {Controller, Put, Query, Req} from "@nestjs/common";
import {ApiBearerAuth, ApiOperation, ApiQuery, ApiTags} from "@nestjs/swagger";
import {ApiStatusCode} from "../../enum/api-status-code.enum";
import {ApiResponseEnum} from "../../enum/api-response.enum";
import {EventService} from "../../service/event/event.service";
import {AuthHeaderExtractor} from "../../helper/auth-header.helper";

@Controller('events')
@ApiTags('Event APIs')
@ApiBearerAuth('bearer')
export class EventController {
    constructor(private readonly _eventService: EventService) {
    }

    @Put('sync')
    @ApiOperation({summary: 'Sync event from Arts data to footlight.'})
    @ApiQuery({
        name: "calendar-id",
        description: "**calendar-id (The calendar identifier)**",
        required: true,
        explode: true
    })
    async getEvent(@Req() request: Request, @Query("calendar-id") calendarId?: string): Promise<ApiResponseEnum> {
        const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
        await this._eventService.syncEntities(token,calendarId);
        return {status: ApiStatusCode.SUCCESS, message: 'Syncing people completed.'};
    }
}

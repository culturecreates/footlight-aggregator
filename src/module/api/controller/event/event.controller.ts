import {Controller, Put, Req} from "@nestjs/common";
import {ApiBearerAuth, ApiOperation, ApiTags} from "@nestjs/swagger";
import {ApiStatusCode} from "../../enum/api-status-code.enum";
import {ApiResponseEnum} from "../../enum/api-response.enum";
import {EventService} from "../../service/event/event.service";

@Controller('events')
@ApiTags('Event APIs')
@ApiBearerAuth('bearer')
export class EventController {
    constructor(private readonly _eventService: EventService) {
    }

    @Put('sync')
    @ApiOperation({summary: 'Sync event from Arts data to footlight.'})
    async getEvent(@Req() request: Request): Promise<ApiResponseEnum> {
        await this._eventService.syncEntities(request);
        return {status: ApiStatusCode.SUCCESS, message: 'Syncing people completed.'};
    }
}

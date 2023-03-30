import { Controller, forwardRef, Inject, Put, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ApiResponseEnum, ApiStatusCode } from "../../enum";
import { diskStorage } from "multer";
import { AuthHeaderExtractor } from "../../helper";
import { Request } from "express";
import { Environment } from "../../enum/environments.enum";
import { InvitationService } from "../../service/invitation";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("invite")
@ApiTags("Invitation APIs")
@ApiBearerAuth("bearer")

export class InvitationController {
  constructor(@Inject(forwardRef(() => InvitationService))
              private readonly _invitationService: InvitationService) {
  }

  @Put("bulk")
  @ApiOperation({ summary: "Invite bulk users" })
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async sendBulkInvite(
    @Req() request: Request,
    @Query("calendar-id") calendarId: string,
    @Query("footlight-base-url") footlightBaseUrl: string,
    @UploadedFile("file") file): Promise<ApiResponseEnum> {
    const token = AuthHeaderExtractor.fromAuthHeaderAsBearerToken(request);
    await this._invitationService.inviteUsers(token, footlightBaseUrl, calendarId, file);
    return { status: ApiStatusCode.SUCCESS, message: "Successfully invited all users" };
  }
}

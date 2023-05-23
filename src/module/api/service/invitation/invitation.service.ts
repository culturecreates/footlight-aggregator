import { HttpStatus, Injectable } from "@nestjs/common";
import { Readable } from "stream";
import { parse } from "papaparse";
import { SharedService } from "../shared";
import { HttpMethodsEnum } from "../../enum";
import { FootlightPaths } from "../../constants/footlight-urls";
import { Exception } from "../../helper";

@Injectable()
export class InvitationService {

  async inviteUsers(token: string, footlightUrl: string, calendarId: string, file: any) {
    const fileBuffer = file.buffer.toString("base64");
    const buffer = Buffer.from(fileBuffer, "base64");
    const dataStream = Readable.from(buffer);
    parse(dataStream, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log("results:", results);
        for (const result of results.data) {
          await this._sendInvitation(result.firstName, result.lastName, result.emailAddress,
            result.role?.toUpperCase(), result.languagePreference?.toUpperCase(), calendarId, token, footlightUrl);
        }
      }
    });

  }

  private async _sendInvitation(firstName: string, lastName: string, inviteEmailId: string, role: string,
                                language: string, calendarId: string, token: string, footlightUrl: string) {
    const url = footlightUrl + FootlightPaths.INVITE;
    const body = {
      firstName: firstName,
      lastName: lastName,
      email: inviteEmailId,
      role: role
    };
    const {
      status,
      response
    } = await SharedService.callFootlightAPI(HttpMethodsEnum.POST, calendarId, token, url, body, language);
    if (status === HttpStatus.UNAUTHORIZED) {
      Exception.unauthorized(response);
    }
    console.log(response);
  }
}
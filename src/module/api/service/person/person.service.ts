import { SharedService } from "../shared";
import { PersonDTO } from "../../dto";
import { Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";

@Injectable()
export class PersonService {

  async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, personDetails: PersonDTO, currentUserId: string) {
    return await this._pushPersonToFootlight(footlightBaseUrl, calendarId, token, personDetails, currentUserId);
  }

  private async _pushPersonToFootlight(footlightUrl: string, calendarId: string, token: string,
                                       personToAdd: PersonDTO, currentUserId: string) {
    const url = footlightUrl + FootlightPaths.ADD_PEOPLE;
    return await SharedService.syncEntityWithFootlight(calendarId, token, url, personToAdd, currentUserId);
  }

}
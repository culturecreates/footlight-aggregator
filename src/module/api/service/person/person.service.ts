import {FootlightPaths} from "../../constants";
import {SharedService} from "../shared";
import {PersonDTO} from "../../dto";
import {Injectable} from "@nestjs/common";

@Injectable()
export class PersonService {

    async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, personDetails: PersonDTO) {
        return await this._pushPersonToFootlight(footlightBaseUrl, calendarId, token, personDetails);
    }

    private async _pushPersonToFootlight(footlightUrl: string, calendarId: string, token: string,
                                         personToAdd: PersonDTO) {
        const url = footlightUrl + FootlightPaths.ADD_PEOPLE;
        return await SharedService.syncEntityWithFootlight(calendarId, token, url, personToAdd);
    }

}
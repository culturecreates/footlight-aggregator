import {SharedService} from "../../service";
import {FootlightPaths} from "../../constants";
import {PostalAddressDTO} from "../../dto";
import {Injectable} from "@nestjs/common";

@Injectable()
export class PostalAddressService {

    private async _pushPostalAddressToFootlight(footlightBaseUrl: string, calendarId: string, token: string,
                                                postalAddressToAdd: PostalAddressDTO) {
        const url = footlightBaseUrl + FootlightPaths.ADD_POSTAL_ADDRESS;
        return await SharedService.syncEntityWithFootlight(calendarId, token, url, postalAddressToAdd);
    }

    async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string,
                                 postalAddressToAdd: PostalAddressDTO) {
        return await this._pushPostalAddressToFootlight(footlightBaseUrl, calendarId, token, postalAddressToAdd);
    }

}
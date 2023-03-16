import {PostalAddressService, SharedService} from "../../service";
import {PlaceDTO} from "../../dto";
import {ArtsDataConstants, ArtsDataUrls, FootlightPaths} from "../../constants";
import {forwardRef, Inject, Injectable} from "@nestjs/common";

@Injectable()
export class PlaceService {
    constructor(
        @Inject(forwardRef(() => PostalAddressService))
        private readonly _postalAddressService: PostalAddressService) {
    }

    async getPlaceDetailsFromArtsData(calendarId: string, footlightBaseUrl: string, token: string, artsDataId: string) {
        const placeFetched = await SharedService.fetchFromArtsDataById(artsDataId, ArtsDataUrls.PLACE_BY_ID);
        if (!placeFetched) {
            return undefined;
        }
        const {address, alternateName} = placeFetched
        delete placeFetched.address;
        const postalAddressId = await this._postalAddressService
            .getFootlightIdentifier(calendarId, token, footlightBaseUrl, address);
        const placeToAdd: PlaceDTO = placeFetched;
        placeToAdd.alternateName = alternateName?.length
            ? SharedService.formatAlternateNames(alternateName) : undefined

        placeToAdd.postalAddressId = postalAddressId ? {entityId: postalAddressId} : undefined;
        return placeToAdd
    }

    private async _pushPlaceToFootlight(footlightBaseUrl: string, calendarId: string, token: string,
                                        placeToAdd: PlaceDTO) {
        const url = footlightBaseUrl + FootlightPaths.ADD_PLACE;
        return await SharedService.syncEntityWithFootlight(calendarId, token, url, placeToAdd);
    }

    async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, artsDataUri: string) {
        const artsDataId = artsDataUri.replace(ArtsDataConstants.RESOURCE_URI_PREFIX, '');
        const placeDetails = await this.getPlaceDetailsFromArtsData(calendarId, footlightBaseUrl, token, artsDataId);
        return placeDetails ? await this._pushPlaceToFootlight(footlightBaseUrl, calendarId, token, placeDetails)
            : undefined;
    }

}
import {ArtsDataConstants} from "../../constants";
import {Exception} from "../../helper";
import {HttpStatus} from "@nestjs/common";
import axios from "axios";
import {HttpMethodsEnum} from "../../enum";

export class SharedService {

    public static async fetchFromArtsDataById(id: string, baseUrl: string) {
        const url = baseUrl.replace(ArtsDataConstants.ARTS_DATA_ID.toString(), id);
        const artsDataResponse = await this.fetchUrl(url);
        return artsDataResponse.data?.[0];
    }

    public static async fetchUrl(url: string) {
        const artsDataResponse = await axios.get(url);
        return artsDataResponse.data;
    }

    private static async _callFootlightAPI(method: string, calendarId: string, token: string, url: string, body) {
        const headers = {
            Accept: "*/*",
            Authorization: `Bearer ${token}`,
            "calendar-id": calendarId,
            "Content-Type": "application/json"
        };
        let responseData;
        let responseStatus;
        if (method === HttpMethodsEnum.POST) {
            await axios.post(url, body, {headers}).then(response => {
                responseData = response.data;
                responseStatus = response.status;
            }).catch((reason) => {
                responseData = reason.response.data;
                responseStatus = reason.response.status;
            });
            return {status: responseStatus, response: responseData};
        }
        if (method === HttpMethodsEnum.PATCH) {
            await axios.patch(url, body, {headers}).then(response => {
                responseData = response.data;
                responseStatus = response.status;
            }).catch((response) => {
                responseData = response.data;
                responseStatus = response.status;
            });
            return {status: responseStatus, response: responseData};
        }
        Exception.internalServerError('Method unsupported');
    }

    public static async syncEntityWithFootlight(calendarId: string, token: string, url: string, body: any) {
        const addResponse = await this._addEntityToFootlight(calendarId, token, url, body);
        const {status, response} = addResponse;
        if (status === HttpStatus.CREATED) {
            console.log(`Added Entity (${response.id}) to Footlight!`);
            return response.id;
        } else if (status === HttpStatus.CONFLICT) {
            const existingEntityId = await response.error;
            const updateResponse = await this._updateEntityInFootlight(calendarId, token, existingEntityId, url, body);
            if (updateResponse.status === HttpStatus.OK) {
                console.log(`Updated Entity (${existingEntityId}) in Footlight!`)
                return existingEntityId
            } else {
                console.log('Updating Entity failed!')
            }
        } else if (status === HttpStatus.UNAUTHORIZED) {
            console.log("Unauthorized!")
            Exception.unauthorized(response.message);
        } else {
            console.log("Some thing went wrong. ")
            Exception.internalServerError("Some thing went wrong");
        }
    }

    private static async _addEntityToFootlight(calendarId: string, token: string, url: string, body: any) {
        return await this._callFootlightAPI(HttpMethodsEnum.POST, calendarId, token, url, body);
    }

    private static async _updateEntityInFootlight(calendarId: string, token: string, existingEntityId: string,
                                                  url: string, body: any) {
        url = url + '/' + existingEntityId;
        return await this._callFootlightAPI(HttpMethodsEnum.PATCH, calendarId, token, url, body);
    }

}
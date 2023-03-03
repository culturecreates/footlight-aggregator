import {ArtsDataConstants} from "../../constants/artsdata-urls";

export class SharedService {

    public static async fetchFromArtsDataById(id: string, baseUrl: string) {
        const url = baseUrl.replace(ArtsDataConstants.ARTS_DATA_ID.toString(), id);
        const artsDataResponse = await this.fetchUrl(url);
        return artsDataResponse.data?.[0];
    }

    public static async fetchUrl(url: string) {
        let artsDataResponse;
        artsDataResponse = await fetch(url)
            .then(data => {
                return data.json();
            });
        return artsDataResponse;
    }

    public static async callFootlightAPI(method: string, calendarId: string, token: string, url: string, body) {
        try {
            return await fetch(url, {
                body: JSON.stringify(body),
                headers: {
                    Accept: "*/*",
                    Authorization: `Bearer ${token}`,
                    "calendar-id": calendarId,
                    "Content-Type": "application/json"
                },
                method: method
            }).then(data => {
                return data.json();
            });
        } catch (e) {
            console.log(e)
        }
    }

    public static async syncEntityWithFootlight(calendarId: string, token: string, url: string, body: any) {
        const addResponse = await this._addEntityToFootlight(calendarId, token, url, body);
        if (addResponse.statusCode === 409) {
            console.log('EntityExists! Trying to update the entity')
            const existingEntityId = addResponse.error;
            const updateResponse = await this._updateEntityInFootlight(calendarId, token, existingEntityId, url, body);
            if (updateResponse.statusCode === 202) {
                return updateResponse
            } else {
                console.log(updateResponse);
            }
        }
        return addResponse;
    }

    private static async _addEntityToFootlight(calendarId: string, token: string, url: string, body: any) {
        return await this.callFootlightAPI("POST", calendarId, token, url, body);
    }

    private static async _updateEntityInFootlight(calendarId: string, token: string, existingEntityId: string,
                                                  url: string, body: any) {
        url = url + '/' + existingEntityId;
        return await this.callFootlightAPI("PATCH", calendarId, token, url, body);
    }

}
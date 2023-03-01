import {Artsdata} from "../../constants/artsdata-urls";

export class SharedService {

    public static async fetchFromArtsDataById(id: string, baseUrl: string) {
        const url = baseUrl.replace(Artsdata.ARTSDATA_ID.toString(), id);
        const artsDataResponse = await this.fetchUrl(url);
        const entity = artsDataResponse.data?.[0];
        return entity;
    }

    public static async fetchUrl(url: string) {
        let artsDataResponse;
        artsDataResponse = await fetch(url)
            .then(data => {
                return data.json();
            });
        return artsDataResponse;
    }

    public static async postToFootlight(calendarId: string, token: string, url: string, body) {
        const postResponse = await fetch(url, {
            body: JSON.stringify(body),
            headers: {
                Accept: "*/*",
                Authorization: `Bearer ${token}`,
                "calendar-id": calendarId,
                "Content-Type": "application/json"
            },
            method: "POST"
        }).then(data => {
            return data.json();
        });
        if (postResponse?.statusCode !== 202) {
            console.log('Something went wrong.')
        }
    }

}
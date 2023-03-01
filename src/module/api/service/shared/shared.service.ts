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
        // const entities = artsDataResponse.data;
        // return entities?.filter(entity => entity.id.startsWith('http://kg.artsdata.ca/resource/'))
        //     .map(entity => entity.id.replace('http://kg.artsdata.ca/resource/', ''));
    }

}
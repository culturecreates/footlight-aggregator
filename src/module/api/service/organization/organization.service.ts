import {SharedService} from "../shared/shared.service";
import {OrganizationDTO} from "../../dto/organization";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";
import {SERVER} from "../../config";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

export class OrganizationService {

    async syncOrganizations(calendarId: string, token: string) {
        const organizationIds = await this._fetchAllOrganizationIdsFromArtsData();
        console.log('Organizations :: count:' + organizationIds.length + ', Artsdata ids: ' + organizationIds)
        let count = 0;
        for (const id of organizationIds) {
            await new Promise(r => setTimeout(r, 500));
            await this.addOrganizationToFootlight(id, calendarId, token);
            count++;
        }
        console.log(`Successfully synchronised ${count} Organizations.`);
    }

    private async _fetchAllOrganizationIdsFromArtsData() {
        const url = ArtsDataUrls.ORGANIZATIONS;
        const artsDataResponse = await SharedService.fetchUrl(url);
        const entities = artsDataResponse.data;
        return entities?.filter(entity => entity.id.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(entity => entity.id.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }

    async addOrganizationToFootlight(id: string, calendarId: string, token: string) {
        const organizationFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.ORGANIZATION_BY_ID);
        const {
            id: artsDataId,
            name,
            alternateName,
            description,
            disambiguatingDescription,
            url,
            sameAs: sameAsValues,

        } = organizationFetched;
        const sameAs = sameAsValues ? sameAsValues?.map(val => ({uri: val})) : [];
        sameAs.push({uri: artsDataId});
        const organizationToAdd = new OrganizationDTO(name, alternateName, description, disambiguatingDescription, url, sameAs);
        //Add org to footlight-admin POST
        await this._pushOrganizationToFootlight(calendarId, token, organizationToAdd);
        console.log(organizationToAdd);
    }

    private async _pushOrganizationToFootlight(calendarId: string, token: string, organizationToAdd: OrganizationDTO) {
        const url = SERVER.FOOTLIGHT_API_BASE_URL + FootlightPaths.ADD_ORGANIZATION;
        await SharedService.postToFootlight(calendarId, token, url, organizationToAdd);
    }

}
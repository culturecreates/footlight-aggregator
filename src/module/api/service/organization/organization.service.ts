import {SharedService} from "../shared/shared.service";
import {OrganizationDTO} from "../../dto/organization";
import {Artsdata, ArtsDataUrls} from "../../constants/artsdata-urls";

export class OrganizationService {

    async syncOrganizations() {
        const organizationIds = await this._fetchAllOrganizationIdsFromArtsData();
        console.log('Organizations :: count:' + organizationIds.length + ', Artsdata ids: ' + organizationIds)
        const organizations = [];
        let count = 0;
        for (const id of organizationIds) {
            await new Promise(r => setTimeout(r, 500));
            organizations.push(await this.addOrganizationToFootlight(id));
            count++;
        }
        // console.log(organizations);
        console.log(`Successfully synchronised ${count} Organizations.`);
    }

    private async _fetchAllOrganizationIdsFromArtsData() {
        const url = ArtsDataUrls.ORGANIZATIONS;
        const artsDataResponse = await SharedService.fetchUrl(url);
        const entities = artsDataResponse.data;
        return entities?.filter(entity => entity.id.startsWith(Artsdata.RESOURCE_URI_PREFIX))
            .map(entity => entity.id.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    }

    async addOrganizationToFootlight(id: string) {
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
        console.log(organizationToAdd);
    }
}
import {SharedService} from "../shared/shared.service";
import {OrganizationDTO} from "../../dto/organization";
import {FootlightPaths} from "../../constants/artsdata-urls/footlight-urls.constants";

export class OrganizationService {

    async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string,
                                 organizationDetails: OrganizationDTO) {
        return await this._pushOrganizationToFootlight(footlightBaseUrl, calendarId, token, organizationDetails);
    }

    private async _pushOrganizationToFootlight(footlightUrl: string, calendarId: string, token: string,
                                               organizationToAdd: OrganizationDTO) {
        const url = footlightUrl + FootlightPaths.ADD_ORGANIZATION;
        return await SharedService.syncEntityWithFootlight(calendarId, token, url, organizationToAdd);
    }

    // async syncOrganizations(calendarId: string, token: string, source: string, footlightUrl: string) {
    //     const organizationIds = await this._fetchAllOrganizationIdsFromArtsData(source);
    //     console.log('Organizations :: count:' + organizationIds.length + ', Artsdata ids: ' + organizationIds)
    //     let count = 0;
    //     for (const id of organizationIds) {
    //         await new Promise(r => setTimeout(r, 500));
    //         await this.addOrganizationToFootlight(id, calendarId, token, footlightUrl);
    //         count++;
    //     }
    //     console.log(`Successfully synchronised ${count} Organizations.`);
    // }

    // private async _fetchAllOrganizationIdsFromArtsData(source: string) {
    //     const url = ArtsDataUrls.ORGANIZATIONS + '&source=' + source;
    //     const artsDataResponse = await SharedService.fetchUrl(url);
    //     const entities = artsDataResponse.data;
    //     return entities?.filter(entity => entity.id.startsWith(Artsdata.RESOURCE_URI_PREFIX))
    //         .map(entity => entity.id.replace(Artsdata.RESOURCE_URI_PREFIX, ''));
    // }

    // async getOrganizationDetailsFromArtsData(id: string) {
    //     const organizationFetched = await SharedService.fetchFromArtsDataById(id, ArtsDataUrls.ORGANIZATION_BY_ID);
    //     const {
    //         id: artsDataId,
    //         name,
    //         alternateName,
    //         description,
    //         disambiguatingDescription,
    //         url,
    //         sameAs: sameAsValues,
    //
    //     } = organizationFetched;
    //     const sameAs = sameAsValues ? sameAsValues?.map(val => ({uri: val})) : [];
    //     sameAs.push({uri: artsDataId});
    //     const organization = new OrganizationDTO(name, alternateName, description, disambiguatingDescription, url,
    //         sameAs);
    //     return organization
    // }

    // async addOrganizationToFootlight(id: string, calendarId: string, token: string, footlightUrl: string) {
    //     const organizationToAdd = await this.getOrganizationDetailsFromArtsData(id);
    //     await this._pushOrganizationToFootlight(footlightUrl, calendarId, token, organizationToAdd);
    // }

}
import { SharedService } from "../shared";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
import { LoggerService } from "..";

@Injectable()
export class TaxonomyService {
  constructor(
    @Inject(forwardRef(()=> LoggerService))
    private readonly _loggerService: LoggerService){
    }

  async getTaxonomy(calendarId: string, token: string, footlightBaseUrl: string, className: string) {
    try {
      const taxonomyData = await this._fetchTaxonomyAndConcepts(footlightBaseUrl, calendarId, token, className);
      const taxonomies = taxonomyData.data;
      if (taxonomies?.length) {
        for (const taxonomy of taxonomies) {
          taxonomy.concept = this._flattenConcepts(taxonomy.concept);
        }
      }
      return taxonomies;
    } catch (e) {
      this._loggerService.errorLogs("Error while fetching taxonomies");
    }
  }

  private async _fetchTaxonomyAndConcepts(footlightUrl: string, calendarId: string, token: string,
                                          className: string) {
    let url = footlightUrl + FootlightPaths.GET_TAXONOMY;
    url = url + "?include-concepts=true&page=1&limit=100";
    if (className) {
      url = url + "&taxonomy-class=" + className;
    }
    const headers = {
      Accept: "*/*",
      Authorization: `Bearer ${token}`,
      "calendar-id": calendarId,
      "Content-Type": "application/json"
    };
    const taxonomyResponse = await SharedService.fetchUrl(url, headers);
    return taxonomyResponse.data;
  }

  private _flattenConcepts(concepts: any[]) {

    concepts.forEach((concept) => {
      const children = concept.children;
      if (concept.children?.length) {
        concepts.push(...this._flattenConcepts(children));
      }
    });
    return concepts;
  }
}
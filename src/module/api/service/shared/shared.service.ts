import { ArtsDataConstants } from "../../constants";
import { Exception } from "../../helper";
import { forwardRef, HttpStatus, Inject, Injectable } from "@nestjs/common";
import axios from "axios";
import { EntityType, HttpMethodsEnum } from "../../enum";
import { FootlightPaths } from "../../constants/footlight-urls";
import { LoggerService } from "..";
import { HEADER } from "../../config";
import { SameAs } from "../../model";
import { EventPredicates } from "../../constants/artsdata-urls/rdf-types.constants";

@Injectable()
export class SharedService {
  constructor(
    @Inject(forwardRef(() => LoggerService))
    private readonly _loggerService: LoggerService) {
  }

  public static async fetchFromArtsDataById(id: string, baseUrl: string) {
    const url = baseUrl.replace(ArtsDataConstants.ARTS_DATA_ID.toString(), id);
    const artsDataResponse = await this.fetchUrl(url);
    return artsDataResponse?.data?.data?.[0];
  }

  public static async fetchUrl(url: string, headers?: any) {
    try{
      let result = await axios.get(url, { headers });
      return result;
    } catch(e){
      this._loggerService(`Unable to fetch URL ${url} Error ::, ${e}`);
      return e.response;
    }
  }

  public static async postUrl(url: string, body?: any, headers?: any) {
    return await axios.post(url, body, { headers });
  }


  static async callFootlightAPI(method: string, calendarId: string, token: string, url: string, body, language?: string) {
    const headers = this.createHeaders(token, calendarId, language);
    let responseData;
    let responseStatus;
    if (method === HttpMethodsEnum.POST) {
      await axios.post(url, body, { headers }).then(response => {
        responseData = response.data;
        responseStatus = response.status;
      }).catch((reason) => {
        responseData = reason.response?.data;
        responseStatus = reason.response?.status;
      });
      return { status: responseStatus, response: responseData };
    }
    if (method === HttpMethodsEnum.PATCH) {
      await axios.patch(url, body, { headers }).then(response => {
        responseData = response.data;
        responseStatus = response.status;
      }).catch((error) => {
        responseData = error?.response?.data;
        responseStatus = error?.response?.status;
      });
      return { status: responseStatus, response: responseData };
    }
    this._loggerService(`Method unsupported`);
    Exception.internalServerError("Method unsupported");
  }

  public static async patchEventInFootlight(calendarId: string, token: string, footlightBaseUrl: string,
                                            eventId: string, dto: any) {

    const url = footlightBaseUrl + FootlightPaths.ADD_EVENT;
    const updateResponse = await this.updateEntityInFootlight(calendarId, token, eventId, url, dto);
    if (updateResponse.status === HttpStatus.OK) {
      this._loggerService(`The event successfully synchronised.`);
      return { message: "The event successfully synchronised." };
    } else {
      this._loggerService(`Updating Entity failed!`);
      Exception.badRequest("Updating Entity failed!");
    }
  }

  public static async syncEntityWithFootlight(calendarId: string, token: string, url: string, body: any,
                                              currentUserId: string, returnStatus?: Boolean) {
    const addResponse = await this.addEntityToFootlight(calendarId, token, url, body);
    const { status, response } = addResponse;
    if (status === HttpStatus.CREATED) {
      this._loggerService(`\tAdded Entity (${response.id} : ${body.uri}) to Footlight!`);
      return returnStatus ? status : response.id;
    } else if (status === HttpStatus.CONFLICT) {
      const existingEntityId = await response.error;
      const existingEntity = await this._getEntityFromFootlight(calendarId, token, existingEntityId, url);
      if (!existingEntity?.modifiedByUserId || existingEntity?.modifiedByUserId === currentUserId) {
        const updateResponse = await this.updateEntityInFootlight(calendarId, token, existingEntityId, url, body);
        if (updateResponse.status === HttpStatus.OK) {
          this._loggerService(`\tUpdated Entity (${existingEntityId} : ${body.uri}) in Footlight!`);
          return returnStatus? updateResponse.status : existingEntityId;
        } else {
          this._loggerService(`\tUpdating Entity (${existingEntityId}) failed!`);
          return returnStatus? updateResponse.status : existingEntityId;
        }
      } else {
        this._loggerService(`\tEntity cannot be modified. Since this entity is updated latest by a different user.`);
        return returnStatus ? HttpStatus.CONFLICT : existingEntityId;
      }
    } else if (status === HttpStatus.UNAUTHORIZED) {
      this._loggerService("Unauthorized Exception!");
      Exception.unauthorized(response.message);
    } else {
      this._loggerService(`Something went wrong.${JSON.stringify(body)}`);
      Exception.internalServerError(`Something went wrong Event: ${response?.error}, message: ${response?.message}, 
                      same as: ${JSON.stringify(body?.sameAs)}`);
    }
  }

  static async addEntityToFootlight(calendarId: string, token: string, url: string, body: any) {
    this._loggerService(`\tAdding ${url.split("/").slice(-1)}...`);
    return await this.callFootlightAPI(HttpMethodsEnum.POST, calendarId, token, url, body);
  }

  static async updateEntityInFootlight(calendarId: string, token: string, existingEntityId: string,
                                       url: string, body: any) {
    this._loggerService(`\tUpdating ${url.split("/").slice(-1)}...`);
    url = url + "/" + existingEntityId;
    return await this.callFootlightAPI(HttpMethodsEnum.PATCH, calendarId, token, url, body);
  }

  private static async _getEntityFromFootlight(calendarId: string, token: string, existingEntityId: any, url: string) {
    this._loggerService(`\tFetching entity ${url.split("/").slice(-1)}...`);
    url = url + "/" + existingEntityId;

    const headers = this.createHeaders(token, calendarId);
    const existingEntity = await SharedService.fetchUrl(url, headers);
    return existingEntity?.data;
  }

  static async getAllEntitiesFromFootlight(calendarId: string, footlightBaseUrl: string, token: string, entityType: EntityType){
    switch(entityType){
      case EntityType.PERSON:
        return await this._fetchAllPeopleFromFootlight(calendarId, footlightBaseUrl, token);
      case EntityType.ORGANIZATION:
        return await this._fetchAllOrganizationsFromFootlight(calendarId, footlightBaseUrl, token);
      case EntityType.PLACE:
        return await this._fetchAllPlacesFromFootlight(calendarId, footlightBaseUrl, token);
      default:
        return null;
    }
  }

  private static async _fetchAllPeopleFromFootlight(calendarId: string,footlightBaseUrl: string, token: string){
    const url = `${footlightBaseUrl}${FootlightPaths.ADD_PEOPLE}?page=1&limit=300`;
    const headers = this.createHeaders(token, calendarId);
    return await SharedService.fetchUrl(url, headers);
  }

  private static async _fetchAllOrganizationsFromFootlight(calendarId: string, footlightBaseUrl:string, token: string){
    const url = `${footlightBaseUrl}${FootlightPaths.ADD_ORGANIZATION}?page=1&limit=300`;
    const headers = this.createHeaders(token, calendarId);
    return await SharedService.fetchUrl(url, headers);
  }

  private static async _fetchAllPlacesFromFootlight(calendarId: string, footlightBaseUrl:string, token: string){
    const url = `${footlightBaseUrl}${FootlightPaths.ADD_PLACE}?page=1&limit=300`;
    const headers = this.createHeaders(token, calendarId);
    return await SharedService.fetchUrl(url, headers);
  }

  static formatAlternateNames(alternateName: { fr: string[], en: string[] }) {
    const alternateNames = [];
    const { en, fr } = alternateName;
    alternateNames.push(en.map(label => ({ en: label })));
    alternateNames.push(fr.map(label => ({ fr: label })));
    return alternateNames.length ? alternateNames : undefined;
  }

  static createHeaders(token: string, calendarId?: string, languagePreference?: string) {
    const headers = {
      Accept: "*/*",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Referer": HEADER.CMS_REFERER_HEADER
    };
    if (calendarId) {
      headers["calendar-id"] = calendarId;
      headers["language"] = languagePreference;
    }
    return headers;
  }

  async fetchCurrentUser(footlightBaseUrl: string, token: string) {
    this._loggerService.infoLogs(`Fetching current user info`);
    const url = footlightBaseUrl + FootlightPaths.GET_CURRENT_USER;
    const headers = SharedService.createHeaders(token);
    try {
      const userResponse = await SharedService.fetchUrl(url, headers);
      return userResponse.data;
    } catch (e) {
      this._loggerService.errorLogs("Authorisation failed. Please check your credentials and access to the calendar");
      Exception.unauthorized("Something went wrong.");
    }
  }

  async fetchCalendar(footlightBaseUrl: string, token: string, calendarId: string) {
    this._loggerService.infoLogs(`Fetching current user info`);
    const url = `${footlightBaseUrl}${FootlightPaths.GET_CALENDAR}/${calendarId} `;
    const headers = SharedService.createHeaders(token, calendarId);
    try {
      const calendarResponse = await SharedService.fetchUrl(url, headers);
      return calendarResponse.data;
    } catch (e) {
      this._loggerService.errorLogs("Authorisation failed. Please check your credentials and access to the calendar");
      Exception.unauthorized("Something went wrong.");
    }
  }

  static _loggerService(args: string) {
    const _loggerService = LoggerService.prototype;
    _loggerService.infoLogs(args);
  }

  public static async fetchJsonFromUrl(url: string) {
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      this._loggerService(`Error fetching JSON from URL: ${url}, Error message: ${error.message}`);
      return null;
    }
  }

  public static formatSameAsForRdf(data:any){
    let sameAs: SameAs[] = [];
    if(!data[EventPredicates.SAME_AS]){
      sameAs = [{uri: data['@id'], type: "ExternalSourceIdentifier"}]
      return sameAs
    }
    data[EventPredicates.SAME_AS] = [].concat(data[EventPredicates.SAME_AS]);
    for(const sameAsValue of data[EventPredicates.SAME_AS]){
      if(sameAsValue.startsWith("http://kg.artsdata.ca/resource/")){
        sameAs.push({uri: sameAsValue, type: "ArtsdataIdentifier"})
      }
      else{sameAs.push({uri: sameAsValue, type: "ExternalSourceIdentifier"})}
    }
    return sameAs;
  }

  public static checkIfSameAsHasArtsdataIdentifier(sameAs: SameAs[]){
    for(const sameAsValue of sameAs){
      if(sameAsValue.type === "ArtsdataIdentifier"){
        return sameAsValue.uri;
      }
    }
    return false;
  }
}
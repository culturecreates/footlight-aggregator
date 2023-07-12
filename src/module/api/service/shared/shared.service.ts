import { ArtsDataConstants } from "../../constants";
import { Exception } from "../../helper";
import { HttpStatus, Injectable } from "@nestjs/common";
import axios from "axios";
import { HttpMethodsEnum } from "../../enum";
import { FootlightPaths } from "../../constants/footlight-urls";

@Injectable()
export class SharedService {

  public static async fetchFromArtsDataById(id: string, baseUrl: string) {
    const url = baseUrl.replace(ArtsDataConstants.ARTS_DATA_ID.toString(), id);
    const artsDataResponse = await this.fetchUrl(url);
    return artsDataResponse.data.data?.[0];
  }

  public static async fetchUrl(url: string, headers?: any) {
    return await axios.get(url, { headers });
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
      }).catch((response) => {
        responseData = response.data;
        responseStatus = response.status;
      });
      return { status: responseStatus, response: responseData };
    }
    Exception.internalServerError("Method unsupported");
  }

  public static async patchEventInFootlight(calendarId: string, token: string, footlightBaseUrl: string,
                                            eventId: string, dto: any) {

    const url = footlightBaseUrl + FootlightPaths.ADD_EVENT;
    const updateResponse = await this.updateEntityInFootlight(calendarId, token, eventId, url, dto);
    if (updateResponse.status === HttpStatus.OK) {
      console.log(`\tThe event successfully synchronised.`);
      return { message: "The event successfully synchronised." };
    } else {
      Exception.badRequest("Updating Entity failed!");
    }
  }

  public static async syncEntityWithFootlight(calendarId: string, token: string, url: string, body: any, currentUserId: string) {
    const addResponse = await this.addEntityToFootlight(calendarId, token, url, body);
    const { status, response } = addResponse;
    if (status === HttpStatus.CREATED) {
      console.log(`\tAdded Entity (${response.id} : ${body.uri}) to Footlight!`);
      return response.id;
    } else if (status === HttpStatus.CONFLICT) {
      const existingEntityId = await response.error;
      const existingEntity = await this._getEntityFromFootlight(calendarId, token, existingEntityId, url);
      if (!existingEntity.modifiedByUserId || existingEntity.modifiedByUserId === currentUserId) {
        const updateResponse = await this.updateEntityInFootlight(calendarId, token, existingEntityId, url, body);
        if (updateResponse.status === HttpStatus.OK) {
          console.log(`\tUpdated Entity (${existingEntityId} : ${body.uri}) in Footlight!`);
        } else {
          console.error("\tUpdating Entity failed!");
        }
      } else {
        console.log("\tEntity cannot be modified. Since this entity is updated latest by a different user.");
      }

      return existingEntityId;
    } else if (status === HttpStatus.UNAUTHORIZED) {
      console.error("\tUnauthorized!");
      Exception.unauthorized(response.message);
    } else {
      console.error(`\tSome thing went wrong.${JSON.stringify(body)} `);
      Exception.internalServerError("Some thing went wrong");
    }
  }

  static async addEntityToFootlight(calendarId: string, token: string, url: string, body: any) {
    console.log(`\tAdding ${url.split("/").slice(-1)}...`);
    return await this.callFootlightAPI(HttpMethodsEnum.POST, calendarId, token, url, body);
  }

  static async updateEntityInFootlight(calendarId: string, token: string, existingEntityId: string,
                                       url: string, body: any) {
    console.log(`\tUpdating ${url.split("/").slice(-1)}...`);
    url = url + "/" + existingEntityId;
    return await this.callFootlightAPI(HttpMethodsEnum.PATCH, calendarId, token, url, body);
  }

  private static async _getEntityFromFootlight(calendarId: string, token: string, existingEntityId: any, url: string) {
    console.log(`\tFetching entity ${url.split("/").slice(-1)}...`);
    url = url + "/" + existingEntityId;

    const headers = this.createHeaders(token, calendarId);
    const existingEntity = await SharedService.fetchUrl(url, headers);
    return existingEntity.data;
  }

  static formatAlternateNames(alternateName: { fr: string[], en: string[] }) {
    const alternateNames = [];
    const { en, fr } = alternateName;
    alternateNames.push(en.map(label => ({ en: label })));
    alternateNames.push(fr.map(label => ({ fr: label })));
    return alternateNames.length ? alternateNames : undefined;
  }

  static createHeaders(token: string, calendarId: string, languagePreference?: string) {
    const headers = {
      Accept: "*/*",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
    if (calendarId) {
      headers["calendar-id"] = calendarId;
      headers["language"] = languagePreference;
    }
    return headers;
  }

  async fetchCurrentUser(footlightBaseUrl: string, token: string, calendarId: string) {
    console.log(`Fetching current user info`);
    const url = footlightBaseUrl + FootlightPaths.GET_CURRENT_USER;
    const headers = SharedService.createHeaders(token, calendarId);
    try {
      const userResponse = await SharedService.fetchUrl(url, headers);
      return userResponse.data;
    } catch (e) {
      console.log('Authorisation failed. Please check your credentials and access to the calendar')
      Exception.unauthorized("Something went wrong.");

    }
  }
}
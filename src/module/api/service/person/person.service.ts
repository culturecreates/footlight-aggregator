import { SharedService } from "../shared";
import { PersonDTO } from "../../dto";
import { Injectable } from "@nestjs/common";
import { FootlightPaths } from "../../constants/footlight-urls";
import { JsonLdParseHelper } from "../../helper";
import { EventPredicates } from "../../constants/artsdata-urls/rdf-types.constants";

@Injectable()
export class PersonService {

  async getFootlightIdentifier(calendarId: string, token: string, footlightBaseUrl: string, personDetails: PersonDTO, currentUserId: string) {
    return await this._pushPersonToFootlight(footlightBaseUrl, calendarId, token, personDetails, currentUserId);
  }

  private async _pushPersonToFootlight(footlightUrl: string, calendarId: string, token: string,
                                       personToAdd: PersonDTO, currentUserId: string) {
    const url = footlightUrl + FootlightPaths.ADD_PEOPLE;
    return await SharedService.syncEntityWithFootlight(calendarId, token, url, personToAdd, currentUserId);
  }

  async formatAndPushJsonLdPerson(person: any, token: string, calendarId: string, footlightBaseUrl: string, currentUserId: string, context: any) {
    const formattedPerson = new PersonDTO();
    formattedPerson.name = JsonLdParseHelper.formatMultilingualField(person[EventPredicates.NAME]);
    formattedPerson.sameAs = SharedService.formatSameAsForRdf(person);
    const artsdataUri = SharedService.checkIfSameAsHasArtsdataIdentifier(formattedPerson.sameAs)
    const uri = JsonLdParseHelper.formatEntityUri(context, person['@id']);
    if(artsdataUri){
      formattedPerson.uri = artsdataUri
    }
    else{
      formattedPerson.uri = uri

    }
    return await this._pushPersonToFootlight(footlightBaseUrl, calendarId, token, formattedPerson, currentUserId)

  }

}
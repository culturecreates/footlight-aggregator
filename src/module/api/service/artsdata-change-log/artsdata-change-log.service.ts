import { forwardRef , HttpStatus , Inject , Injectable } from '@nestjs/common';
import { ArtsDataAPIUrl , ArtsDataChangeLogConstants } from '../../constants';
import { FootlightPaths } from '../../constants/footlight-urls';
import { MessageType } from '../../enum';
import { Exception } from '../../helper';
import { CMS } from '../../config';
import { SharedService } from '../shared';
import { LoggerService } from '../logger';

export interface ChangedValue {
  value: string;
  language?: string;
  name?: string;
}

export interface PropertyChange {
  property: string;
  changedAt: string;
  removed: ChangedValue[];
  added: ChangedValue[];
}

export interface ChangedEvent {
  id: string;
  artsdataUri: string;
  name?: any;
  cmsUrl?: string;
  changes: PropertyChange[];
}

@Injectable()
export class ArtsdataChangeLogService {
  constructor(
    @Inject(forwardRef(() => SharedService))
    private readonly _sharedService: SharedService ,
    @Inject(forwardRef(() => LoggerService))
    private readonly _loggerService: LoggerService) {
  }

  async notifyEventChanges(token: string , calendar: string , source: string , footlightBaseUrl: string , since: Date) {
    const currentUser = await this._sharedService.fetchCurrentUser(footlightBaseUrl , token);
    const role = currentUser?.roles?.find(role => role.calendarId === calendar || role.calendarSlug === calendar);
    if (!role) {
      Exception.unauthorized(`User ${currentUser?.email} has no access to this calendar:: ${calendar}`);
    }
    const calendarDetails = await this._sharedService.fetchCalendar(footlightBaseUrl , token , role.calendarId);
    const calendarId = calendarDetails?.id ?? role.calendarId;
    const calendarSlug = calendarDetails?.slug ?? role.calendarSlug;

    const sourceGraph = ArtsdataChangeLogService.normaliseGraphUri(source);
    await this._loggerService.infoLogs(`Fetching Artsdata changes since ${since.toISOString()} for calendar ${calendarSlug} and source ${sourceGraph}`);
    const bindings = await this._fetchChangeLog(calendarSlug , sourceGraph , since);
    const changedEvents = ArtsdataChangeLogService.groupChanges(bindings);
    await this._loggerService.infoLogs(`Found changes on ${changedEvents.length} Footlight event(s) in Artsdata`);

    const eventsToNotify: ChangedEvent[] = [];
    for (const changedEvent of changedEvents) {
      const cmsEvent = await this._fetchCmsEvent(token , calendarId , changedEvent.id , footlightBaseUrl);
      if (!cmsEvent) {
        await this._loggerService.infoLogs(`\tSkipping ${changedEvent.id}: not found in calendar ${calendarSlug}`);
        continue;
      }
      const editedInCms = !!cmsEvent.modifiedByUserId && cmsEvent.modifiedByUserId !== currentUser.id;
      if (editedInCms) {
        await this._loggerService.infoLogs(`\tSkipping ${changedEvent.id}: last modified by a CMS user, not the aggregator`);
        continue;
      }
      eventsToNotify.push({
        ...changedEvent ,
        name: cmsEvent.name ,
        cmsUrl: CMS.EVENT_URL_TEMPLATE.replace('CALENDAR_ID' , calendarId).replace('EVENT_ID' , changedEvent.id) ,
      });
    }

    if (!eventsToNotify.length) {
      await this._loggerService.infoLogs('No Artsdata changes to notify.');
      return;
    }
    const messageMeta = {
      eventCount: eventsToNotify.length.toString() ,
      senderName: currentUser.firstName + ' ' + currentUser.lastName ,
      eventIds: eventsToNotify.map(event => event.id) ,
      source: sourceGraph ,
      since: since.toISOString() ,
      changedEvents: eventsToNotify
    };
    const sent = await this._sharedService.sendMessageToCms(token , calendarId , messageMeta , footlightBaseUrl ,
      MessageType.ARTSDATA_EVENT_CHANGES);
    if (!sent) {
      throw new Error('Could not send the Artsdata changes message to the CMS');
    }
  }

  private async _fetchChangeLog(calendarSlug: string , sourceGraph: string , since: Date) {
    const calendarGraph = ArtsdataChangeLogService.normaliseGraphUri(
      ArtsDataChangeLogConstants.FOOTLIGHT_CALENDAR_GRAPH.replace('CALENDAR_SLUG' , calendarSlug));
    const query = ArtsDataChangeLogConstants.SPARQL_QUERY_FOR_EVENT_CHANGES
      .replace('CALENDAR_GRAPH' , calendarGraph)
      .replace('SOURCE_GRAPH' , sourceGraph)
      .replace('FOOTLIGHT_EVENT_URI_PREFIX' , ArtsDataChangeLogConstants.FOOTLIGHT_EVENT_URI_PREFIX)
      .replace('SINCE' , since.toISOString());
    const body = new URLSearchParams({ query }).toString();
    const response = await SharedService.postUrl(ArtsDataAPIUrl.ARTSDATA_SPARQL_ENDPOINT , body , {
      'Accept': 'application/sparql-results+json' ,
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    return response?.data?.results?.bindings ?? [];
  }

  private async _fetchCmsEvent(token: string , calendarId: string , eventId: string , footlightBaseUrl: string) {
    const url = `${footlightBaseUrl}${FootlightPaths.ADD_EVENT}/${eventId}`;
    const response = await SharedService.fetchUrl(url , SharedService.createHeaders(token , calendarId));
    // No response or a server error means the CMS is unavailable, not that the event is missing
    if (!response || response.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      throw new Error(`Could not fetch event ${eventId} from the CMS (status ${response?.status ?? 'none'})`);
    }
    return response.status === HttpStatus.OK ? response.data : null;
  }

  static normaliseGraphUri(uri: string): string {
    const trimmed = uri?.trim();
    if (!trimmed || /[<>"'\s{}|\\^`]/.test(trimmed)) {
      Exception.badRequest(`Invalid graph URI: ${uri}`);
    }
    return /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
  }

  static groupChanges(bindings: any[]): ChangedEvent[] {
    const events = new Map<string , ChangedEvent>();
    const changes = new Map<string , PropertyChange>();
    for (const binding of bindings) {
      const src: string = binding.src?.value;
      if (!src?.startsWith(ArtsDataChangeLogConstants.FOOTLIGHT_EVENT_URI_PREFIX)) {
        continue;
      }
      const id = src.substring(ArtsDataChangeLogConstants.FOOTLIGHT_EVENT_URI_PREFIX.length);
      let event = events.get(id);
      if (!event) {
        event = { id , artsdataUri: binding.event?.value , changes: [] };
        events.set(id , event);
      }
      const property = this._localName(binding.property?.value);
      const changeKey = `${id}|${binding.activity?.value}|${property}`;
      let change = changes.get(changeKey);
      if (!change) {
        change = { property , changedAt: binding.changedAt?.value , removed: [] , added: [] };
        changes.set(changeKey , change);
        event.changes.push(change);
      }
      const values = binding.change?.value === 'removed' ? change.removed : change.added;
      this._addValue(values , property , binding.value , binding.valueName);
    }
    return [...events.values()];
  }

  private static _addValue(values: ChangedValue[] , property: string , value: any , valueName: any) {
    if (!value) {
      return;
    }
    const rawValue = property === 'eventStatus' ? this._localName(value.value) : value.value;
    const language = value['xml:lang'];
    let changedValue = values.find(existing => existing.value === rawValue && existing.language === language);
    if (!changedValue) {
      changedValue = language ? { value: rawValue , language } : { value: rawValue };
      values.push(changedValue);
    }
    if (valueName?.value && !changedValue.name) {
      changedValue.name = valueName.value;
    }
  }

  private static _localName(uri: string): string {
    return uri?.split(/[/#]/).pop();
  }
}

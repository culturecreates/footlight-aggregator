import { Injectable } from "@nestjs/common";
import { datadogLogger } from "../../config/index";
import { DATA_DOG } from "../../config";


@Injectable()
export class LoggerService {

  async infoLogs(message: string) {
    DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.info(message) : console.log(message);
  }

  async errorLogs(message: string) {
    DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.error(message) : console.error(message);
  }

  async logStatistics(calendarId:string, calendarSlug: string, source: string, eventCount: number, errorCount: number,
                      skippedCount?: number) {
    skippedCount = skippedCount || 0;
    let message = `Import statistics:
    Events: ${eventCount}
    Imported: ${eventCount - errorCount - skippedCount}
    Error: ${errorCount}
    Skipped: ${skippedCount}
    Source: ${source}
    CalendarSlug: ${calendarSlug}
    CalendarId: ${calendarId}
    DateTime: ${new Date()}`;

    DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.error(message) : console.error(message);
  }

}
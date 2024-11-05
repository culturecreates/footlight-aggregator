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
    let message = `Import statistics:
        Source: ${source}
        CalendarId : ${calendarId}
        CalendarSlug : ${calendarSlug}
        DateTime:  ${new Date()}
        Events: ${eventCount}
        Imported: ${eventCount - errorCount - skippedCount}
        Error:${errorCount}`;
    if (skippedCount) {
      message += `\nSkipped: ${skippedCount}`;
    }
    DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.error(message) : console.error(message);
  }

}
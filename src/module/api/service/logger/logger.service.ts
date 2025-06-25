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
                      skippedCount?: number, createdCount?: number, updatedCount?: number, cannotUpdateCount?: number) {
    skippedCount = skippedCount || 0;
    let message :string = `Import statistics:
    Events: ${eventCount}
    Imported: ${eventCount - errorCount - skippedCount}
    Created: ${createdCount || 0}
    Updated: ${updatedCount || 0}
    Cannot Update: ${cannotUpdateCount || 0}
    Error: ${errorCount}
    Skipped: ${skippedCount}
    Source: ${source}
    CalendarSlug: ${calendarSlug}
    CalendarId: ${calendarId}
    DateTime: ${new Date()}`;

    DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.info(message) : console.log(message);
    if(createdCount == 0){
      message = `Warning: No events were created for calendar ${calendarSlug} (${calendarId}) from source ${source}.`;
      DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.warn(message) : console.warn(message);
    }
  }

}
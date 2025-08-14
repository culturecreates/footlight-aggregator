import { Injectable } from '@nestjs/common';
import { datadogLogger } from '../../config/index';
import { DATA_DOG } from '../../config';


@Injectable()
export class LoggerService {

  async infoLogs(message: string) {
    DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.info(message) : console.log(message);
  }

  async errorLogs(message: string) {
    DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.error(message) : console.error(message);
  }

  async logStatistics(calendarId: string , calendarSlug: string , source: string , eventCount: number , errorCount: number ,
                      skippedCount?: number , createdCount?: number , updatedCount?: number , cannotUpdateCount?: number) {
    skippedCount = skippedCount || 0;
    let message: string = `Import Statistics: 
    
Total Events:        ${eventCount}
Successfully Imported: ${eventCount - errorCount - skippedCount}

 Breakdown:
  • Created:             ${createdCount || 0}
  • Updated:             ${updatedCount || 0}
  • Cannot Update:       ${cannotUpdateCount || 0}
  • Errors:              ${errorCount}
  • Skipped:             ${skippedCount}

🔗 Source Info:
  ${source ? `• Source:              ${source}` : ''}
  • Calendar Slug:       ${calendarSlug}
  • Calendar ID:         ${calendarId}

🕒 Timestamp:            ${new Date().toLocaleString()}`;

    DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.info(message) : console.log(message);

    if (createdCount == 0) {
      message = `No new events were created for calendar ${calendarSlug} (${calendarId}) from source ${source}.`;
      DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.warn(message) : console.warn(message);
      if (updatedCount == 0 && cannotUpdateCount == 0) {
        message = `Warning: No events were created or updated for calendar ${calendarSlug} (${calendarId}) from source ${source}.`;
        DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.warn(message) : console.warn(message);
      }
    }
  }

}
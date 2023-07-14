import { DATA_DOG } from ".";
var winston = require('winston');
var DatadogWinston = require('datadog-winston');

export const datadogLogger = winston.createLogger({
})

if(DATA_DOG.LOG_TO_DATA_DOG === true){
  datadogLogger.add(
    new DatadogWinston({
      apiKey: DATA_DOG.CLIENT_TOKEN,
      hostname: 'Footlight Aggregator',
      service: 'footlight-aggregator',
      forwardErrorsToLogs: DATA_DOG.LOG_TO_DATA_DOG,
      ddsource: 'aggregator-api',
    })
  )
}

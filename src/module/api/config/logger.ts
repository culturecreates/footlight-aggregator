import { DATA_DOG } from "."
var winston = require('winston')
var DatadogWinston = require('datadog-winston')

export const datadogLogger = winston.createLogger({
 
})
 
datadogLogger.add(
  new DatadogWinston({
    apiKey: DATA_DOG.CLIENT_TOKEN,
    hostname: 'Aggregator Service',  //Change to host address
    service: 'aggregator',
    forwardErrorsToLogs: DATA_DOG.LOG_TO_DATA_DOG,
    ddsource: 'aggregator-api',
  })
)

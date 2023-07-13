import { DATA_DOG } from "."
var winston = require('winston')
var DatadogWinston = require('datadog-winston')
 
var logger = winston.createLogger({
 
})
 
logger.add(
  new DatadogWinston({
    apiKey: DATA_DOG.clientToken,
    hostname: 'localhost',
    service: 'aggregator',
    forwardErrorsToLogs: DATA_DOG.forwardErrorsToLogs,
    ddsource: 'aggregator-api',
  })
)

function log(...args){
  DATA_DOG.forwardErrorsToLogs === true ? logger.info(args) : null ;
  console.log(args);
}

function error (...args){
  DATA_DOG.forwardErrorsToLogs === true ? logger.info(args) : null ;
  console.error(args);
}

module.exports =  {log :log, error:error};

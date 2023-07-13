import { Injectable } from "@nestjs/common";
import { datadogLogger } from "../../config/index";
import { DATA_DOG } from "../../config";


@Injectable()
export class DataDogLoggerService{

    async infoLogs(...args){
        DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.info(args) : null;
        console.log(DATA_DOG.LOG_TO_DATA_DOG);
        console.log(args);
    }

    async errorLogs(...args){
        DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.info(args) : null;
        console.error(args);
    }
}
import { Injectable } from "@nestjs/common";
import { datadogLogger } from "../../config/index";
import { DATA_DOG } from "../../config";


@Injectable()
export class LoggerService{

    async infoLogs(args: string){
        DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.info(args) : console.log(args);
    }

    async errorLogs(args: string){
        DATA_DOG.LOG_TO_DATA_DOG === true ? datadogLogger.error(args) : console.error(args);
    }
}
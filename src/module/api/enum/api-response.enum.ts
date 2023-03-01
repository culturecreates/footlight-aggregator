import {ApiStatusCode} from "./api-status-code.enum";

export interface ApiResponseEnum {
    status: ApiStatusCode;
    message: string;
}

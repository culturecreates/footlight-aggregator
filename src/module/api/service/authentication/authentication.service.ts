import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { UserLoginDTO } from "../../dto";
import { HEADER } from "../../config";
import axios from "axios";
import { Environment } from "../../enum/environments.enum";
import { LoggerService } from "../logger";
import { Exception } from "../../helper";

@Injectable()
export class AuthenticationService {

  constructor(
    @Inject(forwardRef(()=> LoggerService))
    private readonly _loggerService: LoggerService) {
    }

  async login(userLoginDTO: UserLoginDTO, footlightUrl: Environment|string) {
    const url = footlightUrl + "/login";
    const data = { "email": userLoginDTO.email, "password": userLoginDTO.password };
    try {
      const loginResponse = await axios.post(url, data,
        {
          headers: {
            "accept": "*/*",
            "Content-Type": "application/json",
            "Referer": HEADER.CMS_REFERER_HEADER
          }
        }
      );
      this._loggerService.infoLogs(` User ${userLoginDTO.email} logged in successfully `)
      return { accessToken: loginResponse?.data?.accessToken };
    } catch(e) {
      this._loggerService.errorLogs(` User ${userLoginDTO.email} login failed:: ${e.message} `)
      Exception.unauthorized(` Something went wrong. ${e.message} `)
    }
    
  }
}
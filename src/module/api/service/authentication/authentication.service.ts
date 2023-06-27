import { Injectable } from "@nestjs/common";
import { UserLoginDTO } from "../../dto";
import { SERVER } from "../../config";
import axios from "axios";
import { Environment } from "../../enum/environments.enum";

@Injectable()
export class AuthenticationService {

  async login(userLoginDTO: UserLoginDTO, footlightUrl: Environment|string) {
    const url = footlightUrl + "/login";
    const data = { "email": userLoginDTO.email, "password": userLoginDTO.password };
    const loginResponse = await axios.post(url, data,
      {
        headers: {
          "accept": "*/*",
          "Content-Type": "application/json"
        }
      }
    );
    return { accessToken: loginResponse?.data?.accessToken };
  }
}
import {Injectable} from "@nestjs/common";
import {UserLoginDTO} from "../../dto/authentication/authentication.dto";
import {SERVER} from "../../config";
import axios from 'axios';

@Injectable()

export class AuthenticationService {

    async login(userLoginDTO: UserLoginDTO) {
        const url = SERVER.FOOTLIGHT_API_BASE_URL + '/login'
        const data = {"email": userLoginDTO.email,"password": userLoginDTO.password}
        const loginResponse = await axios.post(url, data,
            {
                headers: {
                    'accept': '*/*',
                    'Content-Type': 'application/json'
                }
            }
        );
        return {accessToken: loginResponse?.data?.accessToken}
    }
}
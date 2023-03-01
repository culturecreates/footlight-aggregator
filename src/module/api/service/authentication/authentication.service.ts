import {Injectable} from "@nestjs/common";
import {UserLoginDTO} from "../../dto/authentication/authentication.dto";
import {SERVER} from "../../config";

@Injectable()

export class AuthenticationService {

    async login(userLoginDTO: UserLoginDTO) {
        const url = SERVER.FOOTLIGHT_API_BASE_URL + '/login'
        const loginResponse = await fetch(url, {
            body: `{"email": "${userLoginDTO.email}","password": "${userLoginDTO.password}"}`,
            headers: {
                Accept: "*/*",
                "Content-Type": "application/json"
            },
            method: "POST"
        }).then(data => {
            return data.json();
        })
        return {accessToken: loginResponse.accessToken}
    }
}
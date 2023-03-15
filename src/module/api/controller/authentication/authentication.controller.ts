import {Body, Controller, Inject, Post} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {AuthenticationService} from "../../service/authentication";
import {UserLoginDTO} from "../../dto/authentication/authentication.dto";


@ApiTags('Authentication API')
@Controller()
export class AuthenticationController {
    constructor(
        @Inject(AuthenticationService)
        private readonly _authenticationService: AuthenticationService) {
    }

    @ApiOperation({summary: 'User Authentication to footlight admin'})
    @Post('login')
    async login(@Body() userLoginDTO: UserLoginDTO) {
        return this._authenticationService.login(userLoginDTO);
    }
}

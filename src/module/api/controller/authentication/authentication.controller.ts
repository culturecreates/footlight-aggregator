import { Body, Controller, Inject, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuthenticationService } from "../../service";
import { UserLoginDTO } from "../../dto";
import { Environment } from "../../enum/environments.enum";


@ApiTags("Authentication API")
@Controller()
export class AuthenticationController {
  constructor(
    @Inject(AuthenticationService)
    private readonly _authenticationService: AuthenticationService) {
  }

  @ApiOperation({ summary: "User Authentication to footlight admin" })
  @Post("login")
  @ApiQuery({
    name: "footlight-base-url",
    description: "Select the environment",
    required: true,
    enum: Object.values(Environment)
  })
  async login(@Body() userLoginDTO: UserLoginDTO,
              @Query("footlight-base-url") footlightBaseUrl: Environment) {
    return this._authenticationService.login(userLoginDTO, footlightBaseUrl);
  }
}

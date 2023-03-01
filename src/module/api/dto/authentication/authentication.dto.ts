import {ApiProperty} from "@nestjs/swagger";

export class UserLoginDTO {
    @ApiProperty()
    email: string;
    @ApiProperty()
    password: string;
}

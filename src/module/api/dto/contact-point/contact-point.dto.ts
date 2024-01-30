import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {MultilingualString, UriString} from "../../model";

export class ContactPointDTO {
    @ApiProperty({type: MultilingualString})
    name?: MultilingualString;

    @ApiPropertyOptional({type: MultilingualString})
    description?: MultilingualString;

    @ApiPropertyOptional({type: UriString})
    url?: UriString;

    @ApiPropertyOptional()
    email?: string;

    @ApiPropertyOptional()
    telephone?: string;
}

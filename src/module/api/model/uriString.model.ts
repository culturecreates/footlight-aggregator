import { ApiProperty } from '@nestjs/swagger';

export class UriString {
  @ApiProperty()
  uri: string;
}

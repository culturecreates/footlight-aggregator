import { ApiPropertyOptional } from '@nestjs/swagger';

export class Geo {
  @ApiPropertyOptional()
  latitude: string;

  @ApiPropertyOptional()
  longitude: string;
}

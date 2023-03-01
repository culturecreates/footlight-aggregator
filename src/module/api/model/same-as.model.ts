import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SameAs {
  @ApiProperty()
  uri: string;

  @ApiPropertyOptional()
  type: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';

export class MultilingualString {
  @ApiPropertyOptional()
  en: string;

  @ApiPropertyOptional()
  fr: string;
}

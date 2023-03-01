import { ApiProperty } from '@nestjs/swagger';

export class IdentifierString {
  @ApiProperty()
  entityId: string;
}

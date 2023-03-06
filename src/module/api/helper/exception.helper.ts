import {InternalServerErrorException, UnauthorizedException} from '@nestjs/common';

/**
 * @description The error class that help to throw when exception occurs.
 */
export class Exception {

    static unauthorized(msg: string) {
        throw new UnauthorizedException(msg);
    }

    static internalServerError(msg: string) {
        throw new InternalServerErrorException(msg);
    }

}

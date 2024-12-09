import { BadRequestException, InternalServerErrorException, PreconditionFailedException, UnauthorizedException } from "@nestjs/common";

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

    static badRequest(msg: string) {
        throw new BadRequestException(msg);
    }

    static preconditionFailed(msg: string) {
        throw new PreconditionFailedException(msg);
    }

}

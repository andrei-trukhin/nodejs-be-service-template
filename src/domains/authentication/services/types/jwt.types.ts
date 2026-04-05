import {defineDto, field, InferDto} from "bookish-potato-dto";

export const JwtTokenPayload = defineDto({
    /**
     * Expiration time.
     */
    exp: field.number(),
    /**
     * Issued at time.
     */
    iat: field.number(),
    scope: field.string(),
    sub: field.string(),
});

export type JwtTokenPayload = InferDto<typeof JwtTokenPayload>;

export type VerificationResult = {
    /**
     * Provided token payload if verification was successful.
     */
    jwtPayload: JwtTokenPayload | null,
    /**
     * Verification error if verification failed: jwtPayload will be null in this case except for EXPIRED_TOKEN, which will contain the valid payload.
     */
    error: VerificationError | null
}

export enum VerificationError {
    INVALID_TOKEN = 'Invalid token',
    EXPIRED_TOKEN = 'Token expired',
    TOKEN_NOT_PROVIDED = 'Token not provided',
    INVALID_PAYLOAD = 'Invalid payload'
}


import {defineDto, field, InferDto, ParsingError} from "bookish-potato-dto";

export enum JwtHashAlgorithm {
    SHA256 = 'sha256',
    SHA512 = 'sha512'
}

/**
 * Configuration for authentication service.
 */
export const AuthConfig = defineDto({
    /**
     * Used for token hashing.
     */
    JWT_SECRET: field.string({minLength: 16}),
    /**
     * Used for hashing tokens.
     * TOKEN_HASH_PEPPER is an additional secret that being used to hash tokens, providing an extra layer of security.
     * It should be a random string of sufficient length (e.g., 16-64 characters) and kept secret.
     * Provided as a comma-separated list of strings,
     *  allowing for multiple peppers to be used and rotated over time without invalidating existing tokens.
     * The first pepper in the list will be used for hashing new tokens,
     *  while all peppers will be accepted for verifying existing tokens.
     */
    TOKEN_HASH_PEPPER: field.custom<string[]>({
        parser: {
            parse: (value: unknown) => {
                if (typeof value !== 'string') {
                    throw new ParsingError('TOKEN_HASH_PEPPER must be a comma separated array string.');
                }
                if (value.trim() === '') {
                    throw new ParsingError('TOKEN_HASH_PEPPER cannot be an empty string.');
                }
                return value.split(',').map(s => s.trim());
            },
        },
    }),
    /**
     * Algorithm used for hashing tokens.
     */
    JWT_HASH_ALGORITHM: field.enum(JwtHashAlgorithm, {
        defaultValue: JwtHashAlgorithm.SHA256,
        useDefaultValueOnParseError: true,
    }),
    /**
     * Used for hashing user passwords.
     */
    PASSWORD_SALT_ROUNDS: field.integer({defaultValue: 10, minValue: 4, useDefaultValueOnParseError: true}),
});

export type AuthConfig = InferDto<typeof AuthConfig>;


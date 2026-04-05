import {defineDto, field, InferDto} from "bookish-potato-dto";
import {TokenScope} from "../generated/prisma/enums";
import {statusCodeValidationMessage} from "./validation-messages";

export const CreateApiTokenDto = defineDto({
    name: field.string({minLength: 1, maxLength: 255}),
    scope: field.enum(TokenScope, {parsingErrorMessage: statusCodeValidationMessage}),
    expiresAt: field.date(),
});

export type CreateApiTokenDto = InferDto<typeof CreateApiTokenDto>;


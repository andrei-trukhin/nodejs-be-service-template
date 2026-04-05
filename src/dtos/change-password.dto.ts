import {defineDto, field, InferDto} from "bookish-potato-dto";

export const ChangePasswordDto = defineDto({
    password: field.string(),
    newPassword: field.string(),
});

export type ChangePasswordDto = InferDto<typeof ChangePasswordDto>;


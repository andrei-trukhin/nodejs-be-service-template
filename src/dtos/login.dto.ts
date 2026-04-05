import {defineDto, field, InferDto} from "bookish-potato-dto";

export const LoginDto = defineDto({
    username: field.string(),
    password: field.string(),
});

export type LoginDto = InferDto<typeof LoginDto>;


import {defineDto, field, InferDto} from "bookish-potato-dto";
import {UserRole} from "../generated/prisma/enums";

export const CreateUserDto = defineDto({
    username: field.string(),
    password: field.string(),
    role: field.enum(UserRole, {isOptional: true, defaultValue: UserRole.USER}),
});

export type CreateUserDto = InferDto<typeof CreateUserDto>;


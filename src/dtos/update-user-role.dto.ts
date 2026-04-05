import {defineDto, field, InferDto} from "bookish-potato-dto";
import {UserRole} from "../generated/prisma/enums";

export const UpdateUserRoleDto = defineDto({
    role: field.enum(UserRole),
});

export type UpdateUserRoleDto = InferDto<typeof UpdateUserRoleDto>;


import {defineDto, field, InferDto} from "bookish-potato-dto";

export const LogoutDto = defineDto({
    allDevices: field.boolean({isOptional: true}),
});

export type LogoutDto = InferDto<typeof LogoutDto>;


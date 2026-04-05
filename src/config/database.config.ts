import {defineDto, field, InferDto} from "bookish-potato-dto";

export const DatabaseConfig = defineDto({
    DATABASE_URL: field.string(),
});

export type DatabaseConfig = InferDto<typeof DatabaseConfig>;


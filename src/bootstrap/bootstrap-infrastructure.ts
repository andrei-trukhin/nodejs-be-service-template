import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "../generated/prisma/client";
import {Configuration} from "../config";
import {ApiTokensPrismaRepository, RefreshTokensPrismaRepository} from "../domains/authentication";
import {UsersPrismaRepository} from "../domains/users";


export async function bootstrapInfrastructure({ configuration }: { configuration: Configuration }) {
    const connectionString = `${configuration.databaseConfig.DATABASE_URL}`

    const adapter = new PrismaPg({ connectionString })
    const prismaClient = new PrismaClient({adapter, log: ['info', 'warn', 'error'],});

    const refreshTokensRepository = new RefreshTokensPrismaRepository(prismaClient);
    const apiTokensRepository = new ApiTokensPrismaRepository(prismaClient);
    const usersRepository = new UsersPrismaRepository(prismaClient);

    // placeholder — initialise your domain repositories here

    return {
        prismaClient,
        refreshTokensRepository,
        apiTokensRepository,
        usersRepository
    }
}


import {UsersService} from "../domains/users";
import {Configuration} from "../config";
import {bootstrapInfrastructure} from "./bootstrap-infrastructure";
import {ApiTokensService, AuthService, JwtService} from "../domains/authentication";


export async function bootstrapServices({
                                            configuration,
                                            infrastructure,
                                        }: {
    configuration: Configuration;
    infrastructure: ReturnType<typeof bootstrapInfrastructure>
}) {

    const {usersRepository, refreshTokensRepository, apiTokensRepository} = await infrastructure;

    const usersService = new UsersService(
        usersRepository,
        configuration.authConfig
    );

    const jwtService = new JwtService();

    const authService = new AuthService(
        usersService,
        refreshTokensRepository,
        jwtService,
        configuration.authConfig
    );

    const apiTokensService = new ApiTokensService(
        apiTokensRepository,
        configuration.authConfig
    );

    // placeholder — initialise your domain services here

    return {
        usersService,
        authService,
        jwtService,
        apiTokensService,
    };
}


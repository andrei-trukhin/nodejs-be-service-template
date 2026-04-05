import {Request, RequestHandler, Response, Router} from "express";
import {RouterController} from "../../router-controller.type";
import {ApiTokensService} from "../../../domains/authentication";
import {CreateApiTokenDto} from "../../../dtos";
import {methodNotAllowed, requireRole, requireScope, TypedRequest} from "../../shared";
import {validate} from "../../shared/middlewares/validate";
import {User} from "../../../domains/users";

export class ApiTokensRouter implements RouterController {

    constructor(
        private readonly apiTokensService: ApiTokensService,
        private readonly authMiddleware: RequestHandler
    ) {
    }

    getBasePath(): string {
        return '/api-tokens';
    }

    initRoutes(): Router {
        const router = Router();

        router.use(this.authMiddleware);
        router.use(requireScope(['JWT_SESSION']));

        router.route('/')
            .get(requireRole(['ADMIN']), this.listApiTokens.bind(this))
            .post(requireRole(['ADMIN']), validate(CreateApiTokenDto), this.createApiToken.bind(this))
            .all(methodNotAllowed);

        router.route('/:id')
            .delete(requireRole(['ADMIN']), this.revokeApiToken.bind(this))
            .all(methodNotAllowed);

        return router;
    }


    private async listApiTokens(req: Request, res: Response) {
        const user = res.locals.user as User;
        const targetUserId = user.id;

        const tokens = await this.apiTokensService.getUserTokens(targetUserId);

        res.status(200).json(tokens);
    }


    private async createApiToken(req: TypedRequest<CreateApiTokenDto>, res: Response) {
        const user = res.locals.user as User;

        const result = await this.apiTokensService.createApiToken({
            userId: user.id,
            name: req.body.name,
            scope: req.body.scope,
            expiresAt: req.body.expiresAt
        });

        res.status(201).json({
            id: result.entity.id,
            name: result.entity.name,
            scope: result.entity.scope,
            token: result.token,
            expiresAt: result.entity.expiresAt,
            createdAt: result.entity.createdAt
        });
    }


    private async revokeApiToken(req: Request, res: Response) {
        const actor = res.locals.user;
        const tokenId = req.params.id;

        await this.apiTokensService.authorizeTokenRevocation(actor, tokenId);
        await this.apiTokensService.revokeApiToken(tokenId);

        res.sendStatus(204);
    }
}


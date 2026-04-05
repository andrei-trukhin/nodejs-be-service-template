import {DtoDefinition, parseObject} from "bookish-potato-dto";
import {Request, Response, NextFunction} from "express";
import {BadRequestHttpError} from "../errors";

/**
 * Validate request body against DTO.
 * Middleware to validate the request body against DTO.
 * Extracted to separate middleware to allow reuse across different routes and controllers,
 *  as well as encapsulate the DTO parsing logic and parsing library.
 * @param schema DTO definition.
 */
export const validate = (schema: DtoDefinition) =>
    (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = parseObject(schema, req.body);
            next();
        } catch (error) {
            throw new BadRequestHttpError((error as Error).message);
        }
    };
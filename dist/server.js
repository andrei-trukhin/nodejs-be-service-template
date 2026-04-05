'use strict';

var node_http = require('node:http');
var bcrypt = require('bcrypt');
var tslib = require('tslib');
var bookishPotatoDto = require('bookish-potato-dto');
var node_fs = require('node:fs');
var node_path = require('node:path');
var adapterPg = require('@prisma/adapter-pg');
var runtime = require('@prisma/client/runtime/client');
var jwt = require('jsonwebtoken');
var node_crypto = require('node:crypto');
var e = require('express');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var runtime__namespace = /*#__PURE__*/_interopNamespaceDefault(runtime);

class ConsoleLogger {
    prefix;
    loggerLevel;
    constructor(prefix = '', loggerLevel) {
        this.prefix = prefix;
        this.loggerLevel = loggerLevel;
    }
    info(...data) {
        if (this.loggerLevel < 6)
            return;
        console.log(`[INFO] [${this.prefix}]`, data.join(' '));
    }
    warn(...data) {
        if (this.loggerLevel < 4)
            return;
        console.warn(`[WARN] [${this.prefix}]`, data.join(' '));
    }
    error(...data) {
        if (this.loggerLevel < 3)
            return;
        console.error(`[ERROR] [${this.prefix}]`, data.join(' '));
    }
    debug(...data) {
        if (this.loggerLevel < 7)
            return;
        console.debug(`[DEBUG] [${this.prefix}]`, data.join(' '));
    }
}

var LoggerLevel;
(function (LoggerLevel) {
    LoggerLevel["INFO"] = "info";
    LoggerLevel["WARN"] = "warn";
    LoggerLevel["ERROR"] = "error";
    LoggerLevel["DEBUG"] = "debug";
})(LoggerLevel || (LoggerLevel = {}));
function defineLoggerLevel(level) {
    switch (level) {
        case LoggerLevel.ERROR: return 3;
        case LoggerLevel.WARN: return 4;
        case LoggerLevel.INFO: return 6;
        case LoggerLevel.DEBUG: return 7;
        default: return 6;
    }
}

const loggerSeverity = defineLoggerLevel(process.env.LOGGER_LEVEL ?? LoggerLevel.INFO);
const createLogger = (name) => {
    return new ConsoleLogger(name, loggerSeverity);
};

class UniqueConstraintError extends Error {
}

class ConfigurationParsingError extends Error {
}

class InvalidCredentialsError extends Error {
}

/**
 * Thrown when a user tries to perform an action they are not authorized to perform.
 */
class ForbiddenActionError extends Error {
}

function hashPassword(password, saltRounds) {
    return bcrypt.hashSync(password, saltRounds);
}
function compareHash({ secret, hashed }) {
    return bcrypt.compareSync(secret, hashed);
}

class DatabaseConfig {
    DATABASE_URL;
}
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], DatabaseConfig.prototype, "DATABASE_URL", void 0);

class AppConfig {
    PORT;
    HOST;
    /**
     * Base path for API endpoints.
     */
    BASE_API_PATH;
    /**
     * Path for health check endpoint.
     */
    HEALTH_CHECK_PATH;
    /**
     * Username for initial admin user.
     * Application will create this user on startup if it doesn't exist yet.
     * TODO: override via env var in production
     */
    ADMIN_USERNAME;
    /**
     * Password for initial admin user.
     * Application will create this user on startup if it doesn't exist yet.
     * (!) In a production environment, make sure to change this to a strong password via environment variables.
     * TODO: override via env var in production
     */
    ADMIN_PASSWORD;
    /**
     * CORS origin configuration.
     * Specifies which origins are allowed to access the API.
     * Use '*' to allow all origins (default), or specify a specific origin like 'https://example.com'.
     * For multiple origins, use a comma-separated list.
     */
    CORS_ORIGIN;
    /**
     * CORS credentials configuration.
     * Specifies if the API should allow sharing authentication credentials (like cookies).
     */
    CORS_ALLOW_CREDENTIALS;
}
tslib.__decorate([
    bookishPotatoDto.NumberProperty({ defaultValue: 8080 })
], AppConfig.prototype, "PORT", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty({ defaultValue: '0.0.0.0' })
], AppConfig.prototype, "HOST", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty({ defaultValue: '/api' })
], AppConfig.prototype, "BASE_API_PATH", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty({ defaultValue: '/health' })
], AppConfig.prototype, "HEALTH_CHECK_PATH", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty({
        defaultValue: 'admin'
    })
], AppConfig.prototype, "ADMIN_USERNAME", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty({
        defaultValue: 'admin'
    })
], AppConfig.prototype, "ADMIN_PASSWORD", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty({
        defaultValue: '*'
    })
], AppConfig.prototype, "CORS_ORIGIN", void 0);
tslib.__decorate([
    bookishPotatoDto.BooleanProperty({
        defaultValue: false
    })
], AppConfig.prototype, "CORS_ALLOW_CREDENTIALS", void 0);

var JwtHashAlgorithm;
(function (JwtHashAlgorithm) {
    JwtHashAlgorithm["SHA256"] = "sha256";
    JwtHashAlgorithm["SHA512"] = "sha512";
})(JwtHashAlgorithm || (JwtHashAlgorithm = {}));
/**
 * Configuration for authentication service.
 */
class AuthConfig {
    /**
     * Used for token hashing.
     */
    JWT_SECRET;
    /**
     * Used for hashing tokens.
     * TOKEN_HASH_PEPPER is an additional secret that being used to hash tokens, providing an extra layer of security.
     * It should be a random string of sufficient length (e.g., 16-64 characters) and kept secret.
     * Provided as a comma-separated list of strings,
     *  allowing for multiple peppers to be used and rotated over time without invalidating existing tokens.
     * The first pepper in the list will be used for hashing new tokens,
     *  while all peppers will be accepted for verifying existing tokens.
     */
    TOKEN_HASH_PEPPER;
    /**
     * Algorithm used for hashing tokens.
     */
    JWT_HASH_ALGORITHM;
    /**
     * Used for hashing user passwords.
     */
    PASSWORD_SALT_ROUNDS;
}
tslib.__decorate([
    bookishPotatoDto.StringProperty({
        minLength: 16
    })
], AuthConfig.prototype, "JWT_SECRET", void 0);
tslib.__decorate([
    bookishPotatoDto.CustomProperty({
        parser: {
            parse: (value) => {
                if (typeof value !== 'string') {
                    throw new bookishPotatoDto.ParsingError('TOKEN_HASH_PEPPER must be a comma separated array string.');
                }
                if (value.trim() === '') {
                    throw new bookishPotatoDto.ParsingError('TOKEN_HASH_PEPPER cannot be an empty string.');
                }
                return value.split(',').map(s => s.trim());
            },
        },
    })
], AuthConfig.prototype, "TOKEN_HASH_PEPPER", void 0);
tslib.__decorate([
    bookishPotatoDto.EnumProperty(JwtHashAlgorithm, {
        defaultValue: JwtHashAlgorithm.SHA256,
        useDefaultValueOnParseError: true
    })
], AuthConfig.prototype, "JWT_HASH_ALGORITHM", void 0);
tslib.__decorate([
    bookishPotatoDto.IntegerProperty({ defaultValue: 10, minValue: 4, useDefaultValueOnParseError: true })
], AuthConfig.prototype, "PASSWORD_SALT_ROUNDS", void 0);

require('dotenv').config();
const { version } = JSON.parse(node_fs.readFileSync(node_path.join('package.json'), 'utf8'));
const secretKeys = new Set(['JWT_SECRET', 'TOKEN_HASH_PEPPER', 'DATABASE_URL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD']);
class ConfigurationsParser {
    logger = createLogger('Configuration');
    get appVersion() {
        return version;
    }
    _databaseConfig;
    get databaseConfig() {
        return this._databaseConfig;
    }
    _appConfig;
    get appConfig() {
        return this._appConfig;
    }
    _authConfig;
    get authConfig() {
        return this._authConfig;
    }
    constructor() {
        this.parse();
    }
    parse() {
        const errors = [];
        try {
            this._databaseConfig = bookishPotatoDto.parseObject(DatabaseConfig, process.env);
        }
        catch (e) {
            errors.push(e);
        }
        try {
            this._appConfig = bookishPotatoDto.parseObject(AppConfig, process.env);
        }
        catch (e) {
            errors.push(e);
        }
        try {
            this._authConfig = bookishPotatoDto.parseObject(AuthConfig, process.env);
        }
        catch (e) {
            errors.push(e);
        }
        if (errors.length > 0) {
            this.logger.error('Failed to parse configuration:', errors.map(e => e.message).join(', '));
            this.logger.error('Cannot start application due to invalid configuration.');
            throw new ConfigurationParsingError('Configuration parsing failed.');
        }
        this.logger.info('--- Using following configuration ---');
        this.logger.info('Application version:', this.appVersion);
        // Log everything except secrets
        for (const key of Object.keys(this.databaseConfig)) {
            if (secretKeys.has(key)) {
                continue;
            }
            this.logger.info(`${key}: ${this.databaseConfig[key]}`);
        }
        for (const key of Object.keys(this.appConfig)) {
            if (secretKeys.has(key)) {
                continue;
            }
            this.logger.info(`${key}: ${this.appConfig[key]}`);
        }
        this.logger.info('-----------------------------------');
    }
}

/* !!! This is code generated by Prisma. Do not edit directly. !!! */
/* eslint-disable */
// biome-ignore-all lint: generated file
// @ts-nocheck 
/*
 * WARNING: This is an internal file that is subject to change!
 *
 * 🛑 Under no circumstances should you import this file directly! 🛑
 *
 * Please import the `PrismaClient` class from the `client.ts` file instead.
 */
const config = {
    "previewFeatures": [
        "relationJoins"
    ],
    "clientVersion": "7.6.0",
    "engineVersion": "75cbdc1eb7150937890ad5465d861175c6624711",
    "activeProvider": "postgresql",
    "inlineSchema": "// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\n// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?\n// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init\n\ngenerator client {\n  provider        = \"prisma-client\"\n  output          = \"../src/generated/prisma\"\n  previewFeatures = [\"relationJoins\"]\n  runtime         = \"nodejs\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n}\n\nenum UserRole {\n  ADMIN\n  USER\n}\n\nenum TokenScope {\n  READ\n  READ_WRITE\n}\n\nmodel User {\n  id        String         @id @default(uuid())\n  username  String         @unique\n  password  String // store hashed password (e.g. bcrypt/argon2 output)\n  createdAt DateTime       @default(now())\n  updatedAt DateTime       @updatedAt\n  Token     RefreshToken[]\n  apiTokens ApiToken[]\n  role      UserRole       @default(USER)\n\n  @@map(\"users\")\n}\n\nmodel RefreshToken {\n  id          Int      @id @default(autoincrement())\n  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  userId      String\n  hashedToken String   @unique // HMAC-SHA256 hash of the token\n  expiresAt   DateTime\n  createdAt   DateTime @default(now())\n  revoked     Boolean  @default(false)\n\n  @@index([userId])\n  @@index([hashedToken], name: \"idx_token_hashed\", type: Hash)\n  @@map(\"refresh_tokens\")\n}\n\nmodel ApiToken {\n  id          String     @id @default(uuid())\n  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)\n  userId      String\n  hashedToken String     @unique // HMAC-SHA256 hash of the token\n  name        String // User-provided name for the token\n  scope       TokenScope // Permission level\n  expiresAt   DateTime\n  createdAt   DateTime   @default(now())\n  lastUsedAt  DateTime? // Tracks the last time the token was used\n\n  @@index([userId])\n  @@index([hashedToken], name: \"idx_api_token_hashed\", type: Hash)\n  @@map(\"api_tokens\")\n}\n",
    "runtimeDataModel": {
        "models": {},
        "enums": {},
        "types": {}
    },
    "parameterizationSchema": {
        "strings": [],
        "graph": ""
    }
};
config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"username\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"password\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"Token\",\"kind\":\"object\",\"type\":\"RefreshToken\",\"relationName\":\"RefreshTokenToUser\"},{\"name\":\"apiTokens\",\"kind\":\"object\",\"type\":\"ApiToken\",\"relationName\":\"ApiTokenToUser\"},{\"name\":\"role\",\"kind\":\"enum\",\"type\":\"UserRole\"}],\"dbName\":\"users\"},\"RefreshToken\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"RefreshTokenToUser\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"hashedToken\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"revoked\",\"kind\":\"scalar\",\"type\":\"Boolean\"}],\"dbName\":\"refresh_tokens\"},\"ApiToken\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ApiTokenToUser\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"hashedToken\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scope\",\"kind\":\"enum\",\"type\":\"TokenScope\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"lastUsedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"api_tokens\"}},\"enums\":{},\"types\":{}}");
config.parameterizationSchema = {
    strings: JSON.parse("[\"where\",\"orderBy\",\"cursor\",\"user\",\"Token\",\"apiTokens\",\"_count\",\"User.findUnique\",\"User.findUniqueOrThrow\",\"User.findFirst\",\"User.findFirstOrThrow\",\"User.findMany\",\"data\",\"User.createOne\",\"User.createMany\",\"User.createManyAndReturn\",\"User.updateOne\",\"User.updateMany\",\"User.updateManyAndReturn\",\"create\",\"update\",\"User.upsertOne\",\"User.deleteOne\",\"User.deleteMany\",\"having\",\"_min\",\"_max\",\"User.groupBy\",\"User.aggregate\",\"RefreshToken.findUnique\",\"RefreshToken.findUniqueOrThrow\",\"RefreshToken.findFirst\",\"RefreshToken.findFirstOrThrow\",\"RefreshToken.findMany\",\"RefreshToken.createOne\",\"RefreshToken.createMany\",\"RefreshToken.createManyAndReturn\",\"RefreshToken.updateOne\",\"RefreshToken.updateMany\",\"RefreshToken.updateManyAndReturn\",\"RefreshToken.upsertOne\",\"RefreshToken.deleteOne\",\"RefreshToken.deleteMany\",\"_avg\",\"_sum\",\"RefreshToken.groupBy\",\"RefreshToken.aggregate\",\"ApiToken.findUnique\",\"ApiToken.findUniqueOrThrow\",\"ApiToken.findFirst\",\"ApiToken.findFirstOrThrow\",\"ApiToken.findMany\",\"ApiToken.createOne\",\"ApiToken.createMany\",\"ApiToken.createManyAndReturn\",\"ApiToken.updateOne\",\"ApiToken.updateMany\",\"ApiToken.updateManyAndReturn\",\"ApiToken.upsertOne\",\"ApiToken.deleteOne\",\"ApiToken.deleteMany\",\"ApiToken.groupBy\",\"ApiToken.aggregate\",\"AND\",\"OR\",\"NOT\",\"id\",\"userId\",\"hashedToken\",\"name\",\"TokenScope\",\"scope\",\"expiresAt\",\"createdAt\",\"lastUsedAt\",\"equals\",\"in\",\"notIn\",\"lt\",\"lte\",\"gt\",\"gte\",\"not\",\"contains\",\"startsWith\",\"endsWith\",\"revoked\",\"username\",\"password\",\"updatedAt\",\"UserRole\",\"role\",\"every\",\"some\",\"none\",\"is\",\"isNot\",\"connectOrCreate\",\"upsert\",\"createMany\",\"set\",\"disconnect\",\"delete\",\"connect\",\"updateMany\",\"deleteMany\",\"increment\",\"decrement\",\"multiply\",\"divide\"]"),
    graph: "uAEcMAsEAABuACAFAABvACA_AABqADBAAAAOABBBAABqADBCAQAAAAFJQABsACFXAQAAAAFYAQBrACFZQABsACFbAABtWyIBAAAAAQAgCgMAAHMAID8AAHQAMEAAAAMAEEEAAHQAMEICAHYAIUMBAGsAIUQBAGsAIUhAAGwAIUlAAGwAIVYgAHUAIQEDAACsAQAgCgMAAHMAID8AAHQAMEAAAAMAEEEAAHQAMEICAAAAAUMBAGsAIUQBAAAAAUhAAGwAIUlAAGwAIVYgAHUAIQMAAAADACABAAAEADACAAAFACAMAwAAcwAgPwAAcAAwQAAABwAQQQAAcAAwQgEAawAhQwEAawAhRAEAawAhRQEAawAhRwAAcUciSEAAbAAhSUAAbAAhSkAAcgAhAgMAAKwBACBKAAB3ACAMAwAAcwAgPwAAcAAwQAAABwAQQQAAcAAwQgEAAAABQwEAawAhRAEAAAABRQEAawAhRwAAcUciSEAAbAAhSUAAbAAhSkAAcgAhAwAAAAcAIAEAAAgAMAIAAAkAIAEAAAADACABAAAABwAgAQAAAAEAIAsEAABuACAFAABvACA_AABqADBAAAAOABBBAABqADBCAQBrACFJQABsACFXAQBrACFYAQBrACFZQABsACFbAABtWyICBAAAqgEAIAUAAKsBACADAAAADgAgAQAADwAwAgAAAQAgAwAAAA4AIAEAAA8AMAIAAAEAIAMAAAAOACABAAAPADACAAABACAIBAAAqAEAIAUAAKkBACBCAQAAAAFJQAAAAAFXAQAAAAFYAQAAAAFZQAAAAAFbAAAAWwIBDAAAEwAgBkIBAAAAAUlAAAAAAVcBAAAAAVgBAAAAAVlAAAAAAVsAAABbAgEMAAAVADABDAAAFQAwCAQAAI4BACAFAACPAQAgQgEAewAhSUAAfQAhVwEAewAhWAEAewAhWUAAfQAhWwAAjQFbIgIAAAABACAMAAAYACAGQgEAewAhSUAAfQAhVwEAewAhWAEAewAhWUAAfQAhWwAAjQFbIgIAAAAOACAMAAAaACACAAAADgAgDAAAGgAgAwAAAAEAIBMAABMAIBQAABgAIAEAAAABACABAAAADgAgAwYAAIoBACAZAACMAQAgGgAAiwEAIAk_AABmADBAAAAhABBBAABmADBCAQBRACFJQABTACFXAQBRACFYAQBRACFZQABTACFbAABnWyIDAAAADgAgAQAAIAAwGAAAIQAgAwAAAA4AIAEAAA8AMAIAAAEAIAEAAAAFACABAAAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAMAAAADACABAAAEADACAAAFACADAAAAAwAgAQAABAAwAgAABQAgBwMAAIkBACBCAgAAAAFDAQAAAAFEAQAAAAFIQAAAAAFJQAAAAAFWIAAAAAEBDAAAKQAgBkICAAAAAUMBAAAAAUQBAAAAAUhAAAAAAUlAAAAAAVYgAAAAAQEMAAArADABDAAAKwAwBwMAAIgBACBCAgCHAQAhQwEAewAhRAEAewAhSEAAfQAhSUAAfQAhViAAhgEAIQIAAAAFACAMAAAuACAGQgIAhwEAIUMBAHsAIUQBAHsAIUhAAH0AIUlAAH0AIVYgAIYBACECAAAAAwAgDAAAMAAgAgAAAAMAIAwAADAAIAMAAAAFACATAAApACAUAAAuACABAAAABQAgAQAAAAMAIAUGAACBAQAgGQAAhAEAIBoAAIMBACArAACCAQAgLAAAhQEAIAk_AABfADBAAAA3ABBBAABfADBCAgBgACFDAQBRACFEAQBRACFIQABTACFJQABTACFWIABhACEDAAAAAwAgAQAANgAwGAAANwAgAwAAAAMAIAEAAAQAMAIAAAUAIAEAAAAJACABAAAACQAgAwAAAAcAIAEAAAgAMAIAAAkAIAMAAAAHACABAAAIADACAAAJACADAAAABwAgAQAACAAwAgAACQAgCQMAAIABACBCAQAAAAFDAQAAAAFEAQAAAAFFAQAAAAFHAAAARwJIQAAAAAFJQAAAAAFKQAAAAAEBDAAAPwAgCEIBAAAAAUMBAAAAAUQBAAAAAUUBAAAAAUcAAABHAkhAAAAAAUlAAAAAAUpAAAAAAQEMAABBADABDAAAQQAwCQMAAH8AIEIBAHsAIUMBAHsAIUQBAHsAIUUBAHsAIUcAAHxHIkhAAH0AIUlAAH0AIUpAAH4AIQIAAAAJACAMAABEACAIQgEAewAhQwEAewAhRAEAewAhRQEAewAhRwAAfEciSEAAfQAhSUAAfQAhSkAAfgAhAgAAAAcAIAwAAEYAIAIAAAAHACAMAABGACADAAAACQAgEwAAPwAgFAAARAAgAQAAAAkAIAEAAAAHACAEBgAAeAAgGQAAegAgGgAAeQAgSgAAdwAgCz8AAFAAMEAAAE0AEEEAAFAAMEIBAFEAIUMBAFEAIUQBAFEAIUUBAFEAIUcAAFJHIkhAAFMAIUlAAFMAIUpAAFQAIQMAAAAHACABAABMADAYAABNACADAAAABwAgAQAACAAwAgAACQAgCz8AAFAAMEAAAE0AEEEAAFAAMEIBAFEAIUMBAFEAIUQBAFEAIUUBAFEAIUcAAFJHIkhAAFMAIUlAAFMAIUpAAFQAIQ4GAABZACAZAABeACAaAABeACBLAQAAAAFMAQAAAARNAQAAAAROAQAAAAFPAQAAAAFQAQAAAAFRAQAAAAFSAQBdACFTAQAAAAFUAQAAAAFVAQAAAAEHBgAAWQAgGQAAXAAgGgAAXAAgSwAAAEcCTAAAAEcITQAAAEcIUgAAW0ciCwYAAFkAIBkAAFoAIBoAAFoAIEtAAAAAAUxAAAAABE1AAAAABE5AAAAAAU9AAAAAAVBAAAAAAVFAAAAAAVJAAFgAIQsGAABWACAZAABXACAaAABXACBLQAAAAAFMQAAAAAVNQAAAAAVOQAAAAAFPQAAAAAFQQAAAAAFRQAAAAAFSQABVACELBgAAVgAgGQAAVwAgGgAAVwAgS0AAAAABTEAAAAAFTUAAAAAFTkAAAAABT0AAAAABUEAAAAABUUAAAAABUkAAVQAhCEsCAAAAAUwCAAAABU0CAAAABU4CAAAAAU8CAAAAAVACAAAAAVECAAAAAVICAFYAIQhLQAAAAAFMQAAAAAVNQAAAAAVOQAAAAAFPQAAAAAFQQAAAAAFRQAAAAAFSQABXACELBgAAWQAgGQAAWgAgGgAAWgAgS0AAAAABTEAAAAAETUAAAAAETkAAAAABT0AAAAABUEAAAAABUUAAAAABUkAAWAAhCEsCAAAAAUwCAAAABE0CAAAABE4CAAAAAU8CAAAAAVACAAAAAVECAAAAAVICAFkAIQhLQAAAAAFMQAAAAARNQAAAAAROQAAAAAFPQAAAAAFQQAAAAAFRQAAAAAFSQABaACEHBgAAWQAgGQAAXAAgGgAAXAAgSwAAAEcCTAAAAEcITQAAAEcIUgAAW0ciBEsAAABHAkwAAABHCE0AAABHCFIAAFxHIg4GAABZACAZAABeACAaAABeACBLAQAAAAFMAQAAAARNAQAAAAROAQAAAAFPAQAAAAFQAQAAAAFRAQAAAAFSAQBdACFTAQAAAAFUAQAAAAFVAQAAAAELSwEAAAABTAEAAAAETQEAAAAETgEAAAABTwEAAAABUAEAAAABUQEAAAABUgEAXgAhUwEAAAABVAEAAAABVQEAAAABCT8AAF8AMEAAADcAEEEAAF8AMEICAGAAIUMBAFEAIUQBAFEAIUhAAFMAIUlAAFMAIVYgAGEAIQ0GAABZACAZAABZACAaAABZACArAABlACAsAABZACBLAgAAAAFMAgAAAARNAgAAAAROAgAAAAFPAgAAAAFQAgAAAAFRAgAAAAFSAgBkACEFBgAAWQAgGQAAYwAgGgAAYwAgSyAAAAABUiAAYgAhBQYAAFkAIBkAAGMAIBoAAGMAIEsgAAAAAVIgAGIAIQJLIAAAAAFSIABjACENBgAAWQAgGQAAWQAgGgAAWQAgKwAAZQAgLAAAWQAgSwIAAAABTAIAAAAETQIAAAAETgIAAAABTwIAAAABUAIAAAABUQIAAAABUgIAZAAhCEsIAAAAAUwIAAAABE0IAAAABE4IAAAAAU8IAAAAAVAIAAAAAVEIAAAAAVIIAGUAIQk_AABmADBAAAAhABBBAABmADBCAQBRACFJQABTACFXAQBRACFYAQBRACFZQABTACFbAABnWyIHBgAAWQAgGQAAaQAgGgAAaQAgSwAAAFsCTAAAAFsITQAAAFsIUgAAaFsiBwYAAFkAIBkAAGkAIBoAAGkAIEsAAABbAkwAAABbCE0AAABbCFIAAGhbIgRLAAAAWwJMAAAAWwhNAAAAWwhSAABpWyILBAAAbgAgBQAAbwAgPwAAagAwQAAADgAQQQAAagAwQgEAawAhSUAAbAAhVwEAawAhWAEAawAhWUAAbAAhWwAAbVsiC0sBAAAAAUwBAAAABE0BAAAABE4BAAAAAU8BAAAAAVABAAAAAVEBAAAAAVIBAF4AIVMBAAAAAVQBAAAAAVUBAAAAAQhLQAAAAAFMQAAAAARNQAAAAAROQAAAAAFPQAAAAAFQQAAAAAFRQAAAAAFSQABaACEESwAAAFsCTAAAAFsITQAAAFsIUgAAaVsiA1wAAAMAIF0AAAMAIF4AAAMAIANcAAAHACBdAAAHACBeAAAHACAMAwAAcwAgPwAAcAAwQAAABwAQQQAAcAAwQgEAawAhQwEAawAhRAEAawAhRQEAawAhRwAAcUciSEAAbAAhSUAAbAAhSkAAcgAhBEsAAABHAkwAAABHCE0AAABHCFIAAFxHIghLQAAAAAFMQAAAAAVNQAAAAAVOQAAAAAFPQAAAAAFQQAAAAAFRQAAAAAFSQABXACENBAAAbgAgBQAAbwAgPwAAagAwQAAADgAQQQAAagAwQgEAawAhSUAAbAAhVwEAawAhWAEAawAhWUAAbAAhWwAAbVsiXwAADgAgYAAADgAgCgMAAHMAID8AAHQAMEAAAAMAEEEAAHQAMEICAHYAIUMBAGsAIUQBAGsAIUhAAGwAIUlAAGwAIVYgAHUAIQJLIAAAAAFSIABjACEISwIAAAABTAIAAAAETQIAAAAETgIAAAABTwIAAAABUAIAAAABUQIAAAABUgIAWQAhAAAAAAFkAQAAAAEBZAAAAEcCAWRAAAAAAQFkQAAAAAEFEwAAtAEAIBQAALcBACBhAAC1AQAgYgAAtgEAIGcAAAEAIAMTAAC0AQAgYQAAtQEAIGcAAAEAIAAAAAAAAWQgAAAAAQVkAgAAAAFqAgAAAAFrAgAAAAFsAgAAAAFtAgAAAAEFEwAArwEAIBQAALIBACBhAACwAQAgYgAAsQEAIGcAAAEAIAMTAACvAQAgYQAAsAEAIGcAAAEAIAAAAAFkAAAAWwILEwAAnAEAMBQAAKEBADBhAACdAQAwYgAAngEAMGMAAJ8BACBkAACgAQAwZQAAoAEAMGYAAKABADBnAACgAQAwaAAAogEAMGkAAKMBADALEwAAkAEAMBQAAJUBADBhAACRAQAwYgAAkgEAMGMAAJMBACBkAACUAQAwZQAAlAEAMGYAAJQBADBnAACUAQAwaAAAlgEAMGkAAJcBADAHQgEAAAABRAEAAAABRQEAAAABRwAAAEcCSEAAAAABSUAAAAABSkAAAAABAgAAAAkAIBMAAJsBACADAAAACQAgEwAAmwEAIBQAAJoBACABDAAArgEAMAwDAABzACA_AABwADBAAAAHABBBAABwADBCAQAAAAFDAQBrACFEAQAAAAFFAQBrACFHAABxRyJIQABsACFJQABsACFKQAByACECAAAACQAgDAAAmgEAIAIAAACYAQAgDAAAmQEAIAs_AACXAQAwQAAAmAEAEEEAAJcBADBCAQBrACFDAQBrACFEAQBrACFFAQBrACFHAABxRyJIQABsACFJQABsACFKQAByACELPwAAlwEAMEAAAJgBABBBAACXAQAwQgEAawAhQwEAawAhRAEAawAhRQEAawAhRwAAcUciSEAAbAAhSUAAbAAhSkAAcgAhB0IBAHsAIUQBAHsAIUUBAHsAIUcAAHxHIkhAAH0AIUlAAH0AIUpAAH4AIQdCAQB7ACFEAQB7ACFFAQB7ACFHAAB8RyJIQAB9ACFJQAB9ACFKQAB-ACEHQgEAAAABRAEAAAABRQEAAAABRwAAAEcCSEAAAAABSUAAAAABSkAAAAABBUICAAAAAUQBAAAAAUhAAAAAAUlAAAAAAVYgAAAAAQIAAAAFACATAACnAQAgAwAAAAUAIBMAAKcBACAUAACmAQAgAQwAAK0BADAKAwAAcwAgPwAAdAAwQAAAAwAQQQAAdAAwQgIAAAABQwEAawAhRAEAAAABSEAAbAAhSUAAbAAhViAAdQAhAgAAAAUAIAwAAKYBACACAAAApAEAIAwAAKUBACAJPwAAowEAMEAAAKQBABBBAACjAQAwQgIAdgAhQwEAawAhRAEAawAhSEAAbAAhSUAAbAAhViAAdQAhCT8AAKMBADBAAACkAQAQQQAAowEAMEICAHYAIUMBAGsAIUQBAGsAIUhAAGwAIUlAAGwAIVYgAHUAIQVCAgCHAQAhRAEAewAhSEAAfQAhSUAAfQAhViAAhgEAIQVCAgCHAQAhRAEAewAhSEAAfQAhSUAAfQAhViAAhgEAIQVCAgAAAAFEAQAAAAFIQAAAAAFJQAAAAAFWIAAAAAEEEwAAnAEAMGEAAJ0BADBjAACfAQAgZwAAoAEAMAQTAACQAQAwYQAAkQEAMGMAAJMBACBnAACUAQAwAAACBAAAqgEAIAUAAKsBACAFQgIAAAABRAEAAAABSEAAAAABSUAAAAABViAAAAABB0IBAAAAAUQBAAAAAUUBAAAAAUcAAABHAkhAAAAAAUlAAAAAAUpAAAAAAQcFAACpAQAgQgEAAAABSUAAAAABVwEAAAABWAEAAAABWUAAAAABWwAAAFsCAgAAAAEAIBMAAK8BACADAAAADgAgEwAArwEAIBQAALMBACAJAAAADgAgBQAAjwEAIAwAALMBACBCAQB7ACFJQAB9ACFXAQB7ACFYAQB7ACFZQAB9ACFbAACNAVsiBwUAAI8BACBCAQB7ACFJQAB9ACFXAQB7ACFYAQB7ACFZQAB9ACFbAACNAVsiBwQAAKgBACBCAQAAAAFJQAAAAAFXAQAAAAFYAQAAAAFZQAAAAAFbAAAAWwICAAAAAQAgEwAAtAEAIAMAAAAOACATAAC0AQAgFAAAuAEAIAkAAAAOACAEAACOAQAgDAAAuAEAIEIBAHsAIUlAAH0AIVcBAHsAIVgBAHsAIVlAAH0AIVsAAI0BWyIHBAAAjgEAIEIBAHsAIUlAAH0AIVcBAHsAIVgBAHsAIVlAAH0AIVsAAI0BWyIDBAYCBQoDBgAEAQMAAQEDAAECBAsABQwAAAAAAwYACRkAChoACwAAAAMGAAkZAAoaAAsBAwABAQMAAQUGABAZABMaABQrABEsABIAAAAAAAUGABAZABMaABQrABEsABIBAwABAQMAAQMGABkZABoaABsAAAADBgAZGQAaGgAbBwIBCA0BCRABChEBCxIBDRQBDhYFDxcGEBkBERsFEhwHFR0BFh4BFx8FGyIIHCMMHSQCHiUCHyYCICcCISgCIioCIywFJC0NJS8CJjEFJzIOKDMCKTQCKjUFLTgPLjkVLzoDMDsDMTwDMj0DMz4DNEADNUIFNkMWN0UDOEcFOUgXOkkDO0oDPEsFPU4YPk8c"
};
async function decodeBase64AsWasm(wasmBase64) {
    const { Buffer } = await import('node:buffer');
    const wasmArray = Buffer.from(wasmBase64, 'base64');
    return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
    getRuntime: async () => await import('@prisma/client/runtime/query_compiler_fast_bg.postgresql.js'),
    getQueryCompilerWasmModule: async () => {
        const { wasm } = await import('@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.js');
        return await decodeBase64AsWasm(wasm);
    },
    importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
    return runtime__namespace.getPrismaClient(config);
}

/* !!! This is code generated by Prisma. Do not edit directly. !!! */
/* eslint-disable */
// biome-ignore-all lint: generated file
// @ts-nocheck 
/*
 * WARNING: This is an internal file that is subject to change!
 *
 * 🛑 Under no circumstances should you import this file directly! 🛑
 *
 * All exports from this file are wrapped under a `Prisma` namespace object in the client.ts file.
 * While this enables partial backward compatibility, it is not part of the stable public API.
 *
 * If you are looking for your Models, Enums, and Input Types, please import them from the respective
 * model files in the `model` directory!
 */
runtime__namespace.Extensions.getExtensionContext;
({
    DbNull: runtime__namespace.NullTypes.DbNull,
    JsonNull: runtime__namespace.NullTypes.JsonNull,
    AnyNull: runtime__namespace.NullTypes.AnyNull,
});
/**
 * Enums
 */
runtime__namespace.makeStrictEnum({
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
});
runtime__namespace.Extensions.defineExtension;

/* !!! This is code generated by Prisma. Do not edit directly. !!! */
/* eslint-disable */
// biome-ignore-all lint: generated file
// @ts-nocheck 
/*
* This file exports all enum related types from the schema.
*
* 🟢 You can import this file directly.
*/
const UserRole = {
    ADMIN: 'ADMIN',
    USER: 'USER'
};
const TokenScope = {
    READ: 'READ',
    READ_WRITE: 'READ_WRITE'
};

/* !!! This is code generated by Prisma. Do not edit directly. !!! */
/* eslint-disable */
// biome-ignore-all lint: generated file
// @ts-nocheck 
/*
 * This file should be your main import to use Prisma. Through it you get access to all the models, enums, and input types.
 * If you're looking for something you can import in the client-side of your application, please refer to the `browser.ts` file instead.
 *
 * 🟢 You can import this file directly.
 */
/**
 * ## Prisma Client
 *
 * Type-safe database client for TypeScript
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
const PrismaClient = getPrismaClientClass();

class JwtTokenPayload {
    /**
     * Expiration time.
     */
    exp;
    /**
     * Issued at time.
     */
    iat;
    scope;
    sub;
}
tslib.__decorate([
    bookishPotatoDto.NumberProperty()
], JwtTokenPayload.prototype, "exp", void 0);
tslib.__decorate([
    bookishPotatoDto.NumberProperty()
], JwtTokenPayload.prototype, "iat", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], JwtTokenPayload.prototype, "scope", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], JwtTokenPayload.prototype, "sub", void 0);
var VerificationError;
(function (VerificationError) {
    VerificationError["INVALID_TOKEN"] = "Invalid token";
    VerificationError["EXPIRED_TOKEN"] = "Token expired";
    VerificationError["TOKEN_NOT_PROVIDED"] = "Token not provided";
    VerificationError["INVALID_PAYLOAD"] = "Invalid payload";
})(VerificationError || (VerificationError = {}));

class JwtService {
    static EXPIRES_IN = 1000 * 60 * 15; // 15 minutes
    sign(secret, payload) {
        const expireDate = new Date(Date.now() + JwtService.EXPIRES_IN);
        return {
            token: jwt.sign({
                scope: 'access',
                ...payload
            }, secret, {
                expiresIn: JwtService.EXPIRES_IN / 1000 // jwt library expects expiresIn in seconds
            }),
            expireDate: expireDate,
            expiresIn: JwtService.EXPIRES_IN
        };
    }
    verify({ token, secret }) {
        try {
            const payload = jwt.verify(token, secret);
            return this.handlePayloadParsingError(payload);
        }
        catch (e) {
            if (e instanceof jwt.TokenExpiredError) {
                const payload = jwt.verify(token, secret, {
                    ignoreExpiration: true
                });
                const result = this.handlePayloadParsingError(payload);
                if (result.error === null) {
                    return {
                        jwtPayload: result.jwtPayload,
                        error: VerificationError.EXPIRED_TOKEN
                    };
                }
                return result;
            }
            if (e instanceof jwt.JsonWebTokenError) {
                return { jwtPayload: null, error: VerificationError.INVALID_TOKEN };
            }
            return { jwtPayload: null, error: VerificationError.TOKEN_NOT_PROVIDED };
        }
    }
    handlePayloadParsingError(payload) {
        try {
            const parsedPayload = bookishPotatoDto.parseObject(JwtTokenPayload, payload);
            return {
                error: null,
                jwtPayload: parsedPayload
            };
        }
        catch (e) {
            if (e instanceof bookishPotatoDto.ParsingError) {
                return {
                    jwtPayload: null,
                    error: VerificationError.INVALID_PAYLOAD
                };
            }
            console.error('Unexpected error while parsing JWT payload:', e);
            throw e;
        }
    }
}

/**
 * Hashes a token using HMAC with a given algorithm and pepper.
 * @param token Raw token string.
 * @param algorithm Hashing algorithm (e.g., 'sha256').
 * @param pepper Secret pepper.
 */
function hashToken(token, algorithm, pepper) {
    return node_crypto.createHmac(algorithm, pepper)
        .update(token)
        .digest('hex');
}
/**
 * Tries to find a token in the repository using a list of peppers.
 * @param token Raw token string.
 * @param repository Token repository.
 * @param algorithm Hashing algorithm.
 * @param peppers Array of peppers to try.
 */
async function findToken(token, repository, algorithm, peppers) {
    for (const pepper of peppers) {
        const hashedToken = hashToken(token, algorithm, pepper);
        const tokenEntity = await repository.findByToken(hashedToken);
        if (tokenEntity)
            return tokenEntity;
    }
}

class RefreshTokenReuseError extends Error {
}

/**
 * Thrown when an API token is invalid or expired.
 */
class InvalidApiTokenError extends Error {
}

/**
 * Thrown when an API token is not found.
 */
class ApiTokenNotFoundError extends Error {
    constructor(message = 'API token not found') {
        super(message);
        this.name = 'ApiTokenNotFoundError';
    }
}

class ApiTokensService {
    apiTokensRepository;
    authConfig;
    logger = createLogger('ApiTokensService');
    static TOKEN_BYTE_SIZE = 32;
    constructor(apiTokensRepository, authConfig) {
        this.apiTokensRepository = apiTokensRepository;
        this.authConfig = authConfig;
    }
    /**
     * Validates if the user is authorized to revoke an API token.
     * @param actor User who is performing the action.
     * @param tokenId ID of the token being revoked.
     * @throws ForbiddenActionError if the actor is not authorized.
     * @throws ApiTokenNotFoundError if the token is not found.
     */
    async authorizeTokenRevocation(actor, tokenId) {
        const token = await this.apiTokensRepository.findById(tokenId);
        if (!token) {
            throw new ApiTokenNotFoundError();
        }
        if (actor.id !== token.userId) {
            throw new ForbiddenActionError('You are not authorized to revoke an API token of another user.');
        }
    }
    /**
     * Returns all API tokens for a user.
     * @param userId
     */
    async getUserTokens(userId) {
        const tokens = await this.apiTokensRepository.findByUserId(userId);
        return tokens.map(({ hashedToken, ...rest }) => rest);
    }
    async createApiToken(params) {
        const rawToken = node_crypto.randomBytes(ApiTokensService.TOKEN_BYTE_SIZE).toString('hex');
        const hashedToken = hashToken(rawToken, this.authConfig.JWT_HASH_ALGORITHM, this.authConfig.TOKEN_HASH_PEPPER[0]);
        try {
            const entity = await this.apiTokensRepository.save({
                userId: params.userId,
                name: params.name,
                scope: params.scope,
                expiresAt: params.expiresAt,
                hashedToken
            });
            return {
                token: rawToken,
                entity
            };
        }
        catch (e) {
            this.logger.error('Error while saving API token:', e.message);
            throw new Error('Error while saving API token');
        }
    }
    /**
     * Revokes an API token.
     * @param tokenId
     */
    async revokeApiToken(tokenId) {
        await this.apiTokensRepository.deleteById(tokenId);
    }
    async validateApiToken(rawToken) {
        const token = await findToken(rawToken, this.apiTokensRepository, this.authConfig.JWT_HASH_ALGORITHM, this.authConfig.TOKEN_HASH_PEPPER);
        if (!token) {
            throw new InvalidApiTokenError('Invalid or not found API token');
        }
        if (token.expiresAt && token.expiresAt < new Date()) {
            throw new InvalidApiTokenError('API token has expired');
        }
        return token;
    }
}

class AuthService {
    usersService;
    refreshTokenRepository;
    jwtService;
    authConfig;
    logger = createLogger('AuthService');
    static TOKEN_BYTE_SIZE = 32;
    static TOKEN_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 3; // 3 days
    constructor(usersService, refreshTokenRepository, jwtService, authConfig) {
        this.usersService = usersService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.authConfig = authConfig;
    }
    /**
     * Logs in a user with given credentials.
     * Returns null if credentials are invalid.
     * @param credentials User credentials.
     * @return Authentication result with refresh token and user info, or null if credentials are invalid.
     * @throws InvalidCredentialsError if the credentials are invalid.
     */
    async login(credentials) {
        const user = await this.usersService.findByUsername(credentials.username);
        if (!user) {
            throw new InvalidCredentialsError('Invalid credentials');
        }
        if (!compareHash({
            secret: credentials.password,
            hashed: user.password
        })) {
            this.logger.info(`Authentication failed with username ${credentials.username}`);
            throw new InvalidCredentialsError('Invalid credentials');
        }
        this.logger.info(`Login with user with ID ${user.id} succeeded.`);
        return {
            user,
            refreshToken: await this.createRefreshTokenForUser(user.id),
            jwt: await this.createJwtTokenForUser(user.id)
        };
    }
    async createRefreshTokenForUser(userId) {
        // Create random token for refresh token
        const refreshToken = node_crypto.randomBytes(AuthService.TOKEN_BYTE_SIZE).toString('hex');
        const hashedToken = hashToken(refreshToken, this.authConfig.JWT_HASH_ALGORITHM, this.authConfig.TOKEN_HASH_PEPPER[0]);
        const expiresAt = new Date(Date.now() + AuthService.TOKEN_EXPIRES_IN_MS);
        try {
            const token = await this.refreshTokenRepository.save({
                hashedToken,
                expiresAt,
                userId
            });
            this.logger.info(`Issued new refresh token with id ${token.id} for user ${userId}, expires at ${expiresAt.toISOString()}.`);
        }
        catch (e) {
            this.logger.error('Error while saving JWT token:', e.message);
            throw new Error('Error while saving JWT token');
        }
        return {
            refreshToken,
            expiresIn: AuthService.TOKEN_EXPIRES_IN_MS / 1000
        };
    }
    /**
     * Logs out a user by deleting the refresh token.
     * If allDevices are true, deletes all refresh tokens for the user.
     * @param token
     * @param allDevices
     */
    async logout(token, allDevices = false) {
        const foundToken = await findToken(token, this.refreshTokenRepository, this.authConfig.JWT_HASH_ALGORITHM, this.authConfig.TOKEN_HASH_PEPPER);
        if (!foundToken)
            return;
        if (!allDevices) {
            await this.refreshTokenRepository.deleteById(foundToken.id);
            this.logger.info(`Logged out refresh token with id ${foundToken.id} for user ${foundToken.userId}.`);
            return;
        }
        await this.removeAllUserTokens(foundToken.userId);
        this.logger.info(`Logging out all devices for user ${foundToken.userId} by deleting all refresh tokens.`);
    }
    async removeAllUserTokens(userId) {
        const userTokens = await this.refreshTokenRepository.findByUserId(userId);
        await this.refreshTokenRepository.deleteAll(userTokens);
    }
    /**
     * Rotates the refresh token by revoking the old token and issuing a new one.
     * @param token Refresh token to rotate.
     * @return New refresh token.
     * @throws InvalidCredentialsError if the refresh token is invalid or user not found.
     */
    async refreshToken(token) {
        // 1. Find the token
        const savedToken = await findToken(token, this.refreshTokenRepository, this.authConfig.JWT_HASH_ALGORITHM, this.authConfig.TOKEN_HASH_PEPPER);
        if (!savedToken) {
            throw new InvalidCredentialsError('Invalid refresh token');
        }
        // 2. Verify if the token is expired
        if (savedToken.expiresAt < new Date()) {
            await this.refreshTokenRepository.delete(savedToken);
            this.logger.info(`Deleted expired refresh token with id ${savedToken.id} for user ${savedToken.userId}.`);
            throw new InvalidCredentialsError('Refresh token has expired');
        }
        // 3. Verify user existence
        const user = await this.usersService.findById(savedToken.userId);
        if (!user) {
            await this.refreshTokenRepository.delete(savedToken);
            this.logger.info(`Deleted refresh token with id ${savedToken.id} for non-existing user ${savedToken.userId}.`);
            throw new InvalidCredentialsError('Invalid refresh token');
        }
        // 4. Revoke the old token
        await this.refreshTokenRepository.delete(savedToken);
        this.logger.info(`Revoked refresh token with id ${savedToken.id} for user ${savedToken.userId}.`);
        // 5. Issue a new refresh token and return it
        return this.createRefreshTokenForUser(user.id);
    }
    /**
     * Issues a new JWT token based on the provided refresh token.
     * @param refreshToken Refresh token to validate and issue new JWT for.
     * @return New JWT token and its expiration time.
     * @throws InvalidCredentialsError if the refresh token is invalid or user not found.
     */
    async issueJwt(refreshToken) {
        // 1. Find the refresh token
        const savedToken = await findToken(refreshToken, this.refreshTokenRepository, this.authConfig.JWT_HASH_ALGORITHM, this.authConfig.TOKEN_HASH_PEPPER);
        if (!savedToken) {
            throw new InvalidCredentialsError('Invalid refresh token');
        }
        // 2. Verify if the token is expired
        if (savedToken.expiresAt < new Date()) {
            throw new InvalidCredentialsError('Refresh token has expired');
        }
        // 3. Verify if the token is revoked
        if (savedToken.revoked) {
            await this.removeAllUserTokens(savedToken.userId);
            throw new RefreshTokenReuseError('Refresh token has been revoked');
        }
        // 4. Verify user existence
        const user = await this.usersService.findById(savedToken.userId);
        if (!user) {
            throw new InvalidCredentialsError('Invalid refresh token');
        }
        // 5. Issue new JWT token
        return this.createJwtTokenForUser(user.id);
    }
    async createJwtTokenForUser(userId) {
        const tokenPayload = this.jwtService.sign(this.authConfig.JWT_SECRET, {
            timestamp: Date.now(),
            sub: userId
        });
        return {
            jwt: tokenPayload.token,
            expiresIn: tokenPayload.expiresIn
        };
    }
    /**
     * Validates a JWT token and returns the associated user if valid.
     * @param token JWT token to validate.
     * @throws InvalidCredentialsError if the token is invalid or user not found.
     */
    async validateJwt(token) {
        const result = this.jwtService.verify({
            token,
            secret: this.authConfig.JWT_SECRET
        });
        if (result.error || result.jwtPayload === null) {
            throw new InvalidCredentialsError('Invalid JWT token');
        }
        const user = await this.usersService.findById(result.jwtPayload.sub);
        if (!user) {
            throw new InvalidCredentialsError('Invalid JWT token');
        }
        return user;
    }
}

class RefreshTokensPrismaRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async delete(token) {
        await this.deleteById(token.id);
    }
    async deleteAll(tokens) {
        await this.client.refreshToken.deleteMany({
            where: {
                id: { in: tokens.map(token => token.id) }
            }
        });
    }
    async deleteById(id) {
        // call find many to make sure the operation is idempotent,
        // as deleteMany will not throw if the token does not exist
        await this.client.refreshToken.deleteMany({
            where: {
                id
            }
        });
    }
    findByToken(token) {
        return this.client.refreshToken.findUnique({
            where: {
                hashedToken: token
            }
        });
    }
    findByUserId(userId) {
        return this.client.refreshToken.findMany({
            where: {
                userId
            }
        });
    }
    save(token) {
        return this.client.refreshToken.create({
            data: token
        });
    }
    update(token) {
        return this.client.refreshToken.update({
            where: { id: token.id },
            data: token
        });
    }
}

class ApiTokensPrismaRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async delete(token) {
        await this.deleteById(token.id);
    }
    async deleteAll(tokens) {
        await this.client.apiToken.deleteMany({
            where: {
                id: { in: tokens.map(token => token.id) }
            }
        });
    }
    async deleteById(id) {
        // call find many to make sure the operation is idempotent,
        // as deleteMany will not throw if the token does not exist
        await this.client.apiToken.deleteMany({
            where: {
                id
            }
        });
    }
    findByToken(token) {
        return this.client.apiToken.findUnique({
            where: {
                hashedToken: token
            }
        });
    }
    findById(id) {
        return this.client.apiToken.findUnique({
            where: {
                id
            }
        });
    }
    findByUserId(userId) {
        return this.client.apiToken.findMany({
            where: {
                userId
            }
        });
    }
    save(token) {
        return this.client.apiToken.create({
            data: token
        });
    }
    update(token) {
        return this.client.apiToken.update({
            where: { id: token.id },
            data: token
        });
    }
}

class UserAlreadyExistsError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserAlreadyExistsError';
    }
}

class UserNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserNotFoundError';
    }
}

class UsersService {
    usersRepository;
    authConfig;
    constructor(usersRepository, authConfig) {
        this.usersRepository = usersRepository;
        this.authConfig = authConfig;
    }
    async createUser(dto) {
        const { username, password, role } = dto;
        const existingUser = await this.usersRepository.findByUsername(username);
        if (existingUser) {
            throw new UserAlreadyExistsError(`User with this username ${username} already exists.`);
        }
        const hashedPassword = hashPassword(password, this.authConfig.PASSWORD_SALT_ROUNDS);
        const newUserEntity = await this.usersRepository.save({
            username,
            hashedPassword,
            ...(role && { role })
        });
        return {
            id: newUserEntity.id,
            username: newUserEntity.username,
            createdAt: newUserEntity.createdAt,
            updatedAt: newUserEntity.updatedAt,
            password: newUserEntity.password,
            role: newUserEntity.role
        };
    }
    async changePassword(dto) {
        const user = await this.usersRepository.findByUsername(dto.username);
        if (!user) {
            throw new InvalidCredentialsError('User not found.');
        }
        if (!compareHash({
            secret: dto.password,
            hashed: user.password
        })) {
            throw new InvalidCredentialsError('Invalid credentials');
        }
        user.password = hashPassword(dto.newPassword, this.authConfig.PASSWORD_SALT_ROUNDS);
        await this.usersRepository.update(user);
    }
    async findById(id) {
        return this.usersRepository.findById(id);
    }
    async findByUsername(username) {
        return this.usersRepository.findByUsername(username);
    }
    /**
     * Deletes a user by id.
     * @param id - User id to delete.
     * @throws UserNotFoundError if user is not found.
     */
    async deleteUser(id) {
        const user = await this.usersRepository.findById(id);
        if (!user) {
            throw new UserNotFoundError(`User with id ${id} not found.`);
        }
        await this.usersRepository.delete(id);
    }
    /**
     * Gets a list of all users with filtered information.
     * Returns only username, role, createdAt, and updatedAt fields.
     * Excludes the current user from the list.
     * @param currentUserId - The ID of the current user to exclude from the list.
     */
    async getUsers(currentUserId) {
        const users = await this.usersRepository.findAll();
        return users
            .filter(user => user.id !== currentUserId)
            .map(user => ({
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));
    }
    /**
     * Updates a user's role.
     * @param dto - DTO containing userId and new role.
     * @throws UserNotFoundError if user is not found.
     */
    async updateUserRole(dto) {
        const user = await this.usersRepository.findById(dto.userId);
        if (!user) {
            throw new UserNotFoundError(`User with id ${dto.userId} not found.`);
        }
        user.role = dto.role;
        const updatedUser = await this.usersRepository.update(user);
        return {
            id: updatedUser.id,
            username: updatedUser.username,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            password: updatedUser.password,
            role: updatedUser.role
        };
    }
}

class UsersPrismaRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    findById(id) {
        return this.client.user.findUnique({ where: { id } });
    }
    findByUsername(username) {
        return this.client.user.findUnique({ where: { username } });
    }
    async save(user) {
        try {
            return await this.client.user.create({
                data: {
                    username: user.username,
                    password: user.hashedPassword,
                    ...(user.role && { role: user.role })
                }
            });
        }
        catch (error) {
            if (error instanceof runtime.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new UniqueConstraintError(`User with username ${user.username} already exists.`);
            }
            throw error;
        }
    }
    update(user) {
        user.updatedAt = new Date();
        return this.client.user.update({
            where: { id: user.id },
            data: user
        });
    }
    async delete(id) {
        // call deleteMany to make sure the operation is idempotent,
        // as deleteMany will not throw if the user does not exist
        await this.client.user.deleteMany({
            where: { id }
        });
    }
    findAll() {
        return this.client.user.findMany();
    }
}

async function bootstrapInfrastructure({ configuration }) {
    const connectionString = `${configuration.databaseConfig.DATABASE_URL}`;
    const adapter = new adapterPg.PrismaPg({ connectionString });
    const prismaClient = new PrismaClient({ adapter, log: ['info', 'warn', 'error'], });
    const refreshTokensRepository = new RefreshTokensPrismaRepository(prismaClient);
    const apiTokensRepository = new ApiTokensPrismaRepository(prismaClient);
    const usersRepository = new UsersPrismaRepository(prismaClient);
    // placeholder — initialise your domain repositories here
    return {
        prismaClient,
        refreshTokensRepository,
        apiTokensRepository,
        usersRepository
    };
}

async function bootstrapServices({ configuration, infrastructure, }) {
    const { usersRepository, refreshTokensRepository, apiTokensRepository } = await infrastructure;
    const usersService = new UsersService(usersRepository, configuration.authConfig);
    const jwtService = new JwtService();
    const authService = new AuthService(usersService, refreshTokensRepository, jwtService, configuration.authConfig);
    const apiTokensService = new ApiTokensService(apiTokensRepository, configuration.authConfig);
    // placeholder — initialise your domain services here
    return {
        usersService,
        authService,
        jwtService,
        apiTokensService,
    };
}

/**
 * Router to wrap all api routes with common prefix.
 */
class BaseApiRouter {
    routers;
    constructor(routers) {
        this.routers = routers;
    }
    getBasePath() {
        return '';
    }
    initRoutes() {
        const router = e.Router();
        for (const routerController of this.routers) {
            router.use(routerController.getBasePath(), routerController.initRoutes());
        }
        return router;
    }
}

/**
 * Represents an HTTP error with a status code of 400 (Bad Request).
 */
class BadRequestHttpError extends Error {
}

/**
 * Represents an HTTP error indicating that a requested resource was not found.
 */
class NotFoundHttpError extends Error {
}

/**
 * ConflictError is thrown when a request conflicts with the current state of the server.
 */
class ConflictHttpError extends Error {
}

/**
 * UnauthorizedHttpError is thrown when a user tries to access a resource that they are not authorized to access.
 * This error should be used when the user is authenticated but does not have the necessary permissions to access the resource.
 */
class UnauthorizedHttpError extends Error {
}

/**
 * ForbiddenHttpError is thrown when a user is authenticated but does not have the necessary permissions to access the resource.
 * This results in a 403 Forbidden HTTP status code.
 */
class ForbiddenHttpError extends Error {
    constructor(message = 'Forbidden') {
        super(message);
        this.name = 'ForbiddenHttpError';
    }
}

function methodNotAllowed(req, res) {
    res.sendStatus(405);
}

/**
 * Maps known error types to appropriate HTTP errors.
 * If an error is thrown in a router, it checks if the error is an instance of the known error types
 *  and throws a corresponding HTTP error with a relevant message.
 * If the error type is not recognized, it rethrows the original error,
 *  which will be handled by the global error handler as an internal server error.
 */
const errorMapperHandler = async (error, req, res, next) => {
    const message = error?.message;
    if (isBadRequestError(error)) {
        throw new BadRequestHttpError(message || 'Invalid request body or validation error');
    }
    else if (isConflictError(error)) {
        throw new ConflictHttpError(message || 'Conflict error');
    }
    else if (isNotFoundError(error)) {
        throw new NotFoundHttpError(message || 'Resource not found');
    }
    else if (isUnauthorizedError(error)) {
        throw new UnauthorizedHttpError(message || 'Unauthorized');
    }
    else if (isForbiddenError(error)) {
        throw new ForbiddenHttpError(message || 'Forbidden');
    }
    throw error;
};
function isBadRequestError(error) {
    return error instanceof bookishPotatoDto.ParsingError;
}
function isConflictError(error) {
    return error instanceof UniqueConstraintError
        || error instanceof UserAlreadyExistsError;
}
function isNotFoundError(error) {
    return error instanceof ApiTokenNotFoundError
        || error instanceof UserNotFoundError;
}
function isUnauthorizedError(error) {
    return error instanceof InvalidCredentialsError
        || error instanceof InvalidApiTokenError;
}
function isForbiddenError(error) {
    return error instanceof ForbiddenActionError;
}

var HttpErrorCode;
(function (HttpErrorCode) {
    HttpErrorCode["BadRequest"] = "BAD_REQUEST";
    HttpErrorCode["NotFound"] = "NOT_FOUND";
    HttpErrorCode["InternalServerError"] = "INTERNAL_SERVER_ERROR";
    HttpErrorCode["Conflict"] = "CONFLICT";
    HttpErrorCode["Unauthorized"] = "AUTHENTICATION_FAILED";
    HttpErrorCode["Forbidden"] = "FORBIDDEN";
    HttpErrorCode["RefreshTokenReuse"] = "REFRESH_TOKEN_REUSE_DETECTED";
})(HttpErrorCode || (HttpErrorCode = {}));
const logger$2 = createLogger('HttpErrorHandler');
const httpErrorHandler = async (err, req, res, next) => {
    if (err instanceof BadRequestHttpError) {
        handleBadRequest(res, `Invalid request data: ${err.message}`);
        return;
    }
    if (err instanceof NotFoundHttpError) {
        handleNotFound(res, err.message);
        return;
    }
    if (err instanceof ConflictHttpError) {
        handleConflict(res, err.message);
        return;
    }
    if (err instanceof UnauthorizedHttpError) {
        handleUnauthorized(res, err.message);
        return;
    }
    if (err instanceof RefreshTokenReuseError) {
        handleRefreshTokenReuseError(res);
        return;
    }
    if (err instanceof ForbiddenHttpError) {
        handleForbidden(res, err.message);
        return;
    }
    handleInternalServerError(res, err);
};
const handleBadRequest = (res, message) => {
    res.status(400).json({
        code: HttpErrorCode.BadRequest,
        message
    });
};
const handleNotFound = (res, message) => {
    res.status(404).json({
        code: HttpErrorCode.NotFound,
        message
    });
};
const handleConflict = (res, message) => {
    res.status(409).json({
        code: HttpErrorCode.Conflict,
        message
    });
};
const handleUnauthorized = (res, message) => {
    res.status(401).json({
        code: HttpErrorCode.Unauthorized,
        message
    });
};
const handleRefreshTokenReuseError = (res) => {
    res.status(401).json({
        code: HttpErrorCode.RefreshTokenReuse,
        message: 'Refresh token reuse detected. All refresh tokens for this user have been invalidated. Please log in again.'
    });
};
const handleForbidden = (res, message) => {
    res.status(403).json({
        code: HttpErrorCode.Forbidden,
        message
    });
};
const handleInternalServerError = (res, err) => {
    logger$2.error('Unexpected error while API call:', err, err?.stack);
    res.status(500).json({
        code: HttpErrorCode.InternalServerError,
        message: 'Internal server error'
    });
};

var TokenType;
(function (TokenType) {
    TokenType[TokenType["JWT"] = 0] = "JWT";
    TokenType[TokenType["API_TOKEN"] = 1] = "API_TOKEN";
    TokenType[TokenType["UNKNOWN"] = 2] = "UNKNOWN";
})(TokenType || (TokenType = {}));
function detectTokenType(token) {
    if (token.split('.').length === 3) {
        return TokenType.JWT;
    }
    // API tokens are 32-byte hex strings (64 characters)
    if (/^[0-9a-f]{64}$/i.test(token)) {
        return TokenType.API_TOKEN;
    }
    return TokenType.UNKNOWN;
}
const createAuthBearerTokenMiddleware = (authService, apiTokensService, usersService) => {
    async function handleJwtToken(token) {
        try {
            return await authService.validateJwt(token);
        }
        catch {
            throw new UnauthorizedHttpError('Invalid or expired token');
        }
    }
    async function handleApiToken(token) {
        try {
            const apiToken = await apiTokensService.validateApiToken(token);
            const user = await usersService.findById(apiToken.userId);
            if (user)
                return { user, scope: apiToken.scope };
        }
        catch {
            throw new UnauthorizedHttpError('Invalid or expired token');
        }
        throw new UnauthorizedHttpError('User associated with token not found');
    }
    return async (req, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            throw new UnauthorizedHttpError('No token provided');
        }
        const tokenType = detectTokenType(token);
        if (tokenType === TokenType.JWT) {
            res.locals.user = await handleJwtToken(token);
            // JWT tokens from the UI have full access and session privileges
            res.locals.tokenScope = 'JWT_SESSION';
        }
        else if (tokenType === TokenType.API_TOKEN) {
            const { user, scope } = await handleApiToken(token);
            res.locals.user = user;
            res.locals.tokenScope = scope;
        }
        else {
            throw new UnauthorizedHttpError('Invalid token format');
        }
        next();
    };
};

/**
 * Middleware to restrict access based on the user's role.
 * Returns 403 Forbidden if the user's role doesn't match any of the required roles.
 *
 * @param requiredRoles Roles that are allowed to access the endpoint.
 */
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        const user = res.locals.user;
        if (!user) {
            throw new ForbiddenHttpError('User not found in session');
        }
        const userRole = user.role;
        if (!userRole) {
            throw new ForbiddenHttpError('Role not found for user');
        }
        if (!requiredRoles.includes(userRole)) {
            throw new ForbiddenHttpError('Insufficient permissions: required role not met');
        }
        next();
    };
};

/**
 * Middleware to restrict access based on the token scope.
 * JWT_SESSION scope is for full UI-like management access.
 * READ_WRITE scope allows everything.
 * READ scope only allows GET, HEAD, OPTIONS methods.
 *
 * @param requiredScopes Scopes that are allowed to access the endpoint.
 */
const requireScope = (requiredScopes) => {
    return (req, res, next) => {
        const tokenScope = res.locals.tokenScope;
        if (!tokenScope) {
            throw new ForbiddenHttpError('Scope not found in token');
        }
        // If the token has JWT_SESSION, it can access everything
        if (tokenScope === 'JWT_SESSION') {
            return next();
        }
        // If the token has READ_WRITE, it can access READ and READ_WRITE
        if (tokenScope === 'READ_WRITE' && (requiredScopes.includes('READ_WRITE') || requiredScopes.includes('READ'))) {
            return next();
        }
        // If the token has READ, it can only access if READ is in requiredScopes
        if (tokenScope === 'READ' && requiredScopes.includes('READ')) {
            // Additional safety: READ scope should only be used for read operations
            const isReadMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
            if (isReadMethod) {
                return next();
            }
            throw new ForbiddenHttpError('READ scope is not authorized for write operations');
        }
        throw new ForbiddenHttpError('Insufficient token scope');
    };
};

class AuthRouter {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    getBasePath() {
        return `/auth`;
    }
    initRoutes() {
        const router = e.Router();
        router.route('/login')
            .post(this.login.bind(this))
            .all(methodNotAllowed);
        router.route('/logout')
            .post(this.logout.bind(this))
            .all(methodNotAllowed);
        router.route('/refresh')
            .post(this.refreshToken.bind(this))
            .all(methodNotAllowed);
        return router;
    }
    async login(req, res) {
        const credentials = bookishPotatoDto.parseObject(AuthenticationCredentialsDto, req.body);
        const authResult = await this.authService.login(credentials);
        if (!authResult?.user) {
            throw new UnauthorizedHttpError('Invalid credentials');
        }
        const { refreshToken, expiresIn: refreshTokenExpiresIn } = authResult.refreshToken;
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/api/v1/auth',
            maxAge: refreshTokenExpiresIn * 1000
        });
        const { jwt, expiresIn: jwtExpiresIn } = authResult.jwt;
        res.status(200).json({
            access_token: jwt,
            token_type: 'Bearer',
            expires_in: jwtExpiresIn
        });
    }
    async logout(req, res) {
        // 1. Validate JWT token to ensure the user is authenticated before logging out
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            throw new UnauthorizedHttpError('No jwt token provided');
        }
        await this.authService.validateJwt(token);
        // 2. Get the refresh token from the cookie to identify which session to log out
        const refreshToken = req.cookies['refreshToken'];
        if (!refreshToken) {
            throw new UnauthorizedHttpError('No refresh token provided');
        }
        const body = bookishPotatoDto.parseObject(LogoutDto, req.body);
        await this.authService.logout(refreshToken, body.allDevices);
        // 3. Clear the refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/api/v1/auth',
        });
        res.sendStatus(204);
    }
    async refreshToken(req, res) {
        // Retrieve refresh token from a cookie
        const refreshToken = req.cookies['refreshToken'];
        if (!refreshToken) {
            throw new UnauthorizedHttpError('No refresh token provided');
        }
        // 1. Issue a new JWT token using the refresh token
        const jwtResult = await this.authService.issueJwt(refreshToken);
        // 2. If the refresh token is valid, rotate it by issuing a new refresh token and revoking the old one
        const newRefreshToken = await this.authService.refreshToken(refreshToken);
        // 3. Set the new refresh token in the cookie
        res.cookie('refreshToken', newRefreshToken.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/api/v1/auth',
            maxAge: newRefreshToken.expiresIn * 1000
        });
        res.status(200).json({
            access_token: jwtResult.jwt,
            token_type: 'Bearer',
            expires_in: jwtResult.expiresIn
        });
    }
}
class AuthenticationCredentialsDto {
    username;
    password;
}
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], AuthenticationCredentialsDto.prototype, "username", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], AuthenticationCredentialsDto.prototype, "password", void 0);
class LogoutDto {
    allDevices;
}
tslib.__decorate([
    bookishPotatoDto.BooleanProperty({
        isOptional: true,
    })
], LogoutDto.prototype, "allDevices", void 0);

class HealthCheckRouter {
    data;
    startUpTime = new Date();
    constructor(data) {
        this.data = data;
    }
    getBasePath() {
        return `${this.data.healthCheckPath}`;
    }
    initRoutes() {
        const router = e.Router();
        router.route('/')
            .get(this.getSimpleHealthStatus.bind(this))
            .all(methodNotAllowed);
        router.route('/ready')
            .get(this.getHealthStatus.bind(this))
            .all(methodNotAllowed);
        return router;
    }
    getSimpleHealthStatus(req, res) {
        const response = {
            status: 'UP'
        };
        res.status(200).send(response);
    }
    getHealthStatus(req, res) {
        const response = {
            status: 'UP',
            timestamp: new Date().toISOString(),
            version: this.data.appVersion || 'unknown',
            uptime_seconds: (Date.now() - this.startUpTime.getTime()) / 1000
        };
        res.status(200).json(response);
    }
}

function statusCodeValidationMessage() {
    return 'Invalid token scope value. ' +
        `Available values: ${Object.keys(TokenScope).filter(k => !Number.isNaN(Number(k))).join(', ')}`;
}

class CreateApiTokenDto {
    name;
    scope;
    expiresAt;
}
tslib.__decorate([
    bookishPotatoDto.StringProperty({
        minLength: 1,
        maxLength: 255
    })
], CreateApiTokenDto.prototype, "name", void 0);
tslib.__decorate([
    bookishPotatoDto.EnumProperty(TokenScope, {
        parsingErrorMessage: statusCodeValidationMessage
    })
], CreateApiTokenDto.prototype, "scope", void 0);
tslib.__decorate([
    bookishPotatoDto.DateProperty()
], CreateApiTokenDto.prototype, "expiresAt", void 0);

class ApiTokensRouter {
    apiTokensService;
    authMiddleware;
    constructor(apiTokensService, authMiddleware) {
        this.apiTokensService = apiTokensService;
        this.authMiddleware = authMiddleware;
    }
    getBasePath() {
        return '/api-tokens';
    }
    initRoutes() {
        const router = e.Router();
        router.use(this.authMiddleware);
        router.use(requireScope(['JWT_SESSION']));
        router.route('/')
            .get(requireRole(['ADMIN']), this.listApiTokens.bind(this))
            .post(requireRole(['ADMIN']), this.createApiToken.bind(this))
            .all(methodNotAllowed);
        router.route('/:id')
            .delete(requireRole(['ADMIN']), this.revokeApiToken.bind(this))
            .all(methodNotAllowed);
        return router;
    }
    async listApiTokens(req, res) {
        const user = res.locals.user;
        const targetUserId = user.id;
        const tokens = await this.apiTokensService.getUserTokens(targetUserId);
        res.status(200).json(tokens);
    }
    async createApiToken(req, res) {
        const user = res.locals.user;
        const dto = bookishPotatoDto.parseObject(CreateApiTokenDto, req.body);
        const result = await this.apiTokensService.createApiToken({
            userId: user.id,
            name: dto.name,
            scope: dto.scope,
            expiresAt: dto.expiresAt
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
    async revokeApiToken(req, res) {
        const actor = res.locals.user;
        const tokenId = req.params.id;
        await this.apiTokensService.authorizeTokenRevocation(actor, tokenId);
        await this.apiTokensService.revokeApiToken(tokenId);
        res.sendStatus(204);
    }
}

class UsersRouter {
    usersService;
    authMiddleware;
    constructor(usersService, authMiddleware) {
        this.usersService = usersService;
        this.authMiddleware = authMiddleware;
    }
    getBasePath() {
        return `/users`;
    }
    initRoutes() {
        const router = e.Router();
        router.use(this.authMiddleware);
        router.use(requireScope(['JWT_SESSION']));
        router.route('/')
            .get(requireRole(['ADMIN']), this.getUsers.bind(this))
            .post(requireRole(['ADMIN']), this.createUser.bind(this))
            .all(methodNotAllowed);
        router.route('/password')
            .patch(this.changePassword.bind(this))
            .all(methodNotAllowed);
        router.route('/:id')
            .delete(requireRole(['ADMIN']), this.deleteUser.bind(this))
            .all(methodNotAllowed);
        router.route('/:id/role')
            .patch(requireRole(['ADMIN']), this.updateUserRole.bind(this))
            .all(methodNotAllowed);
        return router;
    }
    async getUsers(req, res) {
        const requestor = res.locals.user;
        if (!requestor) {
            throw new UnauthorizedHttpError('User not found in session');
        }
        const users = await this.usersService.getUsers(requestor.id);
        res.status(200).json(users);
    }
    async createUser(req, res) {
        const requestor = res.locals.user;
        if (!requestor) {
            throw new UnauthorizedHttpError('User not found in session');
        }
        const dto = bookishPotatoDto.parseObject(CreateUserDto, req.body);
        const user = await this.usersService.createUser(dto);
        res.status(201).json({
            id: user.id,
            username: user.username,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role
        });
    }
    async changePassword(req, res) {
        const dto = bookishPotatoDto.parseObject(ChangePasswordBodyDto, req.body);
        const user = res.locals.user;
        if (!user) {
            throw new UnauthorizedHttpError('User not found in session');
        }
        await this.usersService.changePassword({
            username: user.username,
            password: dto.password,
            newPassword: dto.newPassword
        });
        res.sendStatus(204);
    }
    async deleteUser(req, res) {
        const requestor = res.locals.user;
        if (!requestor) {
            throw new UnauthorizedHttpError('User not found in session');
        }
        const userId = req.params.id;
        // Prevent user from deleting themselves
        if (requestor.id === userId) {
            throw new ForbiddenHttpError('You cannot delete your own account');
        }
        await this.usersService.deleteUser(userId);
        res.sendStatus(204);
    }
    async updateUserRole(req, res) {
        const requestor = res.locals.user;
        if (!requestor) {
            throw new UnauthorizedHttpError('User not found in session');
        }
        const userId = req.params.id;
        // Prevent user from changing their own role
        if (requestor.id === userId) {
            throw new ForbiddenHttpError('You cannot change your own role');
        }
        const dto = bookishPotatoDto.parseObject(UpdateUserRoleDto, req.body);
        const updatedUser = await this.usersService.updateUserRole({
            userId,
            role: dto.role
        });
        res.status(200).json({
            id: updatedUser.id,
            username: updatedUser.username,
            role: updatedUser.role,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt
        });
    }
}
class CreateUserDto {
    username;
    password;
    role;
}
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], CreateUserDto.prototype, "username", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], CreateUserDto.prototype, "password", void 0);
tslib.__decorate([
    bookishPotatoDto.EnumProperty(UserRole, { isOptional: true, defaultValue: UserRole.USER })
], CreateUserDto.prototype, "role", void 0);
class ChangePasswordBodyDto {
    password;
    newPassword;
}
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], ChangePasswordBodyDto.prototype, "password", void 0);
tslib.__decorate([
    bookishPotatoDto.StringProperty()
], ChangePasswordBodyDto.prototype, "newPassword", void 0);
class UpdateUserRoleDto {
    role;
}
tslib.__decorate([
    bookishPotatoDto.EnumProperty(UserRole)
], UpdateUserRoleDto.prototype, "role", void 0);

async function bootstrapRoutes({ configuration, services }) {
    const { appConfig, appVersion } = configuration;
    const { authService, apiTokensService, usersService } = await services;
    const authMiddleware = createAuthBearerTokenMiddleware(authService, apiTokensService, usersService);
    const apiRouterV1 = new BaseApiRouter([
        new AuthRouter(authService),
        new ApiTokensRouter(apiTokensService, authMiddleware),
        new UsersRouter(usersService, authMiddleware),
        // Health check endpoint
        new HealthCheckRouter({
            healthCheckPath: appConfig.HEALTH_CHECK_PATH,
            appVersion
        })
        // placeholder — add your domain routers here
    ]);
    return {
        apiRouterV1
    };
}

const logger$1 = createLogger('Application');
async function bootstrapApp({ configuration, routes, services }) {
    const { appConfig } = configuration;
    const { apiRouterV1 } = await routes;
    const app = e();
    // Enable CORS for all routes
    const corsOrigin = appConfig.CORS_ORIGIN;
    let origin;
    if (corsOrigin === '*') {
        origin = appConfig.CORS_ALLOW_CREDENTIALS ? true : '*';
    }
    else {
        origin = corsOrigin.split(',').map(o => o.trim());
    }
    const corsOptions = {
        origin,
        credentials: appConfig.CORS_ALLOW_CREDENTIALS
    };
    app.use(cors(corsOptions));
    if (corsOrigin === '*') {
        if (appConfig.CORS_ALLOW_CREDENTIALS) {
            logger$1.warn('CORS is configured to allow all origins with credentials. This is not recommended for production environments.');
        }
        else {
            logger$1.warn('CORS is configured to allow all origins (*). This is not recommended for production environments.');
        }
    }
    app.use(cookieParser());
    app.use(bodyParser.json()); // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    // API v1
    const apiBasePath = appConfig.BASE_API_PATH + '/v1';
    app.use(apiBasePath, apiRouterV1.initRoutes());
    // placeholder — add catch-all route or additional middleware here
    // Global error handlers
    app.use(errorMapperHandler);
    app.use(httpErrorHandler);
    return app;
}

/**
 * Bootstrap the application.
 * This function can be used to perform any necessary initialization before the server starts.
 * For example, you can connect to a database, load configuration, or set up logging here.
 * Motivation:
 * - Centralized initialization: Having a single entry point for bootstrapping the application allows for better organization and separation of concerns.
 *  It keeps the initialization logic separate from the main application logic.
 * - Flexibility: It allows for more flexibility in how the application is initialized. For example, you can swap out different implementations of services or infrastructure components without changing the main application code.
 * - Testing: It makes it easier to test the initialization logic separately from the main application logic. You can write unit tests for the bootstrap function without having to start the entire server.
 * - Scalability: As the application grows, the initialization logic may become more complex. Having a dedicated bootstrap function allows you to manage this complexity more effectively.
 *
 * @returns {Promise<ReturnType<typeof bootstrapApp>>} The initialized Express application.
 */
async function bootstrap() {
    // 1. Load configuration
    const configuration = new ConfigurationsParser();
    // 2. Initialize infrastructure (e.g., database connections, repositories)
    const infrastructure = bootstrapInfrastructure({ configuration });
    // 3. Initialize services
    const services = bootstrapServices({ configuration, infrastructure });
    // 4. Initialize routes
    const routes = bootstrapRoutes({ configuration, services });
    // 5. Initialize the Express application with middleware and routes
    return {
        configuration,
        app: await bootstrapApp({ configuration, routes, services })
    };
}

const logger = createLogger('Application Server');
logger.info('Starting application server...');
process.on('uncaughtException', (err) => {
    if (err instanceof ConfigurationParsingError) {
        logger.error('Configuration parsing failed. Exiting...');
        process.exit(1);
    }
    logger.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, _promise) => {
    logger.error('Unhandled rejection:', reason);
});
async function start() {
    try {
        const { app, configuration } = await bootstrap();
        const appConfig = configuration.appConfig;
        const hostname = appConfig.HOST;
        const port = appConfig.PORT;
        const server = node_http.createServer(app);
        server.listen(port, hostname, () => {
            logger.info(`Server running...`);
            logger.info(`Listening on http://${hostname}:${port}`);
        });
    }
    catch (e) {
        logger.error('Failed to bootstrap application:', e);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=server.js.map

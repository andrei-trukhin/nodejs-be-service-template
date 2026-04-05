import {defineDto, field, InferDto} from "bookish-potato-dto";

export const AppConfig = defineDto({
    PORT: field.number({defaultValue: 8080}),
    HOST: field.string({defaultValue: '0.0.0.0'}),
    /**
     * Base path for API endpoints.
     */
    BASE_API_PATH: field.string({defaultValue: '/api'}),
    /**
     * Path for health check endpoint.
     */
    HEALTH_CHECK_PATH: field.string({defaultValue: '/health'}),
    /**
     * Username for initial admin user.
     * Application will create this user on startup if it doesn't exist yet.
     * TODO: override via env var in production
     */
    ADMIN_USERNAME: field.string({defaultValue: 'admin'}),
    /**
     * Password for initial admin user.
     * Application will create this user on startup if it doesn't exist yet.
     * (!) In a production environment, make sure to change this to a strong password via environment variables.
     * TODO: override via env var in production
     */
    ADMIN_PASSWORD: field.string({defaultValue: 'admin'}),
    /**
     * CORS origin configuration.
     * Specifies which origins are allowed to access the API.
     * Use '*' to allow all origins (default), or specify a specific origin like 'https://example.com'.
     * For multiple origins, use a comma-separated list.
     */
    CORS_ORIGIN: field.string({defaultValue: '*'}),
    /**
     * CORS credentials configuration.
     * Specifies if the API should allow sharing authentication credentials (like cookies).
     */
    CORS_ALLOW_CREDENTIALS: field.boolean({defaultValue: false}),
});

export type AppConfig = InferDto<typeof AppConfig>;


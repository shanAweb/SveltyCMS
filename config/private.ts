/**
 * Do not Edit as the file will be overwritten by CLI Installer!!!
 * Use 'npm run installer' to start the installer
 *
 * PRIVATE configuration for the application
 */

import { createPrivateConfig } from './types.ts';

export const privateEnv = createPrivateConfig({
    // --- Database Configuration ---
    DB_TYPE: 'mongodb',
    DB_HOST: 'mongodb://localhost',
    DB_PORT: 27017,
    DB_NAME: 'SveltyCMS',
    DB_USER: 'root',
    DB_PASSWORD: 'password',
    DB_RETRY_ATTEMPTS: 3,
    DB_RETRY_DELAY: 3000,
    DB_POOL_SIZE: 5,
    MULTI_TENANT: false,

    // --- SMTP Configuration ---
    SMTP_HOST: 'dummy.email.service',
    SMTP_PORT: 25,
    SMTP_EMAIL: 'dev@localhost.com',
    SMTP_PASSWORD: 'dummy_password',
    // SERVER_PORT: undefined, // Optional: Uncomment and provide a value

    // --- Redis Caching ---
    USE_REDIS: false,
    // REDIS_HOST: undefined, // Optional: Uncomment and provide a value
    // REDIS_PORT: undefined, // Optional: Uncomment and provide a value
    // REDIS_PASSWORD: undefined, // Optional: Uncomment and provide a value

    // --- Session Management ---
    SESSION_CLEANUP_INTERVAL: 60000,
    MAX_IN_MEMORY_SESSIONS: 10000,
    DB_VALIDATION_PROBABILITY: 0.1,
    SESSION_EXPIRATION_SECONDS: 3600,

    // --- Google OAuth ---
    USE_GOOGLE_OAUTH: false,
    // GOOGLE_CLIENT_ID: undefined, // Optional: Uncomment and provide a value
    // GOOGLE_CLIENT_SECRET: undefined, // Optional: Uncomment and provide a value

    // --- Other APIs ---
    // GOOGLE_API_KEY: undefined, // Optional: Uncomment and provide a value
    USE_MAPBOX: false,
    // MAPBOX_API_TOKEN: undefined, // Optional: Uncomment and provide a value
    // SECRET_MAPBOX_API_TOKEN: undefined, // Optional: Uncomment and provide a value
    // TWITCH_TOKEN: undefined, // Optional: Uncomment and provide a value
    USE_TIKTOK: false,
    // TIKTOK_TOKEN: undefined, // Optional: Uncomment and provide a value

    // --- LLM APIs ---
    LLM_APIS: {},

    // --- JWT Secret ---
    JWT_SECRET_KEY: 'e98eb41c117ed38f73a45b00a1d97803369cc1246c1c836bb344a48207aeea63',

    // --- Two-Factor Authentication ---
    USE_2FA: false,
    // TWO_FACTOR_AUTH_SECRET: undefined, // Optional: Uncomment and provide a value
    TWO_FACTOR_AUTH_BACKUP_CODES_COUNT: 10,

    // --- Roles & Permissions ---
    ROLES: [
    "admin",
    "editor"
],
    PERMISSIONS: [
    "manage",
    "edit",
    "create"
],
});
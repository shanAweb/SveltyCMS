/**
 * Do not Edit as the file will be overwritten by CLI Installer!!!
 * Use 'npm run installer' to start the installer
 *
 * PUBLIC configuration for the application
 */

import { createPublicConfig } from './types.ts';

export const publicEnv = createPublicConfig({
    // --- Site Configuration ---
    SITE_NAME: 'SveltyCMS',
    PASSWORD_LENGTH: 8,

    // --- Language Configuration ---
    DEFAULT_CONTENT_LANGUAGE: 'en',
    AVAILABLE_CONTENT_LANGUAGES: [
    "en",
    "de"
],
    BASE_LOCALE: 'en',
    LOCALES: [
    "en",
    "de",
    "fr",
    "es"
],

    // --- Media Configuration ---
    MEDIA_FOLDER: 'mediaFiles',
    MEDIA_OUTPUT_FORMAT_QUALITY: {
        format: 'avif',
        quality: 80
    },
    // MEDIASERVER_URL: undefined, // Optional: Uncomment and provide a value
    IMAGE_SIZES: {
    "sm": 600,
    "md": 900,
    "lg": 1200
},
    MAX_FILE_SIZE: 104857600,
    BODY_SIZE_LIMIT: 1048576,
    // EXTRACT_DATA_PATH: undefined, // Optional: Uncomment and provide a value
    USE_ARCHIVE_ON_DELETE: true,

    // --- Host Configuration ---
    HOST_DEV: 'http://localhost:5173',
    HOST_PROD: 'http://localhost:4173',

    // --- Logging ---
    LOG_LEVELS: [
    "error"
],
    LOG_RETENTION_DAYS: 2,
    LOG_ROTATION_SIZE: 5242880,

    // --- Theming ---
    SEASONS: false,
    // SEASON_REGION: undefined, // Optional: Uncomment and provide a value

    // --- Demo Mode ---
    DEMO: false,
});
/**
 * @file vite.config.ts
 * @description This configuration file defines the Vite setup for a SvelteKit project.
 * It includes checks for required configuration files (private.ts and public.ts),
 * a custom plugin for dynamic collection handling (compilation, type generation, hot reloading),
 * dynamic role and permission handling with hot reloading, Tailwind CSS purging,
 * and Paraglide integration for internationalization. The configuration also initializes
 * compilation tasks, sets up environment variables, and defines alias paths for the project.
 */

import path from 'path';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';

// compile and cleanupOrphanedFiles will be imported dynamically later
// import { compile, cleanupOrphanedFiles } from './src/routes/api/compile/compile';

import tailwindcss from '@tailwindcss/vite';
// Get package.json version info
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

// Config directories - Use standard path.join
const userCollections = path.join(process.cwd(), 'config/collections');
const compiledCollections = path.join(process.cwd(), 'compiledCollections');
const configDir = resolve(process.cwd(), 'config');
const privateConfigPath = resolve(configDir, 'private.ts');
const publicConfigPath = resolve(configDir, 'public.ts');

// Check config files
const configPaths = [privateConfigPath, publicConfigPath];

// Check if both config files exist
const checkConfigFiles = () => existsSync(privateConfigPath) && existsSync(publicConfigPath);

if (!checkConfigFiles()) {
	console.error('\x1b[33mConfig files missing. Launching CLI installer...\x1b[0m'); // Yellow text
	try {
		// Attempt to run the installer
		execSync('npm run installer', { stdio: 'inherit' }); // Inherit stdio to show installer prompts

		// Check again if files exist AFTER the installer ran
		if (!checkConfigFiles()) {
			console.error('\x1b[31mInstaller exited without creating config files. Aborting Vite startup.\x1b[0m'); // Red text
			process.exit(1); // Exit Vite config if files are still missing
		} else {
			console.log('\x1b[32mInstaller completed successfully. Continuing Vite startup...\x1b[0m'); // Green text
		}
	} catch (error) {
		// This catch block handles errors from execSync itself (e.g., installer script not found, or installer exited with non-zero code due to internal error)
		// We already modified the installer to exit with code 1 on user cancel/exit,
		// but execSync might not throw an error for that on all systems/shells.
		// The check after execSync is the more reliable way to ensure config exists.
		console.error('\x1b[31mError running the installer or installer exited prematurely. Aborting Vite startup.\x1b[0m', error.message);
		process.exit(1); // Exit Vite config on installer error
	}
}

let compileTimeout: NodeJS.Timeout;

export default defineConfig({
	plugins: [
		paraglide({
			project: './project.inlang', // Path to your inlang project
			outdir: './src/paraglide', // Output directory for generated files
			enforce: 'pre' // Ensure Paraglide runs before other transformations
		}),
		tailwindcss(),
		sveltekit(),
		{
			name: 'collection-watcher',
			async buildStart() {
				try {
					// Dynamically import compile here
					const { compile } = await import('./src/routes/api/compile/compile');
					await compile({ userCollections, compiledCollections });
					console.log('\x1b[32mInitial compilation successful!\x1b[0m');
				} catch (error) {
					console.error('\x1b[31mInitial compilation failed:\x1b[0m', error);
					throw error;
				}
			},
			configureServer(server) {
				let lastUnlinkFile: string | null = null;
				let lastUnlinkTime = 0;
				const lastUUIDUpdate: { [key: string]: number } = {};

				return () => {
					// Helper to normalize paths for comparison
					const normalizePath = (p: string) => p.replace(/\\/g, '/');

					server.watcher.on('all', async (event, file) => {
						const normalizedFile = normalizePath(file);
						const normalizedUserCollections = normalizePath(userCollections);
						const normalizedConfigRolesPath = normalizePath(path.join(process.cwd(), 'config/roles.ts'));

						// Monitor changes in config/collections/**/*.ts and **/*.js
						if (normalizedFile.startsWith(normalizedUserCollections) && (file.endsWith('.ts') || file.endsWith('.js'))) {
							console.log(`Collection file event: ${event} - \x1b[34m${file}\x1b[0m`);

							clearTimeout(compileTimeout);
							compileTimeout = setTimeout(async () => {
								try {
									const currentTime = Date.now();

									if (event === 'unlink' || event === 'unlinkDir') {
										lastUnlinkFile = file;
										lastUnlinkTime = currentTime;
										console.log(`Collection file deleted: \x1b[31m${file}\x1b[0m`);

										// Handle deletion - dynamically import cleanupOrphanedFiles
										const { cleanupOrphanedFiles } = await import('./src/routes/api/compile/compile');
										await cleanupOrphanedFiles(userCollections, compiledCollections);
										console.log(`Cleanup completed for deleted file: \x1b[31m${file}\x1b[0m`);
									} else if (event === 'add' || event === 'change') {
										const isRename = lastUnlinkFile && currentTime - lastUnlinkTime < 100;

										if (isRename) {
											console.log(`Collection file renamed: \x1b[33m${lastUnlinkFile}\x1b[0m -> \x1b[32m${file}\x1b[0m`);
											lastUnlinkFile = null;
										} else {
											console.log(`Collection file ${event}: \x1b[32m${file}\x1b[0m`);
										}

										// Track update time
										lastUUIDUpdate[file] = currentTime;

										// Compile - dynamically import compile
										const { compile } = await import('./src/routes/api/compile/compile');
										await compile({ userCollections, compiledCollections });
										console.log('Compilation successful!');

										// Directly perform actions after compilation
										try {
											// Dynamically import necessary modules
											const { isRedisEnabled, clearCache } = await import('./src/databases/redis');
											const { contentManager } = await import('./src/content/ContentManager');
											const { generateContentTypes } = await import('./src/content/vite');

											// Clear Redis cache if enabled
											if (isRedisEnabled()) { // Check if this function works correctly outside request context
												await clearCache('api:content-structure:*');
												console.log('Cleared content structure Redis cache.');
											}

											// Update content manager
											await contentManager.updateCollections(true);
											console.log('Content manager updated.');

											// Update collection types
											await generateContentTypes();
											console.log(`Collection types updated for: \x1b[32m${file}\x1b[0m`);

										} catch (syncError) {
											console.error('Error during post-compilation sync:', syncError);
										}
									}

									// Notify client to reload collections
									server.ws.send({
										type: 'custom',
										event: 'collections-updated',
										data: {}
									});
								} catch (error) {
									console.error(`Error processing collection file ${event}:`, error);
								}
							}, 50); // Debounce time
						}

						// Handle config file changes
						if (normalizedFile === normalizedConfigRolesPath) {
							console.log(`Roles file changed: \x1b[34m${file}\x1b[0m`);

							try {
								// Clear module cache to force re-import
								const rolesPath = `file://${path.resolve(process.cwd(), 'config', 'roles.ts')}`; // Use standard path.resolve
								// Dynamically reimport updated roles & permissions
								const { roles } = await import(rolesPath + `?update=${Date.now()}`);
								// Update roles and permissions in the application
								const { setLoadedRoles } = await import('./src/auth/types');
								setLoadedRoles(roles);

								// Trigger full page reload
								server.ws.send({ type: 'full-reload' });
							} catch (error) {
								console.error('Error reloading roles:', error);
							}
							return [];
						}
					});
				};
			},
			config() {
				// Normalize path for definition, ensuring forward slashes for env vars if needed cross-platform
				const normalizeForDefine = (p: string) => p.replace(/\\/g, '/');
				return {
					define: {
						'import.meta.env.root': JSON.stringify(normalizeForDefine(path.join('/', process.cwd().replace(path.parse(process.cwd()).root, '')))),
						'import.meta.env.userCollectionsPath': JSON.stringify(normalizeForDefine(userCollections)),
						'import.meta.env.compiledCollectionsPath': JSON.stringify(normalizeForDefine(compiledCollections))
					}
				};
			},
			enforce: 'post'
		}
	],

	server: {
		fs: { allow: ['static', '.'] } // Allow serving files from specific directories
	},
	resolve: {
		alias: {
			'@root': resolve(process.cwd(), './'),
			'@src': resolve(process.cwd(), './src'),
			'@components': resolve(process.cwd(), './src/components'),
			'@content': resolve(process.cwd(), './src/content'),
			'@utils': resolve(process.cwd(), './src/utils'),
			'@stores': resolve(process.cwd(), './src/stores'),
			'@widgets': resolve(process.cwd(), './src/widgets')
		}
	},
	define: {
		__VERSION__: JSON.stringify(pkg.version), // Define global version variable from package.json
		SUPERFORMS_LEGACY: true // Legacy flag for SuperForms (if needed)
	}
});

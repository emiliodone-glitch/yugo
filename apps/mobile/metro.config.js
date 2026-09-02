// Metro config for a pnpm monorepo: watch the workspace root and resolve
// hoisted dependencies from both node_modules trees.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

/**
 * Una sola copia de lo que tiene que ser único.
 *
 * pnpm le da a cada paquete del workspace su propio `node_modules`, así que
 * `@yugo/app-core` resolvía `react` a 18.3.1 mientras la app usa 18.2.0 (la
 * que exige React Native 0.74). Metro, con búsqueda jerárquica, empaquetaba
 * las dos: dos Reacts en el mismo árbol es un «Invalid hook call» al abrir la
 * app. Lo mismo aplica a React Query y a zustand, que guardan estado en
 * contextos de React. Aquí se fuerza que esos nombres se resuelvan siempre
 * desde la app, vengan de donde vengan.
 */
const SINGLETONS = ['react', 'react-native', '@tanstack/react-query', 'zustand'];
const singletonRoot = (name) => path.dirname(require.resolve(`${name}/package.json`, { paths: [projectRoot] }));
const singletonDirs = Object.fromEntries(SINGLETONS.map((name) => [name, singletonRoot(name)]));

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const hit = SINGLETONS.find((name) => moduleName === name || moduleName.startsWith(`${name}/`));
  if (hit) {
    const rest = moduleName.slice(hit.length); // '' o '/jsx-runtime', '/shallow', …
    const forced = path.join(singletonDirs[hit], rest);
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.js') },
      rest ? forced : singletonDirs[hit],
      platform,
    );
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;

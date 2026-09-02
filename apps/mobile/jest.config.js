/**
 * Pruebas de la app móvil.
 *
 * No hay emulador en CI ni aquí, así que la pregunta que estas pruebas
 * contestan es la más barata y la más importante: ¿cada pantalla se monta sin
 * lanzar? Una pantalla que lanza al montarse es una app que se cierra al
 * abrirla, y eso no lo detecta ni el typecheck ni el bundle.
 *
 * El monorepo usa pnpm, así que los paquetes nativos viven bajo
 * node_modules/.pnpm/…/node_modules/<paquete>; el patrón de transformación
 * tiene que mirar ese tramo y no solo el nombre del paquete.
 */
const path = require('path');

const nativeToTransform =
  '(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo-google-fonts|expo-router|expo-modules-core|react-navigation|@react-navigation|react-native-svg|react-native-safe-area-context|react-native-screens|@yugo';

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    `node_modules/\\.pnpm/(?!(${nativeToTransform.replace(/\//g, '\\+')})[^/]*/)`,
    `node_modules/(?!(\\.pnpm|${nativeToTransform})/)`,
  ],
  moduleNameMapper: {
    // Una sola copia de React, React Query y zustand: la de la app. Sin esto,
    // app-core traía su React 18.3.1 y los hooks fallaban con «useContext de
    // null». Es el mismo problema que metro.config.js resuelve para el APK.
    '^react$': require.resolve('react'),
    '^react/(.*)$': `${path.dirname(require.resolve('react/package.json'))}/$1`,
    '^react-native$': require.resolve('react-native'),
    '^@tanstack/react-query$': require.resolve('@tanstack/react-query'),
    '^zustand$': require.resolve('zustand'),
    '^zustand/(.*)$': `${path.dirname(require.resolve('zustand/package.json'))}/$1`,
    '^@yugo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@yugo/app-core$': '<rootDir>/../../packages/app-core/src/index.ts',
    '^@yugo/ui-tokens$': '<rootDir>/../../packages/ui-tokens/src/index.ts',
  },
};

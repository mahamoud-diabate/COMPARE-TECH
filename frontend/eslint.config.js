import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // Code applicatif : s'exécute dans le navigateur.
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  /*
   * Outillage : configuration Vite, tests, scripts utilitaires.
   *
   * Ces fichiers tournent sous Node, pas dans le navigateur. Sans ce bloc,
   * `process` et consorts étaient signalés comme non définis — une erreur de
   * contexte, pas une erreur de code, et le genre de bruit qui finit par faire
   * ignorer la sortie du linter.
   */
  {
    files: ['*.config.js', 'capture_demo.js', 'test/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: { sourceType: 'module' },
    },
  },
])

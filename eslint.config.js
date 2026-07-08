import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,mts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    ...pluginVue.configs['flat/essential'],
    files: ['**/*.vue'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
)

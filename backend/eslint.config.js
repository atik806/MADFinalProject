import js from '@eslint/js';
import globals from 'globals';
export default [{ ignores: ['node_modules/', 'coverage/'] }, js.configs.recommended, { files: ['**/*.js'], languageOptions: { globals: globals.node, sourceType: 'module' } }];

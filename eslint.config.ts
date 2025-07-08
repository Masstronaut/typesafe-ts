/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import type { TSESLint } from '@typescript-eslint/utils';
import parser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import { enforceOptionalUsage } from './src/optional/lint.ts';
import { enforceResultUsage } from './src/result/lint.ts';

/**
 * ESLint 9 flat configuration for ts-utils with custom TypeScript monadic rules.
 * 
 * This configuration demonstrates how to use the custom ESLint rules that enforce
 * Optional and Result usage patterns for type-safe functional programming.
 */
// Define the custom plugin once
const tsUtilsPlugin = {
  rules: {
    'enforce-optional-usage': enforceOptionalUsage,
    'enforce-result-usage': enforceResultUsage,
  },
};

const config: TSESLint.FlatConfig.ConfigArray = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      'ts-utils': tsUtilsPlugin,
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // Disallow explicit any types
      '@typescript-eslint/no-explicit-any': 'error',
      
      // Enforce Optional usage instead of nullable unions
      'ts-utils/enforce-optional-usage': ['error', {
        allowExceptions: [], // Add function names to exclude
        autoFix: true,
      }],
      
      // Enforce Result usage instead of throw/try-catch
      'ts-utils/enforce-result-usage': ['error', {
        allowExceptions: [], // Add function names to exclude
        allowTestFiles: true, // Allow throw/try-catch in test files
        autoFix: true,
      }],
    },
  },
  
  // Configuration for test files with more relaxed rules
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts', '**/tests/**/*.ts'],
    rules: {
      // More lenient rules for test files
      'ts-utils/enforce-optional-usage': 'warn',
      'ts-utils/enforce-result-usage': ['warn', {
        allowTestFiles: true,
        autoFix: false, // Don't auto-fix in test files
      }],
    },
  },
];

export default config;
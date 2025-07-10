import type { UserConfig } from '@commitlint/types';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // New features
      'fix',      // Bug fixes
      'docs',     // Documentation changes
      'style',    // Code style changes (formatting, etc.)
      'refactor', // Code refactoring
      'test',     // Adding or updating tests
      'chore',    // Build process or auxiliary tool changes
      'perf',     // Performance improvements
      'ci',       // Continuous integration changes
      'revert'    // Reverting previous commits
    ]],
    'scope-empty': [0], // Allow empty scopes
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72]
  }
};

export default Configuration;
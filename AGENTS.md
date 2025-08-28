# AGENTS.md - TypeScript Utils Development Guide

## Commands
- `npm run test` - Run all tests with coverage
- `npm run typecheck` - Type checking
- `npm run lint` - Lint all TypeScript files
- `node --test src/optional/optional.test.ts` - Run single test file
- `node --test --experimental-test-coverage src/optional/optional.test.ts` - Single test with coverage

## Code Style
- **License**: MIT license header required in all files
- **Imports**: ES modules only, use `.ts` extensions for local imports
- **Types**: Strict TypeScript with `@tsconfig/strictest`, no `any` types
- **Naming**: snake_case for methods (monadic style), PascalCase for types/interfaces
- **Error Handling**: Use Result monad instead of throw/try-catch, Optional monad for nullable values
- **Comments**: No implementation comments, comprehensive JSDoc for public APIs only
- **Immutability**: Object.freeze() classes and namespaces, prefer functional patterns
- **Testing**: Node.js built-in test runner, 100% coverage required, nested suites with `t.test()`

## Architecture
- Each utility in `src/[name]/` with implementation, tests, and readme
- Monadic patterns with type predicates for safe value access
- Zero dependencies, web standard APIs only
- Factory namespaces for constructors (e.g., `optional.some()`, `result.ok()`)

## Git Conventions
- **Commits/PRs**: Do not mention AI tools, assistants, or automated generation in commit messages or PR descriptions
- Focus commit messages on the technical changes and their purpose
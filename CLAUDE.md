# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated**: 2025-07-14

## Project Overview

This is a collection of TypeScript utilities designed to be portable, well-documented, and dependency-free. Each utility can be copied as a single file into other projects while carrying its license and implementation.

### Core Principles

- **Monadic patterns**: The codebase emphasizes functional programming patterns, particularly monads like `Optional` and `Result` to handle edge cases type-safely
- **Non-throwing**: Operations that may fail use the type system to represent failure states rather than throwing exceptions
- **Zero dependencies**: Utilities use only web standard APIs and TypeScript built-ins
- **Full test coverage**: All utilities must have 100% test coverage
- **Comprehensive documentation**: All public interfaces documented with JSDoc including usage examples

## Development Commands

```bash
# Set up Node.js environment (required before running any commands)
source ~/.nvm/nvm.sh && nvm use 24

# Run tests with coverage
npm run test

# Type checking
npm run typecheck

# Validate changes (run both commands above)
npm run test && npm run typecheck

# Run a single test file
node --test src/optional/optional.test.ts
node --test src/result/result.test.ts

# Run tests with coverage for specific files
node --test --experimental-test-coverage src/optional/optional.test.ts
node --test --experimental-test-coverage src/result/result.test.ts
```

## Architecture

### Utility Structure

Each utility follows a consistent pattern:

1. **License header**: MIT license at the top of every file
2. **Interface definition**: Public API exported as TypeScript interface
3. **Implementation class**: Internal implementation (often frozen for immutability)
4. **Factory namespace**: Exported namespace with constructor functions (e.g., `optional.some()`, `optional.none()`)
5. **Comprehensive tests**: Co-located test file with 100% coverage

### Current Utilities

- **Optional** (`src/optional/`): Monadic alternative to `null`/`undefined` for type-safe handling of potentially missing values
- **Result** (`src/result/`): Monadic error handling for type-safe operations that may fail without throwing exceptions

### Type System Usage

The codebase leverages advanced TypeScript features:

- **Type predicates**: Methods like `is_some()` narrow types to expose additional properties
- **Generic constraints**: Error types extend `Error` base class
- **Symbol-based internal state**: Uses unique symbols for internal "none" values
- **Strict mode**: Full TypeScript strict mode with additional flags like `noUncheckedIndexedAccess`

## File Organization

- `src/[utility-name]/`: Each utility in its own directory
  - `[utility-name].ts`: Main implementation
  - `[utility-name].test.ts`: Test suite
  - `readme.md`: Detailed documentation with examples
- `src/tests/`: Additional test files for cross-utility testing

## Testing Patterns

Tests use Node.js built-in test runner with:
- Nested test suites using `t.test()`
- Assert module for assertions
- Test coverage via `--experimental-test-coverage`
- Focus on both happy path and edge cases
- Monadic operation chaining tests

## Code Style

- **No comments in implementation**: Code should be self-documenting through clear naming
- **Comprehensive JSDoc**: All public interfaces fully documented
- **Functional patterns**: Prefer immutable operations and method chaining
- **Type safety**: Leverage TypeScript's type system to prevent runtime errors
- **Object.freeze()**: Implementation classes and namespaces are frozen for immutability

## Recent Changes

### v1.0.0 Release
- **Breaking change**: Renamed `result.from()` to `result.try()` for clarity
- **New features**: Added `retry()` and `retry_async()` methods to Result type
- **Type safety**: Improved type narrowing for `is_ok()` and `is_error()` predicates
- **Tooling**: Added ESLint rules for type-safe error handling and null safety
- **CI/CD**: Implemented automated release process with semantic versioning

### ESLint Integration
- Custom ESLint rules enforce Result usage patterns
- Prevents unsafe null/undefined access
- Ensures proper error handling throughout the codebase
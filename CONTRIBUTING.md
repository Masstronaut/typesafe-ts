# Contributing to typesafe-ts

Thank you for your interest in contributing to typesafe-ts! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork and clone the repository**

    ```bash
    git clone https://github.com/masstronaut/typesafe-ts.git
    cd typesafe-ts
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Run tests to ensure everything works**. Note that node 23.6 is required for NodeJS native TS support, which is required for the test runner.
    ```bash
    npm run test
    npm run typecheck
    ```

## Development Commands

- `npm run test` - Run tests with coverage
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run build` - Build the project
- `npm run clean` - Clean build artifacts

## Code Standards

### Quality Requirements

All contributions must meet these standards:

- **100% test coverage** - All code must have comprehensive tests
- **TypeScript strict mode** - All code must pass strict TypeScript checking
- **Eraseable syntax only** - Only _erasable_ TypeScript syntax is allowed.
- **ESLint compliance** - All code must pass linting with 0 warnings or errors
- **Zero dependencies** - Core utilities must not introduce external dependencies. Supporting code (tests, dev tools, etc.) should prefer to avoid dependencies where possible.

### Code Style

- Use strict TypeScript for all code
- Follow existing code patterns and conventions
- Use JSDoc for all public interfaces
- No comments in implementation code (code should be self-documenting)
- Use monadic patterns where appropriate

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements
- `ci`: Continuous integration changes
- `revert`: Reverting previous commits

### Examples

```
feat(optional): add flatMap method for chaining operations

fix(result): handle edge case in error propagation

docs: update README with new usage examples

test(optional): add comprehensive tests for filter method
```

### Scope Guidelines

- `optional`: Changes to Optional utility
- `result`: Changes to Result utility
- `lint`: Changes to ESLint or commit lint rules
- `build`: Changes to build configuration
- `ci`: Changes to CI/CD pipeline

## Pull Request Process

1. **Create a feature branch**

    ```bash
    git checkout -b feat/your-feature-name
    ```

2. **Make your changes**
    - Write code following the standards above
    - Add comprehensive tests
    - Update documentation if needed

3. **Verify your changes**

    ```bash
    npm run test
    npm run typecheck
    npm run lint
    npm run build
    npm run docs:build
    ```

4. **Commit using conventional commits**

    ```bash
    git commit -m "feat(optional): add support for linting with biome"
    ```

5. **Push and create a Pull Request**
    ```bash
    git push origin feat/your-feature-name
    ```

## Testing Guidelines

- All utilities must have 100% test coverage
- Tests should cover both happy paths and edge cases
- Use descriptive test names
- Group related tests using `t.test()` nested structure
- Test some complex usage scenarios

## Adding New Utilities

When adding a new utility:

1. **Create directory structure**

    ```
    src/new-utility/
    ├── index.ts            # Main implementation
    ├── new-utility.ts      # Implementation file
    ├── new-utility.test.ts # Test suite
    └── readme.md           # Documentation
    ```

2. **Follow existing patterns**
    - License header at the top
    - Interface definition
    - Implementation class (frozen)
    - Factory namespace
    - Comprehensive JSDoc
    - If there are design decisions you are unsure about, open an issue or update an existing one.

3. **Update package.json exports**
   Add appropriate export paths for the new utility

## Release Process

Releases are automated using semantic-release:

- Commits to `main` branch trigger automatic releases
- Version numbers are determined by commit types
- Changelog is generated automatically
- npm publishing is handled by CI/CD

## Questions?

If you have questions about contributing, please:

1. Check existing issues and discussions
2. Open a new issue with your question
3. Reach out to maintainers

Thank you for contributing to typesafe-ts! 🎉

# About this repo

My intent with this repository is for it to collect utilities that I find generally useful in TypeScript projects.

Often I am tempted to compromise code quality because the right utilities aren't available in a project.

This repository contains my implementations of those utilities, which have been given more love and care than project deadlines typically allow.
They are designed to be portable such that a single file can be copied into a project, carrying its license & implementation with it.

These utilities exist to ease the process of authoring robust code that is easy to read, maintain, and extend.

# Expectations

Utilities in this repository are expected to meet the following criteria:

- **Documented**: All exposed interfaces and types should be documented with JSDoc, including usage examples. This provides a better developer experience and makes it easier for developers unfamiliar with them to understand how to work with them.
- **Tested**: All utilities should have 100% test coverage to ensure they work as expected and to prevent regressions.
- **Type-safe**: Wherever possible, leverage the type system to make incorrect code impossible.
- **No dependencies**: Utilities should not depend on any external libraries or frameworks, unless they are intended to be used with a specific library or framework (e.g., React, Node.js). In this case, they should not introduce any additional dependencies.
- **Platform-first**: These utilities use web standard APIs, types, features, etc.
- **Non-throwing**: Throwing exceptions results in complex control flow that is difficult to reason about and handle comprehensively. Operations that may fail should represent that possibility using the type system so that error handling can be statically enforced.

# Utilities

- **[`Optional`](src/optional/optional.ts)**: A type-safe and ergonomic alternative to `null`|`undefined` for values that might be empty.
- **[`Result`](src/result/result.ts)**: A type-safe alternative to `throw`ing errors; `Result` treats errors as values with full type support.

## ESLint Rules

Both `Optional` and `Result` include ESLint rules to help assist with adoption and correct usage:

- **`enforce-optional-usage`**: Detects functions that return nullable types and suggests using `Optional` instead
- **`enforce-result-usage`**: Detects throw statements and try/catch blocks, suggesting a `Result`-based approach instead

These rules help teams adopt typesafe patterns consistently across their codebase. See the individual utility documentation for setup instructions.

# Contributing

Additions should meet all the expectations outlined above.

To validate changes:

```sh
npm run test
npm run typecheck
npm run lint
```

For more guidance on contributing, see the [CONTRIBUTING.md](CONTRIBUTING.md) file.

# License

This repository is licensed under the [MIT License](LICENSE.txt). See the [LICENSE.txt](LICENSE.txt) file for more details.

All files copied into a project should include the full license text at the top of the file.

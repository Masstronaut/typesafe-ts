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

- **[`Optional`](src/optional/optional.ts)**: A monadic alternative to `null`/`undefined` for expressing the result of operations that may not produce a value, and to work with those results.

# Contributing

Additions should meet all the expectations outlined above.

To validate changes:

```sh
npm run test
npm run typecheck
```

# License

This repository is licensed under the [MIT License](LICENSE.txt). See the [LICENSE.txt](LICENSE.txt) file for more details.

All files copied into a project should include the full license text at the top of the file.

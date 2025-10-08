## 1.6.0 (2025-10-08)

* fix(test): use direct imports for type stripping compat ([338cd70](https://github.com/Masstronaut/typesafe-ts/commit/338cd70))
* docs(assert): fix JSDoc links to use import syntax ([4a99a35](https://github.com/Masstronaut/typesafe-ts/commit/4a99a35))
* docs(assert): improve clarity and reduce verbosity in readme ([254b50f](https://github.com/Masstronaut/typesafe-ts/commit/254b50f))
* ci: add docs & perf improvements to changelog ([bac7412](https://github.com/Masstronaut/typesafe-ts/commit/bac7412))
* feat: export assert module and fix import extensions ([4a2e53a](https://github.com/Masstronaut/typesafe-ts/commit/4a2e53a))

## [1.5.1](https://github.com/Masstronaut/typesafe-ts/compare/v1.5.0...v1.5.1) (2025-10-06)


### Bug Fixes

* **brand:** branded error type now explicitly extends error ([1668bba](https://github.com/Masstronaut/typesafe-ts/commit/1668bba9c9193b79aab0b27a881a54f94ce9bdfa))

# [1.5.0](https://github.com/Masstronaut/typesafe-ts/compare/v1.4.1...v1.5.0) (2025-10-05)


### Bug Fixes

* more precise error brand type & symbol name ([8461100](https://github.com/Masstronaut/typesafe-ts/commit/8461100499e04903c30f52d76f4751cda79be936))
* removed iterations from unnecessarily slow result test ([8ece5a4](https://github.com/Masstronaut/typesafe-ts/commit/8ece5a47a1febb072916ab2378af8c72874e108a))
* use Object.defineProperty for brand symbol on prototype ([10fe175](https://github.com/Masstronaut/typesafe-ts/commit/10fe175da81a0c671aa6a41ef09e3f090768ace2))


### Features

* add brand module for nominal typing and branded errors ([6aa734b](https://github.com/Masstronaut/typesafe-ts/commit/6aa734b30a803939369f69658a8e5ff6da882b6f))
* add error mapper support to Result.try() and try_async() ([5be3ae9](https://github.com/Masstronaut/typesafe-ts/commit/5be3ae969d58c05993b692621673711f24b9cab5))

## [1.4.1](https://github.com/Masstronaut/typesafe-ts/compare/v1.4.0...v1.4.1) (2025-09-19)

# [1.4.0](https://github.com/Masstronaut/typesafe-ts/compare/v1.3.0...v1.4.0) (2025-09-03)

### Features

- add Assert utility for compile-time type assertions ([58efa7e](https://github.com/Masstronaut/typesafe-ts/commit/58efa7e42025377c3e59f9f51c3ad855a28269c3))
- add Check utilities for type relationship testing ([5912b0c](https://github.com/Masstronaut/typesafe-ts/commit/5912b0c2fa196c36fd82f288af360f229e41c8b2))
- enhance Result and_then/or_else type union handling ([48b9e11](https://github.com/Masstronaut/typesafe-ts/commit/48b9e11a44345d82663311a0352ee1e543eb4cd9))

# [1.3.0](https://github.com/Masstronaut/typesafe-ts/compare/v1.2.0...v1.3.0) (2025-08-15)

### Features

- **optional:** add from_nullable() method for direct nullable value conversion ([6c04cca](https://github.com/Masstronaut/typesafe-ts/commit/6c04cca23a0689b32d63a31902ae635621790888))

# [1.2.0](https://github.com/Masstronaut/typesafe-ts/compare/v1.1.0...v1.2.0) (2025-08-05)

### Features

- add AsyncResult with improved error handling and chaining support ([#16](https://github.com/Masstronaut/typesafe-ts/issues/16)) ([b994446](https://github.com/Masstronaut/typesafe-ts/commit/b9944468f3a5efaf8691f7f9c968b0c45853e14e))

# [1.1.0](https://github.com/Masstronaut/typesafe-ts/compare/v1.0.0...v1.1.0) (2025-07-16)

### Features

- add AsyncResult for immediate chaining on async operations ([#15](https://github.com/Masstronaut/typesafe-ts/issues/15)) ([dd3a01d](https://github.com/Masstronaut/typesafe-ts/commit/dd3a01d8aa7ed8f955f5e200d18bb92bb1fb8e2c))

# 1.0.0 (2025-07-11)

### Bug Fixes

- exclude semantic-release commits from commitlint validation ([#13](https://github.com/Masstronaut/typesafe-ts/issues/13)) ([8c4050a](https://github.com/Masstronaut/typesafe-ts/commit/8c4050a18dff4bb181d502791e105636d254d1bf))
- resolve semantic-release permission and repository URL issues ([#12](https://github.com/Masstronaut/typesafe-ts/issues/12)) ([109a55e](https://github.com/Masstronaut/typesafe-ts/commit/109a55eb83a1432b6e48038240cf9c8b9abbc747))
- use RELEASE_TOKEN for semantic-release git operations ([#14](https://github.com/Masstronaut/typesafe-ts/issues/14)) ([7b3b348](https://github.com/Masstronaut/typesafe-ts/commit/7b3b34816cfe8b0d35a695f7bc58e6488aecb3df))

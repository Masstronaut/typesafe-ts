# Assert - Compile-Time Type Assertions

A lightweight, zero-dependency TypeScript utility for compile-time type assertions and type relationship testing. calls to Assert<T, message>() will fail to resolve if `T` is not true. At runtime, all calls to Assert resolve as a no-op.

## Overview

The Assert utility for writing assertions about types at compile time. It performs static type checking that fails at compile time rather than runtime, making it possible to write tests for _types_. Assert can be used on its own, or with the Check utilities.

Since Assert is designed for compile-time checks, each assertion is a no-op at runtime and has close to zero performance impact. This means it's safe to use liberally for testing the behavior of types in your codebase without impacting how long tests take to run.

## Installation

This utility is designed with zero dependencies so it can be easily incorporated into any project. It can be added as part of the `typesafe-ts` package or can be copied as standalone code into your repository.

To install the typesafe-ts package, run:

```bash
npm install typesafe-ts
```

If you only want to use the Assert and/or Check utilities, you can copy the relevant files directly into your project:

```bash
# Copy these files to your project
src/assert/
├── assert.ts    # Main Assert function
├── check.ts     # Type checking utilities like Equal, Extends, True, False, etc.
└── index.ts     # Exports both, bundling checks into a single `Check` namespace
```

## Quick Start

```ts
import { Assert, type Check } from "typesafe-ts/assert";

// ✅ These compile successfully
Assert<Check.Equal<string, string>, "Strings should be equal">();
Assert<Check.True<true>, "This should be true">();
Assert<Check.Extends<"hello", string>, "String literal extends string">();

// ❌ These cause compile errors
Assert<Check.Equal<string, number>, "Different types">(); // Compile error!
Assert<Check.True<false>, "This is false">(); // Compile error!
```

The recommended way to use Assert is by adding tests to cover the behavior of types using your existing testing tools.
Inside those tests, only write Assert statements. When compiling your test code, type tests will fail.
At runtime, the Asserts will do nothing so your tests will pass. This makes it easy to organize type tests next to your existing tests in a way that is familiar to your team.

For examples of tests written using Assert, see the [Assert tests](./assert.test.ts) and [Check tests](./check.test.ts) included in this package or in the [typesafe-ts GitHub repository](https://github.com/Masstronaut/typesafe-ts/tree/main/src/assert/).

## Core Functions

### `Assert<T, Message>()`

Static type assertion function that enforces compile-time type checking.

- **`T`** - Should be a type that resolves to `true`, such as the Check utilities
- **`Message`** - A custom error message included in the compilation error if the assertion fails

```ts
// Example usage
Assert<true, "This assertion will pass">(); // ✅ compiles successfully
Assert<false, "This assertion will fail">(); // ❌ compile error with message
```

### Check Utilities

The check utilities are designed to make it easier to write assertions about types. Each check returns `true` or `false` based on the type relationship being tested.

These utilities can also be used independently of Assert for other type-level programming tasks.

#### `Check.Equal<Left, Right>`

Tests if two types are exactly equal, distinguishing between `any`, `unknown`, `never`, and other similar types.

```ts
type Test1 = Check.Equal<string, string>; // true
type Test2 = Check.Equal<string, number>; // false
type Test3 = Check.Equal<string, any>; // false
type Test4 = Check.Equal<unknown, any>; // false
```

#### `Check.True<T>` / `Check.False<T>`

Tests if a type is exactly `true` or exactly `false` (not truthy/falsy value types).

```ts
type Test1 = Check.True<true>; // true
type Test2 = Check.True<1>; // false (truthy but not true)
type Test3 = Check.False<false>; // true
type Test4 = Check.False<0>; // false (falsy but not false)
```

#### `Check.Extends<SubType, SuperType>`

Tests subtype relationships. Equivalent to `SubType extends SuperType ? true : false`.

```ts
type Test1 = Check.Extends<string, any>; // true
type Test2 = Check.Extends<"hello", string>; // true
type Test3 = Check.Extends<string, number>; // false
type Test4 = Check.Extends<never, string>; // true
```

#### `Check.IsNever<T>` / `Check.IsAny<T>` / `Check.IsUnknown<T>`

Detects the special Typescript types which can be challenging edge cases in type programming.

```ts
type Test1 = Check.IsNever<never>; // true
type Test2 = Check.IsAny<any>; // true
type Test3 = Check.IsUnknown<unknown>; // true
```

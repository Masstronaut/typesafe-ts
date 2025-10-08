# Assert - Compile-Time Type Assertions

TypeScript utility for compile-time type assertions and type relationship testing. `Assert<T, Message>()` fails compilation if `T` is not `true`. At runtime, all assertions are no-ops with zero performance impact.

## Installation

```bash
npm install typesafe-ts
```

Or copy `src/assert/` files directly into your project (zero dependencies).

## Usage

```ts
import { Assert, type Check } from "typesafe-ts/assert";

// ✅ Passes compilation
Assert<Check.Equal<string, string>, "Strings should be equal">();
Assert<Check.Extends<"hello", string>, "Literal extends string">();

// ❌ Fails compilation
Assert<Check.Equal<string, number>, "Different types">();
Assert<Check.True<false>, "This is false">();
```

Use Assert in test files alongside your existing tests. Type assertions fail at compile-time, while runtime tests pass (assertions are no-ops). See [assert.test.ts](./assert.test.ts) and [check.test.ts](./check.test.ts) for examples.

## API Reference

### `Assert<T, Message>()`

Compile-time type assertion. Fails compilation if `T` is not `true`.

**Parameters:**

- `T` - Type that resolves to `true` or the assertion fails. Works well with `Check` utilities.
- `Message` - Error message shown on assertion failure

```ts
Assert<true, "This passes">(); // ✅
Assert<false, "This fails">(); // ❌ Compile error
Assert<Check.Equal<"hello", string>, "Literal is not equal to string">(); // ❌ Compile error
```

### Check Utilities

Type utilities that return `true` or `false`. Use with Assert or standalone for type-level programming.

**`Check.Equal<Left, Right>`** - Exact type equality (distinguishes `any`, `unknown`, `never`)

```ts
Check.Equal<string, string>; // true
Check.Equal<string, number>; // false
Check.Equal<string, any>; // false
```

**`Check.True<T>`** / **`Check.False<T>`** - Exact `true` or `false` type (not truthy/falsy)

```ts
Check.True<true>; // true
Check.True<1>; // false
Check.False<false>; // true
Check.False<0>; // false
```

**`Check.Extends<SubType, SuperType>`** - Subtype relationship test

```ts
Check.Extends<"hello", string>; // true
Check.Extends<string, number>; // false
Check.Extends<never, string>; // true
```

**`Check.IsNever<T>`** / **`Check.IsAny<T>`** / **`Check.IsUnknown<T>`** - Detect special TypeScript types

```ts
Check.IsNever<never>; // true
Check.IsAny<any>; // true
Check.IsUnknown<unknown>; // true
```

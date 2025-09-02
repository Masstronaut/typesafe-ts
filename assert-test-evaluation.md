# Assert Test Evaluation

## Analysis of @ts-expect-error Directives

| Test Case                                    | Line | Code                                            | Should Error?                         | Actually Errors? | Status   | Action Required                                   |
| -------------------------------------------- | ---- | ----------------------------------------------- | ------------------------------------- | ---------------- | -------- | ------------------------------------------------- |
| Assert.Equal<string, any>()                  | 20   | `Assert.Equal<string, any>();`                  | ✅ Yes - any and string are not equal | ❌ No            | **FLAW** | Fix Assert.Equal to properly handle any type      |
| Assert.Equal<{ a: number }, { a: string }>() | 23   | `Assert.Equal<{ a: number }, { a: string }>();` | ✅ Yes - different object shapes      | ❌ No            | **FLAW** | Fix Assert.Equal to properly compare object types |
| Assert.True<never>()                         | 38   | `Assert.True<never>();`                         | ✅ Yes - never is not true            | ❌ No            | **FLAW** | Fix Assert.True to reject never type              |
| Assert.True<null>()                          | 41   | `Assert.True<null>();`                          | ✅ Yes - null is not true             | ❌ No            | **FLAW** | Fix Assert.True to reject null type               |
| Assert.True<undefined>()                     | 44   | `Assert.True<undefined>();`                     | ✅ Yes - undefined is not true        | ❌ No            | **FLAW** | Fix Assert.True to reject undefined type          |
| Assert.False<never>()                        | 65   | `Assert.False<never>();`                        | ✅ Yes - never is not false           | ❌ No            | **FLAW** | Fix Assert.False to reject never type             |
| Assert.False<null>()                         | 68   | `Assert.False<null>();`                         | ✅ Yes - null is not false            | ❌ No            | **FLAW** | Fix Assert.False to reject null type              |
| Assert.False<undefined>()                    | 71   | `Assert.False<undefined>();`                    | ✅ Yes - undefined is not false       | ❌ No            | **FLAW** | Fix Assert.False to reject undefined type         |

## Tasks to Fix Assert Implementation

- [ ] Fix Assert.Equal to handle `any` type properly - The current `Equal<Left, Right>` type utility is not correctly identifying that `string` and `any` are different types. The Equal type should return `false` when comparing any concrete type with `any`.

- [ ] Fix Assert.Equal to handle complex object types - The Equal type utility is not properly comparing object shapes with different property types. `{ a: number }` and `{ a: string }` should not be considered equal.

- [ ] Fix Assert.True to reject never, null, and undefined - The current implementation of `Assert.True` is accepting `never`, `null`, and `undefined` types when it should only accept the literal `true` type.

- [ ] Fix Assert.False to reject never, null, and undefined - The current implementation of `Assert.False` is accepting `never`, `null`, and `undefined` types when it should only accept the literal `false` type.

## Root Cause Analysis

The main issues appear to be:

1. **TrueOrAssertionFailure logic**: The constraint checking logic may not be strict enough to reject types like `never`, `null`, and `undefined` that are not exactly `true` or `false`. It's not possible to impose a type constraint using `extends` that excludes `never` because never is a subtype of all types. This means we must use an intermediary of some kind that does accept never and transforms it into something else that we _can_ exclude with a constraint to produce an error.

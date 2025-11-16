# Result

A monadic type for handling operations that may succeed or fail without throwing exceptions. Provides type-safe, composable error handling with explicit error types in function signatures.

## Basic Usage

```typescript
import { result, type Result } from "./result.ts";

// Creating results
const success = result.ok("Hello, World!");
const failure = result.error(new Error("Something went wrong"));

// Type-safe access
if (success.is_ok()) {
    console.log(success.value); // "Hello, World!"
}

if (failure.is_error()) {
    console.log(failure.error.message); // "Something went wrong"
}

// Safe value extraction
console.log(success.value_or("default")); // "Hello, World!"
console.log(failure.value_or("default")); // "default"
```

## Wrapping Throwing Functions

```typescript
// Wrap functions that may throw
const parseResult = result.try(() => JSON.parse('{"name": "John"}'));
const fileResult = result.try(() => fs.readFileSync("file.txt", "utf8"));

// Wrap async functions
const fetchResult = result.try_async(() => fetch("/api/data"));
const asyncFileResult = result.try_async(() =>
    fs.promises.readFile("file.txt", "utf8")
);
```

## Chaining Operations

```typescript
// Transform values with map
const doubled = result.ok(5).map((x) => x * 2); // Result<number, never>

// Chain operations with and_then
function divide(a: number, b: number): Result<number, Error> {
    return b === 0
        ? result.error(new Error("Division by zero"))
        : result.ok(a / b);
}

const computation = result
    .ok(10)
    .and_then((x) => divide(x, 2))
    .map((x) => x * 3); // Result<number, Error>

// Handle errors with or_else
const withFallback = computation.or_else(() => result.ok(0)); // Provide default on error

// Pattern matching
computation.match({
    on_ok: (value) => console.log(`Result: ${value}`),
    on_error: (error) => console.log(`Error: ${error.message}`),
});
```

## Async Result Chaining

`result.try_async()` returns an `AsyncResult` that supports immediate chaining without intermediate awaits:

```typescript
const processed = result
    .try_async(() => fetch("/api/user/123"))
    .try_async((response) => response.json())
    .and_then((user) =>
        user.name ? result.ok(user) : result.error(new Error("Invalid user"))
    )
    .or_else(() => result.ok({ name: "Unknown" }));

// Only await the final result
const finalResult = await processed;
```

If a function must return an `AsyncResult` but some branches can be resolved synchronously, use `result.ok_async()` / `result.error_async()` to return an `AsyncResult` with a resolved value:

```typescript
async function loadUser(id: string) {
    const cached = cache.get(id);
    if (cached) {
        return result.ok_async(cached);
    }
    const validationIssue = validate(id);
    if (validationIssue) {
        return result.error_async(validationIssue);
    }
    return result.try_async(() => fetchUser(id));
}
```

## Exception vs Result Comparison

Exception-based error handling requires nested try-catch blocks:

```typescript
// Exception-based (verbose, error-prone)
function calculateExpression(a: string, b: string): number | null {
    try {
        const numA = parseNumber(a);
        try {
            const numB = parseNumber(b);
            try {
                const quotient = divide(numA, numB);
                return Math.sqrt(quotient);
            } catch (divisionError) {
                return null;
            }
        } catch (parseError) {
            return null;
        }
    } catch (parseError) {
        return null;
    }
}
```

Result-based error handling chains operations cleanly:

```typescript
// Result-based (concise, type-safe)
function calculateExpression(a: string, b: string): Result<number, Error> {
    return parseNumber(a)
        .and_then((numA) =>
            parseNumber(b).and_then((numB) => divide(numA, numB))
        )
        .and_then((quotient) => sqrt(quotient));
}

function parseNumber(str: string): Result<number, Error> {
    const num = Number(str);
    return isNaN(num)
        ? result.error(new Error(`Invalid number: ${str}`))
        : result.ok(num);
}
```

## Retry Operations

```typescript
// Retry a function that returns Result
function unreliableOperation(): Result<string, Error> {
    return Math.random() > 0.7
        ? result.ok("Success!")
        : result.error(new Error("Failed"));
}

const retryResult = result.retry(unreliableOperation, 3);

// Retry async operations
async function fetchData(): Promise<Result<string, Error>> {
    return result.try_async(() => fetch("/api/data"));
}

const asyncRetryResult = await result.retry_async(fetchData, 3);
```

## Iterator Support

```typescript
// Iterate over successful values
const results = [result.ok(1), result.error(new Error("Failed")), result.ok(3)];

const values = [];
for (const res of results) {
    for (const value of res) {
        values.push(value);
    }
}
console.log(values); // [1, 3]

// Async iteration
for await (const value of result.try_async(() => fetchUser("123"))) {
    console.log(value.name); // Only executes if fetch succeeds
}
```

## ESLint Rule

An ESLint rule is available to enforce Result usage patterns. See [lint.ts](./lint.ts) for the complete rule implementation and configuration options.

```javascript
// eslint.config.js
import { enforceResultUsage } from "./src/result/lint.ts";

export default [
    {
        files: ["**/*.ts"],
        plugins: {
            "typesafe-ts": {
                rules: { "enforce-result-usage": enforceResultUsage },
            },
        },
        rules: { "typesafe-ts/enforce-result-usage": "error" },
    },
];
```

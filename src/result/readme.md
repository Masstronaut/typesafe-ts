# Result

The `Result` type is a monadic alternative to throwing exceptions for expressing the result of operations that may succeed or fail. It provides a way to handle errors in an expressive and type-safe manner without relying on exception handling.

Code that throws exceptions when operations fail has a couple shortcomings:

1. It forces all calling code to handle exceptions, even when they may not be equipped to do so meaningfully.
2. Exception types are not captured in function signatures, making it difficult to know what errors a function might produce.
3. Stack unwinding from exceptions can be expensive and makes control flow less predictable.

`Result` addresses these issues by wrapping either a successful value or an error in a way that makes error handling explicit and composable. It provides expressive methods that encapsulate error checking, making it possible to write robust code that gracefully handles failure cases without repetitive try-catch blocks.

# The `Result` interface

`Result` is fully documented inline. The best way to view its documentation is in your editor, while using it. You can also view the documentation for each method [in this source code](./result.ts).

Here's an overview of the `Result` interface:

```ts result.ts
// Interface definition that can be used for type annotations.
export interface Result<ResultType, ErrorType extends Error> {
  // Check if the result contains an error. If it does, it will be widened to include an `error` property.
  is_error(): this is ErrorResult<ErrorType>;

  // Check if the result contains a value. If it does, it will be widened to include a `value` property.
  is_ok(): this is OkResult<ResultType>;

  // If the result is Ok, return the value. Otherwise, return the provided default value.
  value_or(value_if_error: ResultType): ResultType;

  // If the result is Error, return the error. Otherwise, return the provided default error.
  error_or(error_if_ok: ErrorType): ErrorType;

  // If the result is Ok, map the value and return a new Result with the mapped value.
  // Otherwise, return the error unchanged.
  map<NewResultType>(
    fn: (value: ResultType) => NewResultType,
  ): Result<NewResultType, ErrorType>;

  // If the result is Error, map the error and return a new Result with the mapped error.
  // Otherwise, return the value unchanged.
  map_err<NewErrorType extends Error>(
    fn: (error: ErrorType) => NewErrorType,
  ): Result<ResultType, NewErrorType>;


  // Pattern match against the result, returning the result of the appropriate callback.
  match<OKMatchResultType, ErrorMatchResultType>({
    on_ok,
    on_error,
  }: {
    on_ok: (value: ResultType) => OKMatchResultType;
    on_error: (error: ErrorType) => ErrorMatchResultType;
  }): OKMatchResultType | ErrorMatchResultType;

  // If this Result is Ok, apply the function to the value. Otherwise, return the error unchanged.
  and_then<NewResultType>(
    fn: (value: ResultType) => Result<NewResultType, ErrorType>,
  ): Result<NewResultType, ErrorType>;

  // Provide an alternative Result if this Result is Error.
  or_else<NewErrorType extends Error>(
    fn: (error: ErrorType) => Result<ResultType, NewErrorType>,
  ): Result<ResultType, NewErrorType>;

  // Iterator support - yields the value if Ok, nothing if Error.
  [Symbol.iterator](): Generator<ResultType, void, unknown>;
}

export const result = {
  ok, // constructs a `Result` with a success value
  error, // constructs a `Result` with an error
  of, // constructs a `Result` from a provided function. Ok if it returns, Error if it throws.
  of_async, // constructs a `Result` from an async function. Ok if it resolves, Error if it rejects or throws
  retry, // executes a Result-returning function multiple times until success or retry limit is reached
  retry_async, // executes an async Result-returning function multiple times until success or retry limit is reached
};
```

# Example usage

Sometimes an operation involves a series of steps, any of which may fail. This sort of operation often results in repetitive try-catch blocks that are tedious to write and challenging to read. It requires more code, which increases the likelihood of bugs being introduced and increases the maintenance burden.

Consider this exaggerated example calculation where any of a series of steps may fail. It could benefit from `Result`'s monadic interface to simplify error handling.

```ts
function parseNumber(str: string): number {
  const num = Number(str);
  if (isNaN(num)) {
    throw new Error(`Invalid number: ${str}`);
  }
  return num;
}

function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return a / b;
}

function sqrt(n: number): number {
  if (n < 0) {
    throw new Error("Cannot take square root of negative number");
  }
  return Math.sqrt(n);
}

function calculateExpression(
  numeratorStr: string,
  denominatorStr: string,
): number | null {
  try {
    const numerator = parseNumber(numeratorStr);
    try {
      const denominator = parseNumber(denominatorStr);
      try {
        const quotient = divide(numerator, denominator);
        try {
          const result = sqrt(quotient);
          return result;
        } catch (sqrtError) {
          console.error("Square root error:", sqrtError.message);
          return null;
        }
      } catch (divisionError) {
        console.error("Division error:", divisionError.message);
        return null;
      }
    } catch (denominatorError) {
      console.error("Denominator parse error:", denominatorError.message);
      return null;
    }
  } catch (numeratorError) {
    console.error("Numerator parse error:", numeratorError.message);
    return null;
  }
}

const result = calculateExpression("16", "4");
if (result !== null) {
  console.log("Result:", result);
} else {
  console.log("Calculation failed");
}
```

At every step, the code needs to perform error handling with try-catch blocks. Out of 30 lines of code, ~16 of them are error handling boilerplate. Every function called by `calculateExpression` can throw exceptions, and the client code must handle the possibility of receiving `null`. That's a lot of boilerplate code, and it comes with some serious downsides:

- verbose code obscures the core logic
- more code means more opportunities for bugs
- At any step it's possible to not handle an error, and tooling won't tell you it was missed!

Let's take a look at how this code could be implemented using `Result` instead of exceptions to represent failure. Result comes with interfaces for operating on the result, whether or not it succeeds. This makes it straightforward to chain operations and handle errors. The type system will also ensure it is checked for errors, making it harder to miss handling them.

```ts
function parseNumber(str: string): Result<number, Error> {
  const num = Number(str);
  return isNaN(num)
    ? result.error(new Error(`Invalid number: ${str}`))
    : result.ok(num);
}

function divide(a: number, b: number): Result<number, Error> {
  return b === 0
    ? result.error(new Error("Division by zero"))
    : result.ok(a / b);
}

function sqrt(n: number): Result<number, Error> {
  return n < 0
    ? result.error(new Error("Cannot take square root of negative number"))
    : result.ok(Math.sqrt(n));
}

function calculateExpression(
  numeratorStr: string,
  denominatorStr: string,
): Result<number, Error> {
  return parseNumber(numeratorStr)
    .and_then((numerator) =>
      parseNumber(denominatorStr).and_then((denominator) =>
        divide(numerator, denominator),
      ),
    )
    .and_then((quotient) => sqrt(quotient));
}

const computation = calculateExpression("16", "4");
computation.match({
  on_ok: (value) => console.log("Result:", value),
  on_error: (error) => console.log("Calculation failed:", error.message),
});
```

Similar to the version using exceptions, each step of the operation will only be run if the previous step succeeded. `Result`'s `.and_then()` method encapsulates the error check and only runs the provided function if a value is present. This made it possible to implement the `calculateExpression` using `Result` in 12 lines of code, whereas before it required 30 lines.

# Static Enforcement

To help teams consistently adopt `Result` patterns and avoid mixing exception-based and Result-based error handling, this package includes an ESLint rule that enforces Result usage throughout your codebase.

## ESLint Rule Overview

The `enforce-result-usage` rule automatically detects and flags:

- **Throw statements** - suggests using `result.error()` instead
- **Try/catch blocks** - suggests using `result.from()` or `result.from_async()` instead  
- **Calls to throwing functions** - suggests wrapping with `result.from()` or `result.from_async()`

The rule provides automatic fixes for most violations, making migration to Result patterns straightforward.

## Installation and Setup

### ESLint Flat Config Setup

Add the rule to your ESLint flat configuration:

```js eslint.config.js
import { enforceResultUsage } from './src/result/eslint-rule.js';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'custom-result': {
        rules: {
          'enforce-result-usage': enforceResultUsage,
        },
      },
    },
    rules: {
      'custom-result/enforce-result-usage': 'error',
    },
  },
];
```

### Legacy ESLint Config Setup

For legacy `.eslintrc` configurations:

```json .eslintrc.json
{
  "plugins": ["custom-result"],
  "rules": {
    "custom-result/enforce-result-usage": "error"
  }
}
```

## Rule Configuration

The rule accepts several options to customize its behavior:

```js eslint.config.js
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'custom-result': {
        rules: {
          'enforce-result-usage': enforceResultUsage,
        },
      },
    },
    rules: {
      'custom-result/enforce-result-usage': ['error', {
        allowExceptions: ['validateInput', 'debug*', 'test*'],
        allowTestFiles: true,
        autoFix: true
      }],
    },
  },
];
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowExceptions` | `string[]` | `[]` | Function names or patterns to exclude from the rule. Supports wildcards with `*` |
| `allowTestFiles` | `boolean` | `true` | Allow throw/try-catch in test files (detected by `.test.`, `.spec.`, `test/`, `tests/`, `__tests__` patterns) |
| `autoFix` | `boolean` | `true` | Enable automatic fixes for violations |

#### Exception Patterns

The `allowExceptions` option supports both exact matches and wildcard patterns:

```js
{
  allowExceptions: [
    'validateInput',     // Exact function name
    'debug*',           // Any function starting with 'debug'
    '*Test',            // Any function ending with 'Test'
    'legacy*Helper*'    // Any function containing 'legacy' and 'Helper'
  ]
}
```

## Violation Examples and Fixes

### Throw Statements

**❌ Flagged Code:**
```ts
function parseNumber(str: string): number {
  if (isNaN(Number(str))) {
    throw new Error(`Invalid number: ${str}`);
  }
  return Number(str);
}
```

**✅ Auto-fixed Code:**
```ts
function parseNumber(str: string): Result<number, Error> {
  if (isNaN(Number(str))) {
    return result.error(new Error(`Invalid number: ${str}`));
  }
  return result.ok(Number(str));
}
```

**Disable rule:** `// eslint-disable-next-line typesafe-ts/enforce-result-usage`

### Try/Catch Blocks

**❌ Flagged Code:**
```ts
function readConfig(): ConfigData | null {
  try {
    const data = fs.readFileSync('config.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read config:', error);
    return null;
  }
}
```

**✅ Auto-fixed Code:**
```ts
function readConfig(): Result<ConfigData, Error> {
  const result = result.from(() => {
    const data = fs.readFileSync('config.json', 'utf8');
    return JSON.parse(data);
  });
  
  return result.map_err(error => {
    console.error('Failed to read config:', error);
    return error;
  });
}
```

**Disable rule:** `// eslint-disable-next-line typesafe-ts/enforce-result-usage`

### Async Try/Catch Blocks

**❌ Flagged Code:**
```ts
async function fetchUserData(id: string): Promise<UserData | null> {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
```

**✅ Auto-fixed Code:**
```ts
async function fetchUserData(id: string): Promise<Result<UserData, Error>> {
  const result = await result.from_async(async () => {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  });
  
  return result.map_err(error => {
    console.error('Failed to fetch user:', error);
    return error;
  });
}
```

**Disable rule:** `// eslint-disable-next-line typesafe-ts/enforce-result-usage`

### Function Calls That May Throw

**❌ Flagged Code:**
```ts
function processData(jsonString: string): ProcessedData {
  const data = JSON.parse(jsonString);  // May throw
  return transformData(data);
}
```

**✅ Auto-fixed Code:**
```ts
function processData(jsonString: string): Result<ProcessedData, Error> {
  return result.from(() => JSON.parse(jsonString))
    .map(data => transformData(data));
}
```

**Disable rule:** `// eslint-disable-next-line typesafe-ts/enforce-result-usage`

### Async Function Calls

**❌ Flagged Code:**
```ts
async function uploadFile(file: File): Promise<UploadResult> {
  const response = await fetch('/upload', {  // May throw
    method: 'POST',
    body: file
  });
  return response.json();
}
```

**✅ Auto-fixed Code:**
```ts
async function uploadFile(file: File): Promise<Result<UploadResult, Error>> {
  return await result.from_async(async () => {
    const response = await fetch('/upload', {
      method: 'POST',
      body: file
    });
    return response.json();
  });
}
```

## Message Types

The rule provides four different violation messages:

| Message ID | Description | Triggered By |
|------------|-------------|--------------|
| `noThrowStatement` | Use `result.error()` instead of throw statements | `throw` statements |
| `noTryCatchBlock` | Use `result.from()` or `result.from_async()` instead of try/catch | `try/catch` blocks |
| `useResultFrom` | Wrap throwing function calls with `result.from()` | Calls to functions that may throw |
| `useResultFromAsync` | Wrap async throwing functions with `result.from_async()` | Calls to async functions that may throw |

## Integration with Development Workflow

### Running the Rule

```bash
# Check for violations
npx eslint src/

# Auto-fix violations
npx eslint src/ --fix

# Check specific files
npx eslint src/my-file.ts --fix
```

### CI/CD Integration

Add the rule to your CI pipeline to ensure Result patterns are consistently followed:

```yaml .github/workflows/ci.yml
- name: Lint with Result enforcement
  run: |
    npm run lint
    # Ensure no Result violations in production code
    npx eslint src/ --max-warnings 0
```

### Gradual Migration

For existing codebases, you can gradually adopt Result patterns:

1. **Start with warnings:** Set the rule to `warn` initially
2. **Use allowExceptions:** Exclude legacy functions during migration
3. **Enable autoFix:** Let the rule automatically convert simple cases
4. **Manual review:** Review auto-fixed code for correctness
5. **Strict enforcement:** Switch to `error` once migration is complete

```js
// Gradual migration configuration
rules: {
  'custom-result/enforce-result-usage': ['warn', {
    allowExceptions: ['legacy*', 'old*'],
    autoFix: true
  }]
}
```

The static enforcement rule helps maintain consistency across your codebase, making it easier for teams to adopt Result patterns and avoid the pitfalls of mixed error handling approaches.

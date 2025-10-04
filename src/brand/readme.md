# Brand

The `brand` utility creates nominal types in TypeScript by applying runtime brands to values. This allows you to distinguish between structurally identical types at compile time and provides reliable runtime discrimination for union types.

TypeScript's structural type system treats types with identical structure as assignable to each other. Brands prevent this by:

1. Creating nominal types that are not assignable despite identical structure
2. Providing runtime discrimination that works reliably, even where `instanceof` does not
3. Using a unique symbol to guarantee no conflicts with other properties

## API Reference

`brand` is fully documented inline. The best way to view its documentation is in your editor, while using it. You can also view the documentation for each method [in this source code](./brand.ts).

```ts
// Type for branded values
export type Brand<T extends BrandableTypes, Brand extends string> = T & {
    readonly [brand_symbol]: Brand;
};

export const brand = {
    apply, // Applies a runtime brand to a value
    symbol, // Unique symbol used to store brand identifiers
    Error, // Creates branded error class factories
};
```

## Usage

### Creating Nominal Types

Prevent accidental mixing of structurally identical types:

```ts
import { brand, type Brand } from "typesafe-ts/brand";

type UserId = Brand<{ id: string }, "UserId">;
type ProductId = Brand<{ id: string }, "ProductId">;

const userId: UserId = brand.apply({ id: "user-123" }, "UserId");
const productId: ProductId = brand.apply({ id: "prod-456" }, "ProductId");

function getUser(id: UserId) {
    // Fetch user by id
}

getUser(userId); // ✅ OK
getUser(productId); // ❌ Type error: ProductId is not assignable to UserId
```

### Discriminated Unions

Brands provide reliable runtime discrimination. Unlike `instanceof`, which can fail across iframe boundaries, after bundling, or with mocked classes, brands use a unique symbol that works consistently:

```ts
import { brand } from "typesafe-ts/brand";

class ValidationError extends brand.Error("ValidationError")<{
    field: string;
}> {}

class NetworkError extends brand.Error("NetworkError")<{
    statusCode: number;
}> {}

type AppError = ValidationError | NetworkError;

function handleError(error: AppError) {
    switch (error[brand.symbol]) {
        case "ValidationError":
            console.log(`Validation failed for ${error.field}`);
            break;
        case "NetworkError":
            console.log(`Network error: ${error.statusCode}`);
            break;
    }
}

handleError(new ValidationError({ field: "email" }));
// Output: Validation failed for email
```

### Custom Error Classes

The `brand.Error()` factory creates error classes with custom data fields:

```ts
import { brand } from "typesafe-ts/brand";

class TooShortError extends brand.Error("PasswordTooShort")<{
    minLength: number;
}> {}

class NoNumberError extends brand.Error("PasswordNoNumber") {}

type ValidationError = TooShortError | NoNumberError;

function validatePassword(password: string): ValidationError | null {
    if (password.length < 8) return new TooShortError({ minLength: 8 });
    if (!/\d/.test(password)) return new NoNumberError();
    return null;
}

const error = validatePassword("short");
if (error) {
    switch (error[brand.symbol]) {
        case "PasswordTooShort": // error is narrowed to TooShortError
            console.log(`Min ${error.minLength} characters`);
            break;
        case "PasswordNoNumber": // error is narrowed to NoNumberError
            console.log("Must contain a number");
            break;
    }
}
```

## Notes

### Brandable Types

Only objects and functions can be branded. Primitives must be wrapped:

```ts
// ✅ Valid
type UserId = Brand<{ id: string }, "UserId">;
type Email = Brand<{ value: string }, "Email">;

// ❌ Invalid - primitives cannot be branded
type InvalidId = Brand<string, "UserId">; // Type error
```

### Mutation Behavior

`brand.apply()` mutates the input object by adding a non-enumerable property:

```ts
const obj = { id: "123" };
const branded = brand.apply(obj, "UserId");
console.log(obj === branded); // true - same object reference
```

### When to Use

- Use `brand.apply()` for general nominal types and discriminated unions
- Use `brand.Error()` when you need Error subclasses with custom data fields and stack traces

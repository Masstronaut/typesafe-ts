/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Unique symbol used to store brand identifiers on branded values.
 * Guarantees no conflicts with properties from other libraries or user code.
 */
const brand_symbol = Symbol.for("brand");

type BrandableTypes = ((...args: unknown[]) => unknown) | object;
/**
 * A branded type that combines a base type with a unique brand identifier.
 * Brands create nominal types in TypeScript, making structurally equivalent values non-assignable.
 * This is the type returned by `apply_brand()` / `brand.apply()`.
 * The runtime brand set by apply_brand/brand.apply can be used as a union discriminant at runtime.
 *
 * The brand is stored using a unique symbol (`brand.symbol`), which guarantees it will not conflict
 * with any properties from other tools, libraries, or your own code.
 *
 * @template T - The underlying type to be branded
 * @template Brand - A string literal type that serves as the unique brand identifier
 */
type Brand<T extends BrandableTypes, Brand extends string> = T & {
    readonly [brand_symbol]: Brand;
};

/**
 * Error type for cleaner IDE error messages when attempting to brand an already branded type.
 *
 * @template T - The underlying type of the already branded value
 * @template BrandString - The existing brand string of the already branded type
 */
type TypeAlreadyBrandedError<T, BrandString extends string> = {
    error: `The type you've provided is already branded with the brand "${BrandString}"`;
    underlyingType: T;
};

/**
 * Modifies a value by applying a runtime brand.
 * Brands can be used to create nominal types in TypeScript so that structurally equivalent values are not assignable.
 * At runtime the brand can be used to discriminate union types and works reliably even in cases where `instanceof` does not.
 *
 * The brand is stored using a unique symbol (`brand.symbol`), which guarantees it will not conflict
 * with any properties from other tools, libraries, or your own code.
 *
 * @param value The value to apply a brand to.
 * @param brand_string A string literal used to create a unique brand type and runtime brand.
 * @returns The input value with its type modified to include the brand, and a non-enumerable property added to the runtime value.
 *
 * @example Use a brand to create nominal types
 * ```ts
 * import { brand, type Brand } from "typesafe-ts/brand";
 *
 * type UserId = Brand<{ id: string }, "UserId">;
 * type ProductId = Brand<{ id: string }, "ProductId">;
 *
 * const userId: UserId = brand.apply({ id: "user-123" }, "UserId");
 * const productId: ProductId = brand.apply({ id: "prod-456" }, "ProductId");
 *
 * function getUser(id: UserId) { ... }
 *
 * getUser(userId);     // OK
 * getUser(productId);  // Type error: ProductId is not assignable to UserId
 * ```
 */
function apply_brand<
    T extends BrandableTypes,
    const BrandString extends string,
>(
    value: T extends Brand<infer UnderlyingType, infer ExistingBrand>
        ? TypeAlreadyBrandedError<UnderlyingType, ExistingBrand>
        : T,
    brand_string: BrandString
) {
    const result = value as Brand<T, BrandString>;
    (result as { [brand_symbol]: BrandString })[brand_symbol] = brand_string;
    return result;
}

/**
 * Creates a branded error class factory.
 * The returned class can be extended with custom error data.
 *
 * @param brand_string A string literal used as the error name and brand identifier
 * @returns A class constructor that creates branded Error instances
 * @example Create discriminated error types for validation
 * ```ts
 * import { brand } from "typesafe-ts/brand";
 *
 * class TooShortError extends brand.Error("PasswordTooShort")<{ minLength: number }> {}
 * class NoNumberError extends brand.Error("PasswordNoNumber") {}
 *
 * function validatePassword(password: string) {
 *   if (password.length < 8) return new TooShortError({ minLength: 8 });
 *   if (!/\d/.test(password)) return new NoNumberError();
 *   return null;
 * }
 *
 * const validationError = validatePassword("short");
 * if (!validationError) return;
 *
 * const errorBrand = validationError[brand.symbol];
 * switch (errorBrand) {
 *   case "PasswordTooShort":
 *     // validationError is narrowed to TooShortError
 *     console.log(`Password must be at least ${validationError.minLength} characters`);
 *     break;
 *   case "PasswordNoNumber":
 *     // validationError is narrowed to NoNumberError
 *     console.log("Password must contain a number");
 *     break;
 * }
 * ```
 */
function branded_error<const BrandString extends string>(
    brand_string: BrandString
) {
    abstract class CustomError<
        Data extends Record<string, unknown> = Record<string, never>,
    > extends Error {
        constructor(data?: Data & { message?: string }) {
            const message = data?.message ?? brand_string;
            super(message);

            if (data) {
                Object.assign(this, data);
            }

            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }
        }
    }

    type BrandedErrorCustomData<ErrorData extends Record<string, unknown>> = {
        [Key in keyof ErrorData as Key extends keyof Error
            ? never
            : Key]: ErrorData[Key];
    } & { message?: string; cause?: unknown };

    type BrandedErrorType<
        BrandString extends string,
        ErrorData extends Record<string, unknown>,
    > = CustomError & {
        readonly [brand_symbol]: BrandString;
    } & BrandedErrorCustomData<ErrorData>;

    const BrandedError = <BrandString extends string>(
        brand: BrandString
    ): new <ErrorData extends Record<string, unknown> = Record<string, never>>(
        args: [Record<string, never>] extends [ErrorData]
            ? void | { message?: string; cause?: unknown }
            : BrandedErrorCustomData<ErrorData>
    ) => BrandedErrorType<BrandString, ErrorData> => {
        class Base extends CustomError<Record<string, never>> {
            readonly [brand_symbol] = brand;
        }
        Base.prototype.name = brand_string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        return Base as any;
    };

    return BrandedError(brand_string);
}

/**
 * Factory namespace for creating and managing branded types.
 * Provides utilities to apply runtime brands to values, create discriminated error types,
 * and access the brand symbol for type narrowing in union discriminants.
 *
 * @property apply - Applies a runtime brand to a value, creating a nominal type
 * @property symbol - A unique symbol used for brands. Guaranteed not to conflict with other properties
 * @property Error - Factory for branded error classes that can be reliably discriminated at runtime.
 */
const brand = {
    /** Applies a runtime brand to a value, creating a nominal type. */
    apply: apply_brand,
    /** Unique symbol used to store and access brand identifiers. */
    symbol: brand_symbol,
    /** Creates a branded error class factory for discriminated error handling. */
    Error: branded_error,
};

Object.freeze(brand);
export { brand, type Brand, apply_brand, brand_symbol, branded_error };

/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Static type assertion function that enforces compile-time type checking.
 *
 * Use this function with Check utilities to assert type relationships at compile time.
 * If the assertion fails, TypeScript will show a compile error with your custom message.
 *
 * @template T - Should be a type that resolves to `true` from Check utilities. If `false`, compilation fails.
 * @template AssertMessage - Optional custom error message displayed when assertion fails
 *
 * @example
 * Basic usage with Check utilities:
 * ```ts
 * import { Assert, type Check } from "typesafe-ts/assert";
 *
 * // ✅ These compile successfully
 * Assert<Check.Equal<string, string>, "Strings should be equal">();
 * Assert<Check.True<true>, "This should be true">();
 * Assert<Check.Extends<"hello", string>, "String literal extends string">();
 *
 * // ❌ These cause compile errors
 * Assert<Check.Equal<string, number>, "Different types">(); // Compile error!
 * Assert<Check.True<false>, "This is false">(); // Compile error!
 *
 * // ⚠️These are undefined behavior and should be avoided
 * // prefer Assert<Check.IsNever<T>, "...">(); for reliable behavior
 * Assert<never, "Behavior is not guaranteed and could flip without a breaking change.">();
 * // prefer Assert<Check.IsAny<T>, "...">(); for reliable behavior
 * Assert<any, "Behavior is not guaranteed and could flip without a breaking change.">();
 * ```
 *
 * @example
 * Testing complex type relationships:
 * ```ts
 * import { Assert, type Check } from "typesafe-ts/assert";
 *
 * type User = { name: string; age: number };
 * type UserWithId = User & { id: string };
 *
 * // Assert that UserWithId extends User
 * Assert<Check.Extends<UserWithId, User>, "UserWithId should extend User">();
 *
 * // Assert that two interface definitions are equivalent
 * type ApiUser = { name: string; age: number };
 * Assert<Check.Equal<User, ApiUser>, "User and ApiUser should be the same">();
 * ```
 *
 * @example
 * Detecting problematic types:
 * ```ts
 * import { Assert, type Check } from "typesafe-ts/assert";
 *
 * // Ensure a type is not 'any' (helps catch type safety issues)
 * function processValue<T>(value: T): T {
 *   Assert<Check.IsAny<T>, "Parameter should not be 'any'">();  // ❌ Compile error if T is any
 *   return value;
 * }
 *
 * // Ensure a type is not 'never' (helps catch impossible type scenarios)
 * type Result<T> = T extends string ? string : never;
 * Assert<Check.IsNever<Result<number>>, "Result<number> creates never type">();
 * ```
 *
 * @returns Void if assertion passes, otherwise causes a compile-time error
 *
 * @see {@link Check.Equal} - Test if two types are exactly equal
 * @see {@link Check.True} - Test if a type is exactly `true`
 * @see {@link Check.False} - Test if a type is exactly `false`
 * @see {@link Check.Extends} - Test if one type extends another
 * @see {@link Check.IsNever} - Test if a type is `never`
 * @see {@link Check.IsAny} - Test if a type is `any`
 * @see {@link Check.IsUnknown} - Test if a type is `unknown`
 */
export function Assert<
  T extends
  | true
  | {
    "Assertion Error": AssertMessage;
    "You provided": T;
    Hint: "Assert works best with conditional types that resolves to true or false, such as Check.Equal<A, B>, Check.IsNever<T>, etc.";
  },
  AssertMessage extends string = "",
>(): T extends true ? void : AssertionError<T, AssertMessage> {
  return "" as unknown as T extends true
    ? void
    : AssertionError<T, AssertMessage>;
}

type AssertionError<T, Message extends string> = {
  "Assertion Error": Message;
  "Check Result": T;
  Hint: "Use Check.Equal<A, B>, Check.True<T>, Check.False<T>, or Check.Extends<Sub, Super>";
};

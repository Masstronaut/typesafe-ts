/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Utility type to check if two types are exactly equal.
 * 
 * This performs a strict equality check that distinguishes between `any`, `unknown`, `never`,
 * and other types that might seem similar but are actually different.
 * 
 * @template Left - The first type to compare
 * @template Right - The second type to compare
 * @returns `true` if the types are exactly equal, `false` otherwise
 * 
 * @example
 * Basic type equality:
 * ```ts
 * type Test1 = Equal<string, string>;        // true
 * type Test2 = Equal<string, number>;        // false
 * type Test3 = Equal<string, any>;           // false
 * type Test4 = Equal<unknown, any>;          // false
 * ```
 * 
 * @example
 * Structural equality:
 * ```ts
 * type User = { name: string; age: number };
 * type Person = { name: string; age: number };
 * type Employee = { name: string; age: number; role: string };
 * 
 * type Test1 = Equal<User, Person>;    // true (same structure)
 * type Test2 = Equal<User, Employee>;  // false (different structure)
 * ```
 * 
 * @example
 * Union type equality:
 * ```ts
 * type Test1 = Equal<1 | 2 | 3, 3 | 2 | 1>;     // true (order doesn't matter)
 * type Test2 = Equal<true | false, boolean>;     // true (equivalent)
 * type Test3 = Equal<string | number, any>;      // false (any is not a union)
 * ```
 * 
 * @example
 * Use with Assert for compile-time type checking:
 * ```ts
 * import { Assert, type Check } from "typesafe-ts/assert";
 * 
 * type ApiResponse = { data: string };
 * type ExpectedShape = { data: string };
 * 
 * // ✅ Passes - types are equal
 * Assert<Check.Equal<ApiResponse, ExpectedShape>, "API response shape mismatch">();
 * 
 * // ❌ Fails - types are different  
 * Assert<Check.Equal<ApiResponse, { data: number }>, "Wrong data type">();
 * ```
 */
export type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
  ? true
  : false;

/**
 * Utility type to check if a type is exactly `true`.
 * 
 * @template T - The type to check
 * @returns `true` if T is exactly the `true` type, `false` otherwise
 * 
 * @example
 * ```ts
 * type Test1 = True<true>;           // true
 * type Test2 = True<false>;          // false  
 * type Test3 = True<boolean>;        // false
 * type Test4 = True<1>;              // false (truthy but not true)
 * type Test5 = True<never>;          // false
 * ```
 */
export type True<T> = Equal<T, true>;

/**
 * Utility type to check if a type is exactly `false`.
 * 
 * @template T - The type to check
 * @returns `true` if T is exactly the `false` type, `false` otherwise
 * 
 * @example
 * ```ts
 * type Test1 = False<false>;         // true
 * type Test2 = False<true>;          // false  
 * type Test3 = False<boolean>;       // false
 * type Test4 = False<0>;             // false (falsy but not false)
 * type Test5 = False<never>;         // false
 * ```
 */
export type False<T> = Equal<T, false>;

/**
 * Utility type to check if one type extends another (subtype relationship).
 * Equivalent to `SubType extends SuperType ? true : false`.
 * 
 * @template SubType - The potentially narrower type
 * @template SuperType - The potentially broader type
 * @returns `true` if SubType extends SuperType, `false` otherwise
 * 
 * @example
 * ```ts
 * type Test1 = Extends<string, any>;              // true
 * type Test2 = Extends<"hello", string>;          // true (literal extends base)
 * type Test3 = Extends<string, number>;           // false
 * type Test4 = Extends<never, string>;            // true (never extends everything)
 * type Test5 = Extends<{a: 1, b: 2}, {a: 1}>;    // true (subtype extends supertype)
 * ```
 */
export type Extends<SubType, SuperType> = SubType extends SuperType
  ? true
  : false;

/**
 * Utility type to check if a type is exactly `never`.
 * 
 * @template T - The type to check
 * @returns `true` if T is exactly the `never` type, `false` otherwise
 * 
 * @example
 * ```ts
 * type Test1 = IsNever<never>;         // true
 * type Test2 = IsNever<undefined>;     // false
 * type Test3 = IsNever<null>;          // false
 * type Test4 = IsNever<void>;          // false
 * type Test5 = IsNever<unknown>;       // false
 * ```
 */
export type IsNever<T> = Equal<T, never>;

/**
 * Utility type to check if a type is exactly `any`.
 * 
 * @template T - The type to check
 * @returns `true` if T is exactly the `any` type, `false` otherwise
 * 
 * @example
 * ```ts
 * type Test1 = IsAny<any>;             // true
 * type Test2 = IsAny<unknown>;         // false
 * type Test3 = IsAny<never>;           // false
 * type Test4 = IsAny<{}>;              // false
 * type Test5 = IsAny<object>;          // false
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IsAny<T> = Equal<T, any>;

/**
 * Utility type to check if a type is exactly `unknown`.
 * 
 * @template T - The type to check
 * @returns `true` if T is exactly the `unknown` type, `false` otherwise
 * 
 * @example
 * ```ts
 * type Test1 = IsUnknown<unknown>;     // true
 * type Test2 = IsUnknown<any>;         // false
 * type Test3 = IsUnknown<never>;       // false
 * type Test4 = IsUnknown<{}>;          // false
 * type Test5 = IsUnknown<object>;      // false
 * ```
 */
export type IsUnknown<T> = Equal<T, unknown>;

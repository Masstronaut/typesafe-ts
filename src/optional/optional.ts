/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * An Optional that has been confirmed to contain a value.
 * @template ValueType
 * @property {ValueType} value - The contained value.
 */
interface OptionalWithValue<ValueType> {
  value: ValueType;
}

/**
 * The `none` value is used to represent an empty value in an Optional.
 */
const none_value: unique symbol = Symbol("None");
type NoneType = typeof none_value;

/**
 * Nullable<T> is used to provide better error messages for `optional.from_nullable()`.
 * 
 * The tuple wrapping technique (`[T] extends [...]`) is used here to prevent
 * distributive conditional types, which would otherwise cause the conditional
 * to be applied to each member of a union type individually. By wrapping T in a
 * tuple, we ensure the check is performed on the whole type at once.
 */
type Nullable<T> = [T] extends [null | undefined]
  ? "Error: Value provided to `optional.from_nullable()` is always nullable. To create an empty optional, use `optional.none()`."
  : [T] extends [NonNullable<T>]
  ? "Error: Value provided to `optional.from_nullable()` isn't nullable. To create an optional with a value, use `optional.some(value)`."
  : T;

/**
 * The public interface of an Optional value. An Optional either contains a value of type `ValueType` or is empty.
 *
 * Optionals should be constructed using `optional.some()` or `optional.none<ValueType>()`.
 * These functions return objects implementing the `Optional` interface.
 *
 * The value of an Optional can only be accessed after checking `is_some()`.
 *
 * When working with Optional values, it is preferred to use methods such as `map`,
 * `and_then`, and `or_else` for sequential operations, and only check `is_some()` at the end.
 * These methods allow consumers to write type-safe code using functional patterns that are
 * more expressive than handling empty states at every step.
 *
 * @template ValueType - The type of the value that the Optional may contain.
 */
export interface Optional<ValueType> {
  /**
   * Check if the Optional contains some value.
   * This should be used in an `if` or `switch` to expose the value property.
   *
   * example:
   * ```ts
   * const maybeValue = optional.some("Hello");
   * if (maybeValue.is_some()) {
   *   // maybeValue has been widened to OptionalWithValue<string> and has a `.value` property.
   *   console.log(maybeValue.value); // prints "Hello"
   * } else {
   *   // Type error: Property 'Value' does not exist on type 'Optional<string>'.
   *   console.log(maybeValue.value);
   * }
   *
   * @return true if the Optional contains a value and widens the type to include a `value` property.
   */
  is_some(): this is OptionalWithValue<ValueType>;
  /**
   * Get the value of the Optional if contains some value.
   * Otherwise, returns the provided default value.
   *
   * example:
   * ```ts
   * const maybeValue = optional.none<string>();
   * console.log(maybeValue.value_or("Default")); // prints "Default"
   * ```
   *
   * @param value_if_empty - The value to return if the Optional is empty.
   * @return The value of the Optional if it contains a value, otherwise `value_if_empty`.
   */
  value_or(value_if_empty: ValueType): ValueType;
  /**
   * Transforms the value of the Optional using the provided function.
   * If the Optional is empty, the mapping function will not be run.
   *
   * example:
   * ```ts
   * // with a value
   * const maybe = optional.some("Hello").map((v) => v.toUpperCase());
   * if (maybe.is_some()) {
   *   console.log(maybe.value); // prints "HELLO"
   * }
   * // without a value
   * const empty = optional.none<string>().map((v) => v.toUpperCase());
   * if (!empty.is_some()) {
   *   console.log("No value"); // prints "No value"
   * }
   * ```
   *
   * @param mapper_fn - The function to transform the value, if present. Will not be called if the Optional is empty.
   * @returns {Optional<NewValueType>} A new Optional containing the result of transforming the value or empty if this Optional is empty.
   */
  map<NewValueType>(
    mapper_fn: (value: ValueType) => NewValueType,
  ): Optional<NewValueType>;
  /**
   * Chains another Optional operation if this optional contains some value.
   * If this Optional is empty, the provided function will not be called.
   *
   * example:
   * ```ts
   * const maybe = optional.some("Hello").and_then((v) => optional.some(v.length));
   * if (maybe.is_some()) {
   *   console.log(maybe.value); // prints 5
   * }
   * ```
   *
   * @param fn - A function that accepts an argument of the ValueType of this optional and that returns another Optional.
   * @return A new Optional containing the value from the provided function, or an empty Optional if this Optional is empty.
   */
  and_then<NewValueType>(
    fn: (value: ValueType) => Optional<NewValueType>,
  ): Optional<NewValueType>;
  /**
   * Provides a fallback Optional if this Optional is empty.
   * If this Optional contains a value, it will return itself and the fallback function will not be called.
   *
   * example:
   * ```ts
   * const maybe = optional.none<string>().or_else(() => optional.some("Default"));
   * if (maybe.is_some()) {
   *   console.log(maybe.value); // prints "Default"
   * }
   * ```
   * @param fn - A function that returns an Optional to use as a fallback if this Optional is empty.
   * @return The current Optional if it contains a value, otherwise the Optional returned by the provided function.
   */
  or_else(fn: () => Optional<ValueType>): Optional<ValueType>;

  /**
   * Returns a generator that yields the contained value if this Optional has a value.
   * If this Optional is empty, the generator yields nothing (completes immediately).
   * This allows for easy iteration over present values in for-of loops and other iterator contexts.
   *
   * @returns A generator that yields the value if present, otherwise yields nothing
   *
   * @example
   * ```typescript
   * const someValue = optional.some(42);
   * for (const value of someValue) {
   *   console.log(value); // 42
   * }
   *
   * const emptyValue = optional.none<number>();
   * for (const value of emptyValue) {
   *   console.log("This won't execute");
   * }
   *
   * // Useful for collecting present values from multiple optionals
   * const optionals = [
   *   optional.some(1),
   *   optional.none<number>(),
   *   optional.some(3)
   * ];
   *
   * const values = [];
   * for (const opt of optionals) {
   *   for (const value of opt) {
   *     values.push(value);
   *   }
   * }
   * console.log(values); // [1, 3]
   * ```
   */
  [Symbol.iterator](): Generator<ValueType, void, unknown>;

  get [Symbol.toStringTag](): "Optional";
}

/**
 * A concrete implementation of the Optional interface.
 * `Optional` uses the `is_some()` [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) method to narrow the interface to `OptionalWithValue<ValueType>` when it contains a value.
 * Because of that behavior, it's best not to directly expose/use the constructor of this class.
 * Instead, prefer using `optional.some()` or `optional.none<ValueType>()` to create instantiations typed with only the public interface of `Optional<ValueType>`.
 *
 * @template ValueType - The type of the value that the Optional may contain.
 */
class OptionalImpl<ValueType> implements Optional<ValueType> {
  value: ValueType | NoneType;
  constructor(value: ValueType | NoneType) {
    this.value = value;
  }

  is_some(): this is OptionalWithValue<ValueType> {
    return this.value !== none_value;
  }
  value_or(value_if_empty: ValueType): ValueType {
    return this.is_some() ? this.value : value_if_empty;
  }
  map<NewValueType>(
    mapper_fn: (value: ValueType) => NewValueType,
  ): Optional<NewValueType> {
    if (this.is_some()) {
      return OptionalImpl.some(mapper_fn(this.value));
    }
    return this as unknown as Optional<NewValueType>;
  }
  or_else(fn: () => Optional<ValueType>): Optional<ValueType> {
    if (this.is_some()) return this;
    return fn();
  }
  and_then<NewValueType>(
    fn: (value: ValueType) => Optional<NewValueType>,
  ): Optional<NewValueType> {
    if (this.is_some()) {
      return fn(this.value);
    }
    return this as unknown as Optional<NewValueType>;
  }

  *[Symbol.iterator](): Generator<ValueType, void, unknown> {
    if (this.is_some()) {
      yield this.value;
    }
  }

  get [Symbol.toStringTag]() {
    return "Optional" as const;
  }

  /**
   * Construct an Optional that contains a value of type ValueType.
   * This is the preferred way to create an Optional instance with a value.
   * * @param value - The value to wrap in an Optional.
   * @return An Optional that contains the provided value.
   * @example basic usage:
   * ```ts
   * const maybeValue = optional.some("Hello");
   * if (maybeValue.is_some()) {
   *   console.log(maybeValue.value); // prints "Hello"
   * }
   * ```
   *
   * @example Using monadic operations:
   * ```ts
   * const maybeValue = optional.some("Hello");
   * const transformedResult = maybeValue.map((v) => v + " World")
   *                           .and_then((v) => optional.some(v.length))
   *                           .value_or(0);
   * console.log(transformedResult); // prints 11
   */
  static some<ValueType>(this: void, value: ValueType): Optional<ValueType> {
    return new OptionalImpl(value);
  }
  /**
   * Construct an empty Optional.
   * This is the recommended way to create an Optional instance that does not contain a value.
   * @type ValueType - The type of the value that the Optional would contain if it had a value. Typically you will want to explicitly specify this type.
   *
   * @return An Optional that does not contain a value.
   * @example basic usage:
   * ```ts
   * const maybeValue = optional.none<string>();
   * ```
   */
  static none<ValueType>(this: void): Optional<ValueType> {
    return new OptionalImpl<ValueType>(none_value);
  }
}

Object.freeze(OptionalImpl);

/**
 * The `optional` namespace provides functions to create Optional instances.
 * @property some - Creates an Optional containing the provided value.
 * @property none - Creates an empty Optional. It is recommended to explicitly specify the type of empty `Optional`s.
 */
export const optional = {
  some: OptionalImpl.some,
  none: OptionalImpl.none,

  /**
   * Executes a function and wraps the result in an Optional type.
   * If the function returns null or undefined, returns a none Optional.
   * Otherwise, returns a some Optional with the return value.
   *
   * @deprecated Use `optional.from_nullable()` for direct nullable values instead.
   * In the next major release, `from()` will only accept nullable values directly
   * instead of invoking functions, matching the behavior of `from_nullable()`.
   *
   * @template T - The return type of the function (excluding null/undefined)
   * @param fn - A function that may return null or undefined
   * @returns An Optional containing either the function's return value or none
   *
   * @example
   * ```typescript
   * // DEPRECATED: Current usage
   * const userResult = optional.from(() => findUser("123"));
   * const element = optional.from(() => document.getElementById('myId'));
   *
   * // PREFERRED: Use from_nullable with values to avoid the function call overhead
   * const userResult = optional.from_nullable(findUser("123"));
   * const element = optional.from_nullable(document.getElementById('myId'));
   *
   * // FUTURE: In next major release, from_nullable() will be renamed to from()
   * const userResult = optional.from(findUser("123")); // Will be the new behavior
   * ```
   */
  from: <T>(fn: () => T | null | undefined): Optional<NonNullable<T>> => {
    const result = fn();
    if (result === null || result === undefined) {
      return OptionalImpl.none();
    }
    return OptionalImpl.some(result);
  },

  /**
   * Creates an Optional from a value that may be null or undefined.
   * If the value is null or undefined, returns a none Optional.
   * Otherwise, returns a some Optional with the value.
   *
   * @template T - The type of the value (must include null and/or undefined)
   * @param value - A value that may be null or undefined
   * @returns An Optional containing either the value or none
   *
   * @example
   * ```typescript
   * // Working with nullable values
   * function findUser(id: string): User | null {
   *   return users.find(u => u.id === id) || null;
   * }
   *
   * const user = optional.from_nullable(findUser("123"));
   * if (user.is_some()) {
   *   console.log(user.value.name);
   * }
   *
   * // Direct nullable value conversion
   * const maybeNumber: number | undefined = parseFloat(input);
   * const result = optional.from_nullable(maybeNumber);
   * ```
   */
  from_nullable: <T>(value: Nullable<T>): Optional<NonNullable<T>> => {
    if (value === null || value === undefined) {
      return OptionalImpl.none();
    }
    return OptionalImpl.some(value as NonNullable<T>);
  },

  /**
   * Executes an async function and wraps the result in a Promise<Optional>.
   * If the function resolves to null or undefined, returns a none Optional.
   * Otherwise, returns a some Optional with the resolved value.
   *
   * @template T - The resolved type of the async function (excluding null/undefined)
   * @param fn - An async function that may resolve to null or undefined
   * @returns A Promise resolving to an Optional containing either the resolved value or none
   *
   * @example
   * ```typescript
   * // Working with async functions that might return null
   * async function fetchUser(id: string): Promise<User | null> {
   *   const response = await fetch(`/api/users/${id}`);
   *   return response.ok ? response.json() : null;
   * }
   *
   * const userResult = await optional.from_async(() => fetchUser("123"));
   * if (userResult.is_some()) {
   *   console.log(userResult.value.name);
   * } else {
   *   console.log("User not found");
   * }
   *
   * // Converting Promise-based APIs that might return null
   * const userData = await optional.from_async(async () => {
   *   const response = await fetch('/api/data');
   *   return response.ok ? await response.json() : null;
   * });
   * ```
   */
  from_async: async <T>(
    fn: () => Promise<T | null | undefined>,
  ): Promise<Optional<NonNullable<T>>> => {
    const result = await fn();
    if (result === null || result === undefined) {
      return OptionalImpl.none();
    }
    return OptionalImpl.some(result);
  },
};
Object.freeze(optional);
export default optional;

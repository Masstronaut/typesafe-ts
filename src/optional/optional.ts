/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
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
 * Optional<ValueType> can be used to express a value that may or may not be present.
 * It is a type-safe alternative to `null` or `undefined` in TypeScript.
 * This is similar to the `Option` type in Rust or `Optional` in C++.
 *
 * Optionals should not be constructed directly.
 * Instead, prefer using `optional.some()` or `optional.none()`.
 * These functions return objects implementing the `Optional` interface.
 *
 * Optional's monadic interface allows for typesafe handling of empty values,
 * even when `undefined` or `null` are valid values.
 *
 * Optional also provides methods for monadic operations such as `map`, `and_then`, and `or_else`.
 * These methods allow consumers to write type-safe code using functional patterns that are
 * more expressive than handling `undefined` or `null` type unions directly.
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
   * const maybeValue = optional.none<string>(none);
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
   * const empty = optional.none<string>(none).map((v) => v.toUpperCase());
   * if (!empty.is_some()) {
   *   console.log("No value"); // prints "No value"
   * }
   * ```
   *
   * @param mapper_fn - The function to transform the value, if present. Will not be called if the Optional is empty.
   * @return A new Optional containing the result of transforming the value or empty if this Optional is empty.
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
   * const maybe = optional.none<string>(none).or_else(() => optional.some("Default"));
   * if (maybe.is_some()) {
   *   console.log(maybe.value); // prints "Default"
   * }
   * ```
   * @param fn - A function that returns an Optional to use as a fallback if this Optional is empty.
   * @return The current Optional if it contains a value, otherwise the Optional returned by the provided function.
   */
  or_else(fn: () => Optional<ValueType>): Optional<ValueType>;

  get [Symbol.toStringTag](): "Optional";
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
function some<ValueType>(value: ValueType | NoneType): Optional<ValueType> {
  const createdOptional = {
    value,
    is_some(): this is OptionalWithValue<ValueType> {
      return this.value !== none_value;
    },
    value_or(value_if_empty: ValueType) {
      return this.is_some() ? this.value : value_if_empty;
    },
    map(mapper_fn) {
      type NewValueType = ReturnType<typeof mapper_fn>;
      if (this.is_some()) {
        return some(mapper_fn(this.value));
      }
      return this as unknown as Optional<NewValueType>;
    },
    or_else(fn) {
      if (this.is_some()) return this;
      return fn();
    },
    and_then(fn) {
      if (this.is_some()) {
        return fn(this.value);
      }
      return this as unknown as ReturnType<typeof fn>;
    },
    get [Symbol.toStringTag]() {
      return "Optional" as const;
    },
  } satisfies Optional<ValueType> & { value: ValueType | NoneType };
  return createdOptional as Optional<ValueType>;
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
function none<ValueType>(): Optional<ValueType> {
  return some<ValueType>(none_value);
}

/**
 * The `optional` namespace provides functions to create Optional instances.
 * @property some - Creates an Optional containing the provided value.
 * @property none - Creates an empty Optional. It is recommended to explicitly specify the type of empty `Optional`s.
 */
export const optional = {
  some,
  none,
};

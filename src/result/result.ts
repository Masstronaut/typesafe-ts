/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Represents a Result that contains an error value.
 * This interface is used for type narrowing after calling `is_error()`.
 */
interface ErrorResult<ErrorType extends Error> {
  error: ErrorType;
}

/**
 * Represents a Result that contains a success value.
 * This interface is used for type narrowing after calling `is_ok()`.
 */
interface OkResult<ResultType> {
  value: ResultType;
}

/**
 * A monadic type that represents either a successful value or an error.
 * Result provides a type-safe way to handle operations that may fail without throwing exceptions.
 *
 * @template ResultType - The type of the success value
 * @template ErrorType - The type of the error (must extend Error)
 *
 * @example
 * ```typescript
 * import { result, type Result } from "./result.ts";
 *
 * function divide(a: number, b: number): Result<number, Error> {
 *   if (b === 0) {
 *     return result.error(new Error("Division by zero"));
 *   }
 *   return result.ok(a / b);
 * }
 *
 * const success = divide(10, 2);
 * if (success.is_ok()) {
 *   console.log("Result:", success.value); // Result: 5
 * }
 *
 * const failure = divide(10, 0);
 * if (failure.is_error()) {
 *   console.log("Error:", failure.error.message); // Error: Division by zero
 * }
 * ```
 */
interface Result<ResultType, ErrorType extends Error> {
  /**
   * Returns the string tag for Object.prototype.toString calls.
   * Always returns "Result" for Result instances.
   */
  get [Symbol.toStringTag](): "Result";

  /**
   * Type predicate that checks if this Result contains an error.
   * If true, TypeScript will narrow the type to include the `error` property.
   *
   * @returns True if this Result contains an error, false if it contains a value
   *
   * @example
   * ```typescript
   * const result = result.error(new Error("Something went wrong"));
   * if (result.is_error()) {
   *   console.log(result.error.message); // TypeScript knows .error exists
   * }
   * ```
   */
  is_error(): this is ErrorResult<ErrorType>;

  /**
   * Type predicate that checks if this Result contains a success value.
   * If true, TypeScript will narrow the type to include the `value` property.
   *
   * @returns True if this Result contains a value, false if it contains an error
   *
   * @example
   * ```typescript
   * const result = result.ok("Hello, World!");
   * if (result.is_ok()) {
   *   console.log(result.value); // TypeScript knows .value exists
   * }
   * ```
   */
  is_ok(): this is OkResult<ResultType>;

  /**
   * Returns the contained value if Ok, otherwise returns the provided default value.
   *
   * @param value_if_error - The value to return if this Result contains an error
   * @returns The contained value if Ok, otherwise the default value
   *
   * @example
   * ```typescript
   * const success = result.ok(42);
   * console.log(success.value_or(0)); // 42
   *
   * const failure = result.error(new Error("Failed"));
   * console.log(failure.value_or(0)); // 0
   * ```
   */
  value_or(value_if_error: ResultType): ResultType;

  /**
   * Returns the contained error if Error, otherwise returns the provided default error.
   *
   * @param error_if_ok - The error to return if this Result contains a value
   * @returns The contained error if Error, otherwise the default error
   *
   * @example
   * ```typescript
   * const failure = result.error(new Error("Original error"));
   * console.log(failure.error_or(new Error("Default"))); // Error: Original error
   *
   * const success = result.ok("value");
   * console.log(success.error_or(new Error("Default"))); // Error: Default
   * ```
   */
  error_or(error_if_ok: ErrorType): ErrorType;

  /**
   * Transforms the contained value if Ok, otherwise returns the error unchanged.
   * This is the functor map operation for Result.
   *
   * @template NewResultType - The type of the transformed value
   * @param fn - Function to transform the value if Ok
   * @returns A new Result with the transformed value if Ok, otherwise the original error
   *
   * @example
   * ```typescript
   * const success = result.ok(5);
   * const doubled = success.map(x => x * 2);
   * console.log(doubled.value_or(0)); // 10
   *
   * const failure = result.error(new Error("Failed"));
   * const transformed = failure.map(x => x * 2); // fn is not called
   * console.log(transformed.is_error()); // true
   * ```
   */
  map<NewResultType>(
    fn: (value: ResultType) => NewResultType,
  ): Result<NewResultType, ErrorType>;

  /**
   * Transforms the contained error if Error, otherwise returns the value unchanged.
   * This allows for error transformation and chaining.
   *
   * @template NewErrorType - The type of the transformed error
   * @param fn - Function to transform the error if Error
   * @returns A new Result with the transformed error if Error, otherwise the original value
   *
   * @example
   * ```typescript
   * const failure = result.error(new Error("Original"));
   * const wrapped = failure.map_err(err => new Error(`Wrapped: ${err.message}`));
   * if (wrapped.is_error()) {
   *   console.log(wrapped.error.message); // "Wrapped: Original"
   * }
   *
   * const success = result.ok("value");
   * const unchanged = success.map_err(err => new Error("Won't be called"));
   * console.log(unchanged.is_ok()); // true
   * ```
   */
  map_err<NewErrorType extends Error>(
    fn: (error: ErrorType) => NewErrorType,
  ): Result<ResultType, NewErrorType>;

  /**
   * Pattern matches against the Result, executing the appropriate callback and returning its result.
   * This is useful when you need to transform both Ok and Error cases into the same output type.
   *
   * @template OKMatchResultType - The return type of the on_ok callback
   * @template ErrorMatchResultType - The return type of the on_error callback
   * @param handlers - Object containing callback functions for Ok and Error cases
   * @param handlers.on_ok - Function to execute if Result is Ok, receiving the value
   * @param handlers.on_error - Function to execute if Result is Error, receiving the error
   * @returns The result of the executed callback
   *
   * @example
   * ```typescript
   * const success = result.ok(42);
   * const message = success.match({
   *   on_ok: (value) => `Value is ${value}`,
   *   on_error: (error) => `Error occurred: ${error.message}`,
   * });
   * console.log(message); // "Value is 42"
   *
   * const failure = result.error(new Error("Something went wrong"));
   * const errorMessage = failure.match({
   *   on_ok: (value) => `Value is ${value}`,
   *   on_error: (error) => `Error occurred: ${error.message}`,
   * });
   * console.log(errorMessage); // "Error occurred: Something went wrong"
   * ```
   */
  match<OKMatchResultType, ErrorMatchResultType>({
    on_ok,
    on_error,
  }: {
    on_ok: (value: ResultType) => OKMatchResultType;
    on_error: (error: ErrorType) => ErrorMatchResultType;
  }): OKMatchResultType | ErrorMatchResultType;

  /**
   * Monadic bind operation. Chains another Result-returning operation if this Result is Ok.
   * If this Result is Error, the function is not called and the error is propagated.
   * This is also known as flatMap in some languages.
   *
   * @template NewResultType - The type of the value in the returned Result
   * @param fn - Function that takes the Ok value and returns a new Result
   * @returns The Result returned by fn if Ok, otherwise the original error
   *
   * @example
   * ```typescript
   * function parseNumber(str: string): Result<number, Error> {
   *   const num = Number(str);
   *   return isNaN(num) ? result.error(new Error("Not a number")) : result.ok(num);
   * }
   *
   * function divide(a: number, b: number): Result<number, Error> {
   *   return b === 0 ? result.error(new Error("Division by zero")) : result.ok(a / b);
   * }
   *
   * const computation = parseNumber("10")
   *   .and_then(num => divide(num, 2));
   *
   * if (computation.is_ok()) {
   *   console.log(computation.value); // 5
   * }
   * ```
   */
  and_then<NewResultType>(
    fn: (value: ResultType) => Result<NewResultType, ErrorType>,
  ): Result<NewResultType, ErrorType>;

  /**
   * Provides a fallback Result if this Result is Error.
   * If this Result is Ok, the function is not called and the value is preserved.
   * This allows for error recovery and alternative computation paths.
   *
   * @template NewErrorType - The type of error in the fallback Result
   * @param fn - Function that takes the Error and returns a fallback Result
   * @returns The fallback Result returned by fn if Error, otherwise the original Ok value
   *
   * @example
   * ```typescript
   * function tryPrimary(): Result<string, Error> {
   *   return result.error(new Error("Primary failed"));
   * }
   *
   * function tryFallback(): Result<string, Error> {
   *   return result.ok("Fallback success");
   * }
   *
   * const outcome = tryPrimary()
   *   .or_else(() => tryFallback());
   *
   * if (outcome.is_ok()) {
   *   console.log(outcome.value); // "Fallback success"
   * }
   * ```
   */
  or_else<NewErrorType extends Error>(
    fn: (error: ErrorType) => Result<ResultType, NewErrorType>,
  ): Result<ResultType, NewErrorType>;

  /**
   * Returns a generator that yields the contained value if this Result is Ok.
   * If this Result is Error, the generator yields nothing (completes immediately).
   * This allows for easy iteration over successful values in for-of loops and other iterator contexts.
   *
   * @returns A generator that yields the value if Ok, otherwise yields nothing
   *
   * @example
   * ```typescript
   * const success = result.ok(42);
   * for (const value of success) {
   *   console.log(value); // 42
   * }
   *
   * const failure = result.error(new Error("Failed"));
   * for (const value of failure) {
   *   console.log("This won't execute");
   * }
   *
   * // Useful for collecting successful values from multiple results
   * const results = [
   *   result.ok(1),
   *   result.error(new Error("Failed")),
   *   result.ok(3)
   * ];
   *
   * const values = [];
   * for (const res of results) {
   *   for (const value of res) {
   *     values.push(value);
   *   }
   * }
   * console.log(values); // [1, 3]
   * ```
   */
  [Symbol.iterator](): Generator<ResultType, void, unknown>;
}

const none_value: unique symbol = Symbol("None");
type NoneType = typeof none_value;

/**
 * Error type returned by retry operations when all attempts fail.
 * Contains the original error message, retry count, and all accumulated errors from failed attempts.
 */
interface RetryError<ErrorType extends Error = Error> extends Error {
  name: "Result Retry Error";
  message: `Failed after ${number} attempts.`;
  errors: ErrorType[];
}

const zeroRetriesError = Symbol("Zero Retries Error");
type ZeroRetriesError = typeof zeroRetriesError;

type ZeroRetriesErrorMessage = "Type Error: You passed 0 retries, but retry functions require at least 1 attempt. If you want to try an operation exactly once, call the function directly instead of using retry.";

type ValidRetryCount<T extends number> = T extends 0 
  ? ZeroRetriesErrorMessage | ZeroRetriesError
  : T;

class ResultImpl<ResultType, ErrorType extends Error>
  implements Result<ResultType, ErrorType>
{
  value: ResultType | NoneType;
  error: ErrorType | NoneType;
  constructor(result: { ok: ResultType } | { error: ErrorType }) {
    if ("ok" in result && !("error" in result)) {
      this.value = result.ok;
      this.error = none_value;
    } else if ("error" in result && !("ok" in result)) {
      this.error = result.error;
      this.value = none_value;
    } else {
      throw new TypeError(
        "Result must be constructed with either an 'ok' or 'error' property.",
      );
    }
  }
  get [Symbol.toStringTag]() {
    return "Result" as const;
  }
  is_ok(): this is OkResult<ResultType> {
    return this.value !== none_value;
  }
  is_error(): this is ErrorResult<ErrorType> {
    return this.error !== none_value;
  }

  value_or(value_if_error: ResultType): ResultType {
    if (this.is_ok()) {
      return this.value;
    }
    return value_if_error;
  }

  error_or(error_if_ok: ErrorType): ErrorType {
    if (this.is_error()) {
      return this.error;
    }
    return error_if_ok;
  }

  map<NewResultType>(
    fn: (value: ResultType) => NewResultType,
  ): Result<NewResultType, ErrorType> {
    if (this.is_ok()) {
      return result.ok(fn(this.value));
    }
    return this as unknown as Result<NewResultType, ErrorType>;
  }

  map_err<NewErrorType extends Error>(
    fn: (error: ErrorType) => NewErrorType,
  ): Result<ResultType, NewErrorType> {
    if (this.is_error()) {
      return result.error<ResultType, NewErrorType>(fn(this.error));
    }
    return this as unknown as Result<ResultType, NewErrorType>;
  }

  match<OKMatchResultType, ErrorMatchResultType>({
    on_ok,
    on_error,
  }: {
    on_ok: (value: ResultType) => OKMatchResultType;
    on_error: (error: ErrorType) => ErrorMatchResultType;
  }): OKMatchResultType | ErrorMatchResultType {
    if (this.is_ok()) {
      return on_ok(this.value);
    }
    return on_error(this.error as ErrorType);
  }

  and_then<NewResultType>(
    fn: (value: ResultType) => Result<NewResultType, ErrorType>,
  ): Result<NewResultType, ErrorType> {
    if (this.is_ok()) {
      return fn(this.value);
    }
    return this as unknown as Result<NewResultType, ErrorType>;
  }

  or_else<NewErrorType extends Error>(
    fn: (error: ErrorType) => Result<ResultType, NewErrorType>,
  ): Result<ResultType, NewErrorType> {
    if (this.is_error()) {
      return fn(this.error);
    }
    return this as unknown as Result<ResultType, NewErrorType>;
  }

  *[Symbol.iterator](): Generator<ResultType, void, unknown> {
    if (this.is_ok()) {
      yield this.value;
    }
  }

  static ok<ResultType, ErrorType extends Error = Error>(
    value: ResultType,
  ): Result<ResultType, ErrorType> {
    return new ResultImpl<ResultType, ErrorType>({ ok: value });
  }
  static error<ResultType, ErrorType extends Error = Error>(
    error: ErrorType,
  ): Result<ResultType, ErrorType> {
    return new ResultImpl<ResultType, ErrorType>({ error });
  }
}

/**
 * Factory functions for creating Result instances.
 * This module provides the primary API for constructing Result values.
 *
 * @example
 * ```typescript
 * import { result, type Result } from "./result.ts";
 *
 * // Creating success results
 * const success = result.ok("Hello, World!");
 * const number = result.ok(42);
 * const nullValue = result.ok(null);
 *
 * // Creating error results
 * const failure = result.error(new Error("Something went wrong"));
 * const customError = result.error(new TypeError("Type mismatch"));
 *
 * // Chaining operations
 * const processed = result.ok("  hello  ")
 *   .map(str => str.trim())
 *   .map(str => str.toUpperCase())
 *   .and_then(str => str.length > 0 ? result.ok(str) : result.error(new Error("Empty string")));
 * ```
 */
const result = Object.freeze({
  /**
   * Creates a successful Result containing the provided value.
   * The value can be of any type, including null and undefined.
   *
   * @template ResultType - The type of the success value
   * @template ErrorType - The type of potential errors (defaults to Error)
   * @param value - The value to wrap in a successful Result
   * @returns A Result containing the provided value
   *
   * @example
   * ```typescript
   * const stringValue = result.ok("Hello");
   * const numberValue = result.ok(42);
   * const objectValue = result.ok({ name: "John", age: 30 });
   * const nullValue = result.ok(null);
   * const undefinedValue = result.ok(undefined);
   *
   * // All of these are Ok Results
   * console.log(stringValue.is_ok()); // true
   * console.log(numberValue.value_or(0)); // 42
   * ```
   */
  ok: ResultImpl.ok,

  /**
   * Creates a failed Result containing the provided error.
   * The error must be an instance of Error or a subclass of Error.
   *
   * @template ResultType - The type of potential success values
   * @template ErrorType - The type of the error (defaults to Error)
   * @param error - The error to wrap in a failed Result
   * @returns A Result containing the provided error
   *
   * @example
   * ```typescript
   * const basicError = result.error(new Error("Basic error"));
   * const typeError = result.error<string, TypeError>(new TypeError("Wrong type"));
   * const customError = result.error(new RangeError("Out of range"));
   *
   * // Explicitly typed error results
   * const parseError: Result<number, Error> = result.error<number, Error>(new Error("Parse failed"));
   * const validationError = result.error<User, ValidationError>(new ValidationError("Invalid data"));
   *
   * // All of these are Error Results
   * console.log(basicError.is_error()); // true
   * if (typeError.is_error()) {
   *   console.log(typeError.error.message); // "Wrong type"
   * }
   *
   * // Custom error classes work too
   * class ValidationError extends Error {
   *   field: string;
   *   constructor(message: string, field: string) {
   *     super(message);
   *     this.name = "ValidationError";
   *     this.field = field;
   *   }
   * }
   * ```
   */
  error: ResultImpl.error,

  /**
   * Executes a function and wraps the result in a Result type.
   * If the function executes successfully, returns an Ok Result with the return value.
   * If the function throws an error, returns an Error Result with the caught error.
   *
   * @template T - The return type of the function
   * @param fn - A function that may throw an error
   * @returns A Result containing either the function's return value or the caught error
   *
   * @example
   * ```typescript
   * // Working with a function that might throw
   * function parseJSON(jsonString: string): any {
   *   return JSON.parse(jsonString); // Throws SyntaxError for invalid JSON
   * }
   *
   * const validResult = result.of(() => parseJSON('{"name": "John"}'));
   * if (validResult.is_ok()) {
   *   console.log(validResult.value.name); // "John"
   * }
   *
   * const invalidResult = result.of(() => parseJSON('invalid json'));
   * if (invalidResult.is_error()) {
   *   console.log(invalidResult.error.message); // "Unexpected token i in JSON at position 0"
   * }
   *
   * // Converting existing throwing APIs
   * const fileContent = result.of(() => fs.readFileSync('file.txt', 'utf8'));
   * const parsedNumber = result.of(() => {
   *   const num = parseInt(userInput);
   *   if (isNaN(num)) throw new Error("Not a valid number");
   *   return num;
   * });
   * ```
   */
  of: <T>(fn: () => T): Result<T, Error> => {
    try {
      return ResultImpl.ok(fn());
    } catch (error) {
      return ResultImpl.error(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  },

  /**
   * Executes an async function and wraps the result in a Promise<Result>.
   * If the function resolves successfully, returns an Ok Result with the resolved value.
   * If the function rejects or throws, returns an Error Result with the caught error.
   *
   * @template T - The resolved type of the async function
   * @param fn - An async function that may reject or throw
   * @returns A Promise resolving to a Result containing either the resolved value or the caught error
   *
   * @example
   * ```typescript
   * // Working with async functions that might reject
   * async function fetchUserData(id: string): Promise<User> {
   *   const response = await fetch(`/api/users/${id}`);
   *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
   *   return response.json();
   * }
   *
   * const userResult = await result.of_async(() => fetchUserData("123"));
   * if (userResult.is_ok()) {
   *   console.log(userResult.value.name);
   * } else {
   *   console.log("Failed to fetch user:", userResult.error.message);
   * }
   *
   * // Converting Promise-based APIs
   * const fileContent = await result.of_async(() => fs.promises.readFile('file.txt', 'utf8'));
   * const apiData = await result.of_async(async () => {
   *   const response = await fetch('/api/data');
   *   if (!response.ok) throw new Error('API request failed');
   *   return response.json();
   * });
   * ```
   */
  of_async: async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
    try {
      const value = await fn();
      return ResultImpl.ok(value);
    } catch (error) {
      return ResultImpl.error(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  },

  /**
   * Executes a function that returns a Result multiple times until it succeeds or the retry limit is reached.
   * If the function returns an Ok Result, the retry operation stops and returns that successful Result.
   * If the function returns an Error Result, it's retried up to the specified number of times.
   * If all retries fail, returns an Error Result containing all the accumulated errors.
   *
   * @template ValueType - The type of the success value
   * @template ErrorType - The type of the error (must extend Error)
   * @param fn - Function that returns a Result and may be retried
   * @param retries - Maximum number of attempts to make (0 means no attempts)
   * @returns A Result containing either the successful value or a retry error with all accumulated errors
   *
   * @example
   * ```typescript
   * let attempts = 0;
   * function unreliableOperation(): Result<string, Error> {
   *   attempts++;
   *   if (attempts < 3) {
   *     return result.error(new Error(`Attempt ${attempts} failed`));
   *   }
   *   return result.ok("Success!");
   * }
   *
   * const retryResult = result.retry(unreliableOperation, 5);
   * if (retryResult.is_ok()) {
   *   console.log(retryResult.value); // "Success!"
   * } else {
   *   console.log(`Failed after ${retryResult.error.errors.length} attempts`);
   *   console.log(retryResult.error.message); // "Failed after 5 attempts."
   * }
   *
   * // Network request example
   * function fetchData(): Result<string, Error> {
   *   // Simulated network request that might fail
   *   return Math.random() > 0.7
   *     ? result.ok("Data fetched successfully")
   *     : result.error(new Error("Network timeout"));
   * }
   *
   * const networkResult = result.retry(fetchData, 3);
   * networkResult.match({
   *   on_ok: (data) => console.log("Got data:", data),
   *   on_error: (error) => console.log("All retries failed:", error.errors.map(e => e.message))
   * });
   *
   * // Can be chained with other Result operations
   * const processedResult = result.retry(fetchData, 3)
   *   .map(data => data.toUpperCase())
   *   .and_then(data => data.includes("SUCCESS") ? result.ok(data) : result.error(new Error("Invalid data")));
   * ```
   */
  retry: <ValueType, ErrorType extends Error, RetriesType extends number>(
    fn: () => Result<ValueType, ErrorType>,
    retries: ValidRetryCount<RetriesType>,
  ): Result<ValueType, RetryError<ErrorType>> => {
    if (typeof retries !== 'number' || retries <= 0) {
      return ResultImpl.error<ValueType, RetryError<ErrorType>>({
        message: `Failed after 0 attempts.`,
        name: "Result Retry Error",
        errors: [],
      } as RetryError<ErrorType>);
    }
    
    const errors: ErrorType[] = [];
    for (let i = 0; i < retries; i++) {
      const result = fn();
      if (result.is_ok()) {
        return result as unknown as Result<ValueType, RetryError<ErrorType>>;
      } else if (result.is_error()) {
        errors.push(result.error);
      }
    }
    return ResultImpl.error<ValueType, RetryError<ErrorType>>({
      message: `Failed after ${retries} attempts.`,
      name: "Result Retry Error",
      errors: errors,
    } as RetryError<ErrorType>);
  },

  /**
   * Executes an async function that returns a Promise<Result> multiple times until it succeeds or the retry limit is reached.
   * If the function returns a Promise that resolves to an Ok Result, the retry operation stops and returns that successful Result.
   * If the function returns a Promise that resolves to an Error Result, it's retried up to the specified number of times.
   * If all retries fail, returns a Promise that resolves to an Error Result containing all the accumulated errors.
   *
   * @template ValueType - The type of the success value
   * @template ErrorType - The type of the error (must extend Error)
   * @param fn - Async function that returns a Promise<Result> and may be retried
   * @param retries - Maximum number of attempts to make (0 means no attempts)
   * @returns A Promise resolving to a Result containing either the successful value or a retry error with all accumulated errors
   *
   * @example
   * ```typescript
   * let attempts = 0;
   * async function unreliableAsyncOperation(): Promise<Result<string, Error>> {
   *   attempts++;
   *   await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async work
   *   if (attempts < 3) {
   *     return result.error(new Error(`Async attempt ${attempts} failed`));
   *   }
   *   return result.ok("Async success!");
   * }
   *
   * const retryResult = await result.retry_async(unreliableAsyncOperation, 5);
   * if (retryResult.is_ok()) {
   *   console.log(retryResult.value); // "Async success!"
   * } else {
   *   console.log(`Failed after ${retryResult.error.errors.length} attempts`);
   *   console.log(retryResult.error.message); // "Failed after 5 attempts."
   * }
   *
   * // Network request example
   * async function fetchDataAsync(): Promise<Result<string, Error>> {
   *   try {
   *     const response = await fetch('/api/data');
   *     if (!response.ok) {
   *       return result.error(new Error(`HTTP ${response.status}`));
   *     }
   *     const data = await response.text();
   *     return result.ok(data);
   *   } catch (error) {
   *     return result.error(new Error('Network error'));
   *   }
   * }
   *
   * const networkResult = await result.retry_async(fetchDataAsync, 3);
   * networkResult.match({
   *   on_ok: (data) => console.log("Got data:", data),
   *   on_error: (error) => console.log("All retries failed:", error.errors.map(e => e.message))
   * });
   *
   * // Can be chained with other Result operations
   * const processedResult = await result.retry_async(fetchDataAsync, 3)
   *   .then(res => res.map(data => data.toUpperCase()))
   *   .then(res => res.and_then(data => 
   *     data.includes("SUCCESS") ? result.ok(data) : result.error(new Error("Invalid data"))
   *   ));
   * ```
   */
  retry_async: async <ValueType, ErrorType extends Error, RetriesType extends number>(
    fn: () => Promise<Result<ValueType, ErrorType>>,
    retries: ValidRetryCount<RetriesType>,
  ): Promise<Result<ValueType, RetryError<ErrorType>>> => {
    if (typeof retries !== 'number' || retries <= 0) {
      return Promise.resolve(ResultImpl.error<ValueType, RetryError<ErrorType>>({
        message: `Failed after 0 attempts.`,
        name: "Result Retry Error",
        errors: [],
      } as RetryError<ErrorType>));
    }
    
    const errors: ErrorType[] = [];
    for (let i = 0; i < retries; i++) {
      const result_value = await fn();
      if (result_value.is_ok()) {
        return result_value as unknown as Result<ValueType, RetryError<ErrorType>>;
      } else if (result_value.is_error()) {
        errors.push(result_value.error);
      }
    }
    return ResultImpl.error<ValueType, RetryError<ErrorType>>({
      message: `Failed after ${retries} attempts.`,
      name: "Result Retry Error",
      errors: errors,
    } as RetryError<ErrorType>);
  },
});

export { result, type Result, type RetryError };

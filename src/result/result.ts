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
    readonly error: ErrorType;
}

/**
 * Represents a Result that contains a success value.
 * This interface is used for type narrowing after calling `is_ok()`.
 */
interface OkResult<ResultType> {
    readonly value: ResultType;
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
/**
 * Common methods available on all Result instances.
 */
interface IResult<ResultType, ErrorType extends Error> {
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
        fn: (value: ResultType) => NewResultType
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
     * const wrapped = failure.map_error(err => new Error(`Wrapped: ${err.message}`));
     * if (wrapped.is_error()) {
     *   console.log(wrapped.error.message); // "Wrapped: Original"
     * }
     *
     * const success = result.ok("value");
     * const unchanged = success.map_error(err => new Error("Won't be called"));
     * console.log(unchanged.is_ok()); // true
     * ```
     */
    map_error<NewErrorType extends Error>(
        fn: (error: ErrorType) => NewErrorType
    ): Result<ResultType, NewErrorType>;

    /**
     * @deprecated Use map_error instead. This method will be removed in the next major version release.
     */
    map_err<NewErrorType extends Error>(
        fn: (error: ErrorType) => NewErrorType
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
    and_then<NewResultType, NewErrorType extends Error = ErrorType>(
        fn: (value: ResultType) => Result<NewResultType, NewErrorType>
    ): Result<NewResultType, NewErrorType | ErrorType>;

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
    or_else<NewResultType = ResultType, NewErrorType extends Error = ErrorType>(
        fn: (error: ErrorType) => Result<NewResultType, NewErrorType>
    ): Result<ResultType | NewResultType, NewErrorType>;

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

/**
 * @inlineType
 * @interface
 */
type Result<ResultType, ErrorType extends Error> = IResult<
    ResultType,
    ErrorType
> &
    (OkResult<ResultType> | ErrorResult<ErrorType>);

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

/**
 * Error type returned by try_async operations when an async function throws or rejects.
 * Contains comprehensive debugging information about the failed operation.
 */
class TryAsyncError extends Error {
    constructor(operation: string, originalError?: unknown) {
        super(
            `Async operation failed: ${
                originalError instanceof Error
                    ? originalError.message
                    : String(originalError)
            }`
        );
        this.name = "TryAsyncError";
        this.originalError = originalError;
        this.operation = operation;
        this.timestamp = Date.now();
        // Only set cause if we have an Error
        if (originalError instanceof Error) {
            this.cause = originalError;
            if (originalError.stack) {
                this.stack = originalError.stack;
            }
        }
    }
    /** The original error/value that was thrown or caused the rejection */
    originalError: unknown;
    /** Description of the operation that failed */
    operation: string;
    /** Timestamp when the error occurred (milliseconds since epoch) */
    timestamp: number;
}

class ResultImpl<ResultType, ErrorType extends Error>
    implements IResult<ResultType, ErrorType>
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
            // eslint-disable-next-line typesafe-ts/enforce-result-usage
            throw new TypeError(
                "Result must be constructed with either an 'ok' or 'error' property."
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
        fn: (value: ResultType) => NewResultType
    ): Result<NewResultType, ErrorType> {
        if (this.is_ok()) {
            return result.ok(fn(this.value));
        }
        return this as unknown as Result<NewResultType, ErrorType>;
    }

    map_error<NewErrorType extends Error>(
        fn: (error: ErrorType) => NewErrorType
    ): Result<ResultType, NewErrorType> {
        if (this.is_error()) {
            return result.error<ResultType, NewErrorType>(fn(this.error));
        }
        return this as unknown as Result<ResultType, NewErrorType>;
    }

    map_err<NewErrorType extends Error>(
        fn: (error: ErrorType) => NewErrorType
    ): Result<ResultType, NewErrorType> {
        return this.map_error(fn);
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

    and_then<NewResultType, NewErrorType extends Error = ErrorType>(
        fn: (value: ResultType) => Result<NewResultType, NewErrorType>
    ): Result<NewResultType, ErrorType | NewErrorType> {
        if (this.is_ok()) {
            return fn(this.value);
        }
        return this as unknown as Result<
            NewResultType,
            NewErrorType | ErrorType
        >;
    }

    or_else<NewResultType = ResultType, NewErrorType extends Error = ErrorType>(
        fn: (error: ErrorType) => Result<NewResultType, NewErrorType>
    ): Result<NewResultType | ResultType, NewErrorType> {
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
        value: ResultType
    ): Result<ResultType, ErrorType> {
        return new ResultImpl<ResultType, ErrorType>({ ok: value }) as Result<
            ResultType,
            ErrorType
        >;
    }
    static error<ResultType, ErrorType extends Error = Error>(
        error: ErrorType
    ): Result<ResultType, ErrorType> {
        return new ResultImpl<ResultType, ErrorType>({ error }) as Result<
            ResultType,
            ErrorType
        >;
    }
}

/**
 * An awaitable wrapper for Result that enables immediate method chaining on async operations.
 * AsyncResult implements PromiseLike and provides Result transformation methods like map, and_then, and or_else.
 * The AsyncResult must be awaited to inspect the final result with `is_ok()` or `is_error()`.
 *
 * @template ResultType - The type of the ok value
 * @template ErrorType - The type of the error (must extend Error)
 *
 * @example
 * ```typescript
 * // Chain operations and await the final result in one expression
 * const finalResult = await result.try_async(() => fetchUser("123"))
 *   .map(user => user.name.toUpperCase())
 *   .and_then(name => name ? result.ok(name) : result.error(new Error("Empty name")))
 *   .or_else(() => result.ok("Unknown"));
 * ```
 */
class AsyncResult<ResultType, ErrorType extends Error>
    implements PromiseLike<Result<ResultType, ErrorType>>
{
    private promise: Promise<Result<ResultType, ErrorType>>;

    /**
     * Creates a new AsyncResult from a Promise that resolves to a Result.
     *
     * While `result.try_async()` is the preferred way to create AsyncResult instances,
     * the constructor is useful when you have an async function that already returns
     * a `Promise<Result>`. Wrapping it with `new AsyncResult()` provides access to
     * the chaining API without requiring `await` and without "coloring" your function
     * as async. This is particularly beneficial in contexts where `await` isn't allowed,
     * such as top-level code or in component logic of some frontend frameworks.
     *
     * @param promise - A Promise that resolves to a Result
     *
     * @example
     * ```typescript
     * // Async function that returns Promise<Result>
     * async function fetchUserData(id: string): Promise<Result<User, Error>> {
     *   return result.try_async(() => fetch(`/api/users/${id}`))
     *     .then(response => response.json());
     * }
     *
     * // Without AsyncResult constructor: requires await, makes function async
     * async function processUserAsync(id: string): Promise<Result<string, Error>> {
     *   const userData = await fetchUserData(id);
     *   return userData.map(user => user.name.toUpperCase());
     * }
     *
     * // With AsyncResult constructor: no await needed, function stays sync
     * function processUserSync(id: string): AsyncResult<string, Error> {
     *   return new AsyncResult(fetchUserData(id))
     *     .map(user => user.name.toUpperCase());
     * }
     *
     * // Both usage patterns work the same way:
     * const result1 = await processUserAsync("123");
     * const result2 = await processUserSync("123");
     * ```
     */
    constructor(promise: Promise<Result<ResultType, ErrorType>>) {
        this.promise = promise;
    }

    /**
     * PromiseLike implementation equivalent to Promise.then. Allows AsyncResult to be awaited.
     *
     * @template TResult1 - The type returned when the promise resolves
     * @template TResult2 - The type returned when the promise rejects
     * @param onfulfilled - Callback executed when the AsyncResult resolves to a Result
     * @param onrejected - Callback executed when the AsyncResult rejects
     * @returns A PromiseLike that resolves to the result of the executed callback
     */
    then<TResult1 = Result<ResultType, ErrorType>, TResult2 = never>(
        onfulfilled?:
            | ((
                  value: Result<ResultType, ErrorType>
              ) => TResult1 | PromiseLike<TResult1>)
            | null,
        onrejected?:
            | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
            | null
    ): PromiseLike<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    get [Symbol.toStringTag]() {
        return "Result" as const;
    }

    /**
     * Returns the contained value if Ok, otherwise returns the provided default value.
     *
     * @param value_if_error - The value to return if the Result contains an error
     * @returns A Promise resolving to the contained value or the default value
     */
    value_or(value_if_error: ResultType): Promise<ResultType> {
        return this.promise.then((result) => result.value_or(value_if_error));
    }

    /**
     * Access the contained error if this result is an error. Otherwise returns the provided default error.
     *
     * @param error_if_ok - The error to return if the Result contains a value
     * @returns A Promise resolving to the contained error or the default error
     */
    error_or(error_if_ok: ErrorType): Promise<ErrorType> {
        return this.promise.then((result) => result.error_or(error_if_ok));
    }

    /**
     * Transform the contained value if Ok, otherwise return the error unchanged.
     *
     * @template NewResultType - The type of the transformed value
     * @param fn - Function to transform the value if Ok
     * @returns A new AsyncResult with the transformed value if Ok, otherwise the original error
     */
    map<NewResultType>(
        fn: (value: ResultType) => NewResultType
    ): AsyncResult<NewResultType, ErrorType> {
        const newPromise = this.promise.then((result) => result.map(fn));
        return new AsyncResult(newPromise);
    }

    /**
     * Transform the contained error if Error, otherwise return the value unchanged.
     *
     * @template NewErrorType - The type of the transformed error
     * @param fn - Function to transform the error if Error
     * @returns A new AsyncResult with the transformed error if Error, otherwise the original value
     */
    map_error<NewErrorType extends Error>(
        fn: (error: ErrorType) => NewErrorType
    ): AsyncResult<ResultType, NewErrorType> {
        const newPromise = this.promise.then((result) => result.map_error(fn));
        return new AsyncResult(newPromise);
    }

    /**
     * @deprecated Use map_error instead. This method will be removed in the next major version release.
     */
    map_err<NewErrorType extends Error>(
        fn: (error: ErrorType) => NewErrorType
    ): AsyncResult<ResultType, NewErrorType> {
        return this.map_error(fn);
    }

    /**
     * Pattern match against the Result, executing the appropriate callback and returning its result.
     *
     * @template OKMatchResultType - The return type of the on_ok callback
     * @template ErrorMatchResultType - The return type of the on_error callback
     * @param handlers - Object containing callback functions for Ok and Error cases
     * @param handlers.on_ok - Function to execute if Result is Ok, receiving the value
     * @param handlers.on_error - Function to execute if Result is Error, receiving the error
     * @returns A Promise resolving to the result of the executed callback
     */
    match<OKMatchResultType, ErrorMatchResultType>({
        on_ok,
        on_error,
    }: {
        on_ok: (value: ResultType) => OKMatchResultType;
        on_error: (error: ErrorType) => ErrorMatchResultType;
    }): Promise<OKMatchResultType | ErrorMatchResultType> {
        return this.promise.then((result) => result.match({ on_ok, on_error }));
    }

    /**
     * Chain another Result-returning operation if this Result is Ok.
     * If this Result is Error, the function is not called and the error is propagated.
     *
     * @template NewResultType - The type of the value in the returned Result
     * @param fn - Function that takes the Ok value and returns a new Result
     * @returns A new AsyncResult with the result returned by fn if Ok, otherwise the original error
     */
    and_then<
        NewResultType = ResultType,
        NewErrorType extends Error = ErrorType,
    >(
        fn: (value: ResultType) => Result<NewResultType, NewErrorType>
    ): AsyncResult<NewResultType, ErrorType | NewErrorType> {
        const newPromise = this.promise.then((result) => result.and_then(fn));
        return new AsyncResult(newPromise);
    }

    /**
     * Provide a fallback Result if this Result is Error.
     * If this Result is Ok, the function is not called and the value is preserved.
     *
     * @template NewErrorType - The type of error in the fallback Result
     * @param fn - Function that takes the Error and returns a fallback Result
     * @returns A new AsyncResult with the fallback Result returned by fn if Error, otherwise the original Ok value
     */
    or_else<NewResultType = ResultType, NewErrorType extends Error = ErrorType>(
        fn: (error: ErrorType) => Result<NewResultType, NewErrorType>
    ): AsyncResult<ResultType | NewResultType, NewErrorType> {
        const newPromise = this.promise.then((result) => result.or_else(fn));
        return new AsyncResult(newPromise);
    }

    /**
     * Executes an async function with the contained value if Ok, and wraps the result in a Result.
     * If this AsyncResult is Error, the function is not called and the error is propagated.
     * If the async function throws or rejects, the error is caught and wrapped in a TryAsyncError with detailed debugging information.
     *
     * @template NewResultType - The type of the value returned by the async function
     * @param fn - Async function that takes the Ok value and returns a Promise
     * @returns A new AsyncResult containing the result of the async function or a union of the original error and TryAsyncError
     *
     * @example
     * ```typescript
     * // Chain async operations with rich error information
     * const userData = await result.try_async(() => fetch('/api/user/123'))
     *   .try_async(response => response.json()) // Creates TryAsyncError if JSON parsing fails
     *   .map(user => user.name)
     *   .match(
     *     name => console.log(`User: ${name}`),
     *     error => {
     *       if (error instanceof TryAsyncError) {
     *         console.log(`Operation "${error.operation}" failed`);
     *         console.log(`Original error:`, error.originalError);
     *       }
     *     }
     *   );
     * ```
     */
    try_async<NewResultType>(
        fn: (value: ResultType) => Promise<NewResultType>
    ): AsyncResult<NewResultType, ErrorType | TryAsyncError>;

    /**
     * Executes an async function with the contained value if Ok, and wraps the result in a Result.
     * If this AsyncResult is Error, the function is not called and the error is propagated.
     * If the async function throws or rejects, the error is caught and passed to the provided error mapper.
     *
     * **Important**: The error mapper function should not throw. If it does throw,
     * the thrown error will be unhandled.
     *
     * @template NewResultType - The type of the value returned by the async function
     * @template NewErrorType - The type of the error returned by the error mapper
     * @param fn - Async function that takes the Ok value and returns a Promise
     * @param errorMapper - Function that maps the caught error to a specific error type
     * @returns A new AsyncResult containing the result of the async function or a union of the original error and mapped error
     *
     * @example
     * ```typescript
     * // Chain async operations with custom error mapping
     * const userData = await result.try_async(() => fetch('/api/user/123'))
     *   .try_async(
     *     response => response.json(),
     *     error => new JsonParseError(`Failed to parse response: ${error}`)
     *   )
     *   .map(user => user.name);
     * ```
     */
    try_async<NewResultType, NewErrorType extends Error>(
        fn: (value: ResultType) => Promise<NewResultType>,
        errorMapper: (error: unknown) => NewErrorType
    ): AsyncResult<NewResultType, ErrorType | NewErrorType>;

    try_async<NewResultType, NewErrorType extends Error = TryAsyncError>(
        fn: (value: ResultType) => Promise<NewResultType>,
        errorMapper?: (error: unknown) => NewErrorType
    ): AsyncResult<NewResultType, ErrorType | NewErrorType | TryAsyncError> {
        if (errorMapper) {
            // When error mapper is provided, return type excludes TryAsyncError
            const newPromise: Promise<
                Result<NewResultType, ErrorType | NewErrorType>
            > = this.promise
                .then(async (result) => {
                    if (result.is_error()) {
                        return result as unknown as Result<
                            NewResultType,
                            ErrorType | NewErrorType
                        >;
                    }
                    const value = await fn(result.value);
                    return ResultImpl.ok<
                        NewResultType,
                        ErrorType | NewErrorType
                    >(value);
                })
                .catch((originalError: unknown) => {
                    return ResultImpl.error<
                        NewResultType,
                        ErrorType | NewErrorType
                    >(errorMapper(originalError));
                });
            return new AsyncResult(newPromise);
        } else {
            // When no error mapper is provided, return type includes TryAsyncError
            const newPromise: Promise<
                Result<NewResultType, ErrorType | TryAsyncError>
            > = this.promise
                .then(async (result) => {
                    if (result.is_error()) {
                        return result as unknown as Result<
                            NewResultType,
                            ErrorType | TryAsyncError
                        >;
                    }
                    const value = await fn(result.value);
                    return ResultImpl.ok<
                        NewResultType,
                        ErrorType | TryAsyncError
                    >(value);
                })
                .catch((originalError: unknown) => {
                    return ResultImpl.error<
                        NewResultType,
                        ErrorType | TryAsyncError
                    >(
                        new TryAsyncError(
                            fn.name || fn.toString(),
                            originalError
                        )
                    );
                });
            return new AsyncResult(newPromise);
        }
    }

    /**
     * Async iterator support. Yields the contained value if Ok, nothing if Error.
     *
     * @returns An async generator that yields the value if Ok, otherwise yields nothing
     *
     * @example
     * ```typescript
     * // Iterate over successful values
     * for await (const value of result.try_async(() => fetchUser("123"))) {
     *   console.log(value.name); // Only executes if fetch succeeds
     * }
     *
     * // Collect successful values from multiple async operations
     * const users = [];
     * for await (const user of result.try_async(() => fetchUser("456"))) {
     *   users.push(user);
     * }
     * ```
     */
    async *[Symbol.asyncIterator](): AsyncGenerator<ResultType, void, unknown> {
        const result = await this.promise;
        for (const value of result) {
            yield value;
        }
    }
}

/**
 * Factory functions for creating Result instances.
 * This module provides the primary API for constructing Result values.
 *
 * @property {function} ok - Creates a successful Result containing the provided value
 * @property {function} error - Creates a failed Result containing the provided error
 * @property {function} try - Executes a function and wraps the result in a Result type
 * @property {function} try_async - Executes an async function and returns an awaitable AsyncResult that supports immediate chaining
 * @property {function} retry - Retries a Result-returning function multiple times until success
 * @property {function} retry_async - Retries an async Result-returning function multiple times until success
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
 * const validResult = result.try(() => parseJSON('{"name": "John"}'));
 * if (validResult.is_ok()) {
 *   console.log(validResult.value.name); // "John"
 * }
 *
 * const invalidResult = result.try(() => parseJSON('invalid json'));
 * if (invalidResult.is_error()) {
 *   console.log(invalidResult.error.message); // "Unexpected token i in JSON at position 0"
 * }
 *
 * // Converting existing throwing APIs
 * const fileContent = result.try(() => fs.readFileSync('file.txt', 'utf8'));
 * const parsedNumber = result.try(() => {
 *   const num = parseInt(userInput);
 *   if (isNaN(num)) throw new Error("Not a valid number");
 *   return num;
 * });
 *
 * // With custom error mapping
 * class ValidationError extends Error {
 *   field: string;
 *   constructor(message: string, field: string) {
 *     super(message);
 *     this.name = "ValidationError";
 *     this.field = field;
 *   }
 * }
 *
 * const parseJson = (jsonString: string) =>
 *   result.try(
 *     () => JSON.parse(jsonString),
 *     (error) => new ValidationError(`Invalid JSON: ${String(error)}`, "json")
 *   );
 *
 * const invalidResult = parseJson("invalid json");
 * if (invalidResult.is_error()) {
 *   console.log(invalidResult.error.field); // "json"
 *   console.log(invalidResult.error instanceof ValidationError); // true
 * }
 *
 * // Note: Error mappers should not throw. If they do, the thrown error will be unhandled.
 * ```
 */
function tryImpl<T>(fn: () => T): Result<T, Error>;
function tryImpl<T, ErrorType extends Error>(
    fn: () => T,
    errorMapper: (error: unknown) => ErrorType
): Result<T, ErrorType>;
function tryImpl<T, ErrorType extends Error = Error>(
    fn: () => T,
    errorMapper?: (error: unknown) => ErrorType
): Result<T, ErrorType | Error> {
    // need to use try/catch to wrap throwing functions in results.
    // eslint-disable-next-line typesafe-ts/enforce-result-usage
    try {
        return ResultImpl.ok(fn());
    } catch (error) {
        if (errorMapper) {
            return ResultImpl.error(errorMapper(error));
        }
        return ResultImpl.error(
            error instanceof Error ? error : new Error(String(error))
        );
    }
}

/**
 * Executes an async function and wraps the result in an `AsyncResult`.
 * The `AsyncResult` is a `PromiseLike` that supports the Result method chaining interfaces,
 * and it can be `await`ed to access the `Result` and its contained value or error.
 * If the function resolves successfully, the AsyncResult will contain an Ok Result with the resolved value.
 * If the function rejects or throws, the AsyncResult will contain an Error Result with the caught error.
 * To access the final `Result`, you will need to first `await` the `AsyncResult`.
 *
 * @template T - The resolved type of the async function
 * @param fn - An async function that may reject or throw
 * @returns An AsyncResult that can be chained immediately or awaited to get the final Result
 *
 * @example
 * ```typescript
 * // Immediate chaining without intermediate awaits
 * const processedUser = result.try_async(() => fetchUserData("123"))
 *   .map(user => ({ ...user, name: user.name.toUpperCase() }))
 *   .and_then(user => user.name ? result.ok(user) : result.error(new Error("Invalid name")))
 *   .or_else(() => result.ok(createDefaultUser()));
 *
 * // Only await when you need the final result
 * const finalUser = await processedUser;
 * if (finalUser.is_ok()) {
 *   console.log("Processed user:", finalUser.value.name);
 * }
 *
 * // Converting Promise-based APIs with chaining
 * const fileData = await result.try_async(() => fs.promises.readFile('file.txt', 'utf8'))
 *   .map(content => content.trim())
 *   .and_then(content => content.length > 0 ? result.ok(content) : result.error(new Error("Empty file")));
 *
 * // With custom error mapping
 * class NetworkError extends Error {
 *   statusCode: number;
 *   constructor(message: string, statusCode: number) {
 *     super(message);
 *     this.name = "NetworkError";
 *     this.statusCode = statusCode;
 *   }
 * }
 *
 * const fetchData = async (url: string) =>
 *   result.try_async(
 *     () => fetch(url).then(r => r.json()),
 *     (error) => new NetworkError(`Request failed: ${String(error)}`, 500)
 *   );
 *
 * const userData = await fetchData('/api/user/123');
 * if (userData.is_error()) {
 *   console.log(userData.error.statusCode); // 500
 *   console.log(userData.error instanceof NetworkError); // true
 * }
 * ```
 */
function tryAsyncImpl<T>(fn: () => Promise<T>): AsyncResult<T, Error>;
function tryAsyncImpl<T, ErrorType extends Error>(
    fn: () => Promise<T>,
    errorMapper: (error: unknown) => ErrorType
): AsyncResult<T, ErrorType>;
function tryAsyncImpl<T, ErrorType extends Error = Error>(
    fn: () => Promise<T>,
    errorMapper?: (error: unknown) => ErrorType
): AsyncResult<T, ErrorType | Error> {
    const promise = (async (): Promise<Result<T, ErrorType | Error>> => {
        // need to use try/catch to wrap throwing functions in a `Result`.
        // eslint-disable-next-line typesafe-ts/enforce-result-usage
        try {
            const value = await fn();
            return ResultImpl.ok(value);
        } catch (error) {
            if (errorMapper) {
                return ResultImpl.error(errorMapper(error));
            }
            return ResultImpl.error(
                error instanceof Error ? error : new Error(String(error))
            );
        }
    })();
    return new AsyncResult(promise);
}

const result = {
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
    ok: <ResultType, ErrorType extends Error = Error>(
        value: ResultType
    ): Result<ResultType, ErrorType> => ResultImpl.ok(value),

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
    error: <ResultType, ErrorType extends Error = Error>(
        error: ErrorType
    ): Result<ResultType, ErrorType> => ResultImpl.error(error),

    try: tryImpl,

    try_async: tryAsyncImpl,

    /**
     * Retries a result-returning function until it succeeds or has failed for all of the requested retries.
     * If the function returns an Ok Result, the retry operation stops and returns that successful Result.
     * If the function returns an Error Result, it's retried up to the specified number of times.
     * If all retries fail, returns an Error Result containing all the accumulated errors.
     *
     * @template ValueType - The type of the ok (success) value
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
    retry: <ValueType, ErrorType extends Error>(
        fn: () => Result<ValueType, ErrorType>,
        retries: number
    ): Result<ValueType, RetryError<ErrorType>> => {
        if (typeof retries !== "number" || retries <= 0) {
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
                return result as unknown as Result<
                    ValueType,
                    RetryError<ErrorType>
                >;
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
     * Retries a Promise<Result> returning function until it succeeds or has failed for all of the requested retries.
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
     * }
     *
     * // Network request example
     * async function fetchDataAsync(): Promise<Result<string, Error>> {
     *   return result.try_async(async () => {
     *     const response = await fetch('/api/data');
     *     if (!response.ok) {
     *       throw new Error(`HTTP ${response.status}`);
     *     }
     *     const data = await response.text();
     *     return result.ok(data);
     *   })
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
    retry_async: async <ValueType, ErrorType extends Error>(
        fn: () => Promise<Result<ValueType, ErrorType>>,
        retries: number
    ): Promise<Result<ValueType, RetryError<ErrorType>>> => {
        if (typeof retries !== "number" || retries <= 0) {
            return Promise.resolve(
                ResultImpl.error<ValueType, RetryError<ErrorType>>({
                    message: `Failed after 0 attempts.`,
                    name: "Result Retry Error",
                    errors: [],
                } as RetryError<ErrorType>)
            );
        }

        const errors: ErrorType[] = [];
        for (let i = 0; i < retries; i++) {
            const result_value = await fn();
            if (result_value.is_ok()) {
                return result_value as unknown as Result<
                    ValueType,
                    RetryError<ErrorType>
                >;
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
} as const;

Object.freeze(result);

export {
    result,
    type Result,
    AsyncResult,
    type RetryError,
    type TryAsyncError,
};

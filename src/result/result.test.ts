import { test } from "node:test";
import assert from "node:assert";

import {
    result,
    type Result,
    type RetryError,
    type TryAsyncError,
} from "./result.ts";
import { Assert } from "../assert/assert.ts";
import type * as Check from "../assert/check.ts";

await test("Result", async (t) => {
    await t.test("Construction & Factory Methods", async (t) => {
        await t.test("can create Ok result with result.ok()", () => {
            const value = "Hello";
            const okResult = result.ok(value);
            assert.ok(okResult.is_ok());
            assert.ok(!okResult.is_error());
        });

        await t.test("can create Error result with result.error()", () => {
            const error = new Error("Test error");
            const errorResult = result.error(error);
            assert.ok(errorResult.is_error());
            assert.ok(!errorResult.is_ok());
        });

        await t.test("accepts null as valid Ok value", () => {
            const nullOkResult = result.ok(null);
            assert.ok(nullOkResult.is_ok());
            if (nullOkResult.is_ok()) {
                assert.strictEqual(nullOkResult.value, null);
            }
        });

        await t.test("accepts undefined as valid Ok value", () => {
            const undefinedOkResult = result.ok(undefined);
            assert.ok(undefinedOkResult.is_ok());
            if (undefinedOkResult.is_ok()) {
                assert.strictEqual(undefinedOkResult.value, undefined);
            }
        });

        await t.test("constructor validates arguments defensively", () => {
            const okResult = result.ok("test");
            // Since the ResultImpl is not part of the public interface,
            // we are doing some funny business to access the constructor and test invariants.
            // if this gets broken due to a change to the underlying implementation,
            // consider if this test can be removed as a result of that change.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const ResultConstructor = (okResult as any).constructor;

            assert.throws(
                () =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    new ResultConstructor({
                        ok: "value",
                        error: new Error("both"),
                    }),
                {
                    name: "TypeError",
                    message:
                        "Result must be constructed with either an 'ok' or 'error' property.",
                }
            );

            assert.throws(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                () => new ResultConstructor({}),
                {
                    name: "TypeError",
                    message:
                        "Result must be constructed with either an 'ok' or 'error' property.",
                }
            );

            assert.throws(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                () => new ResultConstructor({ something: "else" }),
                {
                    name: "TypeError",
                    message:
                        "Result must be constructed with either an 'ok' or 'error' property.",
                }
            );
        });
    });

    await t.test("Type Predicates & Narrowing", async (t) => {
        await t.test("is_ok() narrows type to OkResult", () => {
            const value = "Hello";
            const okResult = result.ok<string, Error>(value);
            if (okResult.is_ok()) {
                assert.strictEqual(okResult.value, value);
            } else {
                assert.fail("Result should be Ok");
            }
        });

        await t.test("is_error() narrows type to ErrorResult", () => {
            const error = new Error("Test error");
            const errorResult = result.error<string, Error>(error);
            if (errorResult.is_error()) {
                assert.strictEqual(errorResult.error, error);
            } else {
                assert.fail("Result should be Error");
            }
        });

        await t.test("is_ok() narrows correctly in else branch", () => {
            const error = new Error("Test error");
            const errorResult = result.error<string, Error>(error);

            if (errorResult.is_ok()) {
                assert.fail("Result should not be Ok");
            } else {
                // In the else branch, TypeScript should know this is an ErrorResult
                assert.strictEqual(errorResult.error, error);
                assert.strictEqual(errorResult.error.message, "Test error");
            }
        });

        await t.test("is_error() narrows correctly in else branch", () => {
            const value = "Hello World";
            const okResult = result.ok<string, Error>(value);

            if (okResult.is_error()) {
                assert.fail("Result should not be Error");
            } else {
                // In the else branch, TypeScript should know this is an OkResult
                assert.strictEqual(okResult.value, value);
                assert.strictEqual(okResult.value.length, 11);
            }
        });

        await t.test("discriminated union works with complex branching", () => {
            const testResults: Result<number, Error>[] = [
                result.ok(42),
                result.error(new Error("Failed")),
                result.ok(0),
                result.error(new Error("Another failure")),
            ];

            const values: number[] = [];
            const errors: Error[] = [];

            for (const res of testResults) {
                if (res.is_ok()) {
                    // TypeScript knows res.value exists here
                    values.push(res.value);
                } else {
                    // TypeScript knows res.error exists here
                    errors.push(res.error);
                }
            }

            assert.deepStrictEqual(values, [42, 0]);
            assert.strictEqual(errors.length, 2);
            assert.strictEqual(errors[0]?.message, "Failed");
            assert.strictEqual(errors[1]?.message, "Another failure");
        });

        await t.test(
            "discriminated union preserves type information through chaining",
            () => {
                const maybeNumber = result.ok<number, Error>(5);

                const processed = maybeNumber
                    .map((x) => x * 2)
                    .and_then((x) =>
                        x > 8
                            ? result.ok(x.toString())
                            : result.error(new Error("Too small"))
                    );

                if (processed.is_ok()) {
                    // TypeScript knows this is string
                    assert.strictEqual(processed.value, "10");
                    assert.strictEqual(processed.value.length, 2);
                } else {
                    assert.fail("Should have been Ok");
                }
            }
        );
    });

    await t.test("Value/Error Access", async (t) => {
        await t.test("value_or() returns value for Ok results", () => {
            const value = "Hello";
            const okResult = result.ok<string, Error>(value);
            assert.strictEqual(okResult.value_or("Default"), value);

            const numericResult = result.ok<number, Error>(42);
            assert.strictEqual(numericResult.value_or(0), 42);

            const nullOkResult = result.ok(null);
            assert.ok(nullOkResult.is_ok());
            if (nullOkResult.is_ok()) {
                assert.strictEqual(nullOkResult.value, null);
            }
        });

        await t.test("value_or() returns default for Error results", () => {
            const error = new Error("Test error");
            const errorResult = result.error<string, Error>(error);
            assert.strictEqual(errorResult.value_or("Default"), "Default");

            const numericResult = result.error<number, Error>(error);
            assert.strictEqual(numericResult.value_or(123), 123);
        });

        await t.test("error_or() returns error for Error results", () => {
            const error = new Error("Test error");
            const errorResult = result.error<string, Error>(error);
            const defaultError = new Error("Default error");
            assert.strictEqual(errorResult.error_or(defaultError), error);
        });

        await t.test("error_or() returns default for Ok results", () => {
            const value = "Hello";
            const okResult = result.ok<string, Error>(value);
            const defaultError = new Error("Default error");
            assert.strictEqual(okResult.error_or(defaultError), defaultError);
        });
    });

    await t.test("Transformation Operations", async (t) => {
        await t.test("map() transforms Ok values", () => {
            const value = "hello";
            const okResult = result.ok<string, Error>(value);
            const transformed = okResult.map((v) => v.toUpperCase());

            assert.ok(transformed.is_ok());
            if (transformed.is_ok()) {
                assert.strictEqual(transformed.value, "HELLO");
            }

            const numericResult = result.ok<number, Error>(42);
            const numericTransformed = numericResult.map((v) => v * 2);
            assert.ok(numericTransformed.is_ok());
            if (numericTransformed.is_ok()) {
                assert.strictEqual(numericTransformed.value, 84);
            }
        });

        await t.test(
            "map() doesn't run transformation on Error results",
            () => {
                const error = new Error("Test error");
                const errorResult = result.error<string, Error>(error);
                const transformed = errorResult.map(() => {
                    assert.fail("Map function should not run on Error result");
                });

                assert.ok(transformed.is_error());
                if (transformed.is_error()) {
                    assert.strictEqual(transformed.error, error);
                }
            }
        );

        await t.test("map_err() transforms Error values", () => {
            const originalError = new Error("Original error");
            const errorResult = result.error<string, Error>(originalError);
            const transformed = errorResult.map_err(
                (err) => new Error(`Wrapped: ${err.message}`)
            );

            assert.ok(transformed.is_error());
            if (transformed.is_error()) {
                assert.strictEqual(
                    transformed.error.message,
                    "Wrapped: Original error"
                );
            }
        });

        await t.test(
            "map_err() doesn't run transformation on Ok results",
            () => {
                const value = "Hello";
                const okResult = result.ok<string, Error>(value);
                const transformed = okResult.map_err(() => {
                    assert.fail("Map_err function should not run on Ok result");
                });

                assert.ok(transformed.is_ok());
                if (transformed.is_ok()) {
                    assert.strictEqual(transformed.value, value);
                }
            }
        );
    });

    await t.test("Pattern Matching", async (t) => {
        await t.test("match() executes on_ok callback for Ok results", () => {
            const value = "Hello";
            const okResult = result.ok<string, Error>(value);
            const matched = okResult.match({
                on_ok: (v) => `Value is ${v}`,
                on_error: (e) => `Error: ${e.message}`,
            });

            assert.strictEqual(matched, "Value is Hello");
        });

        await t.test(
            "match() executes on_error callback for Error results",
            () => {
                const error = new Error("Test error");
                const errorResult = result.error<string, Error>(error);
                const matched = errorResult.match({
                    on_ok: (v) => `Value is ${v}`,
                    on_error: (e) => `Error: ${e.message}`,
                });

                assert.strictEqual(matched, "Error: Test error");
            }
        );
    });

    await t.test("Monadic Chaining", async (t) => {
        await t.test("and_then() chains Ok results through function", () => {
            const value = "Hello";
            const okResult = result.ok<string, Error>(value);
            const chained = okResult.and_then((v) =>
                result.ok<number, Error>(v.length)
            );

            assert.ok(chained.is_ok());
            if (chained.is_ok()) {
                assert.strictEqual(chained.value, 5);
            }
        });

        await t.test("and_then() short-circuits on Error results", () => {
            const error = new Error("Test error");
            const errorResult = result.error<string, Error>(error);
            const chained = errorResult.and_then(() => {
                assert.fail("And_then function should not run on Error result");
            });

            assert.ok(chained.is_error());
            if (chained.is_error()) {
                assert.strictEqual(chained.error, error);
            }
        });

        await t.test("or_else() provides fallback for Error results", () => {
            const originalError = new Error("Original error");
            const errorResult = result.error<string, Error>(originalError);
            const fallback = errorResult.or_else(() =>
                result.ok<string, Error>("Fallback value")
            );

            assert.ok(fallback.is_ok());
            if (fallback.is_ok()) {
                assert.strictEqual(fallback.value, "Fallback value");
            }
        });

        await t.test("or_else() preserves Ok results unchanged", () => {
            const value = "Hello";
            const okResult = result.ok<string, Error>(value);
            const fallback = okResult.or_else(() => {
                assert.fail("Or_else function should not run on Ok result");
            });

            assert.ok(fallback.is_ok());
            if (fallback.is_ok()) {
                assert.strictEqual(fallback.value, value);
            }
        });
    });

    await t.test("Complex Chaining", async (t) => {
        await t.test("can chain multiple map operations", () => {
            const chainedResult = result
                .ok<string, Error>("hello")
                .map((v) => v.toUpperCase())
                .map((v) => v + " WORLD")
                .map((v) => v.length);

            assert.ok(chainedResult.is_ok());
            if (chainedResult.is_ok()) {
                assert.strictEqual(chainedResult.value, 11);
            }
        });

        await t.test("can chain map with and_then operations", () => {
            const chainedResult = result
                .ok<string, Error>("hello")
                .map((v) => v.toUpperCase())
                .and_then((v) => result.ok<number, Error>(v.length))
                .map((v) => v * 2);

            assert.ok(chainedResult.is_ok());
            if (chainedResult.is_ok()) {
                assert.strictEqual(chainedResult.value, 10);
            }
        });

        await t.test("chains short-circuit on first error", () => {
            const error = new Error("Test error");
            const chainedResult = result
                .error<string, Error>(error)
                .map((): string => {
                    assert.fail("Should not execute");
                })
                .and_then(() => {
                    assert.fail("Should not execute");
                });

            assert.ok(chainedResult.is_error());
            if (chainedResult.is_error()) {
                assert.strictEqual(chainedResult.error, error);
            }
        });
    });

    await t.test("Type System & Immutability", async (t) => {
        await t.test("has correct Symbol.toStringTag", () => {
            const okResult = result.ok<string, Error>("test");
            const errorResult = result.error<string, Error>(new Error("test"));

            assert.strictEqual(okResult[Symbol.toStringTag], "Result");
            assert.strictEqual(errorResult[Symbol.toStringTag], "Result");
        });

        await t.test("handles custom Error subclasses", () => {
            class CustomError extends Error {
                code: number;
                constructor(message: string, code: number) {
                    super(message);
                    this.name = "CustomError";
                    this.code = code;
                }
            }

            const error = new CustomError("Custom error", 404);
            const errorResult = result.error<string, CustomError>(error);

            assert.ok(errorResult.is_error());
            if (errorResult.is_error()) {
                assert.strictEqual(errorResult.error.code, 404);
                assert.strictEqual(errorResult.error.message, "Custom error");
            }
        });
    });

    await t.test("Generator/Iterator Interface", async (t) => {
        await t.test("Ok result yields its value in for-of loop", () => {
            const okResult = result.ok(42);
            const values: number[] = [];

            for (const value of okResult) {
                values.push(value);
            }

            assert.strictEqual(values.length, 1);
            assert.strictEqual(values[0], 42);
        });

        await t.test("Error result yields nothing in for-of loop", () => {
            const errorResult = result.error<number, Error>(
                new Error("Failed")
            );
            const values: number[] = [];

            for (const value of errorResult) {
                values.push(value);
            }

            assert.strictEqual(values.length, 0);
        });

        await t.test(
            "can collect successful values from array of results",
            () => {
                const results = [
                    result.ok(1),
                    result.error<number, Error>(new Error("Failed")),
                    result.ok(3),
                    result.ok(5),
                    result.error<number, Error>(new Error("Another failure")),
                ];

                const successfulValues: number[] = [];
                for (const res of results) {
                    for (const value of res) {
                        successfulValues.push(value);
                    }
                }

                assert.deepStrictEqual(successfulValues, [1, 3, 5]);
            }
        );

        await t.test("generator works with Array.from", () => {
            const okResult = result.ok("hello");
            const values = Array.from(okResult);

            Assert<
                Check.Equal<typeof values, string[]>,
                "Array.from should extract correct value type from Ok result"
            >();

            assert.strictEqual(values.length, 1);
            assert.strictEqual(values[0], "hello");

            const errorResult = result.error<string, Error>(
                new Error("Failed")
            );
            const emptyValues = Array.from(errorResult);

            Assert<
                Check.Equal<typeof emptyValues, string[]>,
                "Array.from should maintain value type even for Error results"
            >();

            assert.strictEqual(emptyValues.length, 0);
        });

        await t.test("generator works with spread operator", () => {
            const okResult = result.ok(100);
            const values = [...okResult];

            Assert<
                Check.Equal<typeof values, number[]>,
                "Spread operator should extract correct value type from Ok result"
            >();

            assert.strictEqual(values.length, 1);
            assert.strictEqual(values[0], 100);

            const errorResult = result.error<number, Error>(
                new Error("Failed")
            );
            const emptyValues = [...errorResult];

            Assert<
                Check.Equal<typeof emptyValues, number[]>,
                "Spread operator should maintain value type even for Error results"
            >();

            assert.strictEqual(emptyValues.length, 0);
        });

        await t.test("can be used with destructuring", () => {
            const okResult = result.ok("test");
            const [first, second] = okResult;

            Assert<
                Check.Equal<typeof first, string | undefined>,
                "Destructuring should allow value type or undefined from Ok result"
            >();

            Assert<
                Check.Equal<typeof second, string | undefined>,
                "Destructuring second element should be value type or undefined"
            >();

            assert.strictEqual(first, "test");
            assert.strictEqual(second, undefined);

            const errorResult = result.error<string, Error>(
                new Error("Failed")
            );
            const [errorFirst, errorSecond] = errorResult;

            Assert<
                Check.Equal<typeof errorFirst, string | undefined>,
                "Destructuring should maintain value type even for Error results"
            >();

            assert.strictEqual(errorFirst, undefined);
            assert.strictEqual(errorSecond, undefined);
        });

        await t.test("generator works with different value types", () => {
            const stringResult = result.ok("hello");
            assert.deepStrictEqual([...stringResult], ["hello"]);

            const numberResult = result.ok(42);
            assert.deepStrictEqual([...numberResult], [42]);

            const objectResult = result.ok({ name: "test" });
            assert.deepStrictEqual([...objectResult], [{ name: "test" }]);

            const nullResult = result.ok(null);
            assert.deepStrictEqual([...nullResult], [null]);

            const undefinedResult = result.ok(undefined);
            assert.deepStrictEqual([...undefinedResult], [undefined]);
        });
    });

    await t.test("Function Wrapping API", async (t) => {
        await t.test("result.try() wraps successful function execution", () => {
            const successFn = () => "success";
            const res = result.try(successFn);

            assert.ok(res.is_ok());
            if (res.is_ok()) {
                assert.strictEqual(res.value, "success");
            }
        });

        await t.test("result.try() wraps function that throws Error", () => {
            const throwingFn = () => {
                throw new Error("Test error");
            };
            const res = result.try(throwingFn);

            assert.ok(res.is_error());
            if (res.is_error()) {
                assert.strictEqual(res.error.message, "Test error");
                assert.ok(res.error instanceof Error);
            }
        });

        await t.test(
            "result.try() wraps function that throws non-Error value",
            () => {
                const throwingFn = () => {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw "string error";
                };
                const res = result.try(throwingFn);

                assert.ok(res.is_error());
                if (res.is_error()) {
                    assert.strictEqual(res.error.message, "string error");
                    assert.ok(res.error instanceof Error);
                }
            }
        );

        await t.test("result.try() works with different return types", () => {
            const numberResult = result.try(() => 42);
            assert.ok(numberResult.is_ok());
            if (numberResult.is_ok()) {
                assert.strictEqual(numberResult.value, 42);
            }

            const objectResult = result.try(() => ({ name: "test" }));
            assert.ok(objectResult.is_ok());
            if (objectResult.is_ok()) {
                assert.deepStrictEqual(objectResult.value, { name: "test" });
            }

            // eslint-disable-next-line typesafe-ts/enforce-optional-usage
            const nullResult = result.try(() => null);
            assert.ok(nullResult.is_ok());
            if (nullResult.is_ok()) {
                assert.strictEqual(nullResult.value, null);
            }
        });

        await t.test("result.try() preserves Error types", () => {
            const customError = new TypeError("Custom type error");
            const throwingFn = () => {
                throw customError;
            };
            const res = result.try(throwingFn);

            assert.ok(res.is_error());
            if (res.is_error()) {
                assert.strictEqual(res.error, customError);
                assert.ok(res.error instanceof TypeError);
            }
        });

        await t.test(
            "result.try_async() wraps successful async function",
            async () => {
                const asyncSuccessFn = () => Promise.resolve("async success");
                const res = await result.try_async(asyncSuccessFn);

                assert.ok(res.is_ok());
                if (res.is_ok()) {
                    assert.strictEqual(res.value, "async success");
                }
            }
        );

        await t.test(
            "result.try_async() wraps async function that rejects with Error",
            async () => {
                // eslint-disable-next-line @typescript-eslint/require-await
                const asyncThrowingFn = async () => {
                    throw new Error("Async error");
                };
                const res = await result.try_async(asyncThrowingFn);

                assert.ok(res.is_error());
                if (res.is_error()) {
                    assert.strictEqual(res.error.message, "Async error");
                    assert.ok(res.error instanceof Error);
                }
            }
        );

        await t.test(
            "result.try_async() wraps async function that rejects with non-Error",
            async () => {
                // eslint-disable-next-line @typescript-eslint/require-await
                const asyncThrowingFn = async () => {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw "async string error";
                };
                const res = await result.try_async(asyncThrowingFn);

                assert.ok(res.is_error());
                if (res.is_error()) {
                    assert.strictEqual(res.error.message, "async string error");
                    assert.ok(res.error instanceof Error);
                }
            }
        );

        await t.test(
            "result.try_async() works with different resolved types",
            async () => {
                const numberResult = await result.try_async(() =>
                    Promise.resolve(42)
                );
                assert.ok(numberResult.is_ok());
                if (numberResult.is_ok()) {
                    assert.strictEqual(numberResult.value, 42);
                }

                const arrayResult = await result.try_async(() =>
                    Promise.resolve([1, 2, 3])
                );
                assert.ok(arrayResult.is_ok());
                if (arrayResult.is_ok()) {
                    assert.deepStrictEqual(arrayResult.value, [1, 2, 3]);
                }
            }
        );

        await t.test(
            "result.try_async() preserves async Error types",
            async () => {
                const customError = new RangeError("Custom range error");
                // eslint-disable-next-line @typescript-eslint/require-await
                const asyncThrowingFn = async () => {
                    throw customError;
                };
                const res = await result.try_async(asyncThrowingFn);

                assert.ok(res.is_error());
                if (res.is_error()) {
                    assert.strictEqual(res.error, customError);
                    assert.ok(res.error instanceof RangeError);
                }
            }
        );

        await t.test(
            "result.try_async() properly awaits async operations",
            async () => {
                let counter = 0;
                const asyncFn = async () => {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    return ++counter;
                };

                const res = await result.try_async(asyncFn);
                assert.ok(res.is_ok());
                if (res.is_ok()) {
                    assert.strictEqual(res.value, 1);
                    assert.strictEqual(counter, 1);
                }
            }
        );

        await t.test(
            "result.try() and result.try_async() work with JSON parsing example",
            async () => {
                // Sync JSON parsing
                const validJson = result.try(
                    () => JSON.parse('{"name": "John"}') as unknown
                );
                assert.ok(validJson.is_ok());
                if (validJson.is_ok()) {
                    assert.ok(typeof validJson.value === "object");
                    assert.ok(validJson.value !== null);
                    assert.ok("name" in validJson.value);
                    assert.strictEqual(validJson.value.name, "John");
                }

                const invalidJson = result.try(
                    () => JSON.parse("invalid json") as unknown
                );
                assert.ok(invalidJson.is_error());
                if (invalidJson.is_error()) {
                    assert.ok(invalidJson.error instanceof SyntaxError);
                }

                // Async version
                const asyncValidJson = await result.try_async(() =>
                    Promise.resolve(JSON.parse('{"age": 30}'))
                );
                assert.ok(asyncValidJson.is_ok());
                if (asyncValidJson.is_ok()) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    assert.strictEqual(asyncValidJson.value.age, 30);
                }
            }
        );
    });

    await t.test("Retry Function", async (t) => {
        await t.test("returns Ok on first success", () => {
            let attempts = 0;
            const successFn = () => {
                attempts++;
                return result.ok(`success after ${attempts} attempts`);
            };

            const retryResult = result.retry(successFn, 3);
            assert.ok(retryResult.is_ok());
            if (retryResult.is_ok()) {
                assert.strictEqual(
                    retryResult.value,
                    "success after 1 attempts"
                );
            }
            assert.strictEqual(attempts, 1);
        });

        await t.test("retries until success", () => {
            // Run the test 20 times with different random values
            for (let run = 1; run <= 20; run++) {
                let attempts = 0;
                const successOnAttempt = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
                const eventualSuccessFn = (): Result<string, Error> => {
                    attempts++;
                    if (attempts < successOnAttempt) {
                        return result.error(
                            new Error(`Attempt ${attempts} failed`)
                        );
                    }
                    return result.ok(`success after ${attempts} attempts`);
                };

                const retryResult = result.retry(
                    eventualSuccessFn,
                    successOnAttempt
                );
                assert.ok(
                    retryResult.is_ok(),
                    `Run ${run}: Expected success but got error after ${attempts} attempts (target: ${successOnAttempt})`
                );
                if (retryResult.is_ok()) {
                    assert.strictEqual(
                        retryResult.value,
                        `success after ${successOnAttempt} attempts`,
                        `Run ${run}: Incorrect success message`
                    );
                }
                assert.strictEqual(
                    attempts,
                    successOnAttempt,
                    `Run ${run}: Expected ${successOnAttempt} attempts but got ${attempts}`
                );
            }
        });

        await t.test("fails after exhausting all retries", () => {
            let attempts = 0;
            const alwaysFailFn = (): Result<string, Error> => {
                attempts++;
                return result.error(new Error(`Attempt ${attempts} failed`));
            };

            const retryResult = result.retry(alwaysFailFn, 3);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 3 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 3);
                assert.strictEqual(
                    retryResult.error.errors[0]?.message,
                    "Attempt 1 failed"
                );
                assert.strictEqual(
                    retryResult.error.errors[1]?.message,
                    "Attempt 2 failed"
                );
                assert.strictEqual(
                    retryResult.error.errors[2]?.message,
                    "Attempt 3 failed"
                );
            }
            assert.strictEqual(attempts, 3);
        });

        await t.test("handles zero retries", () => {
            let attempts = 0;
            const failFn = (): Result<string, Error> => {
                attempts++;
                return result.error(new Error("Always fails"));
            };

            const retryResult = result.retry(failFn, 0);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 0 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 0);
            }
            assert.strictEqual(attempts, 0);
        });

        await t.test("handles zero retries from variable", () => {
            let attempts = 0;
            const failFn = (): Result<string, Error> => {
                attempts++;
                return result.error(new Error("Always fails"));
            };

            const zeroRetries: number = 0;
            const retryResult = result.retry(failFn, zeroRetries);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 0 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 0);
            }
            assert.strictEqual(attempts, 0);
        });

        await t.test("handles single retry", () => {
            let attempts = 0;
            const failOnceFn = (): Result<string, Error> => {
                attempts++;
                if (attempts === 1) {
                    return result.error(new Error("First attempt failed"));
                }
                return result.ok("Second attempt succeeded");
            };

            const retryResult = result.retry(failOnceFn, 1);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 1 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 1);
                assert.strictEqual(
                    retryResult.error.errors[0]?.message,
                    "First attempt failed"
                );
            }
            assert.strictEqual(attempts, 1);
        });

        await t.test("works with different value types", () => {
            const numberFn = (): Result<number, Error> => result.ok(42);
            const numberResult = result.retry(numberFn, 1);

            Assert<
                Check.Equal<
                    typeof numberResult,
                    Result<number, RetryError<Error>>
                >,
                "Retry should preserve exact function return type for number"
            >();

            assert.ok(numberResult.is_ok());
            if (numberResult.is_ok()) {
                assert.strictEqual(numberResult.value, 42);
            }

            const objectFn = (): Result<{ name: string }, Error> =>
                result.ok({ name: "test" });
            const objectResult = result.retry(objectFn, 1);

            assert.ok(objectResult.is_ok());
            if (objectResult.is_ok()) {
                assert.deepStrictEqual(objectResult.value, { name: "test" });
            }

            const nullFn = (): Result<null, Error> => result.ok(null);
            const nullResult = result.retry(nullFn, 1);

            assert.ok(nullResult.is_ok());
            if (nullResult.is_ok()) {
                assert.strictEqual(nullResult.value, null);
            }
        });

        await t.test("works with different error types", () => {
            class CustomError extends Error {
                code: number;
                constructor(message: string, code: number) {
                    super(message);
                    this.name = "CustomError";
                    this.code = code;
                }
            }

            let attempts = 0;
            const customErrorFn = (): Result<string, CustomError> => {
                attempts++;
                return result.error<string, CustomError>(
                    new CustomError(`Custom error ${attempts}`, 500 + attempts)
                );
            };

            const retryResult = result.retry(customErrorFn, 2);
            Assert<
                Check.Equal<
                    typeof retryResult,
                    Result<string, RetryError<CustomError>>
                >
            >();

            assert.ok(retryResult.is_error());

            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 2 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 2);
                assert.ok(retryResult.error.errors[0] instanceof CustomError);
                assert.ok(retryResult.error.errors[1] instanceof CustomError);
                assert.strictEqual(retryResult.error.errors[0].code, 501);
                assert.strictEqual(retryResult.error.errors[1].code, 502);
            }
        });

        await t.test("preserves error collection across attempts", () => {
            const errors = [
                new Error("First error"),
                new TypeError("Second error"),
                new RangeError("Third error"),
            ];
            let attempts = 0;

            const multiErrorFn = (): Result<string, Error> => {
                const error = errors[attempts];
                attempts++;
                return result.error(error!);
            };

            const retryResult = result.retry(multiErrorFn, 3);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(retryResult.error.errors.length, 3);
                assert.strictEqual(retryResult.error.errors[0], errors[0]);
                assert.strictEqual(retryResult.error.errors[1], errors[1]);
                assert.strictEqual(retryResult.error.errors[2], errors[2]);
                assert.ok(retryResult.error.errors[0] instanceof Error);
                assert.ok(retryResult.error.errors[1] instanceof TypeError);
                assert.ok(retryResult.error.errors[2] instanceof RangeError);
            }
        });

        await t.test("can be chained with other Result operations", () => {
            let attempts = 0;
            const eventualSuccessFn = () => {
                attempts++;
                if (attempts < 2) {
                    return result.error(
                        new Error(`Attempt ${attempts} failed`)
                    );
                }
                return result.ok(10);
            };

            const retryResult = result.retry(eventualSuccessFn, 3);
            const mappedResult = retryResult.map(
                (value: unknown) => (value as number) * 2
            );

            assert.ok(mappedResult.is_ok());
            if (mappedResult.is_ok()) {
                assert.strictEqual(mappedResult.value, 20);
            }
        });

        await t.test("retry error can be handled with match", () => {
            const alwaysFailFn = () =>
                result.error<string>(new Error("Always fails"));

            const retryResult = result.retry(alwaysFailFn, 2);
            const matchResult = retryResult.match({
                on_ok: (value) => `Success: ${value}`,
                on_error: (error) =>
                    `Failed with ${error.errors.length} errors: ${error.message}`,
            });

            assert.strictEqual(
                matchResult,
                "Failed with 2 errors: Failed after 2 attempts."
            );
        });
    });

    await t.test("Enhanced Type Transformation Matrix", async (t) => {
        // Custom error types for testing type transformations
        class ValidationError extends Error {
            code: string;
            constructor(message: string, code: string) {
                super(message);
                this.name = "ValidationError";
                this.code = code;
            }
        }

        class NetworkError extends Error {
            statusCode: number;
            constructor(message: string, statusCode: number) {
                super(message);
                this.name = "NetworkError";
                this.statusCode = statusCode;
            }
        }

        const andThenFunctions = {
            okNewType: (x: string) => result.ok<number, Error>(x.length),
            errNewType: () =>
                result.error<string, ValidationError>(
                    new ValidationError("validation failed", "VAL001")
                ),
            okNewBothTypes: (x: string) =>
                result.ok<boolean, NetworkError>(x.length > 0),
            errNewBothTypes: () =>
                result.error<boolean, NetworkError>(
                    new NetworkError("network failed", 500)
                ),
            okSameTypes: (x: string) =>
                result.ok<string, Error>("transformed: " + x),
            errSameTypes: () =>
                result.error<string, Error>(new Error("same type error")),
        };

        const orElseFunctions = {
            okNewType: () => result.ok<number, Error>(42),
            errNewType: () =>
                result.error<string, ValidationError>(
                    new ValidationError("fallback failed", "VAL002")
                ),
            okNewBothTypes: () => result.ok<boolean, NetworkError>(true),
            errNewBothTypes: () =>
                result.error<boolean, NetworkError>(
                    new NetworkError("fallback network error", 503)
                ),
            okSameTypes: () => result.ok<string, Error>("fallback value"),
            errSameTypes: () =>
                result.error<string, Error>(new Error("fallback error")),
        };

        // Test input results
        const okResult = result.ok<string, Error>("hello");
        const errorResult = result.error<string, Error>(
            new Error("original error")
        );

        await t.test("and_then() type transformations", async (t) => {
            await t.test(
                "Ok Result and_then() creates correct union error types",
                () => {
                    const transformed = okResult.and_then(
                        andThenFunctions.errNewType
                    );
                    // Result should be Result<string, Error | ValidationError>

                    assert.ok(transformed.is_error());
                    const unionError: Error | ValidationError =
                        transformed.error;
                    assert.ok(unionError);

                    // @ts-expect-error - Error | ValidationError is not assignable to ValidationError
                    const justValidationError: ValidationError =
                        transformed.error;
                    assert.ok(justValidationError); // Use the variable to avoid unused variable error
                }
            );

            await t.test(
                "Error Result and_then() preserves union error types",
                () => {
                    const transformed = errorResult.and_then(
                        andThenFunctions.errNewType
                    );
                    // Result should be Result<string, Error | ValidationError>

                    assert.ok(transformed.is_error());
                    const unionError: Error | ValidationError =
                        transformed.error;
                    assert.ok(unionError);

                    // @ts-expect-error - Error | ValidationError is not assignable to ValidationError
                    const justValidationError: ValidationError =
                        transformed.error;
                    assert.ok(justValidationError); // Use the variable to avoid unused variable error
                }
            );

            await t.test("and_then() with new result and error types", () => {
                const transformed = okResult.and_then(
                    andThenFunctions.okNewBothTypes
                );
                // Result should be Result<boolean, Error | NetworkError>

                assert.ok(transformed.is_ok());
                const boolValue: boolean = transformed.value;
                assert.ok(typeof boolValue === "boolean");

                // @ts-expect-error - boolean is not assignable to string
                const stringValue: string = transformed.value;
                assert.ok(stringValue); // Use the variable to avoid unused variable error

                if (transformed.is_error()) {
                    // it's not, but this allows us to validate types
                    const unionError: Error | NetworkError = transformed.error;
                    assert.ok(unionError);
                }
            });
        });

        await t.test("or_else() type transformations", async (t) => {
            await t.test(
                "Error Result or_else() creates correct union result types",
                () => {
                    const transformed = errorResult.or_else(
                        orElseFunctions.okNewType
                    );
                    // Result should be Result<string | number, Error>

                    assert.ok(transformed.is_ok());
                    const unionValue: string | number = transformed.value;
                    assert.ok(unionValue);

                    // @ts-expect-error - string | number is not assignable to string
                    const justString: string = transformed.value;
                    assert.ok(justString); // Use the variable to avoid unused variable error

                    // @ts-expect-error - string | number is not assignable to number
                    const justNumber: number = transformed.value;
                    assert.ok(justNumber); // Use the variable to avoid unused variable error
                }
            );

            await t.test(
                "Ok Result or_else() preserves union result types",
                () => {
                    // Test that ok result maintains union type even when function not called
                    const transformed = okResult.or_else(
                        orElseFunctions.okNewType
                    );
                    // Result should be Result<string | number, Error>

                    assert.ok(transformed.is_ok());
                    const unionValue: string | number = transformed.value;
                    assert.ok(unionValue);

                    // @ts-expect-error - string | number is not assignable to number
                    const justNumber: number = transformed.value;
                    assert.ok(justNumber); // Use the variable to avoid unused variable error
                }
            );

            await t.test("or_else() with new result and error types", () => {
                // Test scenario c: function returns Result<boolean, NetworkError>
                const transformed = errorResult.or_else(
                    orElseFunctions.okNewBothTypes
                );
                // Result should be Result<string | boolean, NetworkError>

                assert.ok(transformed.is_ok());
                const unionValue: string | boolean = transformed.value;
                assert.ok(unionValue);

                // @ts-expect-error - string | boolean is not assignable to string
                const justString: string = transformed.value;
                assert.ok(justString); // Use the variable to avoid unused variable error

                // @ts-expect-error - string | boolean is not assignable to boolean
                const justBoolean: boolean = transformed.value;
                assert.ok(justBoolean); // Use the variable to avoid unused variable error
            });
        });

        await t.test("Complex chaining type verification", async (t) => {
            await t.test("chained and_then() accumulates error types", () => {
                const chainedResult = okResult
                    .and_then(andThenFunctions.okNewType) // Result<number, Error>
                    .and_then(() =>
                        result.error<string, ValidationError>(
                            new ValidationError("chain error", "CHAIN001")
                        )
                    ); // Result<string, Error | ValidationError>

                assert.ok(chainedResult.is_error());
                const unionError: Error | ValidationError = chainedResult.error;
                assert.ok(unionError);

                // @ts-expect-error - Error | ValidationError is not assignable to ValidationError
                const justValidationError: ValidationError =
                    chainedResult.error;
                assert.ok(justValidationError); // Use the variable to avoid unused variable error
            });

            await t.test("chained or_else() accumulates result types", () => {
                const chainedResult = errorResult
                    .or_else(orElseFunctions.okNewType) // Result<string | number, Error>
                    .or_else(() => result.ok<boolean, NetworkError>(false)); // Result<string | number | boolean, NetworkError>

                assert.ok(chainedResult.is_ok());
                // Result type should be string | number | boolean
                const unionValue: string | number | boolean =
                    chainedResult.value;
                assert.ok(unionValue);

                // @ts-expect-error - string | number | boolean is not assignable to string
                const justString: string = chainedResult.value;
                assert.ok(justString); // Use the variable to avoid unused variable error

                // @ts-expect-error - string | number | boolean is not assignable to number
                const justNumber: number = chainedResult.value;
                assert.ok(justNumber); // Use the variable to avoid unused variable error

                // @ts-expect-error - string | number | boolean is not assignable to boolean
                const justBoolean: boolean = chainedResult.value;
                assert.ok(justBoolean); // Use the variable to avoid unused variable error
            });
        });

        await t.test("AsyncResult type consistency", async (t) => {
            await t.test(
                "AsyncResult.and_then() maintains same type behavior",
                async () => {
                    const asyncOkResult = result.try_async(() =>
                        Promise.resolve("async hello")
                    );
                    const transformed = asyncOkResult.and_then(
                        andThenFunctions.errNewType
                    );
                    const awaited = await transformed;

                    assert.ok(awaited.is_error());
                    // Should have same union error type as sync version
                    const unionError: Error | ValidationError = awaited.error;
                    assert.ok(unionError);

                    // @ts-expect-error - Error | ValidationError is not assignable to ValidationError
                    const justValidationError: ValidationError = awaited.error;
                    assert.ok(justValidationError); // Use the variable to avoid unused variable error
                }
            );

            await t.test(
                "AsyncResult.or_else() maintains same type behavior",
                async () => {
                    const asyncErrorResult = result.try_async<string>(() =>
                        Promise.reject(new Error("async error"))
                    );
                    const transformed = asyncErrorResult.or_else(
                        orElseFunctions.okNewType
                    );
                    const awaited = await transformed;

                    assert.ok(awaited.is_ok());
                    const unionValue: string | number = awaited.value;
                    assert.ok(unionValue);

                    // @ts-expect-error - string | number is not assignable to number
                    const justNumber: number = awaited.value;
                    assert.ok(justNumber); // Use the variable to avoid unused variable error
                }
            );
        });

        await t.test("Type narrowing with union types", async (t) => {
            await t.test("is_ok() correctly narrows union result types", () => {
                const transformed = errorResult.or_else(
                    orElseFunctions.okNewType
                );
                // Type is Result<string | number, Error>

                assert.ok(transformed.is_ok());
                const unionValue: string | number = transformed.value;
                assert.ok(unionValue);

                // @ts-expect-error - string | number is not assignable to string
                const justString: string = transformed.value;
                assert.ok(justString); // Use the variable to avoid unused variable error

                // @ts-expect-error - string | number is not assignable to number
                const justNumber: number = transformed.value;
                assert.ok(justNumber); // Use the variable to avoid unused variable error
            });

            await t.test(
                "is_error() correctly narrows union error types",
                () => {
                    const transformed = okResult.and_then(
                        andThenFunctions.errNewType
                    );
                    // Type should be Result<string, Error | ValidationError>

                    assert.ok(transformed.is_error());
                    const unionError: Error | ValidationError =
                        transformed.error;
                    assert.ok(unionError);

                    // @ts-expect-error - Error | ValidationError is not assignable to ValidationError
                    const justValidationError: ValidationError =
                        transformed.error;
                    assert.ok(justValidationError); // Use the variable to avoid unused variable error
                }
            );
        });
    });

    await t.test("Retry Async Function", async (t) => {
        await t.test("returns Ok on first success", async () => {
            let attempts = 0;
            const successFn = async () => {
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 1));
                return result.ok(`async success after ${attempts} attempts`);
            };

            const retryResult = await result.retry_async(successFn, 3);
            assert.ok(retryResult.is_ok());
            if (retryResult.is_ok()) {
                assert.strictEqual(
                    retryResult.value,
                    "async success after 1 attempts"
                );
            }
            assert.strictEqual(attempts, 1);
        });

        await t.test("retries until success", async () => {
            // Run the test 20 times with different random values
            for (let run = 1; run <= 20; run++) {
                let attempts = 0;
                const successOnAttempt = Math.floor(Math.random() * 20) + 1; // Random number between 1 and 100
                const eventualSuccessFn = async () => {
                    attempts++;
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    if (attempts < successOnAttempt) {
                        return result.error(
                            new Error(`Async attempt ${attempts} failed`)
                        );
                    }
                    return result.ok(
                        `async success after ${attempts} attempts`
                    );
                };

                const retryResult = await result.retry_async(
                    eventualSuccessFn,
                    successOnAttempt
                );
                assert.ok(
                    retryResult.is_ok(),
                    `Run ${run}: Expected success but got error after ${attempts} attempts (target: ${successOnAttempt})`
                );
                if (retryResult.is_ok()) {
                    assert.strictEqual(
                        retryResult.value,
                        `async success after ${successOnAttempt} attempts`,
                        `Run ${run}: Incorrect success message`
                    );
                }
                assert.strictEqual(
                    attempts,
                    successOnAttempt,
                    `Run ${run}: Expected ${successOnAttempt} attempts but got ${attempts}`
                );
            }
        });

        await t.test("fails after exhausting all retries", async () => {
            let attempts = 0;
            const alwaysFailFn = async () => {
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 1));
                return result.error(
                    new Error(`Async attempt ${attempts} failed`)
                );
            };

            const retryResult = await result.retry_async(alwaysFailFn, 3);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 3 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 3);
                assert.strictEqual(
                    retryResult.error.errors[0]?.message,
                    "Async attempt 1 failed"
                );
                assert.strictEqual(
                    retryResult.error.errors[1]?.message,
                    "Async attempt 2 failed"
                );
                assert.strictEqual(
                    retryResult.error.errors[2]?.message,
                    "Async attempt 3 failed"
                );
            }
            assert.strictEqual(attempts, 3);
        });

        await t.test("handles zero retries", async () => {
            let attempts = 0;
            const failFn = async () => {
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 1));
                return result.error(new Error("Always fails"));
            };

            const retryResult = await result.retry_async(failFn, 0);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 0 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 0);
            }
            assert.strictEqual(attempts, 0);
        });

        await t.test("handles zero retries from variable", async () => {
            let attempts = 0;
            const failFn = async () => {
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 1));
                return result.error(new Error("Always fails"));
            };

            const zeroRetries: number = 0;
            const retryResult = await result.retry_async(failFn, zeroRetries);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 0 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 0);
            }
            assert.strictEqual(attempts, 0);
        });

        await t.test("handles single retry", async () => {
            let attempts = 0;
            const failOnceFn = async () => {
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 1));
                if (attempts === 1) {
                    return result.error(
                        new Error("First async attempt failed")
                    );
                }
                return result.ok("Second async attempt succeeded");
            };

            const retryResult = await result.retry_async(failOnceFn, 1);
            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 1 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 1);
                assert.strictEqual(
                    retryResult.error.errors[0]?.message,
                    "First async attempt failed"
                );
            }
            assert.strictEqual(attempts, 1);
        });

        await t.test("works with different value types", async () => {
            const numberFn = async () => {
                await new Promise((resolve) => setTimeout(resolve, 1));
                return result.ok(42);
            };
            const numberResult = await result.retry_async(numberFn, 1);

            Assert<
                Check.Equal<
                    typeof numberResult,
                    Result<number, RetryError<Error>>
                >,
                "Async retry should preserve exact function return type for number"
            >();

            assert.ok(numberResult.is_ok());
            if (numberResult.is_ok()) {
                assert.strictEqual(numberResult.value, 42);
            }

            const objectFn = async () => {
                await new Promise((resolve) => setTimeout(resolve, 1));
                return result.ok({ name: "async test" });
            };
            const objectResult = await result.retry_async(objectFn, 1);

            assert.ok(objectResult.is_ok());
            if (objectResult.is_ok()) {
                assert.deepStrictEqual(objectResult.value, {
                    name: "async test",
                });
            }

            const nullFn = async () => {
                await new Promise((resolve) => setTimeout(resolve, 1));
                return result.ok(null);
            };
            const nullResult = await result.retry_async(nullFn, 1);

            Assert<
                Check.Equal<typeof nullResult, Result<null, RetryError<Error>>>,
                "Async retry should preserve exact function return type for null"
            >();

            assert.ok(nullResult.is_ok());
            if (nullResult.is_ok()) {
                assert.strictEqual(nullResult.value, null);
            }
        });

        await t.test("works with different error types", async () => {
            class CustomAsyncError extends Error {
                statusCode: number;
                constructor(message: string, statusCode: number) {
                    super(message);
                    this.name = "CustomAsyncError";
                    this.statusCode = statusCode;
                }
            }

            let attempts = 0;
            const customErrorFn = async (): Promise<
                Result<string, CustomAsyncError>
            > => {
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 1));
                return result.error<string, CustomAsyncError>(
                    new CustomAsyncError(
                        `Custom async error ${attempts}`,
                        400 + attempts
                    )
                );
            };

            const retryResult = await result.retry_async(customErrorFn, 2);

            Assert<
                Check.Equal<
                    typeof retryResult,
                    Result<string, RetryError<CustomAsyncError>>
                >,
                "Async retry should preserve custom error types from function signature"
            >();

            assert.ok(retryResult.is_error());
            if (retryResult.is_error()) {
                assert.strictEqual(
                    retryResult.error.name,
                    "Result Retry Error"
                );
                assert.strictEqual(
                    retryResult.error.message,
                    "Failed after 2 attempts."
                );
                assert.strictEqual(retryResult.error.errors.length, 2);
                assert.ok(
                    retryResult.error.errors[0] instanceof CustomAsyncError
                );
                assert.ok(
                    retryResult.error.errors[1] instanceof CustomAsyncError
                );
                assert.strictEqual(retryResult.error.errors[0].statusCode, 401);
                assert.strictEqual(retryResult.error.errors[1].statusCode, 402);
            }
        });

        await t.test(
            "preserves error collection across async attempts",
            async () => {
                const errors = [
                    new Error("First async error"),
                    new TypeError("Second async error"),
                    new RangeError("Third async error"),
                ];
                let attempts = 0;

                const multiErrorFn = async () => {
                    const error = errors[attempts];
                    attempts++;
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    return result.error(error!);
                };

                const retryResult = await result.retry_async(multiErrorFn, 3);
                assert.ok(retryResult.is_error());
                if (retryResult.is_error()) {
                    assert.strictEqual(retryResult.error.errors.length, 3);
                    assert.strictEqual(retryResult.error.errors[0], errors[0]);
                    assert.strictEqual(retryResult.error.errors[1], errors[1]);
                    assert.strictEqual(retryResult.error.errors[2], errors[2]);
                    assert.ok(retryResult.error.errors[0] instanceof Error);
                    assert.ok(retryResult.error.errors[1] instanceof TypeError);
                    assert.ok(
                        retryResult.error.errors[2] instanceof RangeError
                    );
                }
            }
        );

        await t.test(
            "can be chained with other Result operations",
            async () => {
                let attempts = 0;
                const eventualSuccessFn = async () => {
                    attempts++;
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    if (attempts < 2) {
                        return result.error(
                            new Error(`Async attempt ${attempts} failed`)
                        );
                    }
                    return result.ok(10);
                };

                const retryResult = await result.retry_async(
                    eventualSuccessFn,
                    3
                );
                const mappedResult = retryResult.map(
                    (value: unknown) => (value as number) * 2
                );

                assert.ok(mappedResult.is_ok());
                if (mappedResult.is_ok()) {
                    assert.strictEqual(mappedResult.value, 20);
                }
            }
        );

        await t.test(
            "retry async error can be handled with match",
            async () => {
                const alwaysFailFn = async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    return result.error<string>(new Error("Always fails"));
                };

                const retryResult = await result.retry_async<string, Error>(
                    alwaysFailFn,
                    2
                );
                const matchResult = retryResult.match({
                    on_ok: (value) => `Success: ${value}`,
                    on_error: (error) =>
                        `Failed with ${error.errors.length} async errors: ${error.message}`,
                });

                assert.strictEqual(
                    matchResult,
                    "Failed with 2 async errors: Failed after 2 attempts."
                );
            }
        );

        await t.test("handles promise rejections gracefully", async () => {
            let attempts = 0;
            const rejectingFn = async () => {
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 1));
                if (attempts === 1) {
                    throw new Error("Promise rejected");
                }
                return result.ok("Success after rejection");
            };

            // This should not throw, but the function itself might reject
            try {
                await result.retry_async(rejectingFn, 2);
                assert.fail("Should have thrown due to promise rejection");
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, "Promise rejected");
            }
        });

        await t.test("maintains proper async execution order", async () => {
            const executionOrder: number[] = [];
            let attempts = 0;

            const orderTrackingFn = async () => {
                attempts++;
                executionOrder.push(attempts);
                await new Promise((resolve) => setTimeout(resolve, 10));
                executionOrder.push(attempts + 10);
                if (attempts < 2) {
                    return result.error(
                        new Error(`Attempt ${attempts} failed`)
                    );
                }
                return result.ok("Success");
            };

            const retryResult = await result.retry_async(orderTrackingFn, 3);
            assert.ok(retryResult.is_ok());
            assert.deepStrictEqual(executionOrder, [1, 11, 2, 12]);
        });

        await t.test("works with Promise.all-like patterns", async () => {
            let attempts1 = 0;
            let attempts2 = 0;

            const fn1 = async () => {
                attempts1++;
                await new Promise((resolve) => setTimeout(resolve, 5));
                if (attempts1 < 2) {
                    return result.error(
                        new Error(`Function 1 attempt ${attempts1} failed`)
                    );
                }
                return result.ok("Function 1 success");
            };

            const fn2 = async () => {
                attempts2++;
                await new Promise((resolve) => setTimeout(resolve, 3));
                if (attempts2 < 3) {
                    return result.error(
                        new Error(`Function 2 attempt ${attempts2} failed`)
                    );
                }
                return result.ok("Function 2 success");
            };

            const [result1, result2] = await Promise.all([
                result.retry_async(fn1, 3),
                result.retry_async(fn2, 4),
            ]);

            assert.ok(result1.is_ok());
            assert.ok(result2.is_ok());
            if (result1.is_ok() && result2.is_ok()) {
                assert.strictEqual(result1.value, "Function 1 success");
                assert.strictEqual(result2.value, "Function 2 success");
            }
        });
    });

    await t.test("Error Mapper Functionality", async (t) => {
        class CustomError extends Error {
            code: string;
            constructor(message: string, code: string) {
                super(message);
                this.name = "CustomError";
                this.code = code;
            }
        }

        class ValidationError extends Error {
            field: string;
            constructor(message: string, field: string) {
                super(message);
                this.name = "ValidationError";
                this.field = field;
            }
        }

        await t.test("result.try() with error mapper", async (t) => {
            await t.test("maps Error instances to custom error", () => {
                const throwingFn = () => {
                    throw new Error("Original error");
                };
                const errorMapper = (error: unknown) =>
                    new CustomError(`Mapped: ${String(error)}`, "MAP001");

                const res = result.try(throwingFn, errorMapper);

                Assert<
                    Check.Equal<typeof res, Result<never, CustomError>>,
                    "Result error type should match the error mapper output type"
                >();

                assert.ok(res.is_error());
                if (res.is_error()) {
                    Assert<
                        Check.False<
                            Check.Extends<TryAsyncError, typeof res.error>
                        >,
                        "TryAsyncError should NOT be in error type union when error mapper is provided"
                    >();

                    assert.ok(res.error instanceof CustomError);
                    assert.strictEqual(
                        res.error.message,
                        "Mapped: Error: Original error"
                    );
                    assert.strictEqual(res.error.code, "MAP001");
                }
            });

            await t.test("maps string throws to custom error", () => {
                const throwingFn = () => {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw "string error";
                };
                const errorMapper = (error: unknown) =>
                    new ValidationError(
                        `String error: ${String(error)}`,
                        "stringField"
                    );

                const res = result.try(throwingFn, errorMapper);

                assert.ok(res.is_error());
                if (res.is_error()) {
                    assert.ok(res.error instanceof ValidationError);
                    assert.strictEqual(
                        res.error.message,
                        "String error: string error"
                    );
                    assert.strictEqual(res.error.field, "stringField");
                }
            });

            await t.test("maps object throws to custom error", () => {
                const throwingFn = () => {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw { code: 404, message: "Not found" };
                };
                const errorMapper = (error: unknown) => {
                    const err = error as { code: number; message: string };
                    return new CustomError(
                        `HTTP ${err.code}: ${err.message}`,
                        `HTTP${err.code}`
                    );
                };

                const res = result.try(throwingFn, errorMapper);

                assert.ok(res.is_error());
                if (res.is_error()) {
                    assert.ok(res.error instanceof CustomError);
                    assert.strictEqual(
                        res.error.message,
                        "HTTP 404: Not found"
                    );
                    assert.strictEqual(res.error.code, "HTTP404");
                }
            });

            await t.test("handles null/undefined throws", () => {
                const throwingFn = () => {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw null;
                };
                const errorMapper = (error: unknown) =>
                    new CustomError(`Null error: ${String(error)}`, "NULL");

                const res = result.try(throwingFn, errorMapper);

                assert.ok(res.is_error());
                if (res.is_error()) {
                    assert.ok(res.error instanceof CustomError);
                    assert.strictEqual(res.error.message, "Null error: null");
                    assert.strictEqual(res.error.code, "NULL");
                }
            });
        });

        await t.test("result.try_async() with error mapper", async (t) => {
            await t.test(
                "maps async Error rejections to custom error",
                async () => {
                    // eslint-disable-next-line @typescript-eslint/require-await
                    const asyncThrowingFn = async () => {
                        throw new Error("Async error");
                    };
                    const errorMapper = (error: unknown) =>
                        new CustomError(
                            `Async mapped: ${String(error)}`,
                            "ASYNC001"
                        );

                    const asyncResult = result.try_async(
                        asyncThrowingFn,
                        errorMapper
                    );
                    const res = await asyncResult;

                    Assert<
                        Check.Equal<typeof res, Result<never, CustomError>>,
                        "Async result should have same error mapping as sync result"
                    >();

                    assert.ok(res.is_error());
                    if (res.is_error()) {
                        Assert<
                            Check.False<
                                Check.Extends<TryAsyncError, typeof res.error>
                            >,
                            "TryAsyncError should NOT be in error type union when error mapper is provided"
                        >();

                        assert.ok(res.error instanceof CustomError);
                        assert.strictEqual(
                            res.error.message,
                            "Async mapped: Error: Async error"
                        );
                        assert.strictEqual(res.error.code, "ASYNC001");
                    }
                }
            );

            await t.test(
                "maps async string rejections to custom error",
                async () => {
                    // eslint-disable-next-line @typescript-eslint/require-await
                    const asyncThrowingFn = async () => {
                        // eslint-disable-next-line @typescript-eslint/only-throw-error
                        throw "async string error";
                    };
                    const errorMapper = (error: unknown) =>
                        new ValidationError(
                            `Async string: ${String(error)}`,
                            "asyncField"
                        );

                    const res = await result.try_async(
                        asyncThrowingFn,
                        errorMapper
                    );

                    assert.ok(res.is_error());
                    if (res.is_error()) {
                        assert.ok(res.error instanceof ValidationError);
                        assert.strictEqual(
                            res.error.message,
                            "Async string: async string error"
                        );
                        assert.strictEqual(res.error.field, "asyncField");
                    }
                }
            );

            await t.test(
                "maps promise rejections to custom error",
                async () => {
                    const asyncRejectingFn = () =>
                        Promise.reject(new TypeError("Type error"));
                    const errorMapper = (error: unknown) => {
                        const err = error as Error;
                        return new CustomError(
                            `Promise rejection: ${err.message}`,
                            "REJECT"
                        );
                    };

                    const res = await result.try_async(
                        asyncRejectingFn,
                        errorMapper
                    );

                    assert.ok(res.is_error());
                    if (res.is_error()) {
                        assert.ok(res.error instanceof CustomError);
                        assert.strictEqual(
                            res.error.message,
                            "Promise rejection: Type error"
                        );
                        assert.strictEqual(res.error.code, "REJECT");
                    }
                }
            );

            await t.test("supports chaining with mapped errors", async () => {
                // eslint-disable-next-line @typescript-eslint/require-await
                const asyncThrowingFn = async () => {
                    throw new Error("Chain error");
                };
                const errorMapper = (error: unknown) =>
                    new CustomError(`Chained: ${String(error)}`, "CHAIN");

                const res = await result
                    .try_async(asyncThrowingFn, errorMapper)
                    .map((value: string) => value.toUpperCase())
                    .and_then<string, CustomError>((value) =>
                        result.ok(value.toUpperCase())
                    )
                    .or_else<string, CustomError>(() => result.ok("fallback"));

                Assert<
                    Check.Equal<typeof res, Result<string, CustomError>>,
                    "Chained operations should preserve mapped error types"
                >();

                assert.ok(res.is_ok());
                if (res.is_ok()) {
                    assert.strictEqual(res.value, "fallback");
                }
            });
        });

        await t.test(
            "AsyncResult.try_async() instance method with error mapper",
            async (t) => {
                await t.test(
                    "maps errors from chained async operations",
                    async () => {
                        const errorMapper = (error: unknown) =>
                            new CustomError(
                                `Instance mapped: ${String(error)}`,
                                "INSTANCE"
                            );

                        const res = await result
                            .try_async(() => Promise.resolve("initial"))
                            // eslint-disable-next-line @typescript-eslint/require-await
                            .try_async(async () => {
                                throw new Error("Chained error");
                            }, errorMapper);

                        assert.ok(res.is_error());
                        if (res.is_error()) {
                            Assert<
                                Check.True<
                                    Check.Extends<
                                        TryAsyncError,
                                        typeof res.error
                                    >
                                >,
                                "Error mapper should preserve TryAsyncError from previous operations in the union"
                            >();

                            assert.ok(res.error instanceof CustomError);
                            assert.strictEqual(
                                res.error.message,
                                "Instance mapped: Error: Chained error"
                            );
                            assert.strictEqual(res.error.code, "INSTANCE");
                        }
                    }
                );

                await t.test(
                    "maintains error from previous operation when try_async succeeds",
                    async () => {
                        const errorMapper = () =>
                            new CustomError("Should not be called", "UNUSED");

                        const res = await result
                            .try_async<string>(() =>
                                Promise.reject(new Error("Previous error"))
                            )
                            // eslint-disable-next-line @typescript-eslint/require-await
                            .try_async(async () => "success", errorMapper);

                        assert.ok(res.is_error());
                        if (res.is_error()) {
                            assert.ok(res.error instanceof Error);
                            assert.strictEqual(
                                res.error.message,
                                "Previous error"
                            );
                        }
                    }
                );

                await t.test(
                    "successfully chains when previous operation succeeds",
                    async () => {
                        const errorMapper = (error: unknown) =>
                            new CustomError(
                                `Should not be called: ${String(error)}`,
                                "UNUSED"
                            );

                        const res = await result
                            .try_async(() => Promise.resolve("initial success"))
                            .try_async(
                                // eslint-disable-next-line @typescript-eslint/require-await
                                async (value) => `transformed: ${value}`,
                                errorMapper
                            );

                        assert.ok(res.is_ok());
                        if (res.is_ok()) {
                            assert.strictEqual(
                                res.value,
                                "transformed: initial success"
                            );
                        }
                    }
                );
            }
        );

        await t.test("Error mapper type safety", async (t) => {
            await t.test("enforces Error return type at compile time", () => {
                const throwingFn = () => {
                    throw new Error("Test");
                };

                const validMapper = (error: unknown) =>
                    new CustomError(String(error), "VALID");
                const res1 = result.try(throwingFn, validMapper);
                assert.ok(res1.is_error());

                // This would not compile in TypeScript:
                // const invalidMapper = (error: unknown) => "not an error";
                // const res2 = result.try(throwingFn, invalidMapper);
            });

            await t.test(
                "preserves error type information in Result type",
                () => {
                    const throwingFn = () => {
                        throw new Error("Test");
                    };
                    const mapper = (error: unknown) =>
                        new ValidationError(String(error), "test");

                    const res = result.try(throwingFn, mapper);

                    Assert<
                        Check.Equal<typeof res, Result<never, ValidationError>>,
                        "Error mapper should preserve custom error type properties"
                    >();

                    assert.ok(res.is_error());
                    if (res.is_error()) {
                        assert.ok(res.error instanceof ValidationError);
                        assert.strictEqual(res.error.field, "test");
                    }
                }
            );
        });

        await t.test("Error mapper with real-world scenarios", async (t) => {
            await t.test(
                "HTTP request simulation with custom errors",
                async () => {
                    const fetchData = async (url: string) =>
                        result.try_async(
                            // eslint-disable-next-line @typescript-eslint/require-await
                            async () => {
                                if (url.includes("404")) {
                                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                                    throw { status: 404, message: "Not Found" };
                                }
                                if (url.includes("500")) {
                                    throw new Error("Internal Server Error");
                                }
                                return { data: "success" };
                            },
                            (error) => {
                                if (
                                    typeof error === "object" &&
                                    error !== null &&
                                    "status" in error
                                ) {
                                    const httpError = error as {
                                        status: number;
                                        message: string;
                                    };
                                    return new CustomError(
                                        `HTTP ${httpError.status}: ${httpError.message}`,
                                        `HTTP${httpError.status}`
                                    );
                                }
                                return new CustomError(
                                    `Network error: ${String(error)}`,
                                    "NETWORK"
                                );
                            }
                        );

                    const successResult = await fetchData(
                        "https://api.example.com/data"
                    );
                    assert.ok(successResult.is_ok());

                    const notFoundResult = await fetchData(
                        "https://api.example.com/404"
                    );
                    assert.ok(notFoundResult.is_error());
                    if (notFoundResult.is_error()) {
                        assert.ok(notFoundResult.error instanceof CustomError);
                        assert.strictEqual(
                            notFoundResult.error.code,
                            "HTTP404"
                        );
                    }

                    const serverErrorResult = await fetchData(
                        "https://api.example.com/500"
                    );
                    assert.ok(serverErrorResult.is_error());
                    if (serverErrorResult.is_error()) {
                        assert.ok(
                            serverErrorResult.error instanceof CustomError
                        );
                        assert.strictEqual(
                            serverErrorResult.error.code,
                            "NETWORK"
                        );
                    }
                }
            );
        });
    });
});

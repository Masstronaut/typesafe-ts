import { test } from "node:test";
import assert from "node:assert";

import { result, type Result } from "./result.ts";

test("Result", async (t) => {
  t.test("Construction & Factory Methods", async (t) => {
    t.test("can create Ok result with result.ok()", () => {
      const value = "Hello";
      const okResult = result.ok(value);
      assert.ok(okResult.is_ok());
      assert.ok(!okResult.is_error());
    });

    t.test("can create Error result with result.error()", () => {
      const error = new Error("Test error");
      const errorResult = result.error(error);
      assert.ok(errorResult.is_error());
      assert.ok(!errorResult.is_ok());
    });

    t.test("accepts null as valid Ok value", () => {
      const nullOkResult = result.ok(null);
      assert.ok(nullOkResult.is_ok());
      if (nullOkResult.is_ok()) {
        assert.strictEqual(nullOkResult.value, null);
      }
    });

    t.test("accepts undefined as valid Ok value", () => {
      const undefinedOkResult = result.ok(undefined);
      assert.ok(undefinedOkResult.is_ok());
      if (undefinedOkResult.is_ok()) {
        assert.strictEqual(undefinedOkResult.value, undefined);
      }
    });
  });

  t.test("Type Predicates & Narrowing", async (t) => {
    t.test("is_ok() narrows type to OkResult", () => {
      const value = "Hello";
      const okResult = result.ok<string, Error>(value);
      if (okResult.is_ok()) {
        assert.strictEqual(okResult.value, value);
      } else {
        assert.fail("Result should be Ok");
      }
    });

    t.test("is_error() narrows type to ErrorResult", () => {
      const error = new Error("Test error");
      const errorResult = result.error<string, Error>(error);
      if (errorResult.is_error()) {
        assert.strictEqual(errorResult.error, error);
      } else {
        assert.fail("Result should be Error");
      }
    });

    t.test("is_ok() narrows correctly in else branch", () => {
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

    t.test("is_error() narrows correctly in else branch", () => {
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

    t.test("discriminated union works with complex branching", () => {
      const testResults: Result<number, Error>[] = [
        result.ok(42),
        result.error(new Error("Failed")),
        result.ok(0),
        result.error(new Error("Another failure"))
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

    t.test("discriminated union preserves type information through chaining", () => {
      const maybeNumber = result.ok<number, Error>(5);
      
      const processed = maybeNumber
        .map(x => x * 2)
        .and_then(x => x > 8 ? result.ok(x.toString()) : result.error(new Error("Too small")));

      if (processed.is_ok()) {
        // TypeScript knows this is string
        assert.strictEqual(processed.value, "10");
        assert.strictEqual(processed.value.length, 2);
      } else {
        assert.fail("Should have been Ok");
      }
    });
  });

  t.test("Value/Error Access", async (t) => {
    t.test("value_or() returns value for Ok results", () => {
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

    t.test("value_or() returns default for Error results", () => {
      const error = new Error("Test error");
      const errorResult = result.error<string, Error>(error);
      assert.strictEqual(errorResult.value_or("Default"), "Default");

      const numericResult = result.error<number, Error>(error);
      assert.strictEqual(numericResult.value_or(123), 123);
    });

    t.test("error_or() returns error for Error results", () => {
      const error = new Error("Test error");
      const errorResult = result.error<string, Error>(error);
      const defaultError = new Error("Default error");
      assert.strictEqual(errorResult.error_or(defaultError), error);
    });

    t.test("error_or() returns default for Ok results", () => {
      const value = "Hello";
      const okResult = result.ok<string, Error>(value);
      const defaultError = new Error("Default error");
      assert.strictEqual(okResult.error_or(defaultError), defaultError);
    });
  });

  t.test("Transformation Operations", async (t) => {
    t.test("map() transforms Ok values", () => {
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

    t.test("map() doesn't run transformation on Error results", () => {
      const error = new Error("Test error");
      const errorResult = result.error<string, Error>(error);
      const transformed = errorResult.map(() => {
        assert.fail("Map function should not run on Error result");
        // @ts-expect-error (unreachable code)
        return "TRANSFORMED";
      });

      assert.ok(transformed.is_error());
      if (transformed.is_error()) {
        assert.strictEqual(transformed.error, error);
      }
    });

    t.test("map_err() transforms Error values", () => {
      const originalError = new Error("Original error");
      const errorResult = result.error<string, Error>(originalError);
      const transformed = errorResult.map_err(
        (err) => new Error(`Wrapped: ${err.message}`),
      );

      assert.ok(transformed.is_error());
      if (transformed.is_error()) {
        assert.strictEqual(
          transformed.error.message,
          "Wrapped: Original error",
        );
      }
    });

    t.test("map_err() doesn't run transformation on Ok results", () => {
      const value = "Hello";
      const okResult = result.ok<string, Error>(value);
      const transformed = okResult.map_err(() => {
        assert.fail("Map_err function should not run on Ok result");
        // @ts-expect-error (unreachable code)
        return new Error("Should not happen");
      });

      assert.ok(transformed.is_ok());
      if (transformed.is_ok()) {
        assert.strictEqual(transformed.value, value);
      }
    });
  });

  t.test("Pattern Matching", async (t) => {
    t.test("match() executes on_ok callback for Ok results", () => {
      const value = "Hello";
      const okResult = result.ok<string, Error>(value);
      const matched = okResult.match({
        on_ok: (v) => `Value is ${v}`,
        on_error: (e) => `Error: ${e.message}`,
      });

      assert.strictEqual(matched, "Value is Hello");
    });

    t.test("match() executes on_error callback for Error results", () => {
      const error = new Error("Test error");
      const errorResult = result.error<string, Error>(error);
      const matched = errorResult.match({
        on_ok: (v) => `Value is ${v}`,
        on_error: (e) => `Error: ${e.message}`,
      });

      assert.strictEqual(matched, "Error: Test error");
    });
  });

  t.test("Monadic Chaining", async (t) => {
    t.test("and_then() chains Ok results through function", () => {
      const value = "Hello";
      const okResult = result.ok<string, Error>(value);
      const chained = okResult.and_then((v) =>
        result.ok<number, Error>(v.length),
      );

      assert.ok(chained.is_ok());
      if (chained.is_ok()) {
        assert.strictEqual(chained.value, 5);
      }
    });

    t.test("and_then() short-circuits on Error results", () => {
      const error = new Error("Test error");
      const errorResult = result.error<string, Error>(error);
      const chained = errorResult.and_then(() => {
        assert.fail("And_then function should not run on Error result");
        // @ts-expect-error (unreachable code)
        return result.ok<number, Error>(42);
      });

      assert.ok(chained.is_error());
      if (chained.is_error()) {
        assert.strictEqual(chained.error, error);
      }
    });

    t.test("or_else() provides fallback for Error results", () => {
      const originalError = new Error("Original error");
      const errorResult = result.error<string, Error>(originalError);
      const fallback = errorResult.or_else(() =>
        result.ok<string, Error>("Fallback value"),
      );

      assert.ok(fallback.is_ok());
      if (fallback.is_ok()) {
        assert.strictEqual(fallback.value, "Fallback value");
      }
    });

    t.test("or_else() preserves Ok results unchanged", () => {
      const value = "Hello";
      const okResult = result.ok<string, Error>(value);
      const fallback = okResult.or_else(() => {
        assert.fail("Or_else function should not run on Ok result");
        // @ts-expect-error (unreachable code)
        return result.ok<string, Error>("Should not happen");
      });

      assert.ok(fallback.is_ok());
      if (fallback.is_ok()) {
        assert.strictEqual(fallback.value, value);
      }
    });
  });

  t.test("Complex Chaining", async (t) => {
    t.test("can chain multiple map operations", () => {
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

    t.test("can chain map with and_then operations", () => {
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

    t.test("chains short-circuit on first error", () => {
      const error = new Error("Test error");
      const chainedResult = result
        .error<string, Error>(error)
        .map(() => {
          assert.fail("Should not execute");
          // @ts-expect-error (unreachable code)
          return "transformed";
        })
        .and_then(() => {
          assert.fail("Should not execute");
          // @ts-expect-error (unreachable code)
          return result.ok<number, Error>(42);
        });

      assert.ok(chainedResult.is_error());
      if (chainedResult.is_error()) {
        assert.strictEqual(chainedResult.error, error);
      }
    });
  });

  t.test("Type System & Immutability", async (t) => {
    t.test("has correct Symbol.toStringTag", () => {
      const okResult = result.ok<string, Error>("test");
      const errorResult = result.error<string, Error>(new Error("test"));

      assert.strictEqual(okResult[Symbol.toStringTag], "Result");
      assert.strictEqual(errorResult[Symbol.toStringTag], "Result");
    });

    t.test("handles custom Error subclasses", () => {
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

    t.test("asserts construction invariant", () => {
      const Constructor = result.ok(1).constructor as any;
      assert.throws(() => new Constructor({}));
      assert.throws(() => new Constructor({ ok: 1, error: new Error() }));
    });
  });

  t.test("Generator/Iterator Interface", async (t) => {
    t.test("Ok result yields its value in for-of loop", () => {
      const okResult = result.ok(42);
      const values: number[] = [];

      for (const value of okResult) {
        values.push(value);
      }

      assert.strictEqual(values.length, 1);
      assert.strictEqual(values[0], 42);
    });

    t.test("Error result yields nothing in for-of loop", () => {
      const errorResult = result.error<number, Error>(new Error("Failed"));
      const values: number[] = [];

      for (const value of errorResult) {
        values.push(value);
      }

      assert.strictEqual(values.length, 0);
    });

    t.test("can collect successful values from array of results", () => {
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
    });

    t.test("generator works with Array.from", () => {
      const okResult = result.ok("hello");
      const values = Array.from(okResult);

      assert.strictEqual(values.length, 1);
      assert.strictEqual(values[0], "hello");

      const errorResult = result.error<string, Error>(new Error("Failed"));
      const emptyValues = Array.from(errorResult);

      assert.strictEqual(emptyValues.length, 0);
    });

    t.test("generator works with spread operator", () => {
      const okResult = result.ok(100);
      const values = [...okResult];

      assert.strictEqual(values.length, 1);
      assert.strictEqual(values[0], 100);

      const errorResult = result.error<number, Error>(new Error("Failed"));
      const emptyValues = [...errorResult];

      assert.strictEqual(emptyValues.length, 0);
    });

    t.test("can be used with destructuring", () => {
      const okResult = result.ok("test");
      const [first, second] = okResult;

      assert.strictEqual(first, "test");
      assert.strictEqual(second, undefined);

      const errorResult = result.error<string, Error>(new Error("Failed"));
      const [errorFirst, errorSecond] = errorResult;

      assert.strictEqual(errorFirst, undefined);
      assert.strictEqual(errorSecond, undefined);
    });

    t.test("generator works with different value types", () => {
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

  t.test("Function Wrapping API", async (t) => {
    t.test("result.of() wraps successful function execution", () => {
      const successFn = () => "success";
      const res = result.of(successFn);

      assert.ok(res.is_ok());
      if (res.is_ok()) {
        assert.strictEqual(res.value, "success");
      }
    });

    t.test("result.of() wraps function that throws Error", () => {
      const throwingFn = () => {
        throw new Error("Test error");
      };
      const res = result.of(throwingFn);

      assert.ok(res.is_error());
      if (res.is_error()) {
        assert.strictEqual(res.error.message, "Test error");
        assert.ok(res.error instanceof Error);
      }
    });

    t.test("result.of() wraps function that throws non-Error value", () => {
      const throwingFn = () => {
        throw "string error";
      };
      const res = result.of(throwingFn);

      assert.ok(res.is_error());
      if (res.is_error()) {
        assert.strictEqual(res.error.message, "string error");
        assert.ok(res.error instanceof Error);
      }
    });

    t.test("result.of() works with different return types", () => {
      const numberResult = result.of(() => 42);
      assert.ok(numberResult.is_ok());
      if (numberResult.is_ok()) {
        assert.strictEqual(numberResult.value, 42);
      }

      const objectResult = result.of(() => ({ name: "test" }));
      assert.ok(objectResult.is_ok());
      if (objectResult.is_ok()) {
        assert.deepStrictEqual(objectResult.value, { name: "test" });
      }

      const nullResult = result.of(() => null);
      assert.ok(nullResult.is_ok());
      if (nullResult.is_ok()) {
        assert.strictEqual(nullResult.value, null);
      }
    });

    t.test("result.of() preserves Error types", () => {
      const customError = new TypeError("Custom type error");
      const throwingFn = () => {
        throw customError;
      };
      const res = result.of(throwingFn);

      assert.ok(res.is_error());
      if (res.is_error()) {
        assert.strictEqual(res.error, customError);
        assert.ok(res.error instanceof TypeError);
      }
    });

    t.test("result.of_async() wraps successful async function", async () => {
      const asyncSuccessFn = async () => "async success";
      const res = await result.of_async(asyncSuccessFn);

      assert.ok(res.is_ok());
      if (res.is_ok()) {
        assert.strictEqual(res.value, "async success");
      }
    });

    t.test(
      "result.of_async() wraps async function that rejects with Error",
      async () => {
        const asyncThrowingFn = async () => {
          throw new Error("Async error");
        };
        const res = await result.of_async(asyncThrowingFn);

        assert.ok(res.is_error());
        if (res.is_error()) {
          assert.strictEqual(res.error.message, "Async error");
          assert.ok(res.error instanceof Error);
        }
      },
    );

    t.test(
      "result.of_async() wraps async function that rejects with non-Error",
      async () => {
        const asyncThrowingFn = async () => {
          throw "async string error";
        };
        const res = await result.of_async(asyncThrowingFn);

        assert.ok(res.is_error());
        if (res.is_error()) {
          assert.strictEqual(res.error.message, "async string error");
          assert.ok(res.error instanceof Error);
        }
      },
    );

    t.test(
      "result.of_async() works with different resolved types",
      async () => {
        const numberResult = await result.of_async(async () => 42);
        assert.ok(numberResult.is_ok());
        if (numberResult.is_ok()) {
          assert.strictEqual(numberResult.value, 42);
        }

        const arrayResult = await result.of_async(async () => [1, 2, 3]);
        assert.ok(arrayResult.is_ok());
        if (arrayResult.is_ok()) {
          assert.deepStrictEqual(arrayResult.value, [1, 2, 3]);
        }
      },
    );

    t.test("result.of_async() preserves async Error types", async () => {
      const customError = new RangeError("Custom range error");
      const asyncThrowingFn = async () => {
        throw customError;
      };
      const res = await result.of_async(asyncThrowingFn);

      assert.ok(res.is_error());
      if (res.is_error()) {
        assert.strictEqual(res.error, customError);
        assert.ok(res.error instanceof RangeError);
      }
    });

    t.test("result.of_async() properly awaits async operations", async () => {
      let counter = 0;
      const asyncFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ++counter;
      };

      const res = await result.of_async(asyncFn);
      assert.ok(res.is_ok());
      if (res.is_ok()) {
        assert.strictEqual(res.value, 1);
        assert.strictEqual(counter, 1);
      }
    });

    t.test(
      "result.of() and result.of_async() work with JSON parsing example",
      async () => {
        // Sync JSON parsing
        const validJson = result.of(() => JSON.parse('{"name": "John"}'));
        assert.ok(validJson.is_ok());
        if (validJson.is_ok()) {
          assert.strictEqual(validJson.value.name, "John");
        }

        const invalidJson = result.of(() => JSON.parse("invalid json"));
        assert.ok(invalidJson.is_error());
        if (invalidJson.is_error()) {
          assert.ok(invalidJson.error instanceof SyntaxError);
        }

        // Async version
        const asyncValidJson = await result.of_async(async () =>
          JSON.parse('{"age": 30}'),
        );
        assert.ok(asyncValidJson.is_ok());
        if (asyncValidJson.is_ok()) {
          assert.strictEqual(asyncValidJson.value.age, 30);
        }
      },
    );
  });

  t.test("Retry Function", async (t) => {
    t.test("returns Ok on first success", () => {
      let attempts = 0;
      const successFn = () => {
        attempts++;
        return result.ok(`success after ${attempts} attempts`);
      };

      const retryResult = result.retry(successFn, 3);
      assert.ok(retryResult.is_ok());
      if (retryResult.is_ok()) {
        assert.strictEqual(retryResult.value, "success after 1 attempts");
      }
      assert.strictEqual(attempts, 1);
    });

    t.test("retries until success", () => {
      // Run the test 20 times with different random values
      for (let run = 1; run <= 20; run++) {
        let attempts = 0;
        const successOnAttempt = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
        const eventualSuccessFn = (): Result<string, Error> => {
          attempts++;
          if (attempts < successOnAttempt) {
            return result.error(new Error(`Attempt ${attempts} failed`));
          }
          return result.ok(`success after ${attempts} attempts`);
        };

        const retryResult = result.retry(eventualSuccessFn, successOnAttempt);
        assert.ok(retryResult.is_ok(), `Run ${run}: Expected success but got error after ${attempts} attempts (target: ${successOnAttempt})`);
        if (retryResult.is_ok()) {
          assert.strictEqual(retryResult.value, `success after ${successOnAttempt} attempts`, `Run ${run}: Incorrect success message`);
        }
        assert.strictEqual(attempts, successOnAttempt, `Run ${run}: Expected ${successOnAttempt} attempts but got ${attempts}`);
      }
    });

    t.test("fails after exhausting all retries", () => {
      let attempts = 0;
      const alwaysFailFn = (): Result<string, Error> => {
        attempts++;
        return result.error(new Error(`Attempt ${attempts} failed`));
      };

      const retryResult = result.retry(alwaysFailFn, 3);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 3 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 3);
        assert.strictEqual(retryResult.error.errors[0]?.message, "Attempt 1 failed");
        assert.strictEqual(retryResult.error.errors[1]?.message, "Attempt 2 failed");
        assert.strictEqual(retryResult.error.errors[2]?.message, "Attempt 3 failed");
      }
      assert.strictEqual(attempts, 3);
    });

    t.test("handles zero retries", () => {
      let attempts = 0;
      const failFn = (): Result<string, Error> => {
        attempts++;
        return result.error(new Error("Always fails"));
      };

      // @ts-expect-error - Testing zero retries should produce type error for literal 0
      const retryResult = result.retry(failFn, 0);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 0 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 0);
      }
      assert.strictEqual(attempts, 0);
    });

    t.test("handles zero retries from variable", () => {
      let attempts = 0;
      const failFn = (): Result<string, Error> => {
        attempts++;
        return result.error(new Error("Always fails"));
      };

      const zeroRetries: number = 0;
      const retryResult = result.retry(failFn, zeroRetries);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 0 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 0);
      }
      assert.strictEqual(attempts, 0);
    });

    t.test("handles single retry", () => {
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
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 1 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 1);
        assert.strictEqual(retryResult.error.errors[0]?.message, "First attempt failed");
      }
      assert.strictEqual(attempts, 1);
    });

    t.test("works with different value types", () => {
      const numberFn = (): Result<number, Error> => result.ok(42);
      const numberResult = result.retry(numberFn, 1);
      assert.ok(numberResult.is_ok());
      if (numberResult.is_ok()) {
        assert.strictEqual(numberResult.value, 42);
      }

      const objectFn = (): Result<{ name: string }, Error> => result.ok({ name: "test" });
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

    t.test("works with different error types", () => {
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
        return result.error<string, CustomError>(new CustomError(`Custom error ${attempts}`, 500 + attempts));
      };

      const retryResult = result.retry(customErrorFn, 2);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 2 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 2);
        assert.ok(retryResult.error.errors[0] instanceof CustomError);
        assert.ok(retryResult.error.errors[1] instanceof CustomError);
        assert.strictEqual((retryResult.error.errors[0] as CustomError).code, 501);
        assert.strictEqual((retryResult.error.errors[1] as CustomError).code, 502);
      }
    });

    t.test("preserves error collection across attempts", () => {
      const errors = [
        new Error("First error"),
        new TypeError("Second error"),
        new RangeError("Third error")
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

    t.test("can be chained with other Result operations", () => {
      let attempts = 0;
      const eventualSuccessFn = () => {
        attempts++;
        if (attempts < 2) {
          return result.error(new Error(`Attempt ${attempts} failed`));
        }
        return result.ok(10);
      };

      const retryResult = result.retry(eventualSuccessFn, 3);
      const mappedResult = retryResult.map((value: unknown) => (value as number) * 2);
      
      assert.ok(mappedResult.is_ok());
      if (mappedResult.is_ok()) {
        assert.strictEqual(mappedResult.value, 20);
      }
    });

    t.test("retry error can be handled with match", () => {
      const alwaysFailFn = () => result.error(new Error("Always fails"));
      
      const retryResult = result.retry(alwaysFailFn, 2);
      const matchResult = retryResult.match({
        on_ok: (value) => `Success: ${value}`,
        on_error: (error) => `Failed with ${error.errors.length} errors: ${error.message}`
      });

      assert.strictEqual(matchResult, "Failed with 2 errors: Failed after 2 attempts.");
    });
  });

  t.test("Retry Async Function", async (t) => {
    t.test("returns Ok on first success", async () => {
      let attempts = 0;
      const successFn = async () => {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.ok(`async success after ${attempts} attempts`);
      };

      const retryResult = await result.retry_async(successFn, 3);
      assert.ok(retryResult.is_ok());
      if (retryResult.is_ok()) {
        assert.strictEqual(retryResult.value, "async success after 1 attempts");
      }
      assert.strictEqual(attempts, 1);
    });

    t.test("retries until success", async () => {
      // Run the test 20 times with different random values
      for (let run = 1; run <= 20; run++) {
        let attempts = 0;
        const successOnAttempt = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
        const eventualSuccessFn = async () => {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1));
          if (attempts < successOnAttempt) {
            return result.error(new Error(`Async attempt ${attempts} failed`));
          }
          return result.ok(`async success after ${attempts} attempts`);
        };

        const retryResult = await result.retry_async(eventualSuccessFn, successOnAttempt);
        assert.ok(retryResult.is_ok(), `Run ${run}: Expected success but got error after ${attempts} attempts (target: ${successOnAttempt})`);
        if (retryResult.is_ok()) {
          assert.strictEqual(retryResult.value, `async success after ${successOnAttempt} attempts`, `Run ${run}: Incorrect success message`);
        }
        assert.strictEqual(attempts, successOnAttempt, `Run ${run}: Expected ${successOnAttempt} attempts but got ${attempts}`);
      }
    });

    t.test("fails after exhausting all retries", async () => {
      let attempts = 0;
      const alwaysFailFn = async () => {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.error(new Error(`Async attempt ${attempts} failed`));
      };

      const retryResult = await result.retry_async(alwaysFailFn, 3);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 3 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 3);
        assert.strictEqual(retryResult.error.errors[0]?.message, "Async attempt 1 failed");
        assert.strictEqual(retryResult.error.errors[1]?.message, "Async attempt 2 failed");
        assert.strictEqual(retryResult.error.errors[2]?.message, "Async attempt 3 failed");
      }
      assert.strictEqual(attempts, 3);
    });

    t.test("handles zero retries", async () => {
      let attempts = 0;
      const failFn = async () => {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.error(new Error("Always fails"));
      };

      // @ts-expect-error - Testing zero retries should produce type error for literal 0
      const retryResult = await result.retry_async(failFn, 0);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 0 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 0);
      }
      assert.strictEqual(attempts, 0);
    });

    t.test("handles zero retries from variable", async () => {
      let attempts = 0;
      const failFn = async () => {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.error(new Error("Always fails"));
      };

      const zeroRetries: number = 0;
      const retryResult = await result.retry_async(failFn, zeroRetries);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 0 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 0);
      }
      assert.strictEqual(attempts, 0);
    });

    t.test("handles single retry", async () => {
      let attempts = 0;
      const failOnceFn = async () => {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
        if (attempts === 1) {
          return result.error(new Error("First async attempt failed"));
        }
        return result.ok("Second async attempt succeeded");
      };

      const retryResult = await result.retry_async(failOnceFn, 1);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 1 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 1);
        assert.strictEqual(retryResult.error.errors[0]?.message, "First async attempt failed");
      }
      assert.strictEqual(attempts, 1);
    });

    t.test("works with different value types", async () => {
      const numberFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.ok(42);
      };
      const numberResult = await result.retry_async(numberFn, 1);
      assert.ok(numberResult.is_ok());
      if (numberResult.is_ok()) {
        assert.strictEqual(numberResult.value, 42);
      }

      const objectFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.ok({ name: "async test" });
      };
      const objectResult = await result.retry_async(objectFn, 1);
      assert.ok(objectResult.is_ok());
      if (objectResult.is_ok()) {
        assert.deepStrictEqual(objectResult.value, { name: "async test" });
      }

      const nullFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.ok(null);
      };
      const nullResult = await result.retry_async(nullFn, 1);
      assert.ok(nullResult.is_ok());
      if (nullResult.is_ok()) {
        assert.strictEqual(nullResult.value, null);
      }
    });

    t.test("works with different error types", async () => {
      class CustomAsyncError extends Error {
        statusCode: number;
        constructor(message: string, statusCode: number) {
          super(message);
          this.name = "CustomAsyncError";
          this.statusCode = statusCode;
        }
      }

      let attempts = 0;
      const customErrorFn = async (): Promise<Result<string, CustomAsyncError>> => {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.error<string, CustomAsyncError>(new CustomAsyncError(`Custom async error ${attempts}`, 400 + attempts));
      };

      const retryResult = await result.retry_async(customErrorFn, 2);
      assert.ok(retryResult.is_error());
      if (retryResult.is_error()) {
        assert.strictEqual(retryResult.error.name, "Result Retry Error");
        assert.strictEqual(retryResult.error.message, "Failed after 2 attempts.");
        assert.strictEqual(retryResult.error.errors.length, 2);
        assert.ok(retryResult.error.errors[0] instanceof CustomAsyncError);
        assert.ok(retryResult.error.errors[1] instanceof CustomAsyncError);
        assert.strictEqual((retryResult.error.errors[0] as CustomAsyncError).statusCode, 401);
        assert.strictEqual((retryResult.error.errors[1] as CustomAsyncError).statusCode, 402);
      }
    });

    t.test("preserves error collection across async attempts", async () => {
      const errors = [
        new Error("First async error"),
        new TypeError("Second async error"),
        new RangeError("Third async error")
      ];
      let attempts = 0;
      
      const multiErrorFn = async () => {
        const error = errors[attempts];
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
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
        assert.ok(retryResult.error.errors[2] instanceof RangeError);
      }
    });

    t.test("can be chained with other Result operations", async () => {
      let attempts = 0;
      const eventualSuccessFn = async () => {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
        if (attempts < 2) {
          return result.error(new Error(`Async attempt ${attempts} failed`));
        }
        return result.ok(10);
      };

      const retryResult = await result.retry_async(eventualSuccessFn, 3);
      const mappedResult = retryResult.map((value: unknown) => (value as number) * 2);
      
      assert.ok(mappedResult.is_ok());
      if (mappedResult.is_ok()) {
        assert.strictEqual(mappedResult.value, 20);
      }
    });

    t.test("retry async error can be handled with match", async () => {
      const alwaysFailFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return result.error(new Error("Always fails"));
      };
      
      const retryResult = await result.retry_async(alwaysFailFn, 2);
      const matchResult = retryResult.match({
        on_ok: (value) => `Success: ${value}`,
        on_error: (error) => `Failed with ${error.errors.length} async errors: ${error.message}`
      });

      assert.strictEqual(matchResult, "Failed with 2 async errors: Failed after 2 attempts.");
    });

    t.test("handles promise rejections gracefully", async () => {
      let attempts = 0;
      const rejectingFn = async () => {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1));
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
        assert.strictEqual((error as Error).message, "Promise rejected");
      }
    });

    t.test("maintains proper async execution order", async () => {
      const executionOrder: number[] = [];
      let attempts = 0;

      const orderTrackingFn = async () => {
        attempts++;
        executionOrder.push(attempts);
        await new Promise(resolve => setTimeout(resolve, 10));
        executionOrder.push(attempts + 10);
        if (attempts < 2) {
          return result.error(new Error(`Attempt ${attempts} failed`));
        }
        return result.ok("Success");
      };

      const retryResult = await result.retry_async(orderTrackingFn, 3);
      assert.ok(retryResult.is_ok());
      assert.deepStrictEqual(executionOrder, [1, 11, 2, 12]);
    });

    t.test("works with Promise.all-like patterns", async () => {
      let attempts1 = 0;
      let attempts2 = 0;

      const fn1 = async () => {
        attempts1++;
        await new Promise(resolve => setTimeout(resolve, 5));
        if (attempts1 < 2) {
          return result.error(new Error(`Function 1 attempt ${attempts1} failed`));
        }
        return result.ok("Function 1 success");
      };

      const fn2 = async () => {
        attempts2++;
        await new Promise(resolve => setTimeout(resolve, 3));
        if (attempts2 < 3) {
          return result.error(new Error(`Function 2 attempt ${attempts2} failed`));
        }
        return result.ok("Function 2 success");
      };

      const [result1, result2] = await Promise.all([
        result.retry_async(fn1, 3),
        result.retry_async(fn2, 4)
      ]);

      assert.ok(result1.is_ok());
      assert.ok(result2.is_ok());
      if (result1.is_ok() && result2.is_ok()) {
        assert.strictEqual(result1.value, "Function 1 success");
        assert.strictEqual(result2.value, "Function 2 success");
      }
    });
  });
});

import { test } from "node:test";
import assert from "node:assert";

import { result, type Result, type TryAsyncError, AsyncResult } from "./result.ts";

// Test utility constants
const OPERATION_STRING_MAX_LENGTH = 100;
const TRUNCATED_SUFFIX = "...";
const MAX_TRUNCATED_LENGTH = OPERATION_STRING_MAX_LENGTH + TRUNCATED_SUFFIX.length;

// Test utility functions
function createSuccessResult<T>(value: T) {
  return result.try_async(() => Promise.resolve(value));
}

function createErrorResult<T>(message: string) {
  return result.try_async<T>(() => Promise.reject(new Error(message)));
}

function assertTryAsyncError(
  error: unknown,
  expectedMessage: string,
  expectedOriginalType?: ErrorConstructor | SyntaxErrorConstructor
): asserts error is TryAsyncError {
  assert.ok(error instanceof Error);
  const tryError = error as TryAsyncError;
  assert.strictEqual(tryError.name, "TryAsyncError");
  assert.strictEqual(tryError.message, `Async operation failed: ${expectedMessage}`);
  assert.ok(typeof tryError.operation === "string");
  assert.ok(typeof tryError.timestamp === "number");
  assert.ok(tryError.timestamp > 0);
  
  if (expectedOriginalType) {
    assert.ok(tryError.originalError instanceof expectedOriginalType);
    if (tryError.originalError instanceof Error) {
      assert.strictEqual(tryError.originalError.message, expectedMessage);
    }
    assert.ok(tryError.cause instanceof expectedOriginalType);
  }
}

function assertOperationResult<T, E extends Error>(
  result: Result<T, E>, 
  expectedValue: T
) {
  assert.ok(result.is_ok());
  if (result.is_ok()) {
    assert.strictEqual(result.value, expectedValue);
  }
}

function createMockFetch(responseData: unknown): () => Promise<{ json: () => Promise<unknown> }> {
  return () => Promise.resolve({
    json: () => Promise.resolve(responseData)
  });
}

await test("Async Results", async (t) => {
  await t.test("Support the full Result interface", async (t) => {
    await t.test("value_or() works on async result", async () => {
      const successResult = result.try_async(() => Promise.resolve(42));
      const successValue = await successResult.value_or(0);
      assert.strictEqual(successValue, 42);

      const errorResult = result.try_async<number>(() =>
        Promise.reject(new Error("failed")),
      );
      const errorValue = await errorResult.value_or(0);
      assert.strictEqual(errorValue, 0);
    });

    await t.test("error_or() works on async result", async () => {
      const defaultError = new Error("default");

      const successResult = result.try_async(() => Promise.resolve("success"));
      const successError = await successResult.error_or(defaultError);
      assert.strictEqual(successError, defaultError);

      const errorResult = result.try_async<string>(() =>
        Promise.reject(new Error("failed")),
      );
      const resultError = await errorResult.error_or(defaultError);
      assert.strictEqual(resultError.message, "failed");
    });

    await t.test("map() works on async result", async () => {
      const asyncResult = result.try_async(() => Promise.resolve("hello"));
      const mapped = asyncResult.map((s) => s.toUpperCase());
      const res = await mapped;

      assertOperationResult(res, "HELLO");
    });

    await t.test("map_err() works on async result", async () => {
      const asyncResult = result.try_async(() =>
        Promise.reject(new Error("original")),
      );
      const mapped = asyncResult.map_err(
        (err) => new Error(`wrapped: ${err.message}`),
      );
      const res = await mapped;

      assert.ok(res.is_error());
      assert.strictEqual(res.error.message, "wrapped: original");
    });

    await t.test("match() works on async result", async () => {
      const successResult = result.try_async(() => Promise.resolve("value"));
      const successMatch = await successResult.match({
        on_ok: (v) => `ok: ${v}`,
        on_error: (e) => `error: ${e.message}`,
      });
      assert.strictEqual(successMatch, "ok: value");

      const errorResult = result.try_async<string>(() =>
        Promise.reject(new Error("failed")),
      );
      const errorMatch = await errorResult.match({
        on_ok: (v) => `ok: ${v}`,
        on_error: (e) => `error: ${e.message}`,
      });
      assert.strictEqual(errorMatch, "error: failed");
    });

    await t.test("and_then() works on async result", async () => {
      const asyncResult = result.try_async(() => Promise.resolve(5));
      const chained = asyncResult.and_then((n) => result.ok(n * 2));
      const res = await chained;

      assert.ok(res.is_ok());
      assert.strictEqual(res.value, 10);
    });

    await t.test("or_else() works on async result", async () => {
      const asyncResult = createErrorResult<string>("failed");
      const fallback = asyncResult.or_else(() => result.ok("fallback"));
      const res = await fallback;

      assertOperationResult(res, "fallback");
    });

    await t.test("Symbol.iterator works on async result", async () => {
      const successResult = result.try_async(() => Promise.resolve("value"));
      const values = [];
      for await (const value of successResult) {
        values.push(value);
      }
      assert.deepStrictEqual(values, ["value"]);

      const errorResult = result.try_async(() =>
        Promise.reject(new Error("failed")),
      );
      const emptyValues: string[] = [];
      for await (const value of errorResult) {
        emptyValues.push(value);
      }
      assert.deepStrictEqual(emptyValues, []);
    });

    await t.test("Symbol.toStringTag works on async result", () => {
      const asyncResult = result.try_async(() => Promise.resolve("value"));
      assert.strictEqual(asyncResult[Symbol.toStringTag], "Result");
    });
  });

  await t.test("Chaining support", async (t) => {
    await t.test("map() chains with itself", async () => {
      const chained = createSuccessResult("hello")
        .map((s) => s.toUpperCase())
        .map((s) => s + " WORLD")
        .map((s) => s.length);
      const res = await chained;

      assertOperationResult(res, 11);
    });

    await t.test("and_then() chains with itself", async () => {
      const chained = createSuccessResult(5)
        .and_then((n) => result.ok(n * 2))
        .and_then((n) => result.ok(n + 1))
        .and_then((n) => result.ok(n.toString()));
      const res = await chained;

      assertOperationResult(res, "11");
    });

    await t.test("or_else() chains with itself", async () => {
      const chained = createErrorResult<string>("first")
        .or_else(() => result.error<string>(new Error("second")))
        .or_else(() => result.error<string>(new Error("third")))
        .or_else(() => result.ok("finally"));
      const res = await chained;

      assertOperationResult(res, "finally");
    });

    await t.test("mixed method chaining works", async () => {
      const chained = createSuccessResult("hello")
        .map((s) => s.toUpperCase())
        .and_then((s) =>
          s.length > 3
            ? result.ok(s)
            : result.error<string>(new Error("too short")),
        )
        .map((s) => s + "!")
        .or_else(() => result.ok("fallback"));
      const res = await chained;

      assertOperationResult(res, "HELLO!");
    });
  });

  await t.test("try_async method", async (t) => {
    await t.test(
      "try_async() works with successful async operation",
      async () => {
        const asyncResult = createSuccessResult("initial");
        const chained = asyncResult.try_async(async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return value.toUpperCase();
        });
        const res = await chained;

        assertOperationResult(res, "INITIAL");
      },
    );

    await t.test("try_async() catches thrown errors", async () => {
      const asyncResult = createSuccessResult("initial");
      const chained = asyncResult.try_async(() => {
        throw new Error("Async operation failed");
      });
      const res = await chained;

      assert.ok(res.is_error());
      assertTryAsyncError(res.error, "Async operation failed", Error);
    });

    await t.test("try_async() catches rejected promises", async () => {
      const asyncResult = createSuccessResult("initial");
      const chained = asyncResult.try_async(() => {
        return Promise.reject(new Error("Promise rejected"));
      });
      const res = await chained;

      assert.ok(res.is_error());
      assertTryAsyncError(res.error, "Promise rejected", Error);
    });

    await t.test(
      "try_async() propagates errors from initial AsyncResult",
      async () => {
        const asyncResult = createErrorResult("Initial error");
        const chained = asyncResult.try_async(() => {
          return Promise.resolve("should not be called");
        });
        const res = await chained;

        assert.ok(res.is_error());
        assert.strictEqual(res.error.message, "Initial error");
      },
    );

    await t.test("try_async() chains with itself", async () => {
      const chained = createSuccessResult("hello")
        .try_async(async (s) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return s.toUpperCase();
        })
        .try_async(async (s) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return s + " WORLD";
        });
      const res = await chained;

      assertOperationResult(res, "HELLO WORLD");
    });

    await t.test("try_async() chains with other methods", async () => {
      const chained = createSuccessResult("hello")
        .try_async((s) => Promise.resolve(s.toUpperCase()))
        .map((s) => s + " WORLD")
        .and_then((s) =>
          s.length > 5 ? result.ok(s) : result.error(new Error("Too short")),
        );
      const res = await chained;

      assertOperationResult(res, "HELLO WORLD");
    });

    await t.test("try_async() handles non-Error thrown values", async () => {
      const asyncResult = createSuccessResult("initial");
      const chained = asyncResult.try_async(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "String error";
      });
      const res = await chained;

      assert.ok(res.is_error());
      const error = res.error as TryAsyncError;
      assert.strictEqual(error.name, "TryAsyncError");
      assert.strictEqual(error.message, "Async operation failed: String error");
      assert.strictEqual(error.originalError, "String error");
      assert.ok(typeof error.operation === "string");
      assert.ok(typeof error.timestamp === "number");
      assert.strictEqual(error.cause, undefined); // Non-Error values don't have cause
    });
  });

  await t.test("try_async with custom error mapping", async (t) => {
    class CustomError extends Error {
      public code: number;
      constructor(message: string, code: number) {
        super(message);
        this.name = "CustomError";
        this.code = code;
      }
    }

    await t.test("try_async() with custom error mapper", async () => {
      const asyncResult = createSuccessResult("initial");
      const chained = asyncResult.try_async(
        () => {
          throw new Error("Original error");
        },
        (error) => new CustomError(`Mapped: ${String(error)}`, 500),
      );
      const res = await chained;

      assert.ok(res.is_error());
      const error = res.error as CustomError;
      assert.strictEqual(error.name, "CustomError");
      assert.strictEqual(error.code, 500);
      assert.ok(error.message.includes("Mapped: Error: Original error"));
    });

    await t.test("try_async() error mapping preserves type union", async () => {
      // Start with ValidationError
      class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "ValidationError";
        }
      }

      const initialResult = result.error<string>(
        new ValidationError("Invalid input"),
      );
      const asyncResult = new AsyncResult(Promise.resolve(initialResult));

      const chained = asyncResult.try_async(
        () => Promise.resolve("should not be called"),
        () => new CustomError("Network: error", 404),
      );
      const res = await chained;

      assert.ok(res.is_error());
      // Should be ValidationError (original), not CustomError (since it was already an error)
      assert.strictEqual(res.error.name, "ValidationError");
    });

    await t.test("try_async() with error mapper chains correctly", async () => {
      const chained = createSuccessResult("hello")
        .try_async(
          () => {
            throw new Error("Step 1 failed");
          },
          (error) => new CustomError(`Step 1: ${String(error)}`, 400),
        )
        .try_async(
          () => Promise.resolve("should not be called"),
          (error) => new CustomError(`Step 2: ${String(error)}`, 500),
        );
      const res = await chained;

      assert.ok(res.is_error());
      const error = res.error as CustomError;
      assert.strictEqual(error.name, "CustomError");
      assert.strictEqual(error.code, 400); // From first error
      assert.ok(error.message.includes("Step 1"));
    });
  });

  await t.test("TryAsyncError detailed information", async (t) => {
    await t.test("TryAsyncError contains operation details", async () => {
      const asyncResult = createSuccessResult("initial");
      const chained = asyncResult.try_async(() => {
        throw new SyntaxError("JSON parse failed");
      });
      const res = await chained;

      assert.ok(res.is_error());
      assertTryAsyncError(res.error, "JSON parse failed", SyntaxError);
      assert.ok(res.error.operation.includes("=>"));
    });

    await t.test(
      "TryAsyncError operation string is truncated if too long",
      async () => {
        const asyncResult = createSuccessResult("initial");
        const veryLongFunction = () => {
          // This creates a very long function string when .toString() is called
          // Using variables to make the function definition long
          const x =
            "this is a very long string that will make the function toString very long and should be truncated";
          const y = "another very long string to make it even longer";
          // Using the variables to avoid unused variable warnings
          console.log(x, y);
          throw new Error("test");
        };

        const chained = asyncResult.try_async(veryLongFunction);
        const res = await chained;

        assert.ok(res.is_error());
        const error = res.error as TryAsyncError;
        assert.ok(error.operation.length <= MAX_TRUNCATED_LENGTH);
        assert.ok(error.operation.endsWith(TRUNCATED_SUFFIX));
      },
    );

    await t.test("TryAsyncError preserves stack trace", async () => {
      const asyncResult = createSuccessResult("initial");
      const chained = asyncResult.try_async(() => {
        const originalError = new Error("Original error");
        throw originalError;
      });
      const res = await chained;

      assert.ok(res.is_error());
      assertTryAsyncError(res.error, "Original error", Error);
      assert.ok(res.error.stack);
      assert.strictEqual(res.error.cause, res.error.originalError);
    });
  });

  await t.test("Real-world usage examples", async (t) => {
    await t.test("Can fetch data and process it", async () => {
      const mockData = { name: "Luke Skywalker" };
      const mockFetch = createMockFetch(mockData);
      
      const name = await result
        .try_async(mockFetch)
        .try_async((res) => res.json())
        .map((data) => data as { name: string })
        .map((data) => data.name);
      assertOperationResult(name, "Luke Skywalker");
    });
  });

  await t.test("Edge cases and concurrent operations", async (t) => {
    await t.test("concurrent async operations complete independently", async () => {
      const operation1 = createSuccessResult("first").try_async(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return value.toUpperCase();
      });

      const operation2 = createSuccessResult("second").try_async(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return value.toUpperCase();
      });

      const operation3 = createErrorResult<string>("third").try_async(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return value.toUpperCase();
      });

      const [result1, result2, result3] = await Promise.all([operation1, operation2, operation3]);

      assertOperationResult(result1, "FIRST");
      assertOperationResult(result2, "SECOND");
      assert.ok(result3.is_error());
      assert.strictEqual(result3.error.message, "third");
    });

    await t.test("very long async chains maintain proper error propagation", async () => {
      let chain = createSuccessResult(0);
      
      // Create a long chain of async operations
      for (let i = 0; i < 50; i++) {
        chain = chain.try_async(async (value) => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return value + 1;
        });
      }
      
      const result = await chain;
      assertOperationResult(result, 50);
    });

    await t.test("async operations with rapid succession", async () => {
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        const operation = createSuccessResult(i).try_async((value) => {
          return Promise.resolve(value * 2);
        });
        operations.push(operation);
      }

      const results = await Promise.all(operations);
      
      results.forEach((result, index) => {
        assertOperationResult(result, index * 2);
      });
    });

    await t.test("async result with immediate resolution maintains chaining", async () => {
      const result = await createSuccessResult("immediate")
        .try_async((value) => Promise.resolve(value.toUpperCase()))
        .map((value) => value + "!")
        .try_async((value) => Promise.resolve(value.repeat(2)));

      assertOperationResult(result, "IMMEDIATE!IMMEDIATE!");
    });

    await t.test("mixed success and error operations in concurrent context", async () => {
      const successOp = createSuccessResult("success")
        .try_async(async (value) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return value.toUpperCase();
        });

      const errorOp = createSuccessResult("initial")
        .try_async(async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          throw new Error("Async failure");
        });

      const [successResult, errorResult] = await Promise.all([successOp, errorOp]);

      assertOperationResult(successResult, "SUCCESS");
      assert.ok(errorResult.is_error());
      assertTryAsyncError(errorResult.error, "Async failure", Error);
    });
  });
});

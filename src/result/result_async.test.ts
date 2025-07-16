import { test } from "node:test";
import assert from "node:assert";

import { result } from "./result.ts";

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

      assert.ok(res.is_ok());
      assert.strictEqual(res.value, "HELLO");
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
      const asyncResult = result.try_async<string>(() =>
        Promise.reject(new Error("failed")),
      );
      const fallback = asyncResult.or_else(() => result.ok("fallback"));
      const res = await fallback;

      assert.ok(res.is_ok());
      assert.strictEqual(res.value, "fallback");
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
      const chained = result
        .try_async(() => Promise.resolve("hello"))
        .map((s) => s.toUpperCase())
        .map((s) => s + " WORLD")
        .map((s) => s.length);
      const res = await chained;

      assert.ok(res.is_ok());
      assert.strictEqual(res.value, 11);
    });

    await t.test("and_then() chains with itself", async () => {
      const chained = result
        .try_async(() => Promise.resolve(5))
        .and_then((n) => result.ok(n * 2))
        .and_then((n) => result.ok(n + 1))
        .and_then((n) => result.ok(n.toString()));
      const res = await chained;

      assert.ok(res.is_ok());
      assert.strictEqual(res.value, "11");
    });

    await t.test("or_else() chains with itself", async () => {
      const chained = result
        .try_async<string>(() => Promise.reject(new Error("first")))
        .or_else(() => result.error<string>(new Error("second")))
        .or_else(() => result.error<string>(new Error("third")))
        .or_else(() => result.ok("finally"));
      const res = await chained;

      assert.ok(res.is_ok());
      assert.strictEqual(res.value, "finally");
    });

    await t.test("mixed method chaining works", async () => {
      const chained = result
        .try_async(() => Promise.resolve("hello"))
        .map((s) => s.toUpperCase())
        .and_then((s) =>
          s.length > 3
            ? result.ok(s)
            : result.error<string>(new Error("too short")),
        )
        .map((s) => s + "!")
        .or_else(() => result.ok("fallback"));
      const res = await chained;

      assert.ok(res.is_ok());
      assert.strictEqual(res.value, "HELLO!");
    });
  });

  await t.test("Interface verification", async (t) => {
    await t.test("async result has all chaining methods", () => {
      const asyncResult = result.try_async(() => Promise.resolve("test"));

      // Value/Error access
      assert.strictEqual(typeof asyncResult.value_or, "function");
      assert.strictEqual(typeof asyncResult.error_or, "function");

      // Transformation operations
      assert.strictEqual(typeof asyncResult.map, "function");
      assert.strictEqual(typeof asyncResult.map_err, "function");

      // Pattern matching
      assert.strictEqual(typeof asyncResult.match, "function");

      // Monadic operations
      assert.strictEqual(typeof asyncResult.and_then, "function");
      assert.strictEqual(typeof asyncResult.or_else, "function");

      // Iterator interface
      assert.strictEqual(typeof asyncResult[Symbol.asyncIterator], "function");

      // ToString tag
      assert.strictEqual(asyncResult[Symbol.toStringTag], "Result");
    });
  });
});

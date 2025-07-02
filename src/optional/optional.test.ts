import { test } from "node:test";
import assert from "node:assert";

import { optional, type Optional } from "./optional.ts";

test("Optional", async (t) => {
  t.test("can be narrowed using .is_some()", () => {
    const value = "Hello";
    const maybeValue = optional.some(value);
    assert.ok(maybeValue.is_some());
    assert.strictEqual(maybeValue.value, value);
  });
  t.test("will provide its value if is_some() via .value_or()", () => {
    const value = "Hello";
    const maybeValue: Optional<string> = optional.some(value);
    assert.strictEqual(maybeValue.value_or("Default"), value);
    const numericValue = 42;

    const numericMaybeValue = optional.some(numericValue);
    assert.strictEqual(numericMaybeValue.value_or(0), numericValue);

    const objectValue = { key: "value" };
    const objectMaybeValue = optional.some(objectValue);
    assert.deepStrictEqual(
      objectMaybeValue.value_or({ key: "another value" }),
      objectValue,
    );
  });
  t.test("without a value can provide a default using .value_or()", () => {
    const value = "Hello";
    const maybeValue = optional.some(value);
    assert.strictEqual(maybeValue.value_or("Default"), value);
    const emptyMaybeValue = optional.none<string>();
    assert.strictEqual(emptyMaybeValue.value_or("Default"), "Default");

    const numericMaybeValue = optional.none<number>();
    assert.strictEqual(numericMaybeValue.value_or(123), 123);

    const objectMaybeValue = optional.none<object>();
    assert.deepStrictEqual(objectMaybeValue.value_or({ key: "default" }), {
      key: "default",
    });
  });
  t.test("can transform its value using .map()", () => {
    const value = "Hello";
    const maybeValue = optional.some(value);
    const transformed = maybeValue.map((v) => v.toUpperCase());
    assert.ok(transformed.is_some());
    assert.strictEqual(transformed.value, "HELLO");

    const numericMaybeValue = optional.some(42);
    const numericTransformed = numericMaybeValue.map((v) => v * 2);
    assert.ok(numericTransformed.is_some());
    assert.strictEqual(numericTransformed.value, 84);
  });
  t.test("Won't run the mapper function if the Optional is empty", () => {
    const emptyMaybeValue = optional.none<string>();
    const transformed = emptyMaybeValue.map(() =>
      assert.fail("Mapping function was run on an empty Optional value."),
    );
    assert.ok(!transformed.is_some());
  });
  const optionalName = optional.some("name");
  t.test(`Optionals are named ${optionalName}`);
  t.test("can chain operations using .and_then()", () => {
    const value = "Hello";
    const maybeValue = optional.some(value);
    const result = maybeValue.and_then((v) => optional.some(v.length));
    assert.ok(result.is_some());
    assert.strictEqual(result.value, 5);

    const emptyMaybeValue = optional.none<string>();
    const emptyResult = emptyMaybeValue.and_then((v) =>
      optional.some(v.length),
    );
    assert.ok(!emptyResult.is_some());
  });
  t.test("can chain operations using .or_else()", () => {
    const value = "Hello";
    const maybeValue = optional.some(value);
    const result = maybeValue.or_else(() => optional.some("Default"));
    assert.ok(result.is_some());
    assert.strictEqual(result.value, value);

    const emptyMaybeValue = optional.none<string>();
    const emptyResult = emptyMaybeValue.or_else(() => optional.some("Default"));
    assert.ok(emptyResult.is_some());
    assert.strictEqual(emptyResult.value, "Default");
  });
  t.test("Can chain operations using a combination of monadic methods", () => {
    const maybeValue = optional.some("Hello");
    const transformedResult = maybeValue
      .map((v) => v + " World")
      .and_then((v) => optional.some(v.length))
      .value_or(0);
    assert.strictEqual(transformedResult, 11);
  });

  t.test("has correct Symbol.toStringTag", () => {
    const someValue = optional.some("test");
    const noneValue = optional.none<string>();

    assert.strictEqual(someValue[Symbol.toStringTag], "Optional");
    assert.strictEqual(noneValue[Symbol.toStringTag], "Optional");
  });

  t.test("accepts null and undefined as valid values", () => {
    const nullOptional = optional.some(null);
    assert.ok(nullOptional.is_some());
    assert.strictEqual(nullOptional.value, null);

    const undefinedOptional = optional.some(undefined);
    assert.ok(undefinedOptional.is_some());
    assert.strictEqual(undefinedOptional.value, undefined);
  });

  t.test("complex chaining with early termination", () => {
    const result = optional
      .some("start")
      .map((v) => v + "-step1")
      .and_then((v) =>
        v.length > 5 ? optional.some(v) : optional.none<string>(),
      )
      .map((v) => v.toUpperCase())
      .and_then((v) => optional.some(v.length));

    assert.ok(result.is_some());
    assert.strictEqual(result.value, 11); // "START-STEP1".length

    const terminatedResult = optional
      .some("hi")
      .map((v) => v + "-step1")
      .and_then((v) =>
        v.length > 10 ? optional.some(v) : optional.none<string>(),
      )
      .map((v) => v.toUpperCase())
      .and_then((v) => optional.some(v.length));

    assert.ok(!terminatedResult.is_some());
  });

  t.test("or_else chains with multiple fallbacks", () => {
    const result = optional
      .none<string>()
      .or_else(() => optional.none<string>())
      .or_else(() => optional.some("fallback"));

    assert.ok(result.is_some());
    assert.strictEqual(result.value, "fallback");
  });

  t.test("Generator/Iterator Interface", async (t) => {
    t.test("Optional with value yields its value in for-of loop", () => {
      const someOptional = optional.some(42);
      const values: number[] = [];

      for (const value of someOptional) {
        values.push(value);
      }

      assert.strictEqual(values.length, 1);
      assert.strictEqual(values[0], 42);
    });

    t.test("Empty Optional yields nothing in for-of loop", () => {
      const emptyOptional = optional.none<number>();
      const values: number[] = [];

      for (const value of emptyOptional) {
        values.push(value);
      }

      assert.strictEqual(values.length, 0);
    });

    t.test("can collect present values from array of optionals", () => {
      const optionals = [
        optional.some(1),
        optional.none<number>(),
        optional.some(3),
        optional.some(5),
        optional.none<number>(),
      ];

      const presentValues: number[] = [];
      for (const opt of optionals) {
        for (const value of opt) {
          presentValues.push(value);
        }
      }

      assert.deepStrictEqual(presentValues, [1, 3, 5]);
    });

    t.test("generator works with Array.from", () => {
      const someOptional = optional.some("hello");
      const values = Array.from(someOptional);

      assert.strictEqual(values.length, 1);
      assert.strictEqual(values[0], "hello");

      const emptyOptional = optional.none<string>();
      const emptyValues = Array.from(emptyOptional);

      assert.strictEqual(emptyValues.length, 0);
    });

    t.test("generator works with spread operator", () => {
      const someOptional = optional.some(100);
      const values = [...someOptional];

      assert.strictEqual(values.length, 1);
      assert.strictEqual(values[0], 100);

      const emptyOptional = optional.none<number>();
      const emptyValues = [...emptyOptional];

      assert.strictEqual(emptyValues.length, 0);
    });

    t.test("can be used with destructuring", () => {
      const someOptional = optional.some("test");
      const [first, second] = someOptional;

      assert.strictEqual(first, "test");
      assert.strictEqual(second, undefined);

      const emptyOptional = optional.none<string>();
      const [emptyFirst, emptySecond] = emptyOptional;

      assert.strictEqual(emptyFirst, undefined);
      assert.strictEqual(emptySecond, undefined);
    });

    t.test("generator works with different value types", () => {
      const stringOptional = optional.some("hello");
      assert.deepStrictEqual([...stringOptional], ["hello"]);

      const numberOptional = optional.some(42);
      assert.deepStrictEqual([...numberOptional], [42]);

      const objectOptional = optional.some({ name: "test" });
      assert.deepStrictEqual([...objectOptional], [{ name: "test" }]);

      const nullOptional = optional.some(null);
      assert.deepStrictEqual([...nullOptional], [null]);

      const undefinedOptional = optional.some(undefined);
      assert.deepStrictEqual([...undefinedOptional], [undefined]);
    });
  });

  t.test("from() method", async (t) => {
    t.test("wraps non-null/undefined values in some", () => {
      const result = optional.from(() => "hello");
      assert.ok(result.is_some());
      assert.strictEqual(result.value, "hello");

      const numberResult = optional.from(() => 42);
      assert.ok(numberResult.is_some());
      assert.strictEqual(numberResult.value, 42);

      const objectResult = optional.from(() => ({ key: "value" }));
      assert.ok(objectResult.is_some());
      assert.deepStrictEqual(objectResult.value, { key: "value" });
    });

    t.test("wraps null values in none", () => {
      const result = optional.from(() => null);
      assert.ok(!result.is_some());
    });

    t.test("wraps undefined values in none", () => {
      const result = optional.from(() => undefined);
      assert.ok(!result.is_some());
    });

    t.test("works with functions that conditionally return null", () => {
      // Need this fn to return null to test that optional.from() works correctly
      // eslint-disable-next-line ts-utils/enforce-optional-usage
      function findItem(id: number): string | null {
        return id === 1 ? "found" : null;
      }

      const foundResult = optional.from(() => findItem(1));
      assert.ok(foundResult.is_some());
      assert.strictEqual(foundResult.value, "found");

      const notFoundResult = optional.from(() => findItem(2));
      assert.ok(!notFoundResult.is_some());
    });

    t.test("works with DOM-like APIs", () => {
      const mockDocument = {
        // eslint-disable-next-line ts-utils/enforce-optional-usage
        getElementById: (id: string) => (id === "exists" ? { id } : null),
      };

      const foundElement = optional.from(() =>
        mockDocument.getElementById("exists"),
      );
      assert.ok(foundElement.is_some());
      assert.deepStrictEqual(foundElement.value, { id: "exists" });

      const notFoundElement = optional.from(() =>
        mockDocument.getElementById("missing"),
      );
      assert.ok(!notFoundElement.is_some());
    });

    t.test("can be chained with other Optional methods", () => {
      const result = optional
        .from(() => "hello")
        .map((v) => v.toUpperCase())
        .and_then((v) => optional.some(v.length))
        .value_or(0);

      assert.strictEqual(result, 5);

      const nullResult = optional
        .from(() => null as string | null)
        .map((v) => v.toUpperCase())
        .value_or("default");

      assert.strictEqual(nullResult, "default");
    });
  });

  t.test("from_async() method", async (t) => {
    t.test("wraps non-null/undefined resolved values in some", async () => {
      const result = await optional.from_async(async () => "hello");
      assert.ok(result.is_some());
      assert.strictEqual(result.value, "hello");

      const numberResult = await optional.from_async(async () => 42);
      assert.ok(numberResult.is_some());
      assert.strictEqual(numberResult.value, 42);

      const objectResult = await optional.from_async(async () => ({
        key: "value",
      }));
      assert.ok(objectResult.is_some());
      assert.deepStrictEqual(objectResult.value, { key: "value" });
    });

    t.test("wraps null resolved values in none", async () => {
      const result = await optional.from_async(async () => null);
      assert.ok(!result.is_some());
    });

    t.test("wraps undefined resolved values in none", async () => {
      const result = await optional.from_async(async () => undefined);
      assert.ok(!result.is_some());
    });

    t.test(
      "works with async functions that conditionally return null",
      async () => {
        async function fetchUser(id: number): Promise<{ name: string } | null> {
          await new Promise((resolve) => setTimeout(resolve, 1)); // Simulate async work
          return id === 1 ? { name: "Alice" } : null;
        }

        const foundResult = await optional.from_async(() => fetchUser(1));
        assert.ok(foundResult.is_some());
        assert.deepStrictEqual(foundResult.value, { name: "Alice" });

        const notFoundResult = await optional.from_async(() => fetchUser(2));
        assert.ok(!notFoundResult.is_some());
      },
    );

    t.test("works with fetch-like APIs", async () => {
      const mockFetch = async (url: string) => {
        if (url === "/api/success") {
          return { ok: true, json: async () => ({ data: "success" }) };
        }
        // eslint-disable-next-line ts-utils/enforce-optional-usage
        return { ok: false, json: async () => null };
      };

      const successResult = await optional.from_async(async () => {
        const response = await mockFetch("/api/success");
        return response.ok ? await response.json() : null;
      });

      assert.ok(successResult.is_some());
      assert.deepStrictEqual(successResult.value, { data: "success" });

      const failureResult = await optional.from_async(async () => {
        const response = await mockFetch("/api/failure");
        return response.ok ? await response.json() : null;
      });

      assert.ok(!failureResult.is_some());
    });

    t.test("can be chained with other Optional methods", async () => {
      const result = (await optional.from_async(async () => "hello"))
        .map((v) => v.toUpperCase())
        .and_then((v) => optional.some(v.length))
        .value_or(0);

      assert.strictEqual(result, 5);

      const nullResult = (
        await optional.from_async(async () => null as string | null)
      )
        .map((v) => v.toUpperCase())
        .value_or("default");

      assert.strictEqual(nullResult, "default");
    });

    t.test(
      "handles promises that resolve to falsy but non-null values",
      async () => {
        const falseResult = await optional.from_async(async () => false);
        assert.ok(falseResult.is_some());
        assert.strictEqual(falseResult.value, false);

        const zeroResult = await optional.from_async(async () => 0);
        assert.ok(zeroResult.is_some());
        assert.strictEqual(zeroResult.value, 0);

        const emptyStringResult = await optional.from_async(async () => "");
        assert.ok(emptyStringResult.is_some());
        assert.strictEqual(emptyStringResult.value, "");
      },
    );
  });
});

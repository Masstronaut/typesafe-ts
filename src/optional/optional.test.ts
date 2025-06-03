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
});

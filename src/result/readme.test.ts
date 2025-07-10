import { test } from "node:test";
import assert from "node:assert";

import { result, type Result } from "./result.ts";

await test("Readme examples work correctly", async (t) => {
  await t.test("Result-based mathematical expression calculation", () => {
    function parseNumber(str: string): Result<number, Error> {
      const num = Number(str);
      return isNaN(num) 
        ? result.error(new Error(`Invalid number: ${str}`))
        : result.ok(num);
    }

    function divide(a: number, b: number): Result<number, Error> {
      return b === 0 
        ? result.error(new Error("Division by zero"))
        : result.ok(a / b);
    }

    function sqrt(n: number): Result<number, Error> {
      return n < 0 
        ? result.error(new Error("Cannot take square root of negative number"))
        : result.ok(Math.sqrt(n));
    }

    function calculateExpression(numeratorStr: string, denominatorStr: string): Result<number, Error> {
      return parseNumber(numeratorStr)
        .and_then(numerator => 
          parseNumber(denominatorStr)
            .and_then(denominator => divide(numerator, denominator))
        )
        .and_then(quotient => sqrt(quotient));
    }

    // Test successful calculation
    const successResult = calculateExpression("16", "4");
    assert.ok(successResult.is_ok());
    if (successResult.is_ok()) {
      assert.strictEqual(successResult.value, 2); // sqrt(16/4) = sqrt(4) = 2
    }

    // Test invalid numerator
    const invalidNumerator = calculateExpression("abc", "4");
    assert.ok(invalidNumerator.is_error());
    if (invalidNumerator.is_error()) {
      assert.strictEqual(invalidNumerator.error.message, "Invalid number: abc");
    }

    // Test invalid denominator
    const invalidDenominator = calculateExpression("16", "xyz");
    assert.ok(invalidDenominator.is_error());
    if (invalidDenominator.is_error()) {
      assert.strictEqual(invalidDenominator.error.message, "Invalid number: xyz");
    }

    // Test division by zero
    const divisionByZero = calculateExpression("16", "0");
    assert.ok(divisionByZero.is_error());
    if (divisionByZero.is_error()) {
      assert.strictEqual(divisionByZero.error.message, "Division by zero");
    }

    // Test negative square root
    const negativeSquareRoot = calculateExpression("4", "-16");
    assert.ok(negativeSquareRoot.is_error());
    if (negativeSquareRoot.is_error()) {
      assert.strictEqual(negativeSquareRoot.error.message, "Cannot take square root of negative number");
    }

    // Test that match method works as shown in readme
    const computation = calculateExpression("16", "4");
    const message = computation.match({
      on_ok: (value) => `Result: ${value}`,
      on_error: (error) => `Calculation failed: ${error.message}`
    });
    
    assert.strictEqual(message, "Result: 2");
  });
});
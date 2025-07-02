/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { test } from "node:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { enforceResultUsage } from "./eslint-rule.ts";

// Configure RuleTester for Node.js test environment
RuleTester.afterAll = () => {};
RuleTester.it = test;
RuleTester.describe = (name: string, fn: () => void) => test(name, fn);

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run("enforce-result-usage", enforceResultUsage, {
  valid: [
    {
      name: "Functions returning Result are valid",
      code: `function parseJSON(text: string): Result<any, Error> {
        return result.from(() => JSON.parse(text));
      }`,
    },
    {
      name: "Using result.from() for throwing calls is valid",
      code: `const parsed = result.from(() => JSON.parse(jsonString));`,
    },
    {
      name: "Using result.from() with block statement is valid",
      code: `const data = result.from(() => {
        const parsed = JSON.parse(input);
        return parsed.value;
      });`,
    },
    {
      name: "Using result.from_async() for async operations is valid",
      code: `const data = await result.from_async(() => fetch('/api/data'));`,
    },
    {
      name: "Using result.error() instead of throw is valid",
      code: `function validateInput(input: string): Result<string, Error> {
        if (!input) {
          return result.error(new Error("Input is required"));
        }
        return result.ok(input);
      }`,
    },
    {
      name: "Test files are allowed to use throw/try-catch by default",
      code: `function testHelper() {
        throw new Error("Test error");
      }`,
      filename: "test.spec.ts",
    },
    {
      name: "Test files allow try-catch by default",
      code: `try {
        doSomething();
      } catch (error) {
        console.log(error);
      }`,
      filename: "src/component.test.ts",
    },
    {
      name: "Exception functions are allowed",
      code: `function allowedFunction() {
        throw new Error("This is allowed");
      }`,
      options: [{ allowExceptions: ["allowedFunction"] }],
    },
    {
      name: "Pattern exceptions are allowed",
      code: `function debugHelper() {
        throw new Error("Debug error");
      }`,
      options: [{ allowExceptions: ["debug*"] }],
    },
    {
      name: "Already wrapped calls are valid",
      code: `const parsed = result.from(() => {
        return JSON.parse(data);
      });`,
    },
    {
      name: "Complex call expressions don't trigger rule",
      code: `const result = obj[methodName]();`,
    },
    {
      name: "Non-throwing member expressions are valid", 
      code: `const max = Math.max(1, 2, 3);`,
    },
    {
      name: "Function expressions don't trigger rule",
      code: `const result = (function(){ return 42; })();`,
    },
    {
      name: "Member expressions not in hardcoded list are not detected (limitation)",
      code: `const trimmed = String.prototype.trim.call("  test  ");`,
    },
    {
      name: "Call expression outside try block should exercise isInsideTryBlock false path", 
      code: `function test() { const data = Math.random(); }`,
    },
    {
      name: "Throwing member APIs not in hardcoded list are missed (known limitation)",
      code: `const regex = new RegExp("invalid[");`, // This throws but won't be caught
    },
    {
      name: "Instance method calls are not detected (limitation)",
      code: `weakMap.set(primitive, value);`, // Instance methods not detected
    },
    {
      name: "Exception functions without wildcards are allowed",
      code: `function exactName() {
        throw new Error("Exact match exception");
      }`,
      options: [{ allowExceptions: ["exactName"] }],
    },
  ],

  invalid: [
    {
      name: "Throw statements should be flagged",
      code: `function validateInput(input: string) {
        if (!input) {
          throw new Error("Input is required");
        }
        return input;
      }`,
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
      output: `function validateInput(input: string) {
        if (!input) {
          return result.error(new Error("Input is required"));
        }
        return input;
      }`,
    },

    {
      name: "Throw with identifier",
      code: `function processData() {
        const error = new Error("Processing failed");
        throw error;
      }`,
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
      output: `function processData() {
        const error = new Error("Processing failed");
        return result.error(error);
      }`,
    },

    {
      name: "Throw with string (should wrap in Error)",
      code: `function handleError() {
        throw "Something went wrong";
      }`,
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
      output: `function handleError() {
        return result.error(new Error("Something went wrong"));
      }`,
    },

    {
      name: "Try/catch blocks should be flagged",
      code: `function parseData(input: string) {
        try {
          const data = JSON.parse(input);
          return data.value;
        } catch (error) {
          console.error(error);
          return null;
        }
      }`,
      errors: [
        {
          messageId: "noTryCatchBlock",
        },
      ],
      output: `function parseData(input: string) {
        const result = result.from(() => {
          const data = JSON.parse(input);
          return data.value;
        });
      }`,
    },

    {
      name: "Try/catch with async operations",
      code: `async function fetchData() {
        try {
          const response = await fetch('/api/data');
          return await response.json();
        } catch (error) {
          return null;
        }
      }`,
      errors: [
        {
          messageId: "noTryCatchBlock",
        },
      ],
      output: `async function fetchData() {
        const result = await result.from_async(async () => {
          const response = await fetch('/api/data');
          return await response.json();
        });
      }`,
    },

    {
      name: "Direct JSON.parse call",
      code: `const data = JSON.parse(jsonString);`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const data = result.from(() => JSON.parse(jsonString));`,
    },

    {
      name: "Direct parseInt call",
      code: `const number = parseInt(userInput);`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const number = result.from(() => parseInt(userInput));`,
    },

    {
      name: "Direct atob call",
      code: `const decoded = atob(encodedString);`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const decoded = result.from(() => atob(encodedString));`,
    },

    {
      name: "Direct fetch call (async)",
      code: `const response = fetch('/api/data');`,
      errors: [
        {
          messageId: "useResultFromAsync",
        },
      ],
      output: `const response = result.from_async(() => fetch('/api/data'));`,
    },

    {
      name: "Direct Proxy.revocable call",
      code: `const proxy = Proxy.revocable({}, {});`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const proxy = result.from(() => Proxy.revocable({}, {}));`,
    },

    {
      name: "Direct Array.from call",
      code: `const arr = Array.from({ length: -1 });`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const arr = result.from(() => Array.from({ length: -1 }));`,
    },

    {
      name: "Direct Object.defineProperty call",
      code: `Object.defineProperty(obj, 'prop', { value: 42 });`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `result.from(() => Object.defineProperty(obj, 'prop', { value: 42 }));`,
    },

    {
      name: "Direct String.fromCharCode call",
      code: `const char = String.fromCharCode(0x110000);`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const char = result.from(() => String.fromCharCode(0x110000));`,
    },

    {
      name: "Direct Symbol.keyFor call",
      code: `const key = Symbol.keyFor(notASymbol);`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const key = result.from(() => Symbol.keyFor(notASymbol));`,
    },

    {
      name: "Direct Reflect.get call",
      code: `const value = Reflect.get(target, 'prop');`,
      errors: [
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const value = result.from(() => Reflect.get(target, 'prop'));`,
    },

    {
      name: "Multiple throwing calls in one statement",
      code: `const result = {
        parsed: JSON.parse(input1),
        number: parseInt(input2)
      };`,
      errors: [
        {
          messageId: "useResultFrom",
        },
        {
          messageId: "useResultFrom",
        },
      ],
      output: `const result = {
        parsed: result.from(() => JSON.parse(input1)),
        number: result.from(() => parseInt(input2))
      };`,
    },

    {
      name: "Nested try/catch (disable auto-fix due to complex overlapping fixes)",
      code: `function complexOperation() {
        try {
          const step1 = JSON.parse(input);
          try {
            const step2 = process(step1);
            return step2;
          } catch (innerError) {
            throw new Error("Inner processing failed");
          }
        } catch (outerError) {
          return null;
        }
      }`,
      options: [{ autoFix: false }],
      errors: [
        {
          messageId: "noTryCatchBlock",
        },
        {
          messageId: "noTryCatchBlock",
        },
        {
          messageId: "noThrowStatement",
        },
      ],
    },

    {
      name: "Method with throw",
      code: `class DataProcessor {
        process(input: string) {
          if (!input) {
            throw new Error("Input required");
          }
          return input.toUpperCase();
        }
      }`,
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
      output: `class DataProcessor {
        process(input: string) {
          if (!input) {
            return result.error(new Error("Input required"));
          }
          return input.toUpperCase();
        }
      }`,
    },

    {
      name: "Arrow function with throw",
      code: `const validator = (input: string) => {
        if (!input) throw new Error("Invalid input");
        return input;
      };`,
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
      output: `const validator = (input: string) => {
        if (!input) return result.error(new Error("Invalid input"));
        return input;
      };`,
    },

    {
      name: "Test file with allowTestFiles: false",
      code: `function testHelper() {
        throw new Error("Test error");
      }`,
      filename: "test.spec.ts",
      options: [{ allowTestFiles: false }],
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
      output: `function testHelper() {
        return result.error(new Error("Test error"));
      }`,
    },

    {
      name: "Throw with non-Error object should wrap in Error",
      code: `function handleError() {
        throw { message: "Custom error object" };
      }`,
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
      output: `function handleError() {
        return result.error(new Error({ message: "Custom error object" }));
      }`,
    },

    {
      name: "Throw with number should wrap in Error",
      code: `function handleError() {
        throw 404;
      }`,
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
      output: `function handleError() {
        return result.error(new Error(404));
      }`,
    },
  ],
});

// Test with disabled auto-fix
ruleTester.run("enforce-result-usage (no auto-fix)", enforceResultUsage, {
  valid: [],
  invalid: [
    {
      name: "Throw statement with autoFix disabled",
      code: `throw new Error("Test");`,
      options: [{ autoFix: false }],
      errors: [
        {
          messageId: "noThrowStatement",
        },
      ],
    },
    {
      name: "Try/catch block with autoFix disabled",
      code: `try { doSomething(); } catch (e) { console.log(e); }`,
      options: [{ autoFix: false }],
      errors: [
        {
          messageId: "noTryCatchBlock",
        },
      ],
    },
  ],
});
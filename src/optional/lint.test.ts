/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { test, describe } from "node:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { enforceOptionalUsage } from "./lint.ts";

// Configure RuleTester for Node.js test environment as recommended
// https://typescript-eslint.io/packages/rule-tester/#nodejs-nodetest

RuleTester.afterAll = () => { };
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.it = test;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

ruleTester.run("enforce-optional-usage", enforceOptionalUsage, {
  valid: [
    {
      name: "void functions are valid",
      code: `function doSomething(): void {
        console.log("Doing something");
      }`,
    },
    {
      name: "void functions with return statements are valid",
      code: `function doSomething(): void {
        console.log("Doing something");
        return;
      }`,
    },
    {
      name: "void functions with no explicit return type are valid",
      code: `function doSomething() {
        console.log("Doing something");
      }`,
    },
    {
      name: "void functions with a return statement and no explicit return type are valid",
      code: `function doSomething() {
        console.log("Doing something");
        return;
      }`,
    },
    {
      name: "Functions returning Optional are valid",
      code: `function findUser(id: string): Optional<User> {
        return optional.some(user);
      }`,
    },
    {
      name: "Arrow functions returning Optional are valid",
      code: `const getItem = (): Optional<string> => {
        return optional.none();
      }`,
    },
    {
      name: "Arrow functions with implicit non-nullable returns are valid",
      code: `const getValue = () => "hello";
      const getNumber = () => 42;
      const getBoolean = () => true;`,
    },
    {
      name: "Arrow functions with implicit Optional returns are valid",
      code: `const getOptional = () => optional.some("value");
      const getNone = () => optional.none();`,
    },
    {
      name: "Methods returning Optional are valid",
      code: `class UserService {
        findById(id: string): Optional<User> {
          return optional.some(user);
        }
      }`,
    },
    {
      name: "Using optional.from() for nullable calls is valid",
      code: `const element = optional.from(() => document.getElementById('test'));`,
    },
    {
      name: "Using optional.from() for array.find is valid",
      code: `const item = optional.from(() => array.find(x => x.id === id));`,
    },
    {
      name: "Arrow functions returning null inside optional.from() are valid",
      code: `const result = optional.from(() => condition ? "value" : null);`,
    },
    {
      name: "Arrow functions returning undefined inside optional.from() are valid",
      code: `const result = optional.from(() => condition ? 42 : undefined);`,
    },
    {
      name: "Complex arrow functions with nullable returns inside optional.from() are valid",
      code: `const user = optional.from(() => {
        const found = users.find(u => u.id === targetId);
        return found ? found : null;
      });`,
    },
    {
      name: "Nested arrow functions with nullable returns inside optional.from() are valid",
      code: `const data = optional.from(() => 
        items.map(item => item.value).find(val => val > threshold) || null
      );`,
    },
    {
      name: "Arrow functions returning null inside optional.from_async() are valid",
      code: `const result = await optional.from_async(async () => {
        const response = await fetch('/api/data');
        return response.ok ? await response.json() : null;
      });`,
    },
    {
      name: "Mock functions with nullable returns inside optional.from_async() context are valid",
      code: `const result = await optional.from_async(async () => {
        const mockFetch = async (url: string) => {
          if (url === "/api/success") {
            return { ok: true, json: async () => ({ data: "success" }) };
          }
          return { ok: false, json: async () => null };
        };
        const response = await mockFetch("/api/test");
        return response.ok ? await response.json() : null;
      });`,
    },
    {
      name: "Result.match() calls with non-nullable returns should not trigger the rule",
      code: `const message = someResult.match({
        on_ok: (value) => \`Success: \${value}\`,
        on_error: (error) => \`Error: \${error.message}\`
      });`,
    },
    {
      name: "Exception functions are allowed",
      code: `function allowedFunction(): string | null {
        return null;
      }`,
      options: [{ allowExceptions: ["allowedFunction"] }],
    },
    {
      name: "Pattern exceptions are allowed",
      code: `function testHelper(): string | null {
        return null;
      }`,
      options: [{ allowExceptions: ["test*"] }],
    },
    {
      name: "Non-nullable unions are fine",
      code: `function getValue(): string | number {
        return "test";
      }`,
    },
    {
      name: "Variables with Optional type are valid",
      code: `const user: Optional<User> = optional.some(userData);`,
    },
    {
      name: "Exception functions without wildcards are allowed",
      code: `function exactName(): string | null {
        return null;
      }`,
      options: [{ allowExceptions: ["exactName"] }],
    },
    {
      name: "Logical expressions that don't return nullable values are valid",
      code: `function test() {
        return condition && "value";
      }`,
    },
    {
      name: "Logical expressions with only non-nullable values are valid",
      code: `function test() {
        return getValue() || "default";
      }`,
    },
  ],

  invalid: [
    {
      name: "Function returning nullable type",
      code: `function findUser(id: string): User | null {
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "User" },
        },
      ],
      // No auto-fix for function return types
    },
    {
      name: "Function returning null without a return type annotation",
      code: `function returnNull() { return null; }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
    },
    {
      name: "Function returning undefined without a return type annotation",
      code: `function returnUndefined() { return undefined; }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
    },
    {
      name: "Function returning nullable value without a return type annotation",
      code: `function returnNullable() { 
        return Math.random() > 0.5 ? null : "value";
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
    },
    {
      name: "Function returning possibly undefined value without a return type annotation",
      code: `function returnNullable() { 
        return Math.random() > 0.5 ? undefined : { foo: "bar" };
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
        },
      ],
    },
    {
      name: "Arrow function returning nullable type",
      code: `const getItem = (): string | undefined => {
        return undefined;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Arrow function with implicit return of null",
      code: `const getNull = () => null;`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Arrow function with implicit return of undefined",
      code: `const getUndefined = () => undefined;`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Arrow function with implicit conditional return containing null",
      code: `const getConditional = () => condition ? "value" : null;`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Arrow function with implicit logical expression containing null",
      code: `const getLogical = () => value || null;`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Function returning union with null and undefined",
      code: `function getValue(): number | null | undefined {
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "number" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Method returning nullable type",
      code: `class UserService {
        findById(id: string): User | null {
          return null;
        }
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "User" },
        },
      ],
      // No auto-fix for method return types
    },

    {
      name: "Variable declaration with nullable union",
      code: `const user: User | null = null;`,
      errors: [
        {
          messageId: "noNullableUnion",
          data: { type: "User" },
        },
      ],
      // No auto-fix for variable declarations
    },

    {
      name: "Variable with undefined union",
      code: `let value: string | undefined;`,
      errors: [
        {
          messageId: "noNullableUnion",
          data: { type: "string" },
        },
      ],
      // No auto-fix for variable declarations
    },

    {
      name: "Direct call to getElementById (common nullable API)",
      code: `const element = document.getElementById('test');`,
      errors: [
        {
          messageId: "useOptionalFromNullable",
        },
      ],
      output: `const element = optional.from_nullable(document.getElementById('test'));`,
    },

    {
      name: "Direct call to querySelector",
      code: `const element = document.querySelector('.class');`,
      errors: [
        {
          messageId: "useOptionalFromNullable",
        },
      ],
      output: `const element = optional.from_nullable(document.querySelector('.class'));`,
    },

    {
      name: "Direct call to array.find",
      code: `const item = array.find(x => x.id === 'test');`,
      errors: [
        {
          messageId: "useOptionalFromNullable",
        },
      ],
      output: `const item = optional.from_nullable(array.find(x => x.id === 'test'));`,
    },

    {
      name: "Direct call to array.pop",
      code: `const lastItem = items.pop();`,
      errors: [
        {
          messageId: "useOptionalFromNullable",
        },
      ],
      output: `const lastItem = optional.from_nullable(items.pop());`,
    },

    {
      name: "Direct call to string.match",
      code: `const matches = text.match(/pattern/);`,
      errors: [
        {
          messageId: "useOptionalFromNullable",
        },
      ],
      output: `const matches = optional.from_nullable(text.match(/pattern/));`,
    },

    {
      name: "Result.match() calls with nullable returns should trigger the rule",
      code: `const result = someResult.match({
        on_ok: (value) => value,
        on_error: (error) => null
      });`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Primitive return types - number | null",
      code: `function getNumber(): number | null {
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "number" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Primitive return types - string | undefined",
      code: `function getString(): string | undefined {
        return undefined;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Primitive return types - boolean | null",
      code: `function getBoolean(): boolean | null {
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "boolean" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Complex type union",
      code: `function getComplexType(): SomeInterface | null | undefined {
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "SomeInterface" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Multi-type union falls back to T",
      code: `function getMultiType(): (string | number) | null {
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Standalone null return type",
      code: `function returnNull(): null {
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Standalone undefined return type",
      code: `function returnUndefined(): undefined {
        return undefined;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Anonymous function expression",
      code: `const handler = function(): string | null {
        return null;
      };`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
      // No auto-fix for function return types
    },

    {
      name: "Multiple nullable APIs in one statement",
      code: `const elements = [
        document.getElementById('first'),
        document.querySelector('.second')
      ];`,
      errors: [
        {
          messageId: "useOptionalFromNullable",
        },
        {
          messageId: "useOptionalFromNullable",
        },
      ],
      output: `const elements = [
        optional.from_nullable(document.getElementById('first')),
        optional.from_nullable(document.querySelector('.second'))
      ];`,
    },

    {
      name: "Direct function call to nullable API",
      code: `const result = array.find(item => item.id === 'test');`,
      errors: [
        {
          messageId: "useOptionalFromNullable",
        },
      ],
      output: `const result = optional.from_nullable(array.find(item => item.id === 'test'));`,
    },

    {
      name: "Logical AND expression returning nullable value",
      code: `function test() {
        return condition && null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
    },

    {
      name: "Logical OR expression with nullable fallback",
      code: `function test() {
        return getValue() || null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
    },

    {
      name: "Complex logical expression with undefined",
      code: `function test() {
        return (x && y) || undefined;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
    },

    {
      name: "Logical expression type inference from string literal with null",
      code: `function test() {
        return condition ? "value" : null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
    },

    {
      name: "Logical OR expression with string literal and null",
      code: `function test() {
        return "default" || null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
    },

    {
      name: "Nested logical expressions with null",
      code: `function test() {
        return (condition1 || condition2) && null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
    },

    {
      name: "Function with nested function should only analyze outer returns",
      code: `function outer() {
        function inner() {
          return "inner value";
        }
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
    },

    {
      name: "Type inference from number literal with null",
      code: `function test() {
        return Math.random() > 0.5 ? 42 : null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "number" },
        },
      ],
    },

    {
      name: "Type inference from boolean literal with undefined",
      code: `function test() {
        return condition ? true : undefined;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "boolean" },
        },
      ],
    },

    {
      name: "Variable with standalone undefined type",
      code: `let value: undefined;`,
      errors: [
        {
          messageId: "noNullableUnion",
          data: { type: "T" },
        },
      ],
    },

    {
      name: "Conditional with nullable consequent only",
      code: `function test() {
        return condition ? null : "value";
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
    },

    {
      name: "Union with undefined in type annotation",
      code: `function getValue(): string | undefined {
        return undefined;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
    },

    {
      name: "Complex type reference that falls back to T",
      code: `function getComplexType(): (string & object) | null {
        return null;
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "T" },
        },
      ],
    },

    {
      name: "Mixed return patterns (void + value) should be flagged",
      code: `function mixedReturns(condition: boolean) {
        if (condition) {
          return "value";
        }
        return; // naked return mixed with value return
      }`,
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "string" },
        },
      ],
    },
  ],
});

// Test with disabled auto-fix
ruleTester.run("enforce-optional-usage (no auto-fix)", enforceOptionalUsage, {
  valid: [],
  invalid: [
    {
      name: "Function returning nullable type with auto-fix disabled",
      code: `function findUser(): User | null { return null; }`,
      options: [{ autoFix: false }],
      errors: [
        {
          messageId: "noNullableReturn",
          data: { type: "User" },
        },
      ],
      // No output when autoFix is disabled
    },
  ],
});

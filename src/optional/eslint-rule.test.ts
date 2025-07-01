/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { test } from "node:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { enforceOptionalUsage } from "./eslint-rule.ts";

// Configure RuleTester for Node.js test environment
RuleTester.afterAll = () => { };
RuleTester.it = test;
RuleTester.describe = (name: string, fn: () => void) => test(name, fn);

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
          messageId: "useOptionalFrom",
        },
      ],
      output: `const element = optional.from(() => document.getElementById('test'));`,
    },

    {
      name: "Direct call to querySelector",
      code: `const element = document.querySelector('.class');`,
      errors: [
        {
          messageId: "useOptionalFrom",
        },
      ],
      output: `const element = optional.from(() => document.querySelector('.class'));`,
    },

    {
      name: "Direct call to array.find",
      code: `const item = array.find(x => x.id === 'test');`,
      errors: [
        {
          messageId: "useOptionalFrom",
        },
      ],
      output: `const item = optional.from(() => array.find(x => x.id === 'test'));`,
    },

    {
      name: "Direct call to array.pop",
      code: `const lastItem = items.pop();`,
      errors: [
        {
          messageId: "useOptionalFrom",
        },
      ],
      output: `const lastItem = optional.from(() => items.pop());`,
    },

    {
      name: "Direct call to string.match",
      code: `const matches = text.match(/pattern/);`,
      errors: [
        {
          messageId: "useOptionalFrom",
        },
      ],
      output: `const matches = optional.from(() => text.match(/pattern/));`,
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
          messageId: "useOptionalFrom",
        },
        {
          messageId: "useOptionalFrom",
        },
      ],
      output: `const elements = [
        optional.from(() => document.getElementById('first')),
        optional.from(() => document.querySelector('.second'))
      ];`,
    },

    {
      name: "Direct function call to nullable API",
      code: `const result = find(item => item.id === 'test');`,
      errors: [
        {
          messageId: "useOptionalFrom",
        },
      ],
      output: `const result = optional.from(() => find(item => item.id === 'test'));`,
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

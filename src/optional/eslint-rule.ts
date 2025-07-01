/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

type Options = [
  {
    allowExceptions?: string[];
    autoFix?: boolean;
  },
];

type MessageIds = "noNullableReturn" | "useOptionalFrom" | "noNullableUnion";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/your-org/ts-utils/blob/main/docs/rules/${name}.md`,
);

/**
 * ESLint rule that enforces Optional usage patterns instead of nullable returns and direct nullable function calls.
 *
 * This rule:
 * - Disallows functions returning `T | null` or `T | undefined`
 * - Suggests using `optional.from()` when calling functions that return nullable types
 * - Provides auto-fix suggestions where possible
 */
export const enforceOptionalUsage = createRule<Options, MessageIds>({
  name: "enforce-optional-usage",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce Optional monad usage instead of nullable returns and direct nullable calls",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          allowExceptions: {
            type: "array",
            items: { type: "string" },
            description: "Function names or patterns to exclude from the rule",
          },
          autoFix: {
            type: "boolean",
            description: "Enable automatic fixes",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noNullableReturn:
        "Functions should return Optional<{{type}}> instead of {{type}} | null | undefined. Change the return type and update return statements to use optional.some(value) or optional.none().",
      useOptionalFrom:
        "Calls to functions returning nullable types should be wrapped with optional.from(). This ensures type-safe handling of non-values and avoids propagating them through the code.",
      noNullableUnion:
        "Union types with null/undefined should use Optional<{{type}}> instead of {{type}} | null | undefined. Change the type annotation and initialize with optional.some(value) or optional.none().",
    },
  },
  defaultOptions: [{ allowExceptions: [], autoFix: true }],
  create(context, [options]) {
    const { allowExceptions = [], autoFix = true } = options;

    function isNullableUnion(node: TSESTree.TSTypeAnnotation): boolean {
      // Check for standalone null or undefined types
      if (
        node.typeAnnotation.type === "TSNullKeyword" ||
        node.typeAnnotation.type === "TSUndefinedKeyword"
      ) {
        return true;
      }

      // Check for union types containing null or undefined
      if (node.typeAnnotation.type !== "TSUnionType") return false;

      const union = node.typeAnnotation;
      return union.types.some(
        (type) =>
          type.type === "TSNullKeyword" || type.type === "TSUndefinedKeyword",
      );
    }

    function getNonNullableType(
      typeAnnotation: TSESTree.TSTypeAnnotation,
    ): string {
      // Handle standalone null/undefined types
      if (typeAnnotation.typeAnnotation.type !== "TSUnionType") {
        return "T"; // Fallback for other types
      }

      const union = typeAnnotation.typeAnnotation;
      const nonNullTypes = union.types.filter(
        (type) =>
          type.type !== "TSNullKeyword" && type.type !== "TSUndefinedKeyword",
      );

      if (nonNullTypes.length === 1) {
        const type = nonNullTypes[0];
        if (
          type &&
          type.type === "TSTypeReference" &&
          "typeName" in type &&
          type.typeName &&
          type.typeName.type === "Identifier"
        ) {
          return type.typeName.name;
        }
        if (type && type.type === "TSStringKeyword") return "string";
        if (type && type.type === "TSNumberKeyword") return "number";
        if (type && type.type === "TSBooleanKeyword") return "boolean";
      }
      return "T";
    }

    function isExceptionFunction(name: string): boolean {
      return allowExceptions.some((exception) => {
        if (exception.includes("*")) {
          const pattern = new RegExp(exception.replace(/\*/g, ".*"));
          return pattern.test(name);
        }
        return exception === name;
      });
    }

    return {
      // Check function return types (includes methods via FunctionExpression)
      "FunctionDeclaration, FunctionExpression, ArrowFunctionExpression"(
        node:
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
          | TSESTree.ArrowFunctionExpression,
      ) {
        if (!node.returnType || !isNullableUnion(node.returnType)) return;

        // Skip if this is a method function (handled by parent MethodDefinition selector)
        if (
          node.type === "FunctionExpression" &&
          node.parent?.type === "MethodDefinition"
        ) {
          return;
        }

        const functionName =
          (node.type === "FunctionDeclaration" && node.id?.name) ||
          (node.parent?.type === "VariableDeclarator" &&
            node.parent.id.type === "Identifier" &&
            node.parent.id.name) ||
          "anonymous";

        if (isExceptionFunction(functionName)) return;

        const baseType = getNonNullableType(node.returnType);

        context.report({
          node: node.returnType,
          messageId: "noNullableReturn" as const,
          data: { type: baseType },
          // Disable auto-fix for function return types as it requires
          // updating all return statements within the function body
          fix: null,
        });
      },

      // Check method return types
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (node.value.type !== "FunctionExpression" || !node.value.returnType)
          return;
        if (!isNullableUnion(node.value.returnType)) return;

        const methodName =
          node.key.type === "Identifier" ? node.key.name : "method";
        if (isExceptionFunction(methodName)) return;

        const baseType = getNonNullableType(node.value.returnType);

        context.report({
          node: node.value.returnType,
          messageId: "noNullableReturn" as const,
          data: { type: baseType },
          // Disable auto-fix for method return types as it requires
          // updating all return statements within the method body
          fix: null,
        });
      },

      // Check variable declarations with nullable union types
      "VariableDeclarator[id.typeAnnotation]"(
        node: TSESTree.VariableDeclarator,
      ) {
        if (node.id.type !== "Identifier" || !node.id.typeAnnotation) return;
        if (!isNullableUnion(node.id.typeAnnotation)) return;

        const baseType = getNonNullableType(node.id.typeAnnotation);

        context.report({
          node: node.id.typeAnnotation,
          messageId: "noNullableUnion" as const,
          data: { type: baseType },
          // Disable auto-fix for variable declarations as it requires
          // updating the variable initialization value
          fix: null,
        });
      },

      // Check calls to functions that might return null/undefined
      CallExpression(node: TSESTree.CallExpression) {
        // Skip if this is already an optional.from() or optional.from_async() call
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "optional" &&
          node.callee.property.type === "Identifier" &&
          (node.callee.property.name === "from" ||
            node.callee.property.name === "from_async")
        ) {
          return;
        }

        // Skip if this call is inside an optional.from() arrow function
        let parent: TSESTree.Node = node.parent;
        while (parent) {
          if (
            parent.type === "ArrowFunctionExpression" &&
            parent.parent?.type === "CallExpression" &&
            parent.parent.callee.type === "MemberExpression" &&
            parent.parent.callee.object.type === "Identifier" &&
            parent.parent.callee.object.name === "optional" &&
            parent.parent.callee.property.type === "Identifier" &&
            (parent.parent.callee.property.name === "from" ||
              parent.parent.callee.property.name === "from_async")
          ) {
            return;
          }
          if (!parent.parent) break;
          parent = parent.parent;
        }

        // Check for common nullable-returning functions
        let functionName = "";
        if (node.callee.type === "Identifier") {
          functionName = node.callee.name;
        } else if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier"
        ) {
          functionName = node.callee.property.name;
        }

        // Common DOM/JS APIs that return null
        const nullableAPIs = [
          "getElementById",
          "querySelector",
          "getElementsByClassName",
          "getElementsByTagName",
          "find",
          "pop",
          "shift",
          "match",
        ];

        if (nullableAPIs.includes(functionName)) {
          context.report({
            node,
            messageId: "useOptionalFrom" as const,
            fix: autoFix
              ? (fixer) => {
                const sourceCode = context.sourceCode;
                const callText = sourceCode.getText(node);
                return fixer.replaceText(
                  node,
                  `optional.from(() => ${callText})`,
                );
              }
              : null,
          });
        }
      },
    };
  },
});

export default enforceOptionalUsage;

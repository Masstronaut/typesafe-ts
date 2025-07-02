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

    function isInsideOptionalFrom(node: TSESTree.Node): boolean {
      if (undefined === node.parent) {
        return false;
      }
      // Check if this function is inside an optional.from() or optional.from_async() call
      let parent: TSESTree.Node = node.parent;
      let foundOptionalFromCall = false;

      while (parent) {
        if (
          parent.type === "CallExpression" &&
          parent.callee.type === "MemberExpression" &&
          parent.callee.object.type === "Identifier" &&
          parent.callee.object.name === "optional" &&
          parent.callee.property.type === "Identifier" &&
          (parent.callee.property.name === "from" ||
            parent.callee.property.name === "from_async")
        ) {
          foundOptionalFromCall = true;
        }

        // If we found an optional.from call and we're still within its arguments,
        // then this function is inside the optional.from context
        if (foundOptionalFromCall) {
          return true;
        }
        if (undefined === parent.parent) {
          break;
        }
        parent = parent.parent;
      }
      return false;
    }

    // Helper to collect return statements using ESLint's visitor pattern
    function collectReturnStatements(
      functionNode:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ): TSESTree.ReturnStatement[] {
      const returnStatements: TSESTree.ReturnStatement[] = [];

      // Use context.sourceCode.visitorKeys for type-safe traversal
      function traverse(node: TSESTree.Node): void {
        if (node.type === "ReturnStatement") {
          returnStatements.push(node);
          return; // Don't traverse into the return expression
        }

        // Don't traverse into nested functions
        if (
          node !== functionNode &&
          (node.type === "FunctionDeclaration" ||
            node.type === "FunctionExpression" ||
            node.type === "ArrowFunctionExpression")
        ) {
          return;
        }

        // Traverse child nodes using ESLint's visitor keys
        const visitorKeys = context.sourceCode.visitorKeys[node.type] || [];
        for (const key of visitorKeys) {
          const child = (node as unknown as Record<string, unknown>)[key];
          if (Array.isArray(child)) {
            child.forEach((item) => {
              if (item && typeof item === "object" && "type" in item) {
                traverse(item as TSESTree.Node);
              }
            });
          } else if (child && typeof child === "object" && "type" in child) {
            traverse(child as TSESTree.Node);
          }
        }
      }

      if (functionNode.body) {
        traverse(functionNode.body);
      }

      return returnStatements;
    }

    function hasNullableReturnStatements(
      functionNode:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ): boolean {
      // Special handling for arrow functions with implicit returns
      if (
        functionNode.type === "ArrowFunctionExpression" &&
        functionNode.body &&
        functionNode.body.type !== "BlockStatement"
      ) {
        // Arrow function with implicit return - check the body directly
        return containsNullableValue(functionNode.body as TSESTree.Expression);
      }

      const returnStatements = collectReturnStatements(functionNode);

      // Analyze return patterns to distinguish void functions from value-returning functions
      if (returnStatements.length === 0) {
        return false; // No returns, effectively void
      }

      const nakedReturns = returnStatements.filter((stmt) => !stmt.argument);
      const valueReturns = returnStatements.filter((stmt) => stmt.argument);

      // If ALL returns are naked returns, treat as void function
      if (nakedReturns.length > 0 && valueReturns.length === 0) {
        return false; // Pure void function pattern
      }

      // For functions with value returns, check for nullable values
      const hasNullableValueReturns = valueReturns.some((returnStmt) => {
        return containsNullableValue(returnStmt.argument);
      });

      // Flag if there are nullable value returns OR mixed return patterns
      return (
        hasNullableValueReturns ||
        (nakedReturns.length > 0 && valueReturns.length > 0)
      );
    }

    function containsNullableValue(
      node: TSESTree.Expression | null | undefined,
    ): boolean {
      if (!node) return false;

      // Check for literal null
      if (node.type === "Literal" && node.value === null) {
        return true;
      }

      // Check for undefined identifier
      if (node.type === "Identifier" && node.name === "undefined") {
        return true;
      }

      // Check for conditional expressions (ternary operator)
      if (node.type === "ConditionalExpression") {
        return (
          containsNullableValue(node.consequent) ||
          containsNullableValue(node.alternate)
        );
      }

      // Check for logical expressions (&&, ||)
      if (node.type === "LogicalExpression") {
        return (
          containsNullableValue(node.left) || containsNullableValue(node.right)
        );
      }

      return false;
    }

    function inferNonNullableTypeFromReturns(
      functionNode:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ): string {
      // Special handling for arrow functions with implicit returns
      if (
        functionNode.type === "ArrowFunctionExpression" &&
        functionNode.body &&
        functionNode.body.type !== "BlockStatement"
      ) {
        // Arrow function with implicit return - analyze the body directly
        const nonNullableType = extractNonNullableType(
          functionNode.body as TSESTree.Expression,
        );
        if (nonNullableType !== "T") {
          return nonNullableType;
        }
      }

      const returnStatements = collectReturnStatements(functionNode);

      // Try to infer the non-nullable type from return statements
      for (const returnStmt of returnStatements) {
        if (!returnStmt.argument) continue;

        const nonNullableType = extractNonNullableType(returnStmt.argument);
        if (nonNullableType !== "T") {
          return nonNullableType;
        }
      }

      return "T";
    }

    function extractNonNullableType(
      node: TSESTree.Expression | null | undefined,
    ): string {
      if (!node) return "T";

      // Skip null and undefined
      if (
        (node.type === "Literal" && node.value === null) ||
        (node.type === "Identifier" && node.name === "undefined")
      ) {
        return "T";
      }

      // For literal strings
      if (node.type === "Literal" && typeof node.value === "string") {
        return "string";
      }

      // For literal numbers
      if (node.type === "Literal" && typeof node.value === "number") {
        return "number";
      }

      // For literal booleans
      if (node.type === "Literal" && typeof node.value === "boolean") {
        return "boolean";
      }

      // For conditional expressions, try both branches
      if (node.type === "ConditionalExpression") {
        const consequentType = extractNonNullableType(node.consequent);
        if (consequentType !== "T") return consequentType;

        const alternateType = extractNonNullableType(node.alternate);
        if (alternateType !== "T") return alternateType;
      }

      // For logical expressions
      if (node.type === "LogicalExpression") {
        const leftType = extractNonNullableType(node.left);
        if (leftType !== "T") return leftType;

        const rightType = extractNonNullableType(node.right);
        if (rightType !== "T") return rightType;
      }

      return "T";
    }

    // Helper function to detect String.prototype.match calls
    function isStringMatchCall(node: TSESTree.CallExpression): boolean {
      if (node.callee.type !== "MemberExpression") return false;

      // String.match() typically takes a RegExp or string as first argument
      // This is a heuristic to identify string match vs other match methods
      if (node.arguments.length === 0) return false;

      const firstArg = node.arguments[0];
      if (!firstArg) return false;

      return (
        // RegExp literal: /pattern/
        (firstArg.type === "Literal" &&
          "regex" in firstArg &&
          firstArg.regex !== undefined) ||
        // String literal: "pattern"
        (firstArg.type === "Literal" &&
          "value" in firstArg &&
          typeof firstArg.value === "string") ||
        // Template literal: `pattern`
        firstArg.type === "TemplateLiteral" ||
        // Variable that might be a RegExp/string (less certain but common)
        firstArg.type === "Identifier"
      );
    }

    return {
      // Check function return types (includes methods via FunctionExpression)
      "FunctionDeclaration, FunctionExpression, ArrowFunctionExpression"(
        node:
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
          | TSESTree.ArrowFunctionExpression,
      ) {
        // Skip if this function is inside an optional.from() or optional.from_async() call
        if (isInsideOptionalFrom(node)) {
          return;
        }

        // Check explicit return type annotations
        const hasExplicitNullableReturn =
          node.returnType && isNullableUnion(node.returnType);

        // Check if function returns null/undefined without explicit annotation
        const hasImplicitNullableReturn =
          !node.returnType && hasNullableReturnStatements(node);

        if (!hasExplicitNullableReturn && !hasImplicitNullableReturn) return;

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

        const baseType = node.returnType
          ? getNonNullableType(node.returnType)
          : inferNonNullableTypeFromReturns(node);

        context.report({
          node: node.returnType || node.id || node,
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
        ];

        // Special handling for 'match' - only flag String.prototype.match, not other match methods
        const isMatchCall = functionName === "match";
        const isStringMatch = isMatchCall && isStringMatchCall(node);

        if (nullableAPIs.includes(functionName) || isStringMatch) {
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

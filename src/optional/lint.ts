/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import {
    AST_NODE_TYPES,
    ESLintUtils,
    TSESTree,
} from "@typescript-eslint/utils";

type Options = [
    {
        allowExceptions?: string[];
        autoFix?: boolean;
    },
];

type MessageIds =
    | "noNullableReturn"
    | "useOptionalFromNullable"
    | "noNullableUnion";

const createRule = ESLintUtils.RuleCreator(
    () =>
        `https://github.com/masstronaut/typesafe-ts/blob/main/src/optional/readme.md`
);

const nullableAPIs = new Set([
    "getElementById",
    "querySelector",
    "getElementsByClassName",
    "getElementsByTagName",
    "find",
    "pop",
    "shift",
]);
const stringLikeIdentifierPattern =
    /^(text|str|string|content|message|input|output|name|value|data|source|target)s?$/i;

function isOptionalWrapperCall(node: TSESTree.CallExpression): boolean {
    return (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        node.callee.object.name === "optional" &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        (node.callee.property.name === "from" ||
            node.callee.property.name === "from_async" ||
            node.callee.property.name === "from_nullable")
    );
}

/**
 * ESLint rule that enforces Optional usage patterns instead of nullable returns and direct nullable function calls.
 *
 * This rule:
 * - Disallows functions returning `T | null` or `T | undefined`
 * - Suggests using `optional.from_nullable()` for direct function calls that return nullable types
 * - Suggests using `optional.from()` for complex expressions that evaluate to nullable values
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
                        description:
                            "Function names or patterns to exclude from the rule",
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
            useOptionalFromNullable:
                "Function calls and other expressions that evaluate to nullable values should be wrapped in optional.from_nullable().",
            noNullableUnion:
                "Union types with null/undefined should use Optional<{{type}}> instead of {{type}} | null | undefined. Change the type annotation and initialize with optional.some(value) or optional.none().",
        },
    },
    defaultOptions: [{ allowExceptions: [], autoFix: true }],
    create(context, [options]) {
        const { allowExceptions = [], autoFix = true } = options;
        const exactExceptions =
            allowExceptions.length === 0
                ? undefined
                : new Set(
                      allowExceptions.filter(
                          (exception) => !exception.includes("*")
                      )
                  );
        const wildcardExceptions =
            allowExceptions.length === 0
                ? undefined
                : allowExceptions
                      .filter((exception) => exception.includes("*"))
                      .map(
                          (exception) =>
                              new RegExp(
                                  `^${exception
                                      .split("*")
                                      .map((part) =>
                                          part.replace(
                                              /[.*+?^${}()|[\]\\]/g,
                                              "\\$&"
                                          )
                                      )
                                      .join(".*")}$`
                              )
                      );
        let optionalWrapperDepth = 0;
        const functionStack: Array<
            | TSESTree.FunctionDeclaration
            | TSESTree.FunctionExpression
            | TSESTree.ArrowFunctionExpression
        > = [];
        const returnStatementsCache = new WeakMap<
            | TSESTree.FunctionDeclaration
            | TSESTree.FunctionExpression
            | TSESTree.ArrowFunctionExpression,
            TSESTree.ReturnStatement[]
        >();

        function isNullableUnion(node: TSESTree.TSTypeAnnotation): boolean {
            // Check for standalone null or undefined types
            if (
                node.typeAnnotation.type === AST_NODE_TYPES.TSNullKeyword ||
                node.typeAnnotation.type === AST_NODE_TYPES.TSUndefinedKeyword
            ) {
                return true;
            }

            // Check for union types containing null or undefined
            if (node.typeAnnotation.type !== AST_NODE_TYPES.TSUnionType)
                return false;

            const union = node.typeAnnotation;
            for (const type of union.types) {
                if (
                    type.type === AST_NODE_TYPES.TSNullKeyword ||
                    type.type === AST_NODE_TYPES.TSUndefinedKeyword
                ) {
                    return true;
                }
            }
            return false;
        }

        function getNonNullableType(
            typeAnnotation: TSESTree.TSTypeAnnotation
        ): string {
            // Handle standalone null/undefined types
            if (
                typeAnnotation.typeAnnotation.type !==
                AST_NODE_TYPES.TSUnionType
            ) {
                return "T"; // Fallback for other types
            }

            const union = typeAnnotation.typeAnnotation;
            let nonNullTypeIndex = -1;
            let nonNullTypeCount = 0;

            for (let index = 0; index < union.types.length; index += 1) {
                const type = union.types[index];
                if (
                    type &&
                    type.type !== AST_NODE_TYPES.TSNullKeyword &&
                    type.type !== AST_NODE_TYPES.TSUndefinedKeyword
                ) {
                    nonNullTypeIndex = index;
                    nonNullTypeCount += 1;
                }
            }

            if (nonNullTypeCount === 1) {
                const type = union.types[nonNullTypeIndex];
                if (
                    type &&
                    type.type === AST_NODE_TYPES.TSTypeReference &&
                    "typeName" in type &&
                    type.typeName &&
                    type.typeName.type === AST_NODE_TYPES.Identifier
                ) {
                    return type.typeName.name;
                }
                if (type && type.type === AST_NODE_TYPES.TSStringKeyword)
                    return "string";
                if (type && type.type === AST_NODE_TYPES.TSNumberKeyword)
                    return "number";
                if (type && type.type === AST_NODE_TYPES.TSBooleanKeyword)
                    return "boolean";
            }
            return "T";
        }

        function isExceptionFunction(name: string): boolean {
            if (allowExceptions.length === 0) return false;

            return (
                exactExceptions?.has(name) === true ||
                wildcardExceptions?.some((exception) =>
                    exception.test(name)
                ) === true
            );
        }

        function collectReturnStatements(
            functionNode:
                | TSESTree.FunctionDeclaration
                | TSESTree.FunctionExpression
                | TSESTree.ArrowFunctionExpression
        ): TSESTree.ReturnStatement[] {
            return returnStatementsCache.get(functionNode) ?? [];
        }

        function hasNullableReturnStatements(
            functionNode:
                | TSESTree.FunctionDeclaration
                | TSESTree.FunctionExpression
                | TSESTree.ArrowFunctionExpression
        ): boolean {
            // Special handling for arrow functions with implicit returns
            if (
                functionNode.type === AST_NODE_TYPES.ArrowFunctionExpression &&
                functionNode.body &&
                functionNode.body.type !== AST_NODE_TYPES.BlockStatement
            ) {
                // Arrow function with implicit return - check the body directly
                return containsNullableValue(functionNode.body);
            }

            const returnStatements = collectReturnStatements(functionNode);

            // Analyze return patterns to distinguish void functions from value-returning functions
            if (returnStatements.length === 0) {
                return false; // No returns, effectively void
            }

            let hasNakedReturn = false;
            let hasValueReturn = false;

            for (const returnStatement of returnStatements) {
                if (!returnStatement.argument) {
                    hasNakedReturn = true;
                    continue;
                }

                hasValueReturn = true;
                if (containsNullableValue(returnStatement.argument)) {
                    return true;
                }
            }

            return hasNakedReturn && hasValueReturn;
        }

        function containsNullableValue(
            node: TSESTree.Expression | null | undefined
        ): boolean {
            if (!node) return false;

            // Check for literal null
            if (node.type === AST_NODE_TYPES.Literal && node.value === null) {
                return true;
            }

            // Check for undefined identifier
            if (
                node.type === AST_NODE_TYPES.Identifier &&
                node.name === "undefined"
            ) {
                return true;
            }

            // Check for conditional expressions (ternary operator)
            if (node.type === AST_NODE_TYPES.ConditionalExpression) {
                return (
                    containsNullableValue(node.consequent) ||
                    containsNullableValue(node.alternate)
                );
            }

            // Check for logical expressions (&&, ||)
            if (node.type === AST_NODE_TYPES.LogicalExpression) {
                return (
                    containsNullableValue(node.left) ||
                    containsNullableValue(node.right)
                );
            }

            return false;
        }

        function inferNonNullableTypeFromReturns(
            functionNode:
                | TSESTree.FunctionDeclaration
                | TSESTree.FunctionExpression
                | TSESTree.ArrowFunctionExpression
        ): string {
            // Special handling for arrow functions with implicit returns
            if (
                functionNode.type === AST_NODE_TYPES.ArrowFunctionExpression &&
                functionNode.body &&
                functionNode.body.type !== AST_NODE_TYPES.BlockStatement
            ) {
                // Arrow function with implicit return - analyze the body directly
                const nonNullableType = extractNonNullableType(
                    functionNode.body
                );
                if (nonNullableType !== "T") {
                    return nonNullableType;
                }
            }

            const returnStatements = collectReturnStatements(functionNode);

            // Try to infer the non-nullable type from return statements
            for (const returnStmt of returnStatements) {
                if (!returnStmt.argument) continue;

                const nonNullableType = extractNonNullableType(
                    returnStmt.argument
                );
                if (nonNullableType !== "T") {
                    return nonNullableType;
                }
            }

            return "T";
        }

        function extractNonNullableType(
            node: TSESTree.Expression | null | undefined
        ): string {
            if (!node) return "T";

            // Skip null and undefined
            if (
                (node.type === AST_NODE_TYPES.Literal && node.value === null) ||
                (node.type === AST_NODE_TYPES.Identifier &&
                    node.name === "undefined")
            ) {
                return "T";
            }

            // For literal strings
            if (
                node.type === AST_NODE_TYPES.Literal &&
                typeof node.value === "string"
            ) {
                return "string";
            }

            // For literal numbers
            if (
                node.type === AST_NODE_TYPES.Literal &&
                typeof node.value === "number"
            ) {
                return "number";
            }

            // For literal booleans
            if (
                node.type === AST_NODE_TYPES.Literal &&
                typeof node.value === "boolean"
            ) {
                return "boolean";
            }

            // For conditional expressions, try both branches
            if (node.type === AST_NODE_TYPES.ConditionalExpression) {
                const consequentType = extractNonNullableType(node.consequent);
                if (consequentType !== "T") return consequentType;

                const alternateType = extractNonNullableType(node.alternate);
                if (alternateType !== "T") return alternateType;
            }

            // For logical expressions
            if (node.type === AST_NODE_TYPES.LogicalExpression) {
                const leftType = extractNonNullableType(node.left);
                if (leftType !== "T") return leftType;

                const rightType = extractNonNullableType(node.right);
                if (rightType !== "T") return rightType;
            }

            return "T";
        }

        // Helper function to detect String.prototype.match calls
        function isStringMatchCall(node: TSESTree.CallExpression): boolean {
            if (node.callee.type !== AST_NODE_TYPES.MemberExpression)
                return false;

            // Check if the object looks like it's a string to avoid false positives
            // with custom .match() methods (e.g., Result.match, Matcher.match)
            const object = node.callee.object;
            const isLikelyString =
                // String literal: "text".match(...)
                (object.type === AST_NODE_TYPES.Literal &&
                    typeof object.value === "string") ||
                // Template literal: `text ${var}`.match(...)
                object.type === AST_NODE_TYPES.TemplateLiteral ||
                // Identifier with string-like name that suggests it's a string
                (object.type === AST_NODE_TYPES.Identifier &&
                    stringLikeIdentifierPattern.test(object.name));

            if (!isLikelyString) return false;

            // String.match() typically takes a RegExp or string as first argument
            // This is a heuristic to identify string match vs other match methods
            if (node.arguments.length === 0) return false;

            const firstArg = node.arguments[0];
            if (!firstArg) return false;

            return (
                // RegExp literal: /pattern/
                (firstArg.type === AST_NODE_TYPES.Literal &&
                    "regex" in firstArg &&
                    firstArg.regex !== undefined) ||
                // String literal: "pattern"
                (firstArg.type === AST_NODE_TYPES.Literal &&
                    "value" in firstArg &&
                    typeof firstArg.value === "string") ||
                // Template literal: `pattern`
                firstArg.type === AST_NODE_TYPES.TemplateLiteral ||
                // Variable that might be a RegExp/string (less certain but common)
                firstArg.type === AST_NODE_TYPES.Identifier
            );
        }

        function onFunctionExit(
            node:
                | TSESTree.FunctionDeclaration
                | TSESTree.FunctionExpression
                | TSESTree.ArrowFunctionExpression
        ): void {
            if (optionalWrapperDepth > 0) {
                functionStack.length -= 1;
                return;
            }

            // Check explicit return type annotations
            const hasExplicitNullableReturn =
                node.returnType && isNullableUnion(node.returnType);

            // Check if function returns null/undefined without explicit annotation
            const hasImplicitNullableReturn =
                !node.returnType && hasNullableReturnStatements(node);

            if (!hasExplicitNullableReturn && !hasImplicitNullableReturn) {
                functionStack.length -= 1;
                return;
            }

            // Skip if this is a method function (handled by parent MethodDefinition selector)
            if (
                node.type === AST_NODE_TYPES.FunctionExpression &&
                node.parent?.type === AST_NODE_TYPES.MethodDefinition
            ) {
                functionStack.length -= 1;
                return;
            }

            const functionName =
                (node.type === AST_NODE_TYPES.FunctionDeclaration &&
                    node.id?.name) ||
                (node.parent?.type === AST_NODE_TYPES.VariableDeclarator &&
                    node.parent.id.type === AST_NODE_TYPES.Identifier &&
                    node.parent.id.name) ||
                "anonymous";

            if (isExceptionFunction(functionName)) {
                functionStack.length -= 1;
                return;
            }

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
            functionStack.length -= 1;
        }

        return {
            // Check function return types (includes methods via FunctionExpression)
            "FunctionDeclaration, FunctionExpression, ArrowFunctionExpression"(
                node:
                    | TSESTree.FunctionDeclaration
                    | TSESTree.FunctionExpression
                    | TSESTree.ArrowFunctionExpression
            ) {
                functionStack.push(node);
                returnStatementsCache.set(node, []);
            },

            ReturnStatement(node: TSESTree.ReturnStatement) {
                const functionNode = functionStack[functionStack.length - 1];
                if (functionNode) {
                    returnStatementsCache.get(functionNode)?.push(node);
                }
            },

            "FunctionDeclaration:exit"(node: TSESTree.FunctionDeclaration) {
                onFunctionExit(node);
            },

            "FunctionExpression:exit"(node: TSESTree.FunctionExpression) {
                onFunctionExit(node);
            },

            "ArrowFunctionExpression:exit"(
                node: TSESTree.ArrowFunctionExpression
            ) {
                onFunctionExit(node);
            },

            // Check method return types
            MethodDefinition(node: TSESTree.MethodDefinition) {
                if (
                    node.value.type !== AST_NODE_TYPES.FunctionExpression ||
                    !node.value.returnType
                )
                    return;
                if (!isNullableUnion(node.value.returnType)) return;

                const methodName =
                    node.key.type === AST_NODE_TYPES.Identifier
                        ? node.key.name
                        : "method";
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
                node: TSESTree.VariableDeclarator
            ) {
                if (
                    node.id.type !== AST_NODE_TYPES.Identifier ||
                    !node.id.typeAnnotation
                )
                    return;
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
                if (isOptionalWrapperCall(node)) {
                    optionalWrapperDepth += 1;
                    return;
                }

                if (optionalWrapperDepth > 0) {
                    return;
                }

                // Check for common nullable-returning functions
                let functionName = "";
                if (node.callee.type === AST_NODE_TYPES.Identifier) {
                    functionName = node.callee.name;
                } else if (
                    node.callee.type === AST_NODE_TYPES.MemberExpression &&
                    node.callee.property.type === AST_NODE_TYPES.Identifier
                ) {
                    functionName = node.callee.property.name;
                }

                // Special handling for 'match' - only flag String.prototype.match, not other match methods
                const isMatchCall = functionName === "match";
                const isStringMatch = isMatchCall && isStringMatchCall(node);

                if (nullableAPIs.has(functionName) || isStringMatch) {
                    context.report({
                        node,
                        messageId: "useOptionalFromNullable" as const,
                        fix: autoFix
                            ? (fixer) => {
                                  const sourceCode = context.sourceCode;
                                  const callText = sourceCode.getText(node);
                                  return fixer.replaceText(
                                      node,
                                      `optional.from_nullable(${callText})`
                                  );
                              }
                            : null,
                    });
                }
            },

            "CallExpression:exit"(node: TSESTree.CallExpression) {
                if (isOptionalWrapperCall(node)) {
                    optionalWrapperDepth -= 1;
                }
            },
        };
    },
});

export default enforceOptionalUsage;

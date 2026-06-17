/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import {
    ESLintUtils,
    TSESTree,
    AST_NODE_TYPES,
} from "@typescript-eslint/utils";

type Options = [
    {
        allowExceptions?: string[];
        allowTestFiles?: boolean;
        autoFix?: boolean;
    },
];

type MessageIds =
    | "noThrowStatement"
    | "noTryCatchBlock"
    | "useResultTry"
    | "useResultTryAsync";

const createRule = ESLintUtils.RuleCreator(
    () =>
        `https://github.com/masstronaut/typesafe-ts/blob/main/src/result/readme.md`
);

const throwingAPIs = new Set([
    "parse",
    "parseInt",
    "parseFloat",
    "atob",
    "btoa",
    "decodeURI",
    "decodeURIComponent",
    "fetch",
    "require",
    "import",
    "readFileSync",
    "writeFileSync",
]);

const asyncAPIs = new Set(["fetch", "import", "readFile", "writeFile"]);

const throwingMemberAPIs: Readonly<Record<string, ReadonlySet<string>>> = {
    JSON: new Set(["parse"]),
    Proxy: new Set(["revocable"]),
    Array: new Set(["from"]),
    Object: new Set(["defineProperty", "setPrototypeOf"]),
    String: new Set(["fromCharCode", "fromCodePoint"]),
    Symbol: new Set(["keyFor"]),
    Reflect: new Set([
        "get",
        "set",
        "defineProperty",
        "deleteProperty",
        "construct",
        "apply",
    ]),
    BigInt: new Set(["asIntN", "asUintN"]),
};

function isResultTryCall(node: TSESTree.CallExpression): boolean {
    return (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        node.callee.object.name === "result" &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        (node.callee.property.name === "try" ||
            node.callee.property.name === "try_async")
    );
}

/**
 * ESLint rule that enforces Result usage patterns instead of throw statements and try/catch blocks.
 *
 * This rule:
 * - Disallows `throw` statements, suggesting `result.error()` instead
 * - Disallows `try/catch` blocks, suggesting `result.try()` or `result.try_async()`
 * - Detects calls to functions that throw and requires wrapping with `result.try()`
 * - Provides auto-fix suggestions where possible
 */
export const enforceResultUsage = createRule<Options, MessageIds>({
    name: "enforce-result-usage",
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Enforce Result monad usage instead of throw statements and try/catch blocks",
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
                    allowTestFiles: {
                        type: "boolean",
                        description: "Allow throw/try-catch in test files",
                        default: true,
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
            noThrowStatement:
                "Use result.error() instead of throw statements for functional error handling. This ensures errors are part of the type system.",
            noTryCatchBlock:
                "Use result.try() or result.try_async() instead of try/catch blocks for type-safe error handling.",
            useResultTry:
                "Calls to functions that may throw should be wrapped with result.try(). This ensures exceptions are handled safely.",
            useResultTryAsync:
                "Calls to async functions that may throw should be wrapped with result.try_async(). This ensures exceptions are handled safely.",
        },
    },
    defaultOptions: [
        { allowExceptions: [], allowTestFiles: true, autoFix: true },
    ],
    create(context, [options]) {
        const {
            allowExceptions = [],
            allowTestFiles = true,
            autoFix = true,
        } = options;
        const filename = context.filename;
        const isCurrentTestFile =
            allowTestFiles &&
            /\.test\.|\.spec\.|test\/|tests\/|__tests__/.test(filename);
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
        let resultTryDepth = 0;
        let tryStatementDepth = 0;
        const tryStates: Array<{
            hasAwait: boolean;
            node: TSESTree.TryStatement;
        }> = [];

        function isExceptionFunction(name: string): boolean {
            if (allowExceptions.length === 0) return false;

            return (
                exactExceptions?.has(name) === true ||
                wildcardExceptions?.some((exception) =>
                    exception.test(name)
                ) === true
            );
        }

        function getFunctionName(node: TSESTree.CallExpression): string {
            if (node.callee.type === AST_NODE_TYPES.Identifier) {
                return node.callee.name;
            } else if (
                node.callee.type === AST_NODE_TYPES.MemberExpression &&
                node.callee.property.type === AST_NODE_TYPES.Identifier
            ) {
                return node.callee.property.name;
            }
            return "";
        }

        function isThrowingAPI(functionName: string): boolean {
            return throwingAPIs.has(functionName);
        }

        function isThrowingMemberAPI(node: TSESTree.CallExpression): boolean {
            if (
                node.callee.type !== AST_NODE_TYPES.MemberExpression ||
                node.callee.object.type !== AST_NODE_TYPES.Identifier ||
                node.callee.property.type !== AST_NODE_TYPES.Identifier
            ) {
                return false;
            }

            return (
                throwingMemberAPIs[node.callee.object.name]?.has(
                    node.callee.property.name
                ) === true
            );
        }

        function isAsyncFunction(functionName: string): boolean {
            return (
                functionName.includes("async") ||
                functionName.includes("Async") ||
                functionName.startsWith("fetch") ||
                (!functionName.endsWith("Sync") && asyncAPIs.has(functionName))
            );
        }

        function reportTryStatement(
            node: TSESTree.TryStatement,
            hasAwait: boolean
        ): void {
            context.report({
                node,
                messageId: "noTryCatchBlock" as const,
                fix: autoFix
                    ? (fixer) => {
                          const sourceCode = context.sourceCode;
                          const tryBlockText = sourceCode.getText(node.block);
                          const innerContent = tryBlockText.slice(1, -1);

                          if (hasAwait) {
                              return fixer.replaceText(
                                  node,
                                  `const result = await result.try_async(async () => {${innerContent}});`
                              );
                          }
                          return fixer.replaceText(
                              node,
                              `const result = result.try(() => {${innerContent}});`
                          );
                      }
                    : null,
            });
        }

        return {
            // Detect throw statements
            ThrowStatement(node: TSESTree.ThrowStatement) {
                if (isCurrentTestFile) return;

                // Check if this throw is in an exception function
                let current: TSESTree.Node = node.parent;
                while (current) {
                    if (
                        [
                            "FunctionDeclaration",
                            "FunctionExpression",
                            "ArrowFunctionExpression",
                        ].includes(current.type)
                    ) {
                        const functionName =
                            (current.type ===
                                AST_NODE_TYPES.FunctionDeclaration &&
                                current.id?.name) ||
                            (current.parent?.type ===
                                AST_NODE_TYPES.VariableDeclarator &&
                                current.parent.id.type ===
                                    AST_NODE_TYPES.Identifier &&
                                current.parent.id.name) ||
                            "anonymous";

                        if (isExceptionFunction(functionName)) return;
                        break;
                    }
                    if (!current.parent) break;
                    current = current.parent;
                }

                context.report({
                    node,
                    messageId: "noThrowStatement" as const,
                    fix: autoFix
                        ? (fixer) => {
                              const sourceCode = context.sourceCode;
                              const argumentText = sourceCode.getText(
                                  node.argument
                              );

                              // Handle different types of throw arguments
                              if (
                                  node.argument.type ===
                                      AST_NODE_TYPES.NewExpression &&
                                  node.argument.callee.type ===
                                      AST_NODE_TYPES.Identifier &&
                                  node.argument.callee.name === "Error"
                              ) {
                                  return fixer.replaceText(
                                      node,
                                      `return result.error(${argumentText});`
                                  );
                              } else if (
                                  node.argument.type ===
                                  AST_NODE_TYPES.Identifier
                              ) {
                                  return fixer.replaceText(
                                      node,
                                      `return result.error(${argumentText});`
                                  );
                              } else {
                                  // Wrap non-Error values in Error constructor
                                  return fixer.replaceText(
                                      node,
                                      `return result.error(new Error(${argumentText}));`
                                  );
                              }
                          }
                        : null,
                });
            },

            // Detect try/catch blocks
            TryStatement(node: TSESTree.TryStatement) {
                if (isCurrentTestFile) return;

                tryStatementDepth += 1;
                tryStates.push({ hasAwait: false, node });
            },

            AwaitExpression() {
                for (const tryState of tryStates) {
                    tryState.hasAwait = true;
                }
            },

            // Detect calls to functions that commonly throw
            CallExpression(node: TSESTree.CallExpression) {
                if (isResultTryCall(node)) {
                    resultTryDepth += 1;
                    return;
                }

                if (
                    isCurrentTestFile ||
                    resultTryDepth > 0 ||
                    tryStatementDepth > 0
                )
                    return;

                const functionName = getFunctionName(node);
                if (!functionName || isExceptionFunction(functionName)) return;

                if (isThrowingAPI(functionName) || isThrowingMemberAPI(node)) {
                    const isAsync = isAsyncFunction(functionName);

                    context.report({
                        node,
                        messageId: isAsync
                            ? ("useResultTryAsync" as const)
                            : ("useResultTry" as const),
                        fix: autoFix
                            ? (fixer) => {
                                  const sourceCode = context.sourceCode;
                                  const callText = sourceCode.getText(node);

                                  if (isAsync) {
                                      return fixer.replaceText(
                                          node,
                                          `result.try_async(() => ${callText})`
                                      );
                                  } else {
                                      return fixer.replaceText(
                                          node,
                                          `result.try(() => ${callText})`
                                      );
                                  }
                              }
                            : null,
                    });
                }
            },

            "CallExpression:exit"(node: TSESTree.CallExpression) {
                if (isResultTryCall(node)) {
                    resultTryDepth -= 1;
                }
            },

            "TryStatement:exit"() {
                if (!isCurrentTestFile) {
                    const tryState = tryStates[tryStates.length - 1];
                    if (tryState) {
                        reportTryStatement(tryState.node, tryState.hasAwait);
                    }
                    tryStates.length -= 1;
                    tryStatementDepth -= 1;
                }
            },

            // Note: JSON.parse detection is now handled by the general CallExpression selector above
        };
    },
});

export default enforceResultUsage;

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
    allowTestFiles?: boolean;
    autoFix?: boolean;
  },
];

type MessageIds =
  | "noThrowStatement"
  | "noTryCatchBlock"
  | "useResultFrom"
  | "useResultFromAsync";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/your-org/ts-utils/blob/main/docs/rules/${name}.md`,
);

/**
 * ESLint rule that enforces Result usage patterns instead of throw statements and try/catch blocks.
 *
 * This rule:
 * - Disallows `throw` statements, suggesting `result.error()` instead
 * - Disallows `try/catch` blocks, suggesting `result.from()` or `result.from_async()`
 * - Detects calls to functions that throw and requires wrapping with `result.from()`
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
            description: "Function names or patterns to exclude from the rule",
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
        "Use result.from() or result.from_async() instead of try/catch blocks for type-safe error handling.",
      useResultFrom:
        "Calls to functions that may throw should be wrapped with result.from(). This ensures exceptions are handled safely.",
      useResultFromAsync:
        "Calls to async functions that may throw should be wrapped with result.from_async(). This ensures exceptions are handled safely.",
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

    function isTestFile(): boolean {
      if (!allowTestFiles) return false;
      return /\.test\.|\.spec\.|test\/|tests\/|__tests__/.test(filename);
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

    function getFunctionName(node: TSESTree.CallExpression): string {
      if (node.callee.type === "Identifier") {
        return node.callee.name;
      } else if (
        node.callee.type === "MemberExpression" &&
        node.callee.property.type === "Identifier"
      ) {
        return node.callee.property.name;
      }
      return "";
    }

    function isAlreadyWrappedInResult(node: TSESTree.Node): boolean {
      if (node.parent === undefined) return false;
      // Check if this call is already inside result.from() or result.from_async()
      let parent: TSESTree.Node = node.parent;
      while (parent) {
        if (
          parent.type === "ArrowFunctionExpression" &&
          parent.parent?.type === "CallExpression" &&
          parent.parent.callee.type === "MemberExpression" &&
          parent.parent.callee.object.type === "Identifier" &&
          parent.parent.callee.object.name === "result" &&
          parent.parent.callee.property.type === "Identifier" &&
          (parent.parent.callee.property.name === "from" ||
            parent.parent.callee.property.name === "from_async")
        ) {
          return true;
        }
        if (parent.parent === undefined) return false;
        parent = parent.parent;
      }
      return false;
    }

    function isInsideTryBlock(node: TSESTree.Node): boolean {
      if (!node.parent) return false;

      let parent: TSESTree.Node = node.parent;
      while (parent) {
        if (parent.type === "TryStatement") {
          return true;
        }

        if (!parent.parent) break;
        parent = parent.parent;
      }
      return false;
    }

    function isThrowingAPI(functionName: string): boolean {
      // Common APIs that throw exceptions
      const throwingAPIs = [
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
      ];
      return throwingAPIs.includes(functionName);
    }

    function isThrowingMemberAPI(node: TSESTree.CallExpression): boolean {
      // Check for member expressions like JSON.parse
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.property.type === "Identifier"
      ) {
        const objectName = node.callee.object.name;
        const methodName = node.callee.property.name;

        // Common throwing member APIs (not exhaustive - many more exist)
        const throwingMemberAPIs = [
          ["JSON", "parse"],
          ["Proxy", "revocable"],
          ["Array", "from"], // Can throw with invalid length
          ["Object", "defineProperty"], // Can throw in various cases
          ["Object", "setPrototypeOf"], // Can throw if non-extensible
          ["String", "fromCharCode"], // Can throw RangeError for invalid code points
          ["String", "fromCodePoint"], // Can throw RangeError for invalid code points
          ["Symbol", "keyFor"], // Throws TypeError if not a symbol
          ["Reflect", "get"], // Throws TypeError if target is not object
          ["Reflect", "set"], // Throws TypeError if target is not object
          ["Reflect", "defineProperty"], // Can throw TypeError
          ["Reflect", "deleteProperty"], // Can throw TypeError
          ["Reflect", "construct"], // Can throw TypeError
          ["Reflect", "apply"], // Can throw TypeError
          ["BigInt", "asIntN"], // Can throw RangeError for invalid bits
          ["BigInt", "asUintN"], // Can throw RangeError for invalid bits
        ];

        return throwingMemberAPIs.some(
          ([obj, method]) => objectName === obj && methodName === method,
        );
      }
      return false;
    }

    function isAsyncFunction(node: TSESTree.CallExpression): boolean {
      // Detect if this is likely an async call
      const functionName = getFunctionName(node);
      return (
        functionName.includes("async") ||
        functionName.includes("Async") ||
        functionName.startsWith("fetch") ||
        (/Sync$/.test(functionName) === false &&
          ["fetch", "import", "readFile", "writeFile"].includes(functionName))
      );
    }

    return {
      // Detect throw statements
      ThrowStatement(node: TSESTree.ThrowStatement) {
        if (isTestFile()) return;

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
              (current.type === "FunctionDeclaration" && current.id?.name) ||
              (current.parent?.type === "VariableDeclarator" &&
                current.parent.id.type === "Identifier" &&
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
              const argumentText = sourceCode.getText(node.argument);

              // Handle different types of throw arguments
              if (
                node.argument.type === "NewExpression" &&
                node.argument.callee.type === "Identifier" &&
                node.argument.callee.name === "Error"
              ) {
                return fixer.replaceText(
                  node,
                  `return result.error(${argumentText});`,
                );
              } else if (node.argument.type === "Identifier") {
                return fixer.replaceText(
                  node,
                  `return result.error(${argumentText});`,
                );
              } else {
                // Wrap non-Error values in Error constructor
                return fixer.replaceText(
                  node,
                  `return result.error(new Error(${argumentText}));`,
                );
              }
            }
            : null,
        });
      },

      // Detect try/catch blocks
      TryStatement(node: TSESTree.TryStatement) {
        if (isTestFile()) return;

        // Check if the try block contains async operations
        let hasAwait = false;
        const checkForAwait = (n: TSESTree.Node) => {
          if (n.type === "AwaitExpression") {
            hasAwait = true;
          }
        };

        // Type-safe traversal to detect await
        const visited = new Set<TSESTree.Node>();
        const traverse = (n: TSESTree.Node) => {
          if (visited.has(n)) return;
          visited.add(n);

          checkForAwait(n);
          
          // Use ESLint's visitor pattern for type-safe traversal
          switch (n.type) {
            case 'BlockStatement':
              n.body.forEach(child => {
                if (!visited.has(child)) traverse(child);
              });
              break;
            case 'IfStatement':
              if (!visited.has(n.consequent)) traverse(n.consequent);
              if (n.alternate && !visited.has(n.alternate)) traverse(n.alternate);
              break;
            case 'WhileStatement':
            case 'DoWhileStatement':
            case 'ForStatement':
            case 'ForInStatement':
            case 'ForOfStatement':
              if (!visited.has(n.body)) traverse(n.body);
              break;
            case 'SwitchStatement':
              n.cases.forEach(child => {
                if (!visited.has(child)) traverse(child);
              });
              break;
            case 'SwitchCase':
              n.consequent.forEach(child => {
                if (!visited.has(child)) traverse(child);
              });
              break;
            case 'TryStatement':
              if (!visited.has(n.block)) traverse(n.block);
              if (n.handler && !visited.has(n.handler)) traverse(n.handler);
              if (n.finalizer && !visited.has(n.finalizer)) traverse(n.finalizer);
              break;
            case 'CatchClause':
              if (!visited.has(n.body)) traverse(n.body);
              break;
            case 'ExpressionStatement':
              if (n.expression && !visited.has(n.expression)) traverse(n.expression);
              break;
            case 'AwaitExpression':
              if (n.argument && !visited.has(n.argument)) traverse(n.argument);
              break;
            case 'CallExpression':
              if (n.callee && !visited.has(n.callee)) traverse(n.callee);
              n.arguments.forEach(arg => {
                if (!visited.has(arg)) traverse(arg);
              });
              break;
            case 'VariableDeclaration':
              n.declarations.forEach(decl => {
                if (!visited.has(decl)) traverse(decl);
              });
              break;
            case 'VariableDeclarator':
              if (n.init && !visited.has(n.init)) traverse(n.init);
              break;
            case 'ReturnStatement':
              if (n.argument && !visited.has(n.argument)) traverse(n.argument);
              break;
            case 'AssignmentExpression':
            case 'BinaryExpression':
            case 'LogicalExpression':
              if (n.left && !visited.has(n.left)) traverse(n.left);
              if (n.right && !visited.has(n.right)) traverse(n.right);
              break;
            case 'ConditionalExpression':
              if (n.test && !visited.has(n.test)) traverse(n.test);
              if (n.consequent && !visited.has(n.consequent)) traverse(n.consequent);
              if (n.alternate && !visited.has(n.alternate)) traverse(n.alternate);
              break;
            case 'MemberExpression':
              if (n.object && !visited.has(n.object)) traverse(n.object);
              if (n.computed && n.property && !visited.has(n.property)) traverse(n.property);
              break;
            default:
              // For other node types, check if they have common properties
              if ('body' in n && Array.isArray(n.body)) {
                n.body.forEach((child: TSESTree.Node) => {
                  if (!visited.has(child)) traverse(child);
                });
              } else if ('body' in n && n.body) {
                if (!visited.has(n.body as TSESTree.Node)) traverse(n.body as TSESTree.Node);
              }
          }
        };

        traverse(node.block);

        context.report({
          node,
          messageId: "noTryCatchBlock" as const,
          fix: autoFix
            ? (fixer) => {
              const sourceCode = context.sourceCode;
              const tryBlockText = sourceCode.getText(node.block);

              // Remove braces from block and get inner content, preserving formatting
              const innerContent = tryBlockText.slice(1, -1);

              if (hasAwait) {
                return fixer.replaceText(
                  node,
                  `const result = await result.from_async(async () => {${innerContent}});`,
                );
              } else {
                return fixer.replaceText(
                  node,
                  `const result = result.from(() => {${innerContent}});`,
                );
              }
            }
            : null,
        });
      },

      // Detect calls to functions that commonly throw
      CallExpression(node: TSESTree.CallExpression) {
        if (
          isTestFile() ||
          isAlreadyWrappedInResult(node) ||
          isInsideTryBlock(node)
        )
          return;

        // Skip if this is already a result.from() or result.from_async() call
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "result" &&
          node.callee.property.type === "Identifier" &&
          (node.callee.property.name === "from" ||
            node.callee.property.name === "from_async")
        ) {
          return;
        }

        const functionName = getFunctionName(node);
        if (!functionName || isExceptionFunction(functionName)) return;

        if (isThrowingAPI(functionName) || isThrowingMemberAPI(node)) {
          const isAsync = isAsyncFunction(node);

          context.report({
            node,
            messageId: isAsync
              ? ("useResultFromAsync" as const)
              : ("useResultFrom" as const),
            fix: autoFix
              ? (fixer) => {
                const sourceCode = context.sourceCode;
                const callText = sourceCode.getText(node);

                if (isAsync) {
                  return fixer.replaceText(
                    node,
                    `result.from_async(() => ${callText})`,
                  );
                } else {
                  return fixer.replaceText(
                    node,
                    `result.from(() => ${callText})`,
                  );
                }
              }
              : null,
          });
        }
      },

      // Note: JSON.parse detection is now handled by the general CallExpression selector above
    };
  },
});

export default enforceResultUsage;

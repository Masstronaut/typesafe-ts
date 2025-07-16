# typesafe-ts

[![CI](https://github.com/Masstronaut/typesafe-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/Masstronaut/typesafe-ts/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/typesafe-ts.svg)](https://www.npmjs.com/package/typesafe-ts)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Masstronaut/typesafe-ts/coverage/coverage-badge.json)](https://github.com/Masstronaut/typesafe-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript utilities that eliminate common runtime errors and make your code safer, more predictable, and easier to maintain.

## 🚀 Quick Start

Install `typesafe-ts` via npm:

```bash
npm install typesafe-ts
```

Then use the utilities to write safer, more readable code.

```diff
+import { optional } from 'typesafe-ts';
-// working with nullables isn't ergonomic
+// Type-safe `Optional` is a more ergonomic way to work with nullables
 function authenticateUser(): void {
-  const user = getUser(); // returns User | null
+  optional.from(() => getUser())
-  if (user) {
-    authenticateWithToken(user.token);
+  .map(user => authenticateWithToken(user.token))
-  } else {
+  .or_else(() => {
     throw new Error('Authentication failed');
-  }
+  });
 }
```

## 📚 Table of Contents

- [Why typesafe-ts?](#-why-typesafe-ts)
- [Quick Start](#-quick-start)
- [Utilities](#-utilities)
- [ESLint Rules](#-eslint-rules)
- [Requirements](#-requirements)
- [Links](#-links)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Why typesafe-ts?

**Eliminate runtime crashes** - Replace `null`/`undefined` with `Optional` for cleaner, safer code with a more ergonomic API.

**Cleaner error handling** - No more nested try/catch blocks, untyped errors, or missed error cases. Embrace the "unhappy" path

**Better developer experience** - Full IntelliSense support and type checking catches bugs before they reach production, plus ESLint rules to ease adoption.

**Minimal overhead** - `Optional` and `Result` have 0 dependencies and won't bloat your bundles.

## Links

- **[Published Documentation](https://allandeutsch.com/typesafe-ts)**
- **[NPM Package](https://www.npmjs.com/package/typesafe-ts)**

# Expectations

Utilities in this repository are expected to meet the following criteria:

- **Documented**: All exposed interfaces and types should be documented with JSDoc, including usage examples. This provides a better developer experience and makes it easier for developers unfamiliar with them to understand how to work with them.
- **Tested**: All utilities should have 100% test coverage to ensure they work as expected and to prevent regressions.
- **Type-safe**: Wherever possible, leverage the type system to make incorrect code impossible.
- **No dependencies**: Utilities should not depend on any external libraries or frameworks, unless they are intended to be used with a specific library or framework (e.g., React, Node.js). In this case, they should not introduce any additional dependencies.
- **Platform-first**: These utilities use web standard APIs, types, features, etc.
- **Non-throwing**: Throwing exceptions results in complex control flow that is difficult to reason about and handle comprehensively. Operations that may fail should represent that possibility using the type system so that error handling can be statically enforced.

## 🛠 Utilities

### Optional

A type-safe alternative to `null`/`undefined` for values that might be empty.

```diff
-// Unsafe: Can crash at runtime
+// Safe: Compile-time guarantees
+import { optional } from 'typesafe-ts';
-const user = getUser();
+const user = optional.from(() => getUser());
-const name = user.name.toUpperCase(); // Error: Cannot read properties of null (reading 'name')
+const name = user
+  .map(user => user.name.toUpperCase())
+  .value_or('UNKNOWN'); // provides a default value if the `user` optional is empty
 console.log(name);
```

**[📖 Full Documentation](src/optional/)**

### Result

A type-safe alternative to throwing errors - treat errors as values with full type support.

```diff
-// Unsafe: Uncaught exceptions
-function parseConfig(input: string) {
-  return JSON.parse(input); // Can throw at runtime
-}

+// Safe: Explicit error handling
+import { result } from 'typesafe-ts';
+
+function parseConfig(input: string) {
+  return result.try(() => JSON.parse(input));
+}
+
+const config = parseConfig(userInput)
+  .map(cfg => ({ ...cfg, validated: true }))
+  .match(
+    config => `Loaded: ${config.name}`,
+    error => `Failed: ${error.message}`
+  );
```

**[📖 Full Documentation](src/result/)**

## 🔧 ESLint Rules

Both `Optional` and `Result` include ESLint rules to help assist with adoption and correct usage:

- **`enforce-optional-usage`**: Detects functions that return nullable types and suggests using `Optional` instead
- **`enforce-result-usage`**: Detects throw statements and try/catch blocks, suggesting a `Result`-based approach instead

### Setup

Install the rules alongside the main package:

Add to your ESLint 9 flat config:

```eslint.config.ts
import { enforceResultUsage } from "./src/result/lint.ts";
import { enforceOptionalUsage } from "./src/optional/lint.ts";

// Define the custom plugin once
const typesafe_ts = {
  rules: {
    "enforce-optional-usage": enforceOptionalUsage,
    "enforce-result-usage": enforceResultUsage,
  },
};

export default tseslint.config(
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "typesafe-ts": typesafe_ts,
    },
    rules: {
      "ts-utils/enforce-optional-usage": "warn",
      "ts-utils/enforce-result-usage": "warn",
    },
  },
  // other eslint config options...
);
```

These rules help teams adopt typesafe patterns consistently across their codebase. They are also useful for initial adoption, and for helping LLMs produce safer code.

## 🤝 Contributing

Additions should meet all the expectations outlined above.

To validate changes:

```sh
npm run test
npm run typecheck
npm run lint
```

For more guidance on contributing, see the [CONTRIBUTING.md](CONTRIBUTING.md) file.

# License

This repository is licensed under the [MIT License](LICENSE.txt). See the [LICENSE.txt](LICENSE.txt) file for more details.

All files copied into a project should include the full license text at the top of the file.

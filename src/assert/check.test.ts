/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { test } from "node:test";
import { Assert, type Check } from "./index.ts";

await test("Check.Equal<...> is true when provided types are equal", () => {
    Assert<
        Check.Equal<string, string>,
        "these are the same type and should be equal"
    >();
    Assert<
        Check.Equal<number, number>,
        "these are the same type and should be equal"
    >();
    Assert<
        Check.Equal<boolean, boolean>,
        "these are the same type and should be equal"
    >();
    Assert<
        Check.Equal<{ a: number }, { a: number }>,
        "these are the same type and should be equal"
    >();
    Assert<
        Check.Equal<undefined, undefined>,
        "these are the same type and should be equal"
    >();
    Assert<
        Check.Equal<null, null>,
        "these are the same type and should be equal"
    >();
    Assert<
        Check.Equal<never, never>,
        "these are the same type and should be equal"
    >();
    Assert<
        Check.Equal<unknown, unknown>,
        "these are the same type and should be equal"
    >();
    Assert<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Check.Equal<any, any>,
        "these are the same type and should be equal"
    >();
});

await test("Check.Equal<...> accepts structurally equal types", () => {
    type A = { a: number; b: string };
    type B = { a: number; b: string };
    Assert<Check.Equal<A, B>, "">();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function fn() {
        function foo(): void {}
        return foo;
    }
    type foo = ReturnType<typeof fn>;
    type bar = () => void;
    Assert<Check.Equal<foo, bar>, "">();

    Assert<
        Check.Equal<boolean[], Array<boolean>>,
        "A rose, by any other name..."
    >();
    Assert<
        Check.Equal<1 | 2 | 3, 3 | 2 | 1>,
        "Order doesn't matter in unions"
    >();
    Assert<
        Check.Equal<true | false, boolean>,
        "The way types are defined can differ as long as the resulting type is the same."
    >();
});

await test("Check.Equal<...> is false when provided types are not equal", () => {
    // @ts-expect-error: Different primitive types should not be equal
    Assert<Check.Equal<string, number>, "string and number are not equal">();

    Assert<
        // @ts-expect-error: Different object structures should not be equal
        Check.Equal<{ a: number }, { b: string }>,
        "different object shapes"
    >();
    // @ts-expect-error: any should not equal other types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Assert<Check.Equal<any, string>, "any is not equal to string">();
    // @ts-expect-error: unknown should not equal other types
    Assert<Check.Equal<unknown, string>, "unknown is not equal to string">();
    // @ts-expect-error: never should not equal other types
    Assert<Check.Equal<never, string>, "never is not equal to string">();
    // @ts-expect-error: order shouldn't matter
    Assert<Check.Equal<string, never>, "never is not equal to string">();
});

await test("Check.True<...> is true only for exactly `true` type", () => {
    Assert<Check.True<true>, "true should be true">();

    // @ts-expect-error: false is not true
    Assert<Check.True<false>, "false is not true">();
    // @ts-expect-error: boolean union is not exact true
    Assert<Check.True<boolean>, "boolean is not exactly true">();
    // @ts-expect-error: truthy values are not true
    Assert<Check.True<1>, "1 is truthy but not true">();
    // @ts-expect-error: truthy values are not true
    Assert<Check.True<"hello">, "non-empty string is truthy but not true">();
    // @ts-expect-error: truthy values are not true
    Assert<Check.True<[]>, "empty array is truthy but not true">();
    // @ts-expect-error: truthy values are not true
    Assert<Check.True<true[]>, "true array is not true">();
    Assert<
        // @ts-expect-error: union containing true is not exactly true
        Check.True<true | false>,
        "union containing true is not exactly true"
    >();
    // @ts-expect-error: any is not true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Assert<Check.True<any>, "any is not true">();
    // @ts-expect-error: never is not true
    Assert<Check.True<never>, "never is not true">();
    // @ts-expect-error: unknown is not true
    Assert<Check.True<unknown>, "unknown is not true">();
});

await test("Check.False<...> is true only for exact false type", () => {
    Assert<Check.False<false>, "false should be false">();

    // @ts-expect-error: true is not false
    Assert<Check.False<true>, "true is not false">();
    // @ts-expect-error: boolean union is not exact false
    Assert<Check.False<boolean>, "boolean is not exactly false">();
    // @ts-expect-error: falsy values are not false
    Assert<Check.False<0>, "0 is falsy but not false">();
    // @ts-expect-error: falsy values are not false
    Assert<Check.False<"">, "empty string is falsy but not false">();
    // @ts-expect-error: falsy values are not false
    Assert<Check.False<null>, "null is falsy but not false">();
    // @ts-expect-error: falsy values are not false
    Assert<Check.False<undefined>, "undefined is falsy but not false">();
    Assert<
        // @ts-expect-error: union containing false is not exactly false
        Check.False<true | false>,
        "union containing false is not exactly false"
    >();
});

await test("Check.Extends<...> tests subtype relationships", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Assert<Check.Extends<string, any>, "string extends any">();
    Assert<Check.Extends<never, string>, "never extends everything">();
    Assert<Check.Extends<"hello", string>, "literal extends its base type">();
    Assert<Check.Extends<1, number>, "literal extends its base type">();
    Assert<Check.Extends<true, boolean>, "literal extends its base type">();
    Assert<
        Check.Extends<{ a: number; b: string }, { a: number }>,
        "subtype extends supertype"
    >();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Assert<Check.Extends<string | number, any>, "unions extends any">();
    Assert<
        Check.Extends<string, string | number>,
        "type extends union containing it"
    >();

    // @ts-expect-error: string does not extend number
    Assert<Check.Extends<string, number>, "string does not extend number">();
    Assert<
        // @ts-expect-error: supertype does not extend subtype
        Check.Extends<{ a: number }, { a: number; b: string }>,
        "supertype does not extend subtype"
    >();
    Assert<
        // @ts-expect-error: disjoint union types
        Check.Extends<string | boolean, number | symbol>,
        "disjoint unions don't extend each other"
    >();

    interface A {
        a: number;
    }
    interface B extends A {
        b: string;
    }
    Assert<Check.Extends<B, A>, "derived interface extends base interface">();
    Assert<
        //@ts-expect-error: base interface does not extend derived interface
        Check.Extends<A, B>,
        "base interface does not extend derived interface"
    >();

    class C {
        a: number;
        constructor(a: number) {
            this.a = a;
        }
    }
    class D extends C {
        b: string;
        constructor(a: number, b: string) {
            super(a);
            this.b = b;
        }
    }
    Assert<Check.Extends<D, C>, "derived class extends base class">();
    //@ts-expect-error: base class does not extend derived class
    Assert<Check.Extends<C, D>, "base class does not extend derived class">();
});

await test("Check.IsNever<...> detects never type", () => {
    Assert<Check.IsNever<never>, "never should be detected as never">();

    // @ts-expect-error: undefined not never
    Assert<Check.IsNever<undefined>, "undefined is not never">();
    // @ts-expect-error: null not never
    Assert<Check.IsNever<null>, "null is not never">();
    // @ts-expect-error: void is not never
    Assert<Check.IsNever<void>, "void is not never">();
    // @ts-expect-error: any is not never
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Assert<Check.IsNever<any>, "any is not never">();
    // @ts-expect-error: unknown is not never
    Assert<Check.IsNever<unknown>, "unknown is not never">();
    // @ts-expect-error: array types are not never
    Assert<Check.IsNever<[]>, "empty array is not never">();
});

await test("Check.IsAny<...> detects any type", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Assert<Check.IsAny<any>, "any should be detected as any">();

    // @ts-expect-error: other types are not any
    Assert<Check.IsAny<unknown>, "unknown is not any">();
    // @ts-expect-error: other types are not any
    Assert<Check.IsAny<[]>, "empty array is not any">();
    // @ts-expect-error: other types are not any
    Assert<Check.IsAny<never>, "never is not any">();
    // @ts-expect-error: other types are not any
    Assert<Check.IsAny<string>, "string is not any">();
    // @ts-expect-error: other types are not any
    Assert<Check.IsAny<object>, "object is not any">();
    // @ts-expect-error: Must be a full any, not a subset.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Assert<Check.IsAny<Omit<any, "toString">>, "">();

    // @ts-expect-error: other types are not any
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Assert<Check.IsAny<{}>, "empty object type is not any">();
});

await test("Check.IsUnknown<...> detects unknown type", () => {
    Assert<Check.IsUnknown<unknown>, "unknown should be detected as unknown">();

    // @ts-expect-error: other types are not unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Assert<Check.IsUnknown<any>, "any is not unknown">();
    // @ts-expect-error: other types are not unknown
    Assert<Check.IsUnknown<[]>, "empty array is not unknown">();
    // @ts-expect-error: other types are not unknown
    Assert<Check.IsUnknown<never>, "never is not unknown">();
    // @ts-expect-error: other types are not unknown
    Assert<Check.IsUnknown<string>, "string is not unknown">();
    // @ts-expect-error: other types are not unknown
    Assert<Check.IsUnknown<object>, "object is not unknown">();
});

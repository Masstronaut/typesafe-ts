/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { test } from "node:test";
import assert from "node:assert";
import { Assert } from "../assert/assert.ts";
import type * as Check from "../assert/check.ts";
import {
    type Brand,
    apply_brand,
    brand_symbol,
    branded_error,
} from "./brand.ts";

await test("Brand", async (t) => {
    await t.test("produces a type error when used on a string", () => {
        // @ts-expect-error basic types can't have symbol properties added to them.
        type BrandedString = ReturnType<typeof apply_brand<string, "String">>; // eslint-disable-line @typescript-eslint/no-unused-vars
    });

    await t.test("produces a type error when used on a number", () => {
        // @ts-expect-error basic types can't have symbol properties added to them.
        type BrandedNumber = ReturnType<typeof apply_brand<number, "Number">>; // eslint-disable-line @typescript-eslint/no-unused-vars
    });

    await t.test("produces a type error when used on a boolean", () => {
        // @ts-expect-error basic types can't have symbol properties added to them.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        type BrandedBoolean = ReturnType<
            // @ts-expect-error basic types can't have symbol properties added to them.
            typeof apply_brand<boolean, "Boolean">
        >;
    });

    await t.test("produces a type error when used on a symbol", () => {
        // @ts-expect-error basic types can't have symbol properties added to them.
        type BrandedSymbol = ReturnType<typeof apply_brand<symbol, "Symbol">>; // eslint-disable-line @typescript-eslint/no-unused-vars
    });

    await t.test("produces a type error when used on null", () => {
        // @ts-expect-error basic types can't have symbol properties added to them.
        type BrandedNull = ReturnType<typeof apply_brand<null, "Null">>; // eslint-disable-line @typescript-eslint/no-unused-vars
    });

    await t.test("produces a type error when used on undefined", () => {
        // @ts-expect-error basic types can't have symbol properties added to them.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        type BrandedUndefined = ReturnType<
            // @ts-expect-error basic types can't have symbol properties added to them.
            typeof apply_brand<undefined, "Undefined">
        >;
    });

    await t.test("produces a type error when used on bigint", () => {
        // @ts-expect-error basic types can't have symbol properties added to them.
        type BrandedBigInt = ReturnType<typeof apply_brand<bigint, "BigInt">>; // eslint-disable-line @typescript-eslint/no-unused-vars
    });

    await t.test("works with function keyword syntax", () => {
        function regularFunction(x: number): string {
            return x.toString();
        }

        const brandedFunction = apply_brand(regularFunction, "TestFunction");

        assert.strictEqual(brandedFunction[brand_symbol], "TestFunction");
        assert.strictEqual(brandedFunction(42), "42");

        type BrandedFunctionType = typeof brandedFunction;
        Assert<
            Check.Extends<
                BrandedFunctionType,
                Brand<typeof regularFunction, "TestFunction">
            >
        >();
    });

    await t.test("works with arrow function syntax", () => {
        const arrowFunction = (x: number): string => x.toString();

        const brandedArrowFunction = apply_brand(
            arrowFunction,
            "TestArrowFunction"
        );

        assert.strictEqual(
            brandedArrowFunction[brand_symbol],
            "TestArrowFunction"
        );
        assert.strictEqual(brandedArrowFunction(42), "42");

        type BrandedArrowFunctionType = typeof brandedArrowFunction;
        Assert<
            Check.Extends<
                BrandedArrowFunctionType,
                Brand<typeof arrowFunction, "TestArrowFunction">
            >
        >();
    });

    await t.test("branded functions maintain correct typing", () => {
        function namedFunc(a: string, b: number): boolean {
            return a.length === b;
        }
        const arrowFunc = (a: string, b: number): boolean => a.length === b;

        const brandedNamed = apply_brand(namedFunc, "NamedBrand");
        const brandedArrow = apply_brand(arrowFunc, "ArrowBrand");

        assert.strictEqual(brandedNamed("hello", 5), true);
        assert.strictEqual(brandedArrow("world", 5), true);
        assert.strictEqual(brandedNamed[brand_symbol], "NamedBrand");
        assert.strictEqual(brandedArrow[brand_symbol], "ArrowBrand");

        type NamedType = typeof brandedNamed;
        type ArrowType = typeof brandedArrow;

        Assert<Check.Extends<NamedType, (a: string, b: number) => boolean>>();
        Assert<Check.Extends<ArrowType, (a: string, b: number) => boolean>>();
        Assert<
            Check.Extends<NamedType, Brand<typeof namedFunc, "NamedBrand">>
        >();
        Assert<
            Check.Extends<ArrowType, Brand<typeof arrowFunc, "ArrowBrand">>
        >();
    });

    await t.test("branded void functions remain invokable", () => {
        let sideEffect = 0;

        function voidFunc(): void {
            sideEffect = 42;
        }

        const brandedVoidFunc = apply_brand(voidFunc, "VoidBrand");

        assert.strictEqual(sideEffect, 0);
        brandedVoidFunc();
        assert.strictEqual(sideEffect, 42);
        assert.strictEqual(brandedVoidFunc[brand_symbol], "VoidBrand");

        type VoidType = typeof brandedVoidFunc;
        Assert<Check.Extends<VoidType, () => void>>();
        Assert<Check.Extends<VoidType, Brand<typeof voidFunc, "VoidBrand">>>();
    });

    await t.test(
        "branded closures maintain side-effects on captured values",
        () => {
            let capturedValue = 10;
            let anotherCaptured = "initial";

            const closure = (increment: number, newString: string) => {
                capturedValue += increment;
                anotherCaptured = newString;
                return capturedValue * 2;
            };

            const brandedClosure = apply_brand(closure, "ClosureBrand");

            assert.strictEqual(capturedValue, 10);
            assert.strictEqual(anotherCaptured, "initial");

            const result1 = brandedClosure(5, "modified");
            assert.strictEqual(result1, 30);
            assert.strictEqual(capturedValue, 15);
            assert.strictEqual(anotherCaptured, "modified");

            const result2 = brandedClosure(3, "final");
            assert.strictEqual(result2, 36);
            assert.strictEqual(capturedValue, 18);
            assert.strictEqual(anotherCaptured, "final");

            assert.strictEqual(brandedClosure[brand_symbol], "ClosureBrand");

            type ClosureType = typeof brandedClosure;
            Assert<
                Check.Extends<
                    ClosureType,
                    (increment: number, newString: string) => number
                >
            >();
            Assert<
                Check.Extends<
                    ClosureType,
                    Brand<typeof closure, "ClosureBrand">
                >
            >();
        }
    );

    await t.test("branded variadic functions work correctly", () => {
        function sum(...numbers: number[]): number {
            return numbers.reduce((acc, num) => acc + num, 0);
        }

        const brandedSum = apply_brand(sum, "SumBrand");

        Assert<
            Check.Equal<ReturnType<typeof brandedSum>, ReturnType<typeof sum>>,
            "Branding a function shouldn't change its return type."
        >();
        Assert<
            Check.Equal<Parameters<typeof brandedSum>, Parameters<typeof sum>>,
            "Branding a function shouldn't change its parameter types."
        >();

        assert.strictEqual(brandedSum(), 0);
        assert.strictEqual(brandedSum(1), 1);
        assert.strictEqual(brandedSum(1, 2, 3), 6);
        assert.strictEqual(brandedSum(10, 20, 30, 40), 100);

        assert.strictEqual(brandedSum[brand_symbol], "SumBrand");

        type SumType = typeof brandedSum;

        Assert<Check.Extends<SumType, (...numbers: number[]) => number>>();
        Assert<Check.Extends<SumType, Brand<typeof sum, "SumBrand">>>();
    });

    await t.test("works with empty arrays", () => {
        const emptyArray: number[] = [];
        const brandedEmpty = apply_brand(emptyArray, "EmptyArray");

        assert.strictEqual(brandedEmpty[brand_symbol], "EmptyArray");
        assert.strictEqual(brandedEmpty.length, 0);

        type EmptyArrayType = typeof brandedEmpty;
        Assert<Check.Extends<EmptyArrayType, number[]>>();
        Assert<Check.Extends<EmptyArrayType, Brand<number[], "EmptyArray">>>();
    });

    await t.test("works with arrays of intrinsic types", () => {
        const numbers = [1, 2, 3];
        const strings = ["hello", "world"];
        const booleans = [true, false];

        const brandedNumbers = apply_brand(numbers, "Numbers");
        const brandedStrings = apply_brand(strings, "Strings");
        const brandedBooleans = apply_brand(booleans, "Booleans");

        assert.strictEqual(brandedNumbers[brand_symbol], "Numbers");
        assert.strictEqual(brandedStrings[brand_symbol], "Strings");
        assert.strictEqual(brandedBooleans[brand_symbol], "Booleans");

        type NumberArrayType = typeof brandedNumbers;
        type StringArrayType = typeof brandedStrings;
        type BooleanArrayType = typeof brandedBooleans;

        Assert<Check.Extends<NumberArrayType, number[]>>();
        Assert<Check.Extends<StringArrayType, string[]>>();
        Assert<Check.Extends<BooleanArrayType, boolean[]>>();
        Assert<Check.Extends<NumberArrayType, Brand<number[], "Numbers">>>();
        Assert<Check.Extends<StringArrayType, Brand<string[], "Strings">>>();
        Assert<Check.Extends<BooleanArrayType, Brand<boolean[], "Booleans">>>();
    });

    await t.test("works with arrays of user-defined types", () => {
        interface User {
            id: number;
            name: string;
        }

        const users: User[] = [{ id: 1, name: "Alice" }];
        const brandedUsers = apply_brand(users, "Users");

        assert.strictEqual(brandedUsers[brand_symbol], "Users");
        assert.deepStrictEqual(brandedUsers, users);

        type UserArrayType = typeof brandedUsers;
        Assert<Check.Extends<UserArrayType, User[]>>();
        Assert<Check.Extends<UserArrayType, Brand<User[], "Users">>>();
        Assert<Check.Equal<UserArrayType[number], User>>();
    });

    await t.test("works with tuples", () => {
        const tuple: [string, number] = ["test", 42];
        const brandedTuple = apply_brand(tuple, "Tuple");

        assert.strictEqual(brandedTuple[brand_symbol], "Tuple");
        assert.strictEqual(brandedTuple.length, 2);
        assert.strictEqual(brandedTuple[0], "test");
        assert.strictEqual(brandedTuple[1], 42);

        type TupleType = typeof brandedTuple;
        Assert<Check.Extends<TupleType, [string, number]>>();
        Assert<Check.Extends<TupleType, Brand<[string, number], "Tuple">>>();
    });

    await t.test("branding an array doesn't create a copy", () => {
        const original = [1, 2, 3];
        const branded = apply_brand(original, "TestArray");

        assert.strictEqual(branded, original);
        assert.strictEqual(branded[brand_symbol], "TestArray");
    });

    await t.test("branded arrays still support array operations", () => {
        const numbers = [1, 2, 3];
        const branded = apply_brand(numbers, "Numbers");

        Assert<Check.Equal<(typeof branded)[number], number>>();

        branded.push(4);
        assert.strictEqual(branded.length, 4);
        assert.strictEqual(branded[3], 4);

        const sum = branded.reduce((acc, num) => acc + num, 0);
        assert.strictEqual(sum, 10);

        const doubled = branded.map((x) => x * 2);
        assert.deepStrictEqual(doubled, [2, 4, 6, 8]);

        assert.strictEqual(branded[brand_symbol], "Numbers");
    });

    await t.test("branded arrays preserve brand after mutation", () => {
        const array = [1, 2];
        const branded = apply_brand(array, "Mutable");

        branded.push(3);
        branded[0] = 99;
        // eslint-disable-next-line typesafe-ts/enforce-optional-usage
        branded.pop();

        assert.strictEqual(branded[brand_symbol], "Mutable");
        assert.strictEqual(branded[0], 99);
        assert.strictEqual(branded[1], 2);
        assert.strictEqual(branded.length, 2);
    });

    await t.test("tuple destructuring works with branded tuples", () => {
        const tuple: [string, number] = ["hello", 42];
        const branded = apply_brand(tuple, "DestructureTuple");

        const [first, second] = branded;
        assert.strictEqual(first, "hello");
        assert.strictEqual(second, 42);
        assert.strictEqual(branded[brand_symbol], "DestructureTuple");
    });

    await t.test("works with plain objects", () => {
        const obj = { name: "Alice", age: 30 };
        const branded = apply_brand(obj, "Person");

        assert.strictEqual(branded[brand_symbol], "Person");
        assert.strictEqual(branded.name, "Alice");
        assert.strictEqual(branded.age, 30);

        type PersonType = typeof branded;
        Assert<Check.Extends<PersonType, { name: string; age: number }>>();
        Assert<Check.Extends<PersonType, Brand<typeof obj, "Person">>>();
        Assert<Check.Equal<Pick<PersonType, keyof typeof obj>, typeof obj>>();
    });

    await t.test("works with objects containing methods", () => {
        const obj = {
            value: 42,
            getValue(): number {
                return this.value;
            },
            setValue(newValue: number): void {
                this.value = newValue;
            },
        };

        const branded = apply_brand(obj, "Calculator");

        assert.strictEqual(branded[brand_symbol], "Calculator");
        assert.strictEqual(branded.getValue(), 42);

        branded.setValue(100);
        assert.strictEqual(branded.getValue(), 100);
        assert.strictEqual(branded.value, 100);

        type CalculatorType = typeof branded;
        Assert<Check.Extends<CalculatorType, typeof obj>>();
        Assert<
            Check.Extends<CalculatorType, Brand<typeof obj, "Calculator">>
        >();
        Assert<
            Check.Equal<Pick<CalculatorType, keyof typeof obj>, typeof obj>
        >();
    });

    await t.test("works with class instances", () => {
        class Rectangle {
            constructor(width: number, height: number) {
                this.width = width;
                this.height = height;
            }
            width: number;
            height: number;
            area(): number {
                return this.width * this.height;
            }
        }

        const rect = new Rectangle(10, 20);
        const branded = apply_brand(rect, "Shape");

        assert.strictEqual(branded[brand_symbol], "Shape");
        assert.strictEqual(branded.width, 10);
        assert.strictEqual(branded.height, 20);
        assert.strictEqual(branded.area(), 200);

        type ShapeType = typeof branded;
        Assert<Check.Extends<ShapeType, Rectangle>>();
        Assert<Check.Extends<ShapeType, Brand<Rectangle, "Shape">>>();
        Assert<Check.Equal<Pick<ShapeType, keyof Rectangle>, Rectangle>>();
    });

    await t.test("works with class inheritance", () => {
        class Animal {
            constructor(name: string) {
                this.name = name;
            }
            name: string;
            speak(): string {
                return `${this.name} makes a sound`;
            }
        }

        class Dog extends Animal {
            constructor(name: string, breed: string) {
                super(name);
                this.breed = breed;
            }
            breed: string;
            override speak(): string {
                return `${this.name} barks`;
            }
        }

        const dog = new Dog("Rex", "Golden Retriever");
        const branded = apply_brand(dog, "Pet");

        assert.strictEqual(branded[brand_symbol], "Pet");
        assert.strictEqual(branded.name, "Rex");
        assert.strictEqual(branded.breed, "Golden Retriever");
        assert.strictEqual(branded.speak(), "Rex barks");
        assert.ok(branded instanceof Dog);
        assert.ok(branded instanceof Animal);

        type PetType = typeof branded;
        Assert<Check.Extends<PetType, Dog>>();
        Assert<Check.Extends<PetType, Brand<Dog, "Pet">>>();
        Assert<Check.Equal<Pick<PetType, keyof Dog>, Dog>>();
    });

    await t.test("branding an object doesn't create a copy", () => {
        const original = { x: 1, y: 2 };
        const branded = apply_brand(original, "Point");

        assert.strictEqual(branded, original);
        assert.strictEqual(branded[brand_symbol], "Point");
    });

    await t.test("branded objects still support property access", () => {
        const obj = { count: 0, items: ["a", "b"] };
        const branded = apply_brand(obj, "Container");

        branded.count = 5;
        branded.items.push("c");

        assert.strictEqual(branded.count, 5);
        assert.deepStrictEqual(branded.items, ["a", "b", "c"]);
        assert.strictEqual(branded[brand_symbol], "Container");
    });

    await t.test("branded objects still support method calls", () => {
        const obj = {
            counter: 0,
            increment(): number {
                return ++this.counter;
            },
            getCounter(): number {
                return this.counter;
            },
        };

        const branded = apply_brand(obj, "Counter");

        assert.strictEqual(branded.increment(), 1);
        assert.strictEqual(branded.increment(), 2);
        assert.strictEqual(branded.getCounter(), 2);
        assert.strictEqual(branded[brand_symbol], "Counter");
    });

    await t.test("branded objects preserve brand after mutation", () => {
        const obj = { data: "initial" };
        const branded = apply_brand(obj, "Mutable");

        branded.data = "modified";
        Object.assign(branded, { extra: "property" });

        assert.strictEqual(branded[brand_symbol], "Mutable");
        assert.strictEqual(branded.data, "modified");
        assert.strictEqual("extra" in branded, true);
    });

    await t.test("branded class instances preserve inheritance", () => {
        class Base {
            baseMethod(): string {
                return "base";
            }
        }

        class Derived extends Base {
            derivedMethod(): string {
                return "derived";
            }
        }

        const instance = new Derived();
        const branded = apply_brand(instance, "Inherited");

        assert.strictEqual(branded[brand_symbol], "Inherited");
        assert.strictEqual(branded.baseMethod(), "base");
        assert.strictEqual(branded.derivedMethod(), "derived");
        assert.ok(branded instanceof Derived);
        assert.ok(branded instanceof Base);

        type InheritedType = typeof branded;
        Assert<Check.Equal<Pick<InheritedType, keyof Derived>, Derived>>();
    });

    await t.test("brand symbol discriminates union of error types", () => {
        class ValidationError extends Error {
            constructor(message: string) {
                super(message);
            }
        }

        class PasswordTooShortError extends ValidationError {
            minLength: number;
            constructor(message: string, minLength: number) {
                super(message);
                this.minLength = minLength;
            }
        }

        class PasswordNoNumberError extends ValidationError {}

        class PasswordNoSpecialCharError extends ValidationError {}

        type BrandedTooShort = Brand<
            PasswordTooShortError,
            "PasswordTooShortError"
        >;
        type BrandedNoNumber = Brand<
            PasswordNoNumberError,
            "PasswordNoNumberError"
        >;
        type BrandedNoSpecial = Brand<
            PasswordNoSpecialCharError,
            "PasswordNoSpecialCharError"
        >;
        type ErrorUnion = BrandedTooShort | BrandedNoNumber | BrandedNoSpecial;

        const error: ErrorUnion = apply_brand(
            new PasswordTooShortError(
                "Password must be at least 8 characters",
                8
            ),
            "PasswordTooShortError"
        ) as ErrorUnion;

        type BrandType = (typeof error)[typeof brand_symbol];

        Assert<
            Check.Equal<
                BrandType,
                | "PasswordTooShortError"
                | "PasswordNoNumberError"
                | "PasswordNoSpecialCharError"
            >
        >();

        switch (error[brand_symbol]) {
            case "PasswordTooShortError": {
                type NarrowedType = typeof error;
                Assert<Check.Equal<NarrowedType, BrandedTooShort>>();

                assert.ok(error instanceof PasswordTooShortError);
                assert.strictEqual(
                    error.message,
                    "Password must be at least 8 characters"
                );
                assert.strictEqual(error.minLength, 8);
                break;
            }
            case "PasswordNoNumberError": {
                type NarrowedType = typeof error;
                Assert<Check.Equal<NarrowedType, BrandedNoNumber>>();

                assert.ok(error instanceof PasswordNoNumberError);
                assert.strictEqual(
                    error.message,
                    "Password must be at least 8 characters"
                );
                break;
            }
            case "PasswordNoSpecialCharError": {
                type NarrowedType = typeof error;
                Assert<Check.Equal<NarrowedType, BrandedNoSpecial>>();

                assert.ok(error instanceof PasswordNoSpecialCharError);
                assert.strictEqual(
                    error.message,
                    "Password must be at least 8 characters"
                );
                break;
            }
        }
    });

    await t.test("brand symbol variable discriminates union types", () => {
        class TooShortError extends branded_error("PasswordTooShort") {}
        class NoNumberError extends branded_error("PasswordNoNumber") {}
        class NoSpecialCharError extends branded_error(
            "PasswordNoSpecialChar"
        ) {}

        // eslint-disable-next-line typesafe-ts/enforce-optional-usage
        function validatePassword(password: string) {
            if (password.length < 8) return new TooShortError();
            if (!/\d/.test(password)) return new NoNumberError();
            if (!/[!@#$%^&*]/.test(password)) return new NoSpecialCharError();
            return null;
        }

        const validationError = validatePassword("short");
        if (!validationError) {
            assert.fail("Expected validation error");
        }

        const errorBrand = validationError[brand_symbol];

        type ErrorBrandType = typeof errorBrand;
        Assert<
            Check.Equal<
                ErrorBrandType,
                | "PasswordTooShort"
                | "PasswordNoNumber"
                | "PasswordNoSpecialChar"
            >
        >();

        switch (errorBrand) {
            case "PasswordTooShort": {
                type NarrowedBrandType = typeof errorBrand;
                Assert<Check.Equal<NarrowedBrandType, "PasswordTooShort">>();

                type NarrowedErrorType = typeof validationError;
                Assert<Check.Equal<NarrowedErrorType, TooShortError>>();

                assert.strictEqual(errorBrand, "PasswordTooShort");
                assert.strictEqual(validationError.message, "PasswordTooShort");
                break;
            }
            case "PasswordNoNumber": {
                type NarrowedBrandType = typeof errorBrand;
                Assert<Check.Equal<NarrowedBrandType, "PasswordNoNumber">>();

                type NarrowedErrorType = typeof validationError;
                Assert<Check.Equal<NarrowedErrorType, NoNumberError>>();

                assert.fail("Should not reach this case");
            }
            case "PasswordNoSpecialChar": {
                type NarrowedBrandType = typeof errorBrand;
                Assert<
                    Check.Equal<NarrowedBrandType, "PasswordNoSpecialChar">
                >();

                type NarrowedErrorType = typeof validationError;
                Assert<Check.Equal<NarrowedErrorType, NoSpecialCharError>>();

                assert.fail("Should not reach this case");
            }
        }
    });
});

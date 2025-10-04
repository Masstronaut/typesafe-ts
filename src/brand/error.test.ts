/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { test } from "node:test";
import assert from "node:assert";
import { brand_symbol, type Brand, brand, branded_error } from "./brand.ts";
import { Assert, type Check } from "../assert/index.ts";

class MyError extends brand.Error("MyError") {}
class ValidationError extends brand.Error("ValidationError")<{
    field: string;
    reason?: string;
}> {}
class NetworkError extends brand.Error("NetworkError")<{
    statusCode?: number;
    url: string;
}> {}
class DataError extends brand.Error("DataError")<{
    code: number;
    metadata: string;
    details: { reason: string; timestamp: number };
}> {}

await test("branded_error", async (t) => {
    await t.test("should create error with tag only", () => {
        const error = new MyError();

        Assert<Check.Equal<(typeof error)[typeof brand_symbol], "MyError">>();

        assert.ok(error instanceof Error);
        assert.ok(error instanceof MyError);
        assert.strictEqual(error[brand_symbol], "MyError");
        assert.strictEqual(error.message, "MyError");
        assert.strictEqual(error.name, "MyError");
    });

    await t.test("should create error with custom data", () => {
        const error = new ValidationError({
            reason: "invalid format",
            field: "email",
        });

        Assert<
            Check.Equal<(typeof error)[typeof brand_symbol], "ValidationError">
        >();
        Assert<Check.Extends<typeof error, Brand<Error, "ValidationError">>>();
        Assert<Check.Equal<typeof error.field, string>>();
        Assert<Check.Equal<typeof error.reason, string | undefined>>();

        assert.strictEqual(error.field, "email");
        assert.strictEqual(error.reason, "invalid format");
        assert.ok(error instanceof Error);
        assert.strictEqual(error[brand_symbol], "ValidationError");
    });

    await t.test("should create error with optional data", () => {
        const error1 = new NetworkError({ url: "https://example.com" });
        Assert<Check.Equal<typeof error1.url, string>>();
        Assert<Check.Equal<typeof error1.statusCode, number | undefined>>();

        assert.strictEqual(error1.url, "https://example.com");
        assert.strictEqual(error1.statusCode, undefined);

        const error2 = new NetworkError({
            url: "https://example.com",
            statusCode: 404,
        });
        assert.strictEqual(error2.statusCode, 404);
    });

    await t.test("should spread data properties onto error instance", () => {
        const error = new DataError({
            code: 500,
            metadata: "test",
            details: { reason: "TestReason", timestamp: Date.now() },
        });

        Assert<Check.Equal<typeof error.code, number>>();
        Assert<Check.Equal<typeof error.metadata, string>>();

        assert.strictEqual(error.code, 500);
        assert.strictEqual(error.metadata, "test");
        assert.ok(Object.hasOwn(error, "code"));
        assert.ok(Object.hasOwn(error, "metadata"));
    });

    await t.test("should use tag as default message", () => {
        class MyError extends branded_error("MyError") {}
        const error = new MyError();

        assert.strictEqual(error.message, "MyError");
    });

    await t.test("should use custom message when provided", () => {
        class MyError extends branded_error("MyError") {}
        const error = new MyError({ message: "Custom error message" });

        assert.strictEqual(error.message, "Custom error message");
        assert.strictEqual(error[brand_symbol], "MyError");
    });

    await t.test(
        "should combine tag and custom data with custom message",
        () => {
            class ValidationError extends branded_error("ValidationError")<{
                field: string;
            }> {}

            const error = new ValidationError({
                field: "email",
                message: "Email validation failed",
            });

            assert.strictEqual(error.message, "Email validation failed");
            assert.strictEqual(error.field, "email");
            assert.strictEqual(error[brand_symbol], "ValidationError");
        }
    );

    await t.test("should have correct name property", () => {
        class MyError extends branded_error("MyError") {}
        const error = new MyError();

        assert.strictEqual(error.name, "MyError");
    });

    await t.test("should have stack trace", () => {
        class MyError extends branded_error("MyError") {}
        const error = new MyError();

        assert.ok(error.stack);
        assert.ok(error.stack?.includes("MyError"));
    });

    await t.test("should preserve custom data properties", () => {
        const error = new DataError({
            code: 500,
            metadata: "test",
            details: { reason: "Internal", timestamp: Date.now() },
        });

        Assert<Check.Equal<typeof error.code, number>>();
        Assert<Check.Equal<typeof error.details.reason, string>>();
        Assert<Check.Equal<typeof error.details.timestamp, number>>();

        assert.strictEqual(error.code, 500);
        assert.strictEqual(error.details.reason, "Internal");
        assert.ok(typeof error.details.timestamp === "number");
    });

    await t.test("should discriminate by brand symbol", () => {
        type ErrorUnion =
            | InstanceType<typeof MyError>
            | InstanceType<typeof ValidationError>;

        const error: ErrorUnion = new MyError() as ErrorUnion;
        const errorBrand = error[brand_symbol];

        Assert<Check.Equal<typeof errorBrand, "MyError" | "ValidationError">>();

        if (errorBrand === "MyError") {
            assert.ok(true);
        } else {
            assert.fail("Should be MyError");
        }
    });

    await t.test("should discriminate by brand with switch", () => {
        type ErrorUnion =
            | InstanceType<typeof MyError>
            | InstanceType<typeof ValidationError>;

        const errors: ErrorUnion[] = [
            new MyError(),
            new ValidationError({ field: "test" }),
        ];
        const error = errors[1]!;
        const tag = error[brand_symbol];

        switch (tag) {
            case "MyError":
                assert.fail("The wrong branch was triggered.");
            case "ValidationError":
                assert.ok(true);
                break;
        }
    });

    await t.test("should work with different data shapes", () => {
        type AppError =
            | InstanceType<typeof NetworkError>
            | InstanceType<typeof ValidationError>;

        const error: AppError = new ValidationError({
            field: "email",
            reason: "test",
        });
        const errorBrand = error[brand_symbol];

        if (errorBrand === "ValidationError") {
            assert.strictEqual(error.field, "email");
        } else {
            assert.fail("Should be ValidationError");
        }
    });

    await t.test("should work with instanceof", () => {
        class MyError extends branded_error("MyError") {}
        class OtherError extends branded_error("OtherError") {}

        const error = new MyError();

        assert.ok(error instanceof MyError);
        assert.ok(error instanceof Error);
        assert.ok(!(error instanceof OtherError));
    });

    await t.test("should be throwable", () => {
        class MyError extends branded_error("MyError") {}

        assert.throws(
            () => {
                throw new MyError();
            },
            (err: unknown) => {
                if (err instanceof MyError) {
                    return err[brand_symbol] === "MyError";
                }
                return false;
            }
        );
    });

    await t.test("should preserve data when thrown", () => {
        try {
            throw new DataError({
                code: 404,
                metadata: "not found",
                details: { reason: "NotFound", timestamp: Date.now() },
            });
        } catch (err) {
            assert.ok(err instanceof DataError);
            if (err instanceof DataError) {
                assert.strictEqual(err.code, 404);
                assert.strictEqual(err[brand_symbol], "DataError");
            }
        }
    });

    await t.test("should have brand_symbol property", () => {
        class MyError extends branded_error("MyError") {}
        const error = new MyError();

        assert.strictEqual(error[brand_symbol], "MyError");
        assert.ok(brand_symbol in error);
    });

    await t.test("should have readonly brand at type level", () => {
        class MyError extends branded_error("MyError") {}
        const error = new MyError();

        Assert<Check.Equal<(typeof error)[typeof brand_symbol], "MyError">>();
        assert.strictEqual(error[brand_symbol], "MyError");
    });

    await t.test("should freeze the brand namespace", () => {
        assert.ok(Object.isFrozen(brand));
    });

    await t.test("should handle complex nested data", () => {
        class ComplexError extends branded_error("ComplexError")<{
            nested: {
                deep: {
                    value: string;
                };
            };
        }> {}

        const error = new ComplexError({
            nested: { deep: { value: "test" } },
        });

        Assert<Check.Equal<typeof error.nested.deep.value, string>>();
        assert.strictEqual(error.nested.deep.value, "test");
    });

    await t.test("should handle array data", () => {
        class ArrayError extends branded_error("ArrayError")<{
            items: string[];
        }> {}

        const error = new ArrayError({ items: ["a", "b", "c"] });

        Assert<Check.Extends<typeof error.items, string[]>>();
        assert.deepStrictEqual(error.items, ["a", "b", "c"]);
    });

    await t.test("should extend standard Error", () => {
        class MyError extends branded_error("MyError") {}
        const error = new MyError();

        assert.ok(error instanceof Error);
    });

    await t.test("should work in catch blocks expecting Error", () => {
        class MyError extends branded_error("MyError") {}

        try {
            throw new MyError({ message: "test error" });
        } catch (err) {
            assert.ok(err instanceof Error);
            if (err instanceof Error) {
                assert.strictEqual(err.message, "test error");
            }
        }
    });

    await t.test("should be compatible with Brand<Error, Tag>", () => {
        class MyError extends branded_error("MyError") {}
        const error = new MyError(); // eslint-disable-line @typescript-eslint/no-unused-vars

        Assert<Check.Extends<typeof error, Brand<Error, "MyError">>>();
    });

    await t.test("should allow brand.get() on error instances", () => {
        const myError = new MyError();
        const validationError = new ValidationError({ field: "test" });

        const brandA = myError[brand_symbol];
        const brandB = validationError[brand_symbol];

        Assert<Check.Equal<typeof brandA, "MyError">>();
        Assert<Check.Equal<typeof brandB, "ValidationError">>();

        assert.strictEqual(brandA, "MyError");
        assert.strictEqual(brandB, "ValidationError");
    });
});

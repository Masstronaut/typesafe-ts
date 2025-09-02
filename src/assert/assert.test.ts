import { test } from "node:test";
import { Assert } from "./index.ts";

await test("Assert compiles when provided `true`", () => {
  Assert<true>();

  /**
   * this is horrible and I wish desperately for a solution
   * but I have not found a way to constrain a type parameter to simultaneously:
   * 1. disallow types that extend true and are not exactly true - `never` and `any`
   * 2. produce a compiler error on the provided type, rather than somewhere else
   *
   * This library considers asserting either of those types to be undefined behavior:
   * - Assert<never>()   // undefined behavior
   * - Assert<any>()     // undefined behavior
   *
   * Depending on assertions for those types to compile may one day result in compiler errors
   * in a non-breaking change to this library if a way to constrain against them is found.
   * In such a case, the relevant asserts below should be updated to expect an error.
   */
  Assert<never, "never is not true; this is undefined behavior.">();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Assert<any, "any is not true; this is undefined behavior.">();
});

await test("Assert produces compiler errors when not provided `true`", () => {
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<false, "False is not true">();
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<null, "null is not true">();
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<undefined, "undefined is not true">();
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<string, "string is not true">();
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<boolean, "boolean is not true">();
  // @ts-expect-error: Assert should only compile when provided _exactly_ `true`
  Assert<true | false, "A union containing true is not _exactly_ true">();
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<unknown, "unknown is not true">();
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<{ true: true }, "an object with the key `true` is not true">();
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<1, "1 is a truthy value, but it is not true">();
  // @ts-expect-error: Assert should only compile when provided `true`
  Assert<"true", `The string "true" is not the type true`>();

  // any and never are undefined behavior. If a way to constrain against them is found,
  // they should be updated here to expect errors.
  Assert<never, "never is not true; this is undefined behavior.">();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Assert<any, "any is not true; this is undefined behavior.">();
});


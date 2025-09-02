/*
Copyright (c) 2025 Allan Deutsch

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const brand = Symbol("brand");

type BrandType<T, Brand extends string> = T & { [brand]: Brand };

type BrandValue<T, Brand extends string> = T & { [brand]: Brand };

function brand_value<T, const Brand extends string>(
  value: T,
  brand_string: Brand,
) {
  const result = value as BrandValue<T, Brand>;
  result[brand] = brand_string;
  return result;
}

function brand_type<T, const Brand extends string>(
  value: T,
  // @ts-expect-error: The string is only provided to infer the brand type.
  brand_string: Brand, // eslint-disable-line @typescript-eslint/no-unused-vars
): BrandType<T, Brand> {
  return value as BrandType<T, Brand>;
}

export { type BrandType, type BrandValue, brand_value, brand_type };

# Optional

The `Optional` type is a monadic alternative to `null`/`undefined` for expressing the result of operations that may not produce a value, and to work with those results. It provides a way to handle optional values in an expressive and type-safe manner.

Code that returns `null` or `undefined` when it doesn't produce a value has a couple shortcomings:

1. It can't distinguish between "no value" and "value is `null`/`undefined`".
2. Client code must check for `null`/`undefined` before using the value, which can lead to repetitive and error-prone code.

`Optional` addresses these issues by wrapping a value that may or may not be present in a way that allows `null`/`undefined` to be valid values. It additionally provides expressive methods that encapsulate the checks for empty values, making it possible to write expressive code that doesn't need to repeatedly check for an empty value.

# The `Optional` interface

`Optional` is fully documented inline. The best way to view its documentation is in your editor, while using it. You can also view the documentation for each method [in this source code](./optional.ts).

Here's an overview of the `Optional` interface:

```ts optional.ts
// Interface definition that can be used for type annotations.
export interface Optional<ValueType> {
  // Check if the optional has a value. If it does, it will be widened to include a `value` property.
  is_some(): this is OptionalWithValue<ValueType>;

  // If the optional has a value, return it. Otherwise, return the provided default value.
  value_or(value_if_empty: ValueType): ValueType;

  // If the optional has a value, map it and return a new Optional with the mapped value.
  // Otherwise, return an empty Optional.
  map<NewValueType>(
    mapper_fn: (value: ValueType) => NewValueType,
  ): Optional<NewValueType>;

  // If this Optional has a value, apply the function to it. Otherwise, return an empty Optional.
  and_then<NewValueType>(
    fn: (value: ValueType) => Optional<NewValueType>,
  ): Optional<NewValueType>;

  // Provide an alternative value if this Optional is empty.
  or_else(fn: () => Optional<ValueType>): Optional<ValueType>;
}

export const optional = {
  some, // constructs an `Optional` with a value
  none, // constructs an `Optional` without a value
};
```

# Example usage

Sometimes an operation involves a series of steps, any of which may fail to produce a value usable on the next step. This sort of operation often results in repetitive `null` checks that are tedious to write and challenging to read. It requires more code, which increases the likelihood of bugs being introduced and increases the maintenance burden.

Here's an example of such an operation where any of a series of steps may not produce a value. It could benefit from `Optional`'s monadic interface to simplify handling the absence of values.

```ts
function getUserByUsername(username: string): User | null { ... }
function getUserPosts(userId: string): Post[] | null { ... }
function getPostComments(postId: string): Comment[] | null { ... }
function getUserPostsWithComments(
  username: string): { post: Post; comments: Comment[] }[] | null {
  const user: User | null = getUserByUsername(username);
  if (!user) {
    return null;
  }
  const posts: Post[] | null = getUserPosts(user.id);
  if (!posts) {
    return null;
  }
  const postsWithComments = posts.map(post => {
    const comments: Comment[] | null = getPostComments(post.id);
    return {
      post,
      comments: comments
    };
  });
  return postsWithComments.filter(
    ({ comments }) => comments !== null && comments.length > 0
  );
}

const postsWithComments = getUserPostsWithComments('alice');
if(postsWithComments) {
    renderPostsWithComments(postsWithComments);
} else {
    renderEmptyPosts();
}
```

At every step, the code needs to perform a `null` check. Out of 18 lines of code, 8 of them are null checks. Every function called by `getUserPostsWithComments` must have its own null checks, and the client code consuming `getUserPostsWithComments` must also check for `null`. That's a lot of boilerplate code to do nothing!

Let's take a look at how this code could be implemented using `Optional` instead of `null` to represent the absence of a value. Optional provides interfaces for operating on the value if it is present or if it is empty. This makes it straightforward to chain operations and handle the absence of values.

```ts
function getUserByUsername(username: string): Optional<User> { ... }
function getUserPosts(userId: string): Optional<Post[]> { ... }
function getPostComments(postId: string): Optional<Comment[]> { ... }
function getUserPostsWithComments(
  username: string): Optional<{ post: Post; comments: Comment[] }[]> {
  getUserByUsername(username)
    .and_then(user => getUserPosts(user.id))
    .and_then(posts => posts.map(post => ({
      post,
      comments: getPostComments(post.id)
    })))
    .and_then(postsWithComments => postsWithComments.filter(
      ({ comments }) => comments.has_value() && comments.length > 0
    ));
}

const postsWithComments = getUserPostsWithComments(`alice`);
if(postsWithComments.is_some()) {
    // the `.value` property is only available after widening it by checking `is_some()`
    renderPostsWithComments(postsWithComments.value);
} else {
    renderEmptyPosts();
}
```

Similar to the version using `null`, each step of the operation will only be run if the previous step produced a value. `Optional`'s `.and_then()` method encapsulates the empty check and only runs the provided function is a value is present. This made it possible to implement the `getUserPostsWithComments` using `Optional` in 11 lines of code, whereas before it required 20 lines.

import { test } from "node:test";
import assert from "node:assert";

import { optional, type Optional } from "./optional.ts";

// Mock types for the example
interface User {
  id: string;
  username: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
}

interface Comment {
  id: string;
  text: string;
  author: string;
}

test("Readme examples work correctly", async (t) => {
  t.test("Optional-based post and comments system", () => {
    // Mock data
    const users: User[] = [
      { id: "1", username: "alice" },
      { id: "2", username: "bob" },
    ];

    const posts: Post[] = [
      { id: "1", title: "Post 1", content: "Content 1" },
      { id: "2", title: "Post 2", content: "Content 2" },
    ];

    const comments: Comment[] = [
      { id: "1", text: "Great post!", author: "bob" },
      { id: "2", text: "I agree", author: "alice" },
      { id: "3", text: "Nice work", author: "bob" },
    ];

    function getUserByUsername(username: string): Optional<User> {
      // eslint-disable-next-line typesafe-ts/enforce-optional-usage
      const user = users.find((u) => u.username === username);
      return user ? optional.some(user) : optional.none();
    }

    function getUserPosts(userId: string): Optional<Post[]> {
      // For this example, user "1" (alice) has posts, user "2" (bob) doesn't
      if (userId === "1") {
        return optional.some(posts);
      }
      return optional.none();
    }

    function getPostComments(_postId: string): Optional<Comment[]> {
      const postComments = comments.filter((_) => true); // All comments for simplicity
      return postComments.length > 0
        ? optional.some(postComments)
        : optional.none();
    }

    function getUserPostsWithComments(
      username: string,
    ): Optional<{ post: Post; comments: Comment[] }[]> {
      return getUserByUsername(username)
        .and_then((user) => getUserPosts(user.id))
        .and_then((userPosts) => {
          const postsWithComments = userPosts.map((post) => ({
            post,
            comments: getPostComments(post.id).value_or([]),
          }));
          const postsWithNonEmptyComments = postsWithComments.filter(
            ({ comments }) => comments.length > 0,
          );
          return postsWithNonEmptyComments.length > 0
            ? optional.some(postsWithNonEmptyComments)
            : optional.none();
        });
    }

    // Test successful case
    const alicePostsWithComments = getUserPostsWithComments("alice");
    assert.ok(alicePostsWithComments.is_some());
    if (alicePostsWithComments.is_some()) {
      assert.strictEqual(alicePostsWithComments.value.length, 2);
      assert.strictEqual(alicePostsWithComments.value[0]!.post.title, "Post 1");
      assert.strictEqual(alicePostsWithComments.value[0]!.comments.length, 3);
    }

    // Test user not found
    const unknownUserPosts = getUserPostsWithComments("charlie");
    assert.ok(!unknownUserPosts.is_some());

    // Test user with no posts
    const bobPostsWithComments = getUserPostsWithComments("bob");
    assert.ok(!bobPostsWithComments.is_some());

    // Test the conditional rendering pattern from readme
    const postsWithComments = getUserPostsWithComments("alice");
    let renderResult: string;

    if (postsWithComments.is_some()) {
      // the `.value` property is only available after widening it by checking `is_some()`
      renderResult = `Rendered ${postsWithComments.value.length} posts with comments`;
    } else {
      renderResult = "Rendered empty posts";
    }

    assert.strictEqual(renderResult, "Rendered 2 posts with comments");

    // Test the empty case rendering
    const emptyPosts = getUserPostsWithComments("bob");
    let emptyRenderResult: string;

    if (emptyPosts.is_some()) {
      emptyRenderResult = `Rendered ${emptyPosts.value.length} posts with comments`;
    } else {
      emptyRenderResult = "Rendered empty posts";
    }

    assert.strictEqual(emptyRenderResult, "Rendered empty posts");
  });
});

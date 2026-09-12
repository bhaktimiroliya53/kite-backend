const express = require("express");
const router = express.Router();

const {
  createPost,
  getPosts,
  searchPosts,
  getUserPosts,
  deletePost,
  editPost,
  toggleLike,
  addComment,
  toggleCommentLike,
  deleteComment,
  toggleRepost,
  reportPost,
  toggleSave,
  addReply,
  toggleReplyLike,
  repostComment,
} = require("../controllers/postController");

router.post("/", createPost);

router.get("/", getPosts);

router.get("/search", searchPosts);

router.get("/user/:userId", getUserPosts);

router.delete("/:id", deletePost);

router.put("/edit/:id", editPost);

router.put("/like/:id", toggleLike);

router.put("/comment/:id", addComment);

router.put(
  "/comment-like/:postId/:commentIndex",
  toggleCommentLike
);

router.delete(
  "/comment/:postId/:commentIndex",
  deleteComment
);

router.put("/reply/:postId/:commentIndex", addReply);

router.put(
  "/reply-like/:postId/:commentIndex/:replyIndex",
  toggleReplyLike
);

router.put("/repost/:id", toggleRepost);

router.put("/save/:id", toggleSave);

router.post("/report/:id", reportPost);

module.exports = router;

router.put(
 "/reply/:postId/:commentIndex",
 addReply
);

router.put(
"/comment-repost/:postId/:commentIndex",
repostComment
);
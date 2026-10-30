const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  createPost,
  getPosts,
  getTopics,
  searchPosts,
  getPostById,
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
  deleteReply,
  repostComment,
  
} = require("../controllers/postController");

router.post("/", createPost);

router.get("/", getPosts);

router.get("/topics", getTopics);

router.get("/search", searchPosts);

router.get("/user/:userId", getUserPosts);

router.get("/:id", getPostById);

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
  authMiddleware,
  deleteComment
);

router.put("/reply/:postId/:commentIndex", addReply);

router.delete(
  "/reply/:postId/:commentIndex/:replyIndex",
  authMiddleware,
  deleteReply
);

router.put(
  "/reply-like/:postId/:commentIndex/:replyIndex",
  toggleReplyLike
);

router.put("/repost/:id", toggleRepost);

router.put("/save/:id", toggleSave);

router.post("/report/:id", reportPost);

module.exports = router;

router.put(
"/comment-repost/:postId/:commentIndex",
repostComment
);
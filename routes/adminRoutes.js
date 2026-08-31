const express = require("express");
const router = express.Router();

const adminMiddleware = require("../middleware/adminMiddleware");

const {
  getDashboard,
  getAllUsers,
  deleteUser,
  getAllPosts,
  deletePost,
  getAnalytics,
  getNotifications,
} = require("../controllers/adminController"); 

// Dashboard
router.post("/dashboard", adminMiddleware, getDashboard);

// Users
router.post("/users", adminMiddleware, getAllUsers);

// Delete User
router.delete("/users/:id", adminMiddleware, deleteUser);

// Posts
router.post("/posts", adminMiddleware, getAllPosts);

// Delete Post
router.delete("/posts/:id", adminMiddleware, deletePost);

// Analytics
router.get("/analytics", adminMiddleware, getAnalytics);

// Notifications
router.get("/notifications", adminMiddleware, getNotifications);

module.exports = router;
const express = require("express");

const {
  getAllUsers,
  searchUsers,  
  getProfile,
  updateProfile,
  toggleFollow,
  updateSettings,
  runSecurityCheck,
  approveFollowRequest,
  rejectFollowRequest,
  logoutSession,
  updateDigitalExpiry,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAllUsers);

router.get("/search", searchUsers);

router.put("/follow/:id", toggleFollow);

router.put("/follow-request/approve/:id", approveFollowRequest);

router.put("/follow-request/reject/:id", rejectFollowRequest);

router.put("/settings/:id", updateSettings);

router.put("/security-check", authMiddleware, runSecurityCheck);

router.put(
  "/digital-expiry",
  authMiddleware,
  updateDigitalExpiry
);

router.put(
  "/sessions/:sessionId/logout",
  authMiddleware,
  logoutSession,
);

router.put("/:id", updateProfile);

router.get("/:id", getProfile);

module.exports = router;
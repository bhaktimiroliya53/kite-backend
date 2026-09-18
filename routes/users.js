const express = require("express");

const {
  getAllUsers,
  searchUsers,  
  getProfile,
  updateProfile,
  getProfileChangeHistory,
  toggleFollow,
  updateSettings,
  approveFollowRequest,
  rejectFollowRequest,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAllUsers);

router.get("/search", searchUsers);

router.put("/follow/:id", toggleFollow);

router.put("/follow-request/approve/:id", approveFollowRequest);

router.put("/follow-request/reject/:id", rejectFollowRequest);

router.get("/:id/profile-history", getProfileChangeHistory);

router.get("/:id", getProfile);

router.put("/:id", updateProfile);

router.put("/settings/:id", updateSettings);

module.exports = router;
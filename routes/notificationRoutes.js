const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markNotificationAsRead,
} = require("../controllers/notificationController");

router.get("/:userId", getNotifications);
router.put("/read/:notificationId", markNotificationAsRead);

module.exports = router;
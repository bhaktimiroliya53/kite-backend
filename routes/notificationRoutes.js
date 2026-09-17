const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

router.get("/:userId", getNotifications);
router.put("/read/:notificationId", markNotificationAsRead);
router.delete("/:notificationId", deleteNotification);


module.exports = router;
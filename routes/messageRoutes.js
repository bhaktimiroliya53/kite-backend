const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
  reactToMessage,
  deleteMessage,
  shareComment,
  updateMessage,
} = require("../controllers/messageController");

router.post("/", sendMessage);

router.post("/share-comment", shareComment);

router.get("/:senderId/:receiverId", getMessages);

router.put("/react/:messageId", reactToMessage);

router.put("/:messageId", updateMessage);

// 🗑 Delete Message
router.delete("/:messageId", deleteMessage);

module.exports = router;
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  generateAIImage,
} = require("../controllers/imageGenerationController");

router.post("/generate", authMiddleware, generateAIImage);

module.exports = router;
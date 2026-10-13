const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  generateAIImage,
  getMyGeneratedImages,
} = require("../controllers/imageGenerationController");

router.post("/generate", authMiddleware, generateAIImage);

router.get("/my-generations", authMiddleware, getMyGeneratedImages);

module.exports = router;
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  generateAIImage,
  getMyGeneratedImages,
  saveMyGeneratedImage,
  deleteMyGeneratedImage,
} = require("../controllers/imageGenerationController");

router.post("/generate", authMiddleware, generateAIImage);

router.get("/my-generations", authMiddleware, getMyGeneratedImages);

router.patch("/:id/save", authMiddleware, saveMyGeneratedImage);

router.delete("/:id", authMiddleware, deleteMyGeneratedImage);

module.exports = router;
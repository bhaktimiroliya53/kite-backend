const express = require("express");
const router = express.Router();

const {
  getTopicSuggestions,
} = require("../controllers/topicSuggestionController");

router.get("/", getTopicSuggestions);

module.exports = router;
const express = require("express");
const router = express.Router();

const { askKiteAI } = require("../controllers/aiController");

router.post("/ask", askKiteAI);

module.exports = router;
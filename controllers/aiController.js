const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const askKiteAI = async (req, res) => {
  try {
    const { question, notifications } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    const pulseContext = (notifications || [])
      .map((notification) => {
        return {
          type: notification.type,
          message: notification.message,
          actorUsername: notification.actorUsername,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        };
      });

    const response = await client.responses.create({
      model: "gpt-5-mini",
      instructions:
        "You are KITE AI, the intelligent assistant inside the KITE Pulse page. Answer questions using the user's Pulse activity context. Be concise, useful, and factual. Do not invent activity that is not present in the provided context.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `User's Pulse activity:
${JSON.stringify(pulseContext, null, 2)}

User question:
${question}`,
            },
          ],
        },
      ],
    });

    res.status(200).json({
      answer: response.output_text,
    });
  } catch (error) {
    console.error("KITE AI ERROR:", error);

    res.status(500).json({
      message: "KITE AI failed to respond",
    });
  }
};

module.exports = {
  askKiteAI,
};
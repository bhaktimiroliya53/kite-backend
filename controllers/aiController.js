const askKiteAI = async (req, res) => {
  try {
    const { question, notifications } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    const pulseContext = (notifications || []).map((notification) => {
      return {
        type: notification.type,
        message: notification.message,
        actorUsername: notification.actorUsername,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      };
    });

    const prompt = `
You are KITE AI, the intelligent assistant inside the KITE Pulse page.

Answer the user's question using only the provided Pulse activity context.

Be concise, useful, and factual.
Do not invent activity that is not present in the context.

User's Pulse activity:
${JSON.stringify(pulseContext, null, 2)}

User question:
${question}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("GEMINI API ERROR:", data);

      return res.status(500).json({
        message: "KITE AI failed to respond",
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      return res.status(500).json({
        message: "KITE AI returned no answer",
      });
    }

    res.status(200).json({
      answer,
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
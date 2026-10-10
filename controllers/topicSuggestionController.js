const Post = require("../models/Post");

exports.getTopicSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        databaseTopics: [],
        aiSuggestions: [],
      });
    }

    const searchQuery = query.trim().replace(/^#/, "");

    // STEP 1: Search KITE database first
    const databaseTopics = await Post.aggregate([
      {
        $match: {
          audience: "everyone",
          hashtags: { $exists: true, $ne: [] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: "$owner",
      },
      {
        $match: {
          "owner.privateAccount": { $ne: true },
          $or: [
            {
              hashtags: {
                $elemMatch: {
                  $regex: searchQuery,
                  $options: "i",
                },
              },
            },
            {
              content: {
                $regex: searchQuery,
                $options: "i",
              },
            },
          ],
        },
      },
      {
        $unwind: "$hashtags",
      },
      {
        $group: {
          _id: "$hashtags",
          postCount: { $sum: 1 },
        },
      },
      {
        $sort: { postCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          postCount: 1,
          source: { $literal: "database" },
        },
      },
    ]);

    // STEP 2: If database has enough results, return them.
    if (databaseTopics.length >= 3) {
      return res.json({
        databaseTopics,
        aiSuggestions: [],
      });
    }

    // STEP 3: Ask Gemini for additional related topic ideas.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing from environment variables.");

      return res.json({
        databaseTopics,
        aiSuggestions: [],
      });
    }

    const prompt = `
You are the topic discovery assistant for KITE, a social networking app.

The user searched for: "${searchQuery}"

Suggest 5 relevant, related social media topics or hashtags.

Rules:
- Return only valid JSON.
- Use this exact format: {"suggestions":["topic1","topic2","topic3"]}
- Topic names must not contain the # symbol.
- Avoid duplicates.
- Do not claim these topics exist in KITE's database.
- Do not include explanations or markdown.
- Keep topic names short and relevant.
- Do not simply repeat the user's search term.
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorDetails = await geminiResponse.text();

      console.error("Gemini topic suggestion failed:", errorDetails);

      return res.json({
        databaseTopics,
        aiSuggestions: [],
      });
    }

    const geminiData = await geminiResponse.json();

    const generatedText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    let aiSuggestions = [];

    if (generatedText) {
      try {
        const parsedResponse = JSON.parse(generatedText);

        const existingTopics = new Set(
          databaseTopics.map((topic) =>
            topic.name.toLowerCase()
          )
        );

        aiSuggestions = (
          Array.isArray(parsedResponse.suggestions)
            ? parsedResponse.suggestions
            : []
        )
          .filter(
            (topic) =>
              typeof topic === "string" &&
              topic.trim().length > 0
          )
          .map((topic) => topic.trim().replace(/^#/, ""))
          .filter(
            (topic) =>
              !existingTopics.has(topic.toLowerCase())
          )
          .filter(
            (topic, index, array) =>
              array.findIndex(
                (item) =>
                  item.toLowerCase() === topic.toLowerCase()
              ) === index
          )
          .slice(0, 5)
          .map((name) => ({
            name,
            source: "ai",
          }));
      } catch (parseError) {
        console.error(
          "Failed to parse Gemini topic suggestions:",
          parseError
        );
      }
    }

    return res.json({
      databaseTopics,
      aiSuggestions,
    });
  } catch (error) {
    console.error("Topic suggestion error:", error);

    return res.status(500).json({
      message: "Failed to fetch topic suggestions.",
    });
  }
};
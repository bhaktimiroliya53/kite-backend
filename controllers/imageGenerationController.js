const AIImageGeneration = require("../models/AIImageGeneration");
const cloudinary = require("../config/cloudinary");

const CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const MAX_PROMPT_LENGTH = 2000;

const ALLOWED_STYLES = [
    "Cinematic",
    "Digital art",
    "Anime",
    "Realistic",
];

const ALLOWED_ASPECT_RATIOS = ["1:1", "3:4", "16:9"];

const getUTCDate = () => new Date().toISOString().slice(0, 10);

const uploadBufferToCloudinary = (buffer) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "kite/ai-generated",
                resource_type: "image",
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result?.secure_url) {
                    return reject(new Error("Cloudinary upload failed"));
                }

                resolve(result);
            }
        );

        stream.end(buffer);
    });

exports.generateAIImage = async (req, res) => {
    let reservation;

    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "Please sign in to generate an image.",
            });
        }

        const { prompt, style, aspectRatio } = req.body || {};

        if (typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({
                message: "Please enter an image prompt.",
            });
        }

        const cleanPrompt = prompt.trim();

        if (cleanPrompt.length > MAX_PROMPT_LENGTH) {
            return res.status(400).json({
                message: `Your prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`,
            });
        }

        if (!ALLOWED_STYLES.includes(style)) {
            return res.status(400).json({
                message: "Please select a valid image style.",
            });
        }

        if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio)) {
            return res.status(400).json({
                message: "Please select a valid image aspect ratio.",
            });
        }

        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;

        if (!accountId || !apiToken) {
            return res.status(503).json({
                message: "Image generation is not configured yet.",
            });
        }

        if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            return res.status(503).json({
                message: "Image storage is not configured yet.",
            });
        }

        const generationDate = getUTCDate();

        // Reserve today's generation before contacting the provider.
        // The unique userId + generationDate index prevents duplicate requests.
        try {
            reservation = await AIImageGeneration.create({
                userId,
                generationDate,
                status: "pending",
                prompt: cleanPrompt,
                style,
                aspectRatio,
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(429).json({
                    message: "You've already used today's image generation. Try again tomorrow.",
                    limitReached: true,
                });
            }

            throw error;
        }

        const styledPrompt = `${cleanPrompt}. Visual style: ${style}.`;

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_MODEL}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: styledPrompt,
                }),
                signal: AbortSignal.timeout(120000),
            }
        );

        if (!response.ok) {
            throw new Error("Cloudflare image generation failed");
        }

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.startsWith("image/")) {
            throw new Error("Cloudflare returned an unexpected image response");
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());

        if (!imageBuffer.length || imageBuffer.length > 15 * 1024 * 1024) {
            throw new Error("Generated image has an invalid size");
        }

        // Cloudflare's image response is binary; upload it directly to Cloudinary.
        const uploadedImage = await uploadBufferToCloudinary(imageBuffer);

        reservation.status = "succeeded";
        reservation.imageUrl = uploadedImage.secure_url;
        await reservation.save();

        return res.status(201).json({
            message: "Your AI image was generated successfully.",
            imageUrl: uploadedImage.secure_url,
            generation: {
                id: reservation._id,
                prompt: cleanPrompt,
                style,
                aspectRatio,
                generationDate,
            },
            dailyLimit: 1,
            remainingGenerationsToday: 0,
        });
    } catch (error) {
        // A failed generation should not consume the user's daily allowance.
        if (reservation?._id) {
            try {
                await AIImageGeneration.deleteOne({
                    _id: reservation._id,
                    status: "pending",
                });
            } catch (cleanupError) {
                console.error("AI image reservation cleanup failed.");
            }
        }

        console.error("KITE AI image generation failed:", {
            name: error?.name,
            message: error?.message,
            status: error?.status,
            statusText: error?.statusText,
        });

        if (error.name === "TimeoutError" || error.name === "AbortError") {
            return res.status(504).json({
                message: "Image generation took too long. Please try again.",
            });
        }

        return res.status(502).json({
            message: "We couldn't generate your image right now. Please try again.",
        });
    }
};
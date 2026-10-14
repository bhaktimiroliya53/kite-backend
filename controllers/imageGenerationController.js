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
            const errorBody = await response.text();

            console.error("Cloudflare Workers AI request failed:", {
                status: response.status,
                statusText: response.statusText,
                body: errorBody.slice(0, 1000),
            });

            throw new Error(
                `Cloudflare image generation failed (${response.status})`
            );
        }

        const contentType = response.headers.get("content-type") || "";

        let imageBuffer;

        if (contentType.startsWith("image/")) {
            imageBuffer = Buffer.from(await response.arrayBuffer());
        } else if (contentType.includes("application/json")) {
            const result = await response.json();

            if (result.errors?.length) {
                console.error("Cloudflare Workers AI returned errors:", result.errors);
                throw new Error("Cloudflare AI could not generate the image");
            }

            const imageData = result.result?.image || result.image;

            if (typeof imageData !== "string" || !imageData.length) {
                console.error("Unexpected Cloudflare response:", {
                    contentType,
                    responseKeys: Object.keys(result),
                    resultKeys: result.result
                        ? Object.keys(result.result)
                        : [],
                });

                throw new Error("Cloudflare response did not contain image data");
            }

            const base64Data = imageData.replace(
                /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
                ""
            );

            imageBuffer = Buffer.from(base64Data, "base64");
        } else {
            console.error("Unexpected Cloudflare content type:", contentType);
            throw new Error("Cloudflare returned an unsupported response format");
        }

        if (
            !imageBuffer.length ||
            imageBuffer.length > 15 * 1024 * 1024
        ) {
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

// Get the logged-in user's generated AI images
exports.getMyGeneratedImages = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "Please sign in to view your generated images.",
            });
        }

        const images = await AIImageGeneration.find({
            userId,
            status: "succeeded",
            imageUrl: { $ne: null },
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .select("prompt style aspectRatio imageUrl isSaved createdAt");

        return res.status(200).json({
            message: "Your generated images were fetched successfully.",
            images,
        });
    } catch (error) {
        console.error("Fetch generated AI images failed:", error);

        return res.status(500).json({
            message: "Unable to fetch your generated images right now.",
        });
    }
};

// Save a generated AI image to the user's KITE collection
exports.saveMyGeneratedImage = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: "Please sign in to save this image.",
            });
        }

        const image = await AIImageGeneration.findOneAndUpdate(
            {
                _id: id,
                userId,
                status: "succeeded",
                imageUrl: { $ne: null },
            },
            {
                $set: { isSaved: true },
            },
            {
                new: true,
                runValidators: true,
            }
        ).select("prompt style aspectRatio imageUrl isSaved createdAt");

        if (!image) {
            return res.status(404).json({
                message: "Generated image not found in your account.",
            });
        }

        return res.status(200).json({
            message: "Image saved to your KITE collection successfully!",
            image,
        });
    } catch (error) {
        console.error("Save generated AI image failed:", error);

        return res.status(500).json({
            message: "Unable to save this image right now.",
        });
    }
};
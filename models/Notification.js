const mongoose = require("mongoose");
const User = require("./User");

const notificationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
        },

        message: {
            type: String,
            required: true,
        },

        isRead: {
            type: Boolean,
            default: false,
        },

        // User who receives this notification
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },

        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },

        actorUsername: {
            type: String,
            required: false,
        },

        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: false,
        },

        expiresAt: {
            type: Date,
            default: null,
            index: true,
            expires: 0,
        },
    },
    {
        timestamps: true,
    }
);

notificationSchema.pre("save", async function (next) {
    try {
        if (!this.isNew || !this.userId) {
            return next();
        }

        const user = await User.findById(this.userId).select(
            "notificationRetention"
        );

        const retention = user?.notificationRetention || "24h";

        if (retention === "forever") {
            this.expiresAt = null;
        } else {
            const durations = {
                "1m": 60 * 1000,
                "24h": 24 * 60 * 60 * 1000,
                "2d": 2 * 24 * 60 * 60 * 1000,
                "3d": 3 * 24 * 60 * 60 * 1000,
            };

            this.expiresAt = new Date(
                Date.now() + durations[retention]
            );
        }

        next();
    } catch (error) {
        next(error);
    }
});

notificationSchema.post("save", function (doc) {
    if (global.emitNotification && doc.userId) {
        global.emitNotification(doc.userId, doc);
    }
});

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);
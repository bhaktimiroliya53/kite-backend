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

notificationSchema.pre("save", async function () {
    if (!this.isNew || !this.userId) return;

    const user = await User.findById(this.userId).select(
        "notificationRetentionSettings"
    );

    const settings = user?.notificationRetentionSettings;

    const retentionMap = {
        like: settings?.likes || "24h",
        "comment-like": settings?.likes || "24h",
        "reply-like": settings?.likes || "24h",

        comment: settings?.comments || "3d",
        reply: settings?.replies || "3d",

        follow: settings?.follows || "7d",
        "follow-request": settings?.followRequests || "7d",

        mention: settings?.mentions || "7d",
        tag: settings?.mentions || "7d",

        repost: settings?.reposts || "3d",

        system: settings?.system || "forever",
    };

    const retention = retentionMap[this.type] || "24h";

    if (retention === "forever") {
        this.expiresAt = null;
        return;
    }

    const durations = {
        "1m": 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "2d": 2 * 24 * 60 * 60 * 1000,
        "3d": 3 * 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
    };

    this.expiresAt = new Date(
        Date.now() + durations[retention]
    );
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
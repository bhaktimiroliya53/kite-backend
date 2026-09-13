const mongoose = require("mongoose");

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
    },
    {
        timestamps: true,
    }
);

notificationSchema.post("save", function (doc) {
    if (global.emitNotification && doc.userId) {
        global.emitNotification(doc.userId, doc);
    }
});

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);
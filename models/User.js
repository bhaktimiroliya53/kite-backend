const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    securityHealth: {
      passwordChangedAt: {
        type: Date,
        default: null,
      },

      lastSecurityCheck: {
        type: Date,
        default: null,
      },
    },

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    profileChangeHistory: [
      {
        type: {
          type: String,
          enum: [
            "username",
            "bio",
            "avatar",
            "privacy",
          ],
          required: true,
        },

        oldValue: {
          type: String,
          default: "",
        },

        newValue: {
          type: String,
          default: "",
        },

        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    followRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    privateAccount: {
      type: Boolean,
      default: false,
    },

    showActivity: {
      type: Boolean,
      default: true,
    },

    allowMessages: {
      type: Boolean,
      default: true,
    },

    notificationRetentionSettings: {
      likes: {
        type: String,
        enum: ["1m", "24h", "2d", "3d", "7d", "30d", "forever"],
        default: "24h",
      },

      comments: {
        type: String,
        enum: ["1m", "24h", "2d", "3d", "7d", "30d", "forever"],
        default: "3d",
      },

      replies: {
        type: String,
        enum: ["1m", "24h", "2d", "3d", "7d", "30d", "forever"],
        default: "3d",
      },

      follows: {
        type: String,
        enum: ["1m", "24h", "2d", "3d", "7d", "30d", "forever"],
        default: "7d",
      },

      followRequests: {
        type: String,
        enum: ["1m", "24h", "2d", "3d", "7d", "30d", "forever"],
        default: "7d",
      },

      mentions: {
        type: String,
        enum: ["1m", "24h", "2d", "3d", "7d", "30d", "forever"],
        default: "7d",
      },

      reposts: {
        type: String,
        enum: ["1m", "24h", "2d", "3d", "7d", "30d", "forever"],
        default: "3d",
      },

      system: {
        type: String,
        enum: ["1m", "24h", "2d", "3d", "7d", "30d", "forever"],
        default: "forever",
      },
    },

    notInterestedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    mutedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      trim: true,
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
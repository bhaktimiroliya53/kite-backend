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

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

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

    notificationRetention: {
      type: String,
      enum: ["1m", "24h", "2d", "3d", "forever"],
      default: "24h",
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
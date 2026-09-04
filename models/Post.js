const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    username: {
      type: String,
      default: "",
    },

    profilePic: {
      type: String,
      default: "",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    taggedPeople: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    audience: {
      type: String,
      enum: ["everyone", "followers", "private"],
      default: "everyone",
    },

    mood: {
      type: String,
      default: "",
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],


    comments: [
      {
        userId: String,
        username: String,
        avatar: String,
        text: String,

        likes: [
          {
            type: String,
          },
        ],

        reposts: [
          {
            type: String,
          }
        ],


        replies: [
          {
            userId: String,
            avatar: String,
            text: String,
            image: String,

            likes: [
              {
                type: String,
              },
            ],

            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],


        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],


    reposts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],


    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },

  {
    timestamps: true
  }
);


module.exports = mongoose.model("Post", postSchema);
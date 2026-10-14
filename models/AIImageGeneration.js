const mongoose = require("mongoose");

const aiImageGenerationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    generationDate: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "succeeded"],
      default: "pending",
      required: true,
    },

    prompt: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    style: {
      type: String,
      required: true,
    },

    aspectRatio: {
      type: String,
      required: true,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    isSaved: {
    type: Boolean,
    default: false,
},

  },
  {
    timestamps: true,
  }
);

// Allow only one generation reservation per user per UTC date.
aiImageGenerationSchema.index(
  { userId: 1, generationDate: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "AIImageGeneration",
  aiImageGenerationSchema
);
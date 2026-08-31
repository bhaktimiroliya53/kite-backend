const Message = require("../models/Message");

exports.sendMessage = async (req, res) => {
  try {
    console.log(req.body);
    const {
      senderId,
      receiverId,
      text = "",
      image = "",
      gif = "",
    } = req.body;

    const message = await Message.create({
      senderId,
      receiverId,
      text,
      image,
       gif,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "username avatar")
      .populate("receiverId", "username avatar");

    global.io.emit("receiveMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("SEND MESSAGE ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const messages = await Message.find({
      $or: [
        {
          senderId,
          receiverId,
        },
        {
          senderId: receiverId,
          receiverId: senderId,
        },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("GET MESSAGES ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { emoji, userId } = req.body;

    const message = await Message.findById(
      req.params.messageId
    );

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    const existingReaction = message.reactions.find(
      (r) => String(r.userId) === String(userId)
    );

    if (existingReaction) {
      message.reactions = message.reactions.filter(
        (r) => String(r.userId) !== String(userId)
      );
    } else {
      message.reactions.push({
        userId,
        emoji,
      });
    }

    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    global.io.emit("messageDeleted", req.params.messageId);

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.shareComment = async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      comment
    } = req.body;


    const message = await Message.create({
      senderId,
      receiverId,

      text: "Shared a comment",

      sharedComment: {
        username: comment.username,
        avatar: comment.avatar,
        text: comment.text,
      },
    });


    res.status(201).json(message);

  } catch (error) {

    console.log("SHARE COMMENT ERROR =>", error);

    res.status(500).json({
      message:"Server error"
    });

  }
};

exports.updateMessage = async (req, res) => {

  try {

    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.messageId,
      {
        text: req.body.text,
        edited: true,
      },
      {
        new: true,
      }
    );


    if (!updatedMessage) {
      return res.status(404).json({
        message: "Message not found",
      });
    }


    res.json(updatedMessage);


  } catch (error) {

    console.log("UPDATE MESSAGE ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });

  }

};

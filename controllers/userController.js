const User = require("../models/User");
const Notification = require("../models/Notification");

console.log("USER MODEL PATH =>", require.resolve("../models/User"));
console.log("USER ROLE ENUM =>", User.schema.path("role")?.enumValues);

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("followers", "username avatar")
      .populate("following", "username avatar")
      .populate("followRequests", "username avatar");

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedUser);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password");

    res.status(200).json(users);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// Follow / Unfollow / Follow Request
exports.toggleFollow = async (req, res) => {
  try {
    const { currentUserId } = req.body;

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Cannot follow yourself
    if (targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    const isFollowing = targetUser.followers.some(
      (id) => id.toString() === currentUserId.toString()
    );

    const hasRequested = targetUser.followRequests?.some(
      (id) => id.toString() === currentUserId.toString()
    );

    // UNFOLLOW
    if (isFollowing) {
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId.toString()
      );

      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUser._id.toString()
      );

      await targetUser.save();
      await currentUser.save();

      return res.status(200).json({
        success: true,
        status: "unfollowed",
      });
    }

    // CANCEL FOLLOW REQUEST
    if (hasRequested) {
      targetUser.followRequests = targetUser.followRequests.filter(
        (id) => id.toString() !== currentUserId.toString()
      );

      await targetUser.save();

      return res.status(200).json({
        success: true,
        status: "request_cancelled",
      });
    }

    // PRIVATE ACCOUNT → SEND REQUEST
    if (targetUser.privateAccount) {
      targetUser.followRequests.push(currentUserId);

      await targetUser.save();

      // Create Pulse notification for the target user
      await Notification.create({
        userId: targetUser._id,
        actorId: currentUser._id,
        actorUsername: currentUser.username,
        type: "follow-request",
        message: `${currentUser.username} requested to follow you`,
      });

      return res.status(200).json({
        success: true,
        status: "requested",
      });
    }

    // PUBLIC ACCOUNT → FOLLOW DIRECTLY
    targetUser.followers.push(currentUserId);
    currentUser.following.push(targetUser._id);

    // Fix old users whose role contains extra spaces
    targetUser.role = targetUser.role?.trim() || "user";
    currentUser.role = currentUser.role?.trim() || "user";

    await targetUser.save();
    await currentUser.save();

    return res.status(200).json({
      success: true,
      status: "following",
    });

  } catch (error) {
    console.log("FOLLOW ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Approve Follow Request
exports.approveFollowRequest = async (req, res) => {
  try {
    const { userId } = req.body;

    const targetUser = await User.findById(req.params.id);
    const requester = await User.findById(userId);

    if (!targetUser || !requester) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const hasRequest = targetUser.followRequests?.some(
      (id) => id.toString() === userId.toString()
    );

    if (!hasRequest) {
      return res.status(400).json({
        message: "Follow request not found",
      });
    }

    targetUser.followRequests = targetUser.followRequests.filter(
      (id) => id.toString() !== userId.toString()
    );

    targetUser.followers.push(userId);

    requester.following.push(targetUser._id);

    await targetUser.save();
    await requester.save();
    await Notification.deleteOne({
      userId: targetUser._id,
      actorId: requester._id,
      type: "follow-request",
    });

    res.status(200).json({
      success: true,
      status: "approved",
    });

  } catch (error) {
    console.log("APPROVE REQUEST ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Reject Follow Request
exports.rejectFollowRequest = async (req, res) => {
  try {
    const { userId } = req.body;

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    targetUser.followRequests = targetUser.followRequests.filter(
      (id) => id.toString() !== userId.toString()
    );

    await targetUser.save();
    await Notification.deleteOne({
      userId: targetUser._id,
      actorId: userId,
      type: "follow-request",
    });

    res.status(200).json({
      success: true,
      status: "rejected",
    });

  } catch (error) {
    console.log("REJECT REQUEST ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Update Privacy & Theme
exports.updateSettings = async (req, res) => {
  try {
    const {
      privateAccount,
      showActivity,
      allowMessages,
      theme,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        privateAccount,
        showActivity,
        allowMessages,
        theme,
      },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
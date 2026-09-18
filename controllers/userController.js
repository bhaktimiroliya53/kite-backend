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

/// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const {
      username,
      bio,
      avatar,
    } = req.body;

    const historyEntries = [];

    // Username changed
    if (
      username !== undefined &&
      username !== user.username
    ) {
      historyEntries.push({
        type: "username",
        oldValue: user.username || "",
        newValue: username || "",
        changedAt: new Date(),
      });

      user.username = username;
    }

    // Bio changed
    if (
      bio !== undefined &&
      bio !== user.bio
    ) {
      historyEntries.push({
        type: "bio",
        oldValue: user.bio || "",
        newValue: bio || "",
        changedAt: new Date(),
      });

      user.bio = bio;
    }

    // Profile picture changed
    if (
      avatar !== undefined &&
      avatar !== user.avatar
    ) {
      historyEntries.push({
        type: "avatar",
        oldValue: user.avatar || "",
        newValue: avatar || "",
        changedAt: new Date(),
      });

      user.avatar = avatar;
    }

    // Save profile change history
    if (historyEntries.length > 0) {
      user.profileChangeHistory.unshift(
        ...historyEntries
      );

      // Keep only latest 50 changes
      user.profileChangeHistory =
        user.profileChangeHistory.slice(0, 50);
    }

    await user.save();

    res.status(200).json(user);

  } catch (error) {
    console.log(
      "UPDATE PROFILE ERROR =>",
      error
    );

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

exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      username: { $regex: query, $options: "i" },
    })
      .select("username avatar bio")
      .limit(8);

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

      // Create Pulse notification for the target user
      await Notification.create({
        userId: targetUser._id,
        actorId: currentUser._id,
        actorUsername: currentUser.username,
        type: "follow",
        message: `${currentUser.username} started following you`,
      });

      return res.status(200).json({
        success: true,
        status: "following",
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

    console.log("APPROVE TARGET USER =>", targetUser._id.toString());
    console.log("APPROVE REQUESTER =>", userId.toString());
    console.log(
      "CURRENT FOLLOW REQUESTS =>",
      targetUser.followRequests?.map((id) => id.toString())
    );

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
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const {
      privateAccount,
      showActivity,
      allowMessages,
      theme,
    } = req.body;

    // Track privacy change
    if (
      privateAccount !== undefined &&
      privateAccount !== user.privateAccount
    ) {
      user.profileChangeHistory.unshift({
        type: "privacy",
        oldValue: String(user.privateAccount),
        newValue: String(privateAccount),
        changedAt: new Date(),
      });
    }

    // Update settings
    if (privateAccount !== undefined) {
      user.privateAccount = privateAccount;
    }

    if (showActivity !== undefined) {
      user.showActivity = showActivity;
    }

    if (allowMessages !== undefined) {
      user.allowMessages = allowMessages;
    }

    if (theme !== undefined) {
      user.theme = theme;
    }

    // Keep only latest 50 changes
    user.profileChangeHistory =
      user.profileChangeHistory.slice(0, 50);

    await user.save();

    res.status(200).json(user);

  } catch (error) {
    console.log(
      "UPDATE SETTINGS ERROR =>",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// Run Security Check
exports.runSecurityCheck = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.securityHealth = user.securityHealth || {};

    user.securityHealth.lastSecurityCheck = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Security check completed",
      lastSecurityCheck:
        user.securityHealth.lastSecurityCheck,
    });

  } catch (error) {
    console.log(
      "SECURITY CHECK ERROR =>",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// Logout Specific Session
exports.logoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const session = user.loginActivity.find(
      (activity) => activity.sessionId === sessionId
    );

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    user.loginActivity = user.loginActivity.filter(
      (activity) => activity.sessionId !== sessionId
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: "Session logged out successfully",
    });
  } catch (error) {
    console.log("LOGOUT SESSION ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};
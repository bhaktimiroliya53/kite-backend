const Post = require("../models/Post");
const Report = require("../models/Report");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");


// Create Post
exports.createPost = async (req, res) => {
  try {
    console.log("REQUEST BODY =>", req.body);

    const {
      content,
      image,
      userId,
      taggedPeople,
      audience,
      mood,
      location,
      music,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }
    const user = await User.findById(userId);

    console.log("FOUND USER =>", user);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const newPost = new Post({
      content: content || "",
      image: image || "",
      userId,
      username: user.username || "Unknown User",
      profilePic: user.avatar || "",

      taggedPeople: Array.isArray(taggedPeople)
        ? taggedPeople
        : [],

      audience: ["everyone", "followers", "private"].includes(audience)
        ? audience
        : "everyone",

      mood: mood || "",

      location: location || null,

      music: music || null,
    });

    await newPost.save();

    res.status(201).json(newPost);
  } catch (error) {
    console.error("CREATE POST ERROR =>", error);

    res.status(500).json({
      message: error.message,
      error: error,
    });
  }
};

// Get All Posts
exports.getPosts = async (req, res) => {
  try {
    const currentUserId = req.query.userId;

    const currentUser = currentUserId
      ? await User.findById(currentUserId)
      : null;

    const posts = await Post.find({})
      .populate("userId", "username avatar privateAccount followers")
      .populate("likes", "username avatar")
      .populate("reposts", "username avatar")
      .sort({ _id: -1 })
      .limit(100);

    const visiblePosts = posts.filter((post) => {
      const postOwner = post.userId;

      // Safety check
      if (!postOwner) return false;

      const isOwner =
        currentUserId &&
        postOwner._id.toString() === currentUserId.toString();

      const isFollower =
        currentUserId &&
        postOwner.followers?.some(
          (followerId) =>
            followerId.toString() === currentUserId.toString()
        );

      // Only me → owner only
      if (post.audience === "private") {
        return Boolean(isOwner);
      }

      // Followers → owner + followers
      if (post.audience === "followers") {
        return Boolean(isOwner || isFollower);
      }

      // Everyone → existing account privacy behavior
      if (!postOwner.privateAccount) {
        return true;
      }

      // Private account → owner + approved followers
      return Boolean(isOwner || isFollower);
    });

    res.status(200).json(visiblePosts);
  } catch (error) {
    console.log("GET POSTS ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete Post
exports.deletePost = async (req, res) => {
  try {

    await Post.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      message: "Post deleted",
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// Toggle Like
exports.toggleLike = async (req, res) => {
  try {

    const { userId } = req.body;

    const post = await Post.findById(
      req.params.id
    );

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadyLiked =
      post.likes.includes(userId);

    if (alreadyLiked) {

      post.likes = post.likes.filter(
        (id) => id.toString() !== userId
      );

    } else {

      post.likes.push(userId);

    }

    await post.save();

    res.status(200).json(post);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// Toggle Comment Like
exports.toggleCommentLike = async (req, res) => {
  try {
    const { userId } = req.body;

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comment = post.comments[req.params.commentIndex];

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (!comment.likes) {
      comment.likes = [];
    }

    const alreadyLiked = comment.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      comment.likes.push(userId);
    }

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("COMMENT LIKE ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Add Comment// Add Comment
exports.addComment = async (req, res) => {
  try {
    const { userId, avatar, text, image } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    if (!text?.trim() && !image) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    post.comments.push({
      userId,
      avatar: avatar || "",
      text: text || "",
      image: image || "",
      likes: [],
      replies: [],
    });

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("COMMENT ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.addReply = async (req, res) => {
  try {

    const {
      userId,
      avatar,
      text,
      image
    } = req.body;


    const post = await Post.findById(
      req.params.postId
    );


    if (!post) {
      return res.status(404).json({
        message: "Post not found"
      });
    }


    const comment =
      post.comments[
      req.params.commentIndex
      ];


    if (!comment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }


    if (!comment.replies) {
      comment.replies = [];
    }


    comment.replies.push({

      userId,
      avatar,
      text,
      image: image || "",

      likes: [],

      createdAt: new Date()

    });


    await post.save();


    res.status(200).json(post);


  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message
    });

  }
};

// Delete Comment
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    post.comments.splice(req.params.commentIndex, 1);

    await post.save();

    res.status(200).json(post);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Toggle Repost
exports.toggleRepost = async (req, res) => {
  try {

    const { userId } = req.body;

    const post = await Post.findById(
      req.params.id
    );

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadyReposted =
      post.reposts.includes(userId);

    if (alreadyReposted) {

      post.reposts = post.reposts.filter(
        (id) => id.toString() !== userId
      );

    } else {

      post.reposts.push(userId);

    }

    await post.save();

    res.status(200).json(post);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// Toggle Save
exports.toggleSave = async (req, res) => {
  try {

    const { userId } = req.body;

    const post = await Post.findById(
      req.params.id
    );

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadySaved =
      post.savedBy.includes(userId);

    if (alreadySaved) {

      post.savedBy = post.savedBy.filter(
        (id) => id.toString() !== userId
      );

    } else {

      post.savedBy.push(userId);

    }

    await post.save();

    res.status(200).json(post);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// Get User Posts
exports.getUserPosts = async (req, res) => {
  try {
    const profileUserId = req.params.userId;
    const currentUserId = req.query.currentUserId;

    const profileUser = await User.findById(profileUserId);

    if (!profileUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isOwner =
      currentUserId &&
      profileUser._id.toString() === currentUserId.toString();

    const isFollower =
      currentUserId &&
      profileUser.followers?.some(
        (followerId) =>
          followerId.toString() === currentUserId.toString()
      );

    // PRIVATE ACCOUNT
    if (profileUser.privateAccount && !isOwner && !isFollower) {
      return res.status(403).json({
        privateAccount: true,
        message: "This account is private",
        posts: [],
      });
    }

    const posts = await Post.find({
      userId: profileUserId,
    })
      .populate("userId", "username avatar privateAccount followers")
      .populate("likes", "username avatar")
      .populate("reposts", "username avatar")
      .sort({ _id: -1 });

    const visiblePosts = posts.filter((post) => {
      // Everyone
      if (post.audience === "everyone") {
        return true;
      }

      // Only me → owner only
      if (post.audience === "private") {
        return Boolean(isOwner);
      }

      // Followers → owner + followers
      if (post.audience === "followers") {
        return Boolean(isOwner || isFollower);
      }

      // Safety fallback
      return true;
    });

    res.status(200).json({
      privateAccount: profileUser.privateAccount,
      canViewPosts: true,
      posts: visiblePosts,
    });

  } catch (error) {
    console.log("GET USER POSTS ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Add Reply
exports.addReply = async (req, res) => {
  try {
    const {
      userId,
      avatar,
      text,
      image,
    } = req.body;

    const { postId, commentIndex } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    if (!text?.trim() && !image) {
      return res.status(400).json({
        message: "Reply cannot be empty",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comment = post.comments[commentIndex];

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    comment.replies.push({
      userId,
      avatar: avatar || "",
      text: text || "",
      image: image || "",
      likes: [],
      replies: [],
    });

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("REPLY ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Toggle Reply Like
exports.toggleReplyLike = async (req, res) => {
  try {
    const { userId } = req.body;

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comment = post.comments[req.params.commentIndex];

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const reply = comment.replies[req.params.replyIndex];

    if (!reply) {
      return res.status(404).json({
        message: "Reply not found",
      });
    }

    if (!reply.likes) {
      reply.likes = [];
    }

    const alreadyLiked = reply.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      reply.likes = reply.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      reply.likes.push(userId);
    }

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("REPLY LIKE ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Repost Comment
exports.repostComment = async (req, res) => {

  try {

    const { userId } = req.body;


    const post = await Post.findById(req.params.postId);


    if (!post) {
      return res.status(404).json({
        message: "Post not found"
      });
    }


    const comment = post.comments[req.params.commentIndex];


    if (!comment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }


    if (!comment.reposts) {
      comment.reposts = [];
    }


    const already =
      comment.reposts.includes(userId);



    if (already) {

      comment.reposts =
        comment.reposts.filter(
          id => id !== userId
        );

    } else {

      comment.reposts.push(userId);

    }


    await post.save();


    res.status(200).json(post);


  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

exports.reportPost = async (req, res) => {
  try {
    const { reporterId, reason } = req.body;
    const { id } = req.params;

    if (!reporterId) {
      return res.status(400).json({
        message: "Reporter ID is required",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const existingReport = await Report.findOne({
      reporterId,
      postId: id,
      status: "pending",
    });

    if (existingReport) {
      return res.status(400).json({
        message: "You have already reported this post",
      });
    }

    const report = await Report.create({
      reporterId,
      postId: id,
      reason: reason || "",
    });

    res.status(201).json({
      message: "Post reported successfully",
      report,
    });
  } catch (error) {
    console.error("REPORT POST ERROR =>", error);

    res.status(500).json({
      message: error.message,
    });
  }
};
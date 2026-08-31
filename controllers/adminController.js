const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

// Dashboard Stats
exports.getDashboard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalPosts = await Post.countDocuments();

        res.status(200).json({
            totalUsers,
            totalPosts,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    try {

        await User.findByIdAndDelete(req.params.id);

        await Notification.create({
            type: "user",
            message: "A user has been deleted by Admin",
        });

        res.status(200).json({
            message: "User deleted successfully",
        });

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};

// Get All Posts
exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().populate(
            "userId",
            "username avatar"
        );

        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// Delete Post
exports.deletePost = async (req, res) => {
    try {

        await Post.findByIdAndDelete(req.params.id);

        const notification = await Notification.create({
            type: "post",
            message: "A post has been deleted by Admin",
        });

        global.io.emit(
            "newNotification",
            notification
        );

        res.status(200).json({
            message: "Post deleted successfully",
        });

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const users = await User.countDocuments();
        const posts = await Post.countDocuments();

        const activeUsers = await User.countDocuments({
            isOnline: true,
        });

        const trendingPost = await Post.findOne()
            .sort({ likes: -1 })
            .select("content image likes");

        const topUsers = await Post.aggregate([
            {
                $project: {
                    username: 1,
                    likesCount: { $size: "$likes" }
                }
            },
            {
                $group: {
                    _id: "$username",
                    totalPosts: { $sum: 1 },
                    totalLikes: { $sum: "$likesCount" }
                }
            },
            {
                $sort: {
                    totalLikes: -1
                }
            },
            {
                $limit: 5
            }
        ]);

        const totalLikes = await Post.aggregate([
            {
                $project: {
                    likesCount: { $size: "$likes" }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$likesCount" }
                }
            }
        ]);

        const totalComments = await Post.aggregate([
            {
                $project: {
                    commentsCount: { $size: "$comments" }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$commentsCount" }
                }
            }
        ]);

        res.json({
            users,
            posts,
            likes: totalLikes[0]?.total || 0,
            comments: totalComments[0]?.total || 0,
            trendingPost,
            topUsers,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.getNotifications = async (req, res) => {
    try {

        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json(notifications);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Server Error",
        });

    }
};


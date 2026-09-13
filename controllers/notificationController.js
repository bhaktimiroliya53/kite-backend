const Notification = require("../models/Notification");


// GET /api/notifications/:userId
const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;

        const notifications = await Notification.find({
            userId: userId,
        })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(notifications);

    } catch (error) {
        console.error("Get notifications error:", error);

        res.status(500).json({
            message: "Failed to fetch notifications",
        });
    }
};

// MARK notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found",
            });
        }

        res.status(200).json(notification);

    } catch (error) {
        console.error("Mark notification as read error:", error);

        res.status(500).json({
            message: "Failed to mark notification as read",
        });
    }
};

module.exports = {
    getNotifications,
    markNotificationAsRead,
};
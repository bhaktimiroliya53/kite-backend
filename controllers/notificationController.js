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


module.exports = {
    getNotifications,
};
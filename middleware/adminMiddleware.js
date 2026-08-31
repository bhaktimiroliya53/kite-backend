const User = require("../models/User");

const adminMiddleware = async (req, res, next) => {
    try {

        const userId =
            req.body?.userId ||
            req.query?.userId;

        console.log("USER ID:", userId);

        const user = await User.findById(userId);

        console.log("USER:", user);

        if (!user) {
            return res.status(403).json({
                message: "User not found",
            });
        }

        if (user.role !== "admin") {
            return res.status(403).json({
                message: "Not Admin",
            });
        }

        next();

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: err.message,
        });
    }
};

module.exports = adminMiddleware;
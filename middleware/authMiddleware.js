const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({
      message: "No token, authorization denied",
    });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {
    const decoded = jwt.verify(token, "secretkey");

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const session = user.loginActivity.find(
      (activity) => activity.sessionId === decoded.sessionId
    );

    if (!session || !session.isActive) {
      return res.status(401).json({
        message: "Session has been logged out",
      });
    }
    session.lastActiveAt = new Date();
    await user.save();

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Token is not valid",
    });
  }
};
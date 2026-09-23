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

    console.log("AUTH SESSION CHECK =>", {
      userId: decoded.id,
      sessionId: decoded.sessionId,
      foundSession: !!session,
      isActive: session?.isActive,
    });

    if (!session || !session.isActive) {
      return res.status(401).json({
        message: "Session has been logged out",
      });
    }
    session.lastActiveAt = new Date();

const now = new Date();

user.digitalExpiry.lastActiveAt = now;

if (
  user.digitalExpiry.enabled &&
  user.digitalExpiry.period !== "never"
) {
  const expiryDate = new Date(now);

  if (user.digitalExpiry.period === "6-months") {
    expiryDate.setMonth(expiryDate.getMonth() + 6);
  }

  if (user.digitalExpiry.period === "1-year") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }

  if (user.digitalExpiry.period === "2-years") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);
  }

  user.digitalExpiry.expiresAt = expiryDate;
} else {
  user.digitalExpiry.expiresAt = null;
}

await user.save();

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Token is not valid",
    });
  }
};
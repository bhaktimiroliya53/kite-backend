const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const User = require("./models/User");

require("dotenv").config();

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messageRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const server = http.createServer(app);

// CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store Online Users
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);

    io.emit(
      "onlineUsers",
      Array.from(onlineUsers.keys())
    );
  });

  socket.on(
    "typing",
    ({ senderId, receiverId }) => {
      console.log(
        "⌨️ Typing:",
        senderId,
        "->",
        receiverId
      );

      const receiverSocket =
        onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit(
          "typing",
          senderId
        );
      }
    }
  );

  socket.on(
    "stopTyping",
    ({ senderId, receiverId }) => {
      console.log(
        "🛑 Stop Typing:",
        senderId,
        "->",
        receiverId
      );

      const receiverSocket =
        onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit(
          "stopTyping",
          senderId
        );
      }
    }
  );

  socket.on("disconnect", () => {
    console.log(
      "🔴 User Disconnected:",
      socket.id
    );

    for (const [
      userId,
      socketId,
    ] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit(
      "onlineUsers",
      Array.from(onlineUsers.keys())
    );
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use(
  "/api/notifications",
  notificationRoutes
);

app.use("/api/ai", aiRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("KITE Backend Running 🚀");
});

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");

    server.listen(
      process.env.PORT,
      () => {
        console.log(
          `🚀 Server running on port ${process.env.PORT}`
        );
      }
    );
  })
  .catch((err) => {
    console.log(err);
  });

global.io = io;

global.emitNotification = (userId, notification) => {
  io.to(userId.toString()).emit("new-notification", notification);
};

// Digital Expiry Auto Archive Checker
setInterval(async () => {
  try {
    const now = new Date();

    const result = await User.updateMany(
      {
        "digitalExpiry.enabled": true,
        "digitalExpiry.expiresAt": {
          $lte: now,
        },
        "digitalExpiry.isArchived": false,
      },
      {
        $set: {
          "digitalExpiry.isArchived": true,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `🗃️ Digital Expiry: Archived ${result.modifiedCount} account(s)`
      );
    }
  } catch (error) {
    console.log(
      "DIGITAL EXPIRY AUTO CHECK ERROR =>",
      error
    );
  }
}, 60 * 60 * 1000);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messageRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

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
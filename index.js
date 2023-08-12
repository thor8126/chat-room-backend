const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS options
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // Replace with your frontend's origin
    methods: ["GET", "POST"],
  },
});

// Set up MongoDB connection
mongoose.connect(
  "mongodb+srv://admin:admin@mongo.h9vbr7w.mongodb.net/chat-rooms?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Create a simple message schema
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  timestamp: Date,
  room: String,
});
const Message = mongoose.model("Message", messageSchema);

app.get("/getMessages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }); // Retrieve messages sorted by timestamp
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("sendMessage", async (data) => {
    const newMessage = new Message({
      user: data.user,
      text: data.message,
      timestamp: new Date(),
      room: data.room,
    });

    await newMessage.save();

    io.to(data.room).emit("message", newMessage);
  });

  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    console.log(`User left room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});

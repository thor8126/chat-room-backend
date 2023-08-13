const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// app.use((req, res, next) => {
//   res.header(
//     "Access-Control-Allow-Origin",
//     "https://chat-room-frontend.vercel.app"
//   );
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

app.use(cors({ origin: true }));

const server = http.createServer(app);

const io = socketIo(server);

mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Create a message schema
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  timestamp: Date,
  room: String,
});
const Message = mongoose.model("Message", messageSchema);

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

app.get("/getMessages/:room", async (req, res) => {
  const room = req.params.room;
  try {
    const messages = await Message.find({ room }).sort({ timestamp: 1 }); // Retrieve messages for the specified room sorted by timestamp
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

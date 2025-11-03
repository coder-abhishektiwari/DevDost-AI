// server.js - Main server logic for chat web app

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize Express app
const app = express();
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server);

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join room / set nickname
  socket.on('joinRoom', ({ nickname }) => {
    if (typeof nickname === 'string') {
      socket.nickname = nickname;
      // Notify other users that a new user has joined
      socket.broadcast.emit('userJoined', { nickname });
      console.log(`${nickname} joined the chat`);
    }
  });

  // Receive chat messages
  socket.on('chatMessage', ({ msg }) => {
    if (typeof msg === 'string' && socket.nickname) {
      const message = {
        nickname: socket.nickname,
        text: msg,
        timestamp: new Date().toISOString(),
      };
      // Broadcast the new message to all connected clients
      io.emit('newMessage', message);
      console.log('Message broadcast:', message);
    }
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    if (socket.nickname) {
      socket.broadcast.emit('userLeft', { nickname: socket.nickname });
      console.log(`${socket.nickname} left the chat`);
    }
    console.log('A user disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

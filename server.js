import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join', ({ username, room, color }) => {
    currentRoom = room;
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { users: {} };
    }

    rooms[room].users[socket.id] = {
      username,
      color,
      x: Math.floor(Math.random() * 10) + 1,
      y: Math.floor(Math.random() * 10) + 5
    };

    io.to(room).emit('stateUpdate', rooms[room]);
    io.to(room).emit('chatMessage', { type: 'system', text: `${username} joined the room` });
  });

  socket.on('move', ({ dir }) => {
    if (!currentRoom || !rooms[currentRoom] || !rooms[currentRoom].users[socket.id]) return;

    const user = rooms[currentRoom].users[socket.id];

    if (dir === 'up') user.y -= 1;
    if (dir === 'down') user.y += 1;
    if (dir === 'left') user.x -= 1;
    if (dir === 'right') user.x += 1;

    io.to(currentRoom).emit('stateUpdate', rooms[currentRoom]);
  });

  socket.on('chatMessage', (text) => {
    if (!currentRoom || !rooms[currentRoom] || !rooms[currentRoom].users[socket.id]) return;
    
    const user = rooms[currentRoom].users[socket.id];
    io.to(currentRoom).emit('chatMessage', {
      type: 'user',
      sender: user.username,
      color: user.color,
      text: text
    });
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom] && rooms[currentRoom].users[socket.id]) {
      const username = rooms[currentRoom].users[socket.id].username;
      delete rooms[currentRoom].users[socket.id];

      if (Object.keys(rooms[currentRoom].users).length === 0) {
        delete rooms[currentRoom];
      } else {
        io.to(currentRoom).emit('stateUpdate', rooms[currentRoom]);
        io.to(currentRoom).emit('chatMessage', { type: 'system', text: `${username} left the room` });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
const socket = io();

socket.on('connect', () => {
  console.log('connected as:', socket.id);
});


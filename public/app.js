const socket = io();

const joinScreen = document.getElementById('join-screen');
const gameContainer = document.getElementById('game-container');
const gridWorld = document.getElementById('grid-world');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const dpadBtns = document.querySelectorAll('.dpad-btn');
const roomDisplay = document.getElementById('room-display');
const leaveBtn = document.getElementById('leave-btn');

let currentRoom = '';
const GRID_SIZE = 30;

function joinRoom(username, room, color) {
  currentRoom = room;
  
  joinScreen.style.display = 'none';
  gameContainer.classList.remove('hidden');
  document.body.classList.add('paper-bg');
  
  roomDisplay.innerText = `Room: ${room}`;
  
  sessionStorage.setItem('hangout_user', JSON.stringify({ username, room, color }));
  
  socket.emit('join', { username, room, color });
}

const savedSession = sessionStorage.getItem('hangout_user');
if (savedSession) {
  const { username, room, color } = JSON.parse(savedSession);
  joinRoom(username, room, color);
}

joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();
  const color = document.querySelector('input[name="color"]:checked').value;
  
  if (username && room) {
    joinRoom(username, room, color);
  }
});

leaveBtn.addEventListener('click', () => {
  sessionStorage.removeItem('hangout_user');
  window.location.reload();
});

socket.on('stateUpdate', (roomState) => {
  gridWorld.innerHTML = '';
  
  for (const [id, user] of Object.entries(roomState.users)) {
    renderAvatar(id, user);
  }
});

document.addEventListener('keydown', (e) => {
  if (joinScreen.style.display !== 'none') return;
  if (document.activeElement.id === 'chat-input') return;

  let dir = null;
  if (e.key === 'ArrowUp' || e.key === 'w') dir = 'up';
  if (e.key === 'ArrowDown' || e.key === 's') dir = 'down';
  if (e.key === 'ArrowLeft' || e.key === 'a') dir = 'left';
  if (e.key === 'ArrowRight' || e.key === 'd') dir = 'right';

  if (dir) {
    socket.emit('move', { dir });
  }
});

dpadBtns.forEach(btn => {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    const dir = btn.getAttribute('data-dir');
    socket.emit('move', { dir });
  });
});

function renderAvatar(id, data) {
  let el = document.createElement('div');
  el.id = `player-${id}`;
  el.className = 'avatar';
  
  const nameTag = document.createElement('div');
  nameTag.className = 'avatar-name';
  nameTag.innerText = data.username;
  
  el.appendChild(nameTag);
  gridWorld.appendChild(el);

  el.style.backgroundColor = data.color;
  el.style.left = `${data.x * GRID_SIZE}px`;
  el.style.top = `${data.y * GRID_SIZE}px`;
}

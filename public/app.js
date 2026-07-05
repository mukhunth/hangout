const socket = io();

const joinScreen = document.getElementById('join-screen');
const gameContainer = document.getElementById('game-container');
const gridWorld = document.getElementById('grid-world');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const dpadBtns = document.querySelectorAll('.dpad-btn');

let currentRoom = '';
let myId = null;
const GRID_SIZE = 30;

joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();
  
  if (username && room) {
    currentRoom = room;
    
    joinScreen.style.display = 'none';
    gameContainer.classList.remove('hidden');
    document.body.classList.add('paper-bg');
    
    renderAvatar('temp_id', { x: 5, y: 5, username, color: '#88e389' });
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
    console.log('moving', dir);
  }
});

dpadBtns.forEach(btn => {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    const dir = btn.getAttribute('data-dir');
    console.log('moving', dir);
  });
});

function renderAvatar(id, data) {
  let el = document.getElementById(`player-${id}`);
  
  if (!el) {
    el = document.createElement('div');
    el.id = `player-${id}`;
    el.className = 'avatar';
    
    const nameTag = document.createElement('div');
    nameTag.className = 'avatar-name';
    nameTag.innerText = data.username;
    
    el.appendChild(nameTag);
    gridWorld.appendChild(el);
  }

  el.style.backgroundColor = data.color;
  el.style.left = `${data.x * GRID_SIZE}px`;
  el.style.top = `${data.y * GRID_SIZE}px`;
}

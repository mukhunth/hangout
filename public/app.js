const socket = io();

const joinScreen = document.getElementById('join-screen');
const joinForm = document.getElementById('join-form');
const gameContainer = document.getElementById('game-container');
const gridWorld = document.getElementById('grid-world');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const roomDisplay = document.getElementById('room-display');
const leaveBtn = document.getElementById('leave-btn');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const watchPartyBtn = document.getElementById('watch-party-btn');
const urlModal = document.getElementById('url-modal');
const ytUrlInput = document.getElementById('yt-url-input');
const startPartyBtn = document.getElementById('start-party-btn');
const cancelPartyBtn = document.getElementById('cancel-party-btn');
const videoOverlay = document.getElementById('video-overlay');
const closeVideoBtn = document.getElementById('close-video-btn');

let currentRoom = '';
const GRID_SIZE = 30;

function joinRoom(username, room, color) {
  currentRoom = room;
  
  joinScreen.style.display = 'none';
  gameContainer.classList.remove('hidden');
  document.body.classList.add('paper-bg');
  roomDisplay.innerText = `room ${room}`;
  
  sessionStorage.setItem('hangout_user', JSON.stringify({ username, room, color }));
  
  socket.emit('join', { username, room, color });
}

const savedSession = sessionStorage.getItem('hangout_user');
if (savedSession) {
  const { username, room, color } = JSON.parse(savedSession);
  joinRoom(username, room, color);
}

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
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

socket.on('chatMessage', (msg) => {
  const div = document.createElement('div');
  div.style.marginBottom = '5px';
  
  if (msg.type === 'system') {
    div.style.color = '#888';
    div.style.fontStyle = 'italic';
    div.innerText = msg.text;
  } else {
    div.innerHTML = `<strong style="color: ${msg.color}">${msg.sender}:</strong> ${msg.text}`;
  }
  
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = chatInput.value.trim();
    if (text) {
      socket.emit('chatMessage', text);
      chatInput.value = '';
    }
  }
});

// Keyboard controls
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

// Swipe-to-move controls
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('pointerdown', (e) => {
  if (joinScreen.style.display !== 'none') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
  
  touchStartX = e.clientX;
  touchStartY = e.clientY;
});

document.addEventListener('pointerup', (e) => {
  if (joinScreen.style.display !== 'none') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

  const touchEndX = e.clientX;
  const touchEndY = e.clientY;
  
  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;
  
  if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) return;

  let dir = null;
  if (Math.abs(diffX) > Math.abs(diffY)) {
    dir = diffX > 0 ? 'right' : 'left';
  } else {
    dir = diffY > 0 ? 'down' : 'up';
  }
  
  if (dir) {
    socket.emit('move', { dir });
  }
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

// Watch Party
let player;
let isInitializing = false;
let ignoreUntil = 0;

window.onYouTubeIframeAPIReady = function() {};

function initPlayer(videoId, startSeconds = 0) {
  if (player) {
    player.loadVideoById({ videoId, startSeconds });
    videoOverlay.classList.remove('hidden');
    closeVideoBtn.classList.remove('hidden');
    return;
  }
  
  videoOverlay.classList.remove('hidden');
  closeVideoBtn.classList.remove('hidden');
  isInitializing = true;
  player = new YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    videoId: videoId,
    playerVars: { 
      'autoplay': 1, 
      'controls': 1,
      'start': Math.floor(startSeconds)
    },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
  if (isInitializing) {
    if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
      isInitializing = false;
    }
    return;
  }
  
  if (event.data !== YT.PlayerState.PLAYING && event.data !== YT.PlayerState.PAUSED) return;
  
  if (Date.now() < ignoreUntil) return;
  
  const time = player.getCurrentTime();
  if (event.data === YT.PlayerState.PLAYING) {
    socket.emit('videoCommand', { action: 'play', time });
  } else if (event.data === YT.PlayerState.PAUSED) {
    socket.emit('videoCommand', { action: 'pause', time });
  }
}

watchPartyBtn.addEventListener('click', () => {
  urlModal.classList.remove('hidden');
});

cancelPartyBtn.addEventListener('click', () => {
  urlModal.classList.add('hidden');
  ytUrlInput.value = '';
});

startPartyBtn.addEventListener('click', () => {
  const url = ytUrlInput.value.trim();
  if (!url) return;
  
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (match && match[1]) {
    initPlayer(match[1]);
    socket.emit('videoCommand', { action: 'load', videoId: match[1] });
    urlModal.classList.add('hidden');
    ytUrlInput.value = '';
  } else {
    alert("Invalid YouTube URL");
  }
});

closeVideoBtn.addEventListener('click', () => {
  videoOverlay.classList.add('hidden');
  closeVideoBtn.classList.add('hidden');
  if (player && player.stopVideo) player.stopVideo();
  socket.emit('videoCommand', { action: 'close' });
});

socket.on('videoCommand', (cmd) => {
  ignoreUntil = Date.now() + 1000;
  
  if (cmd.action === 'load') {
    initPlayer(cmd.videoId);
  } else if (cmd.action === 'play') {
    if (player && player.seekTo) {
      if (Math.abs(player.getCurrentTime() - cmd.time) > 2) {
        player.seekTo(cmd.time, true);
      }
      player.playVideo();
    }
  } else if (cmd.action === 'pause') {
    if (player && player.pauseVideo) {
      if (Math.abs(player.getCurrentTime() - cmd.time) > 2) {
        player.seekTo(cmd.time, true);
      }
      player.pauseVideo();
    }
  } else if (cmd.action === 'close') {
    videoOverlay.classList.add('hidden');
    closeVideoBtn.classList.add('hidden');
    if (player && player.stopVideo) player.stopVideo();
  }
});

socket.on('videoSync', (vs) => {
  initPlayer(vs.videoId, vs.time);
});
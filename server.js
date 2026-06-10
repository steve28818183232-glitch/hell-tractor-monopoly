const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 讓伺服器讀取網頁檔案
app.use(express.static(__dirname));

// 紀錄所有在線上的玩家
const players = {};

io.on('connection', (socket) => {
    console.log('有新玩家加入：' + socket.id);
    
    // 給新玩家一個隨機顏色和初始位置
    players[socket.id] = {
        x: 300,
        y: 200,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    
    // 把目前所有人傳給新玩家
    socket.emit('currentPlayers', players);
    // 通知其他人有新玩家來了
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // 接收玩家移動的指令
    socket.on('playerMovement', (movementData) => {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        // 廣播給所有人更新畫面
        io.emit('playerMoved', { id: socket.id, player: players[socket.id] });
    });

    // 玩家離開
    socket.on('disconnect', () => {
        console.log('玩家離開：' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`遊戲伺服器已啟動在 port ${PORT}`);
});

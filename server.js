const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const players = {};
let turnOrder = []; // 紀錄玩家順序的陣列
let currentTurnIndex = 0; // 目前輪到第幾個人

const boardLength = 14;

io.on('connection', (socket) => {
    console.log('有新玩家連線：' + socket.id);
    
    // 玩家選擇角色後才正式加入遊戲
    socket.on('joinGame', (selectedAvatar) => {
        players[socket.id] = {
            id: socket.id,
            position: 0,
            coins: 0,
            avatar: selectedAvatar
        };
        turnOrder.push(socket.id); // 加入排隊隊伍
        
        // 廣播給所有人最新的玩家名單和回合狀態
        io.emit('currentPlayers', players);
        updateTurn();
    });

    socket.on('rollDice', () => {
        // 檢查是不是輪到這個人
        if (turnOrder[currentTurnIndex] !== socket.id) return;
        
        const player = players[socket.id];
        const steps = Math.floor(Math.random() * 6) + 1;
        let newPosition = player.position + steps;
        
        if (newPosition >= boardLength) {
            player.coins += 10;
            newPosition = newPosition % boardLength;
        }
        
        player.position = newPosition;
        
        io.emit('diceResult', { id: socket.id, steps: steps, player: player });
        
        // 換下一個人
        currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
        updateTurn();
    });

    socket.on('disconnect', () => {
        console.log('玩家離開：' + socket.id);
        delete players[socket.id];
        // 把離開的人從排隊隊伍中剔除
        turnOrder = turnOrder.filter(id => id !== socket.id);
        if (currentTurnIndex >= turnOrder.length) {
            currentTurnIndex = 0;
        }
        io.emit('currentPlayers', players);
        io.emit('playerDisconnected', socket.id);
        updateTurn();
    });

    // 通知所有人現在輪到誰了
    function updateTurn() {
        if (turnOrder.length > 0) {
            const currentTurnId = turnOrder[currentTurnIndex];
            io.emit('turnUpdate', currentTurnId);
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`遊戲伺服器已啟動`);
});

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const players = {};
// 給玩家隨機分配可愛的瑪利歐風格角色
const avatars = ['🍄', '🐢', '🌟', '👻', '🐶', '🐱'];
const boardLength = 14; // 我們的環狀地圖總共有 14 格

io.on('connection', (socket) => {
    console.log('有新玩家加入：' + socket.id);
    
    // 玩家初始狀態設定
    players[socket.id] = {
        id: socket.id,
        position: 0, // 大家都在第 0 格 (起點) 出生
        coins: 0,    // 初始金幣為 0
        avatar: avatars[Math.floor(Math.random() * avatars.length)]
    };
    
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // 接收玩家按鈕「擲骰子」的指令
    socket.on('rollDice', () => {
        const player = players[socket.id];
        if (!player) return;
        
        // 隨機產生 1 到 6 的步數
        const steps = Math.floor(Math.random() * 6) + 1;
        let newPosition = player.position + steps;
        
        // 【核心邏輯】經過或回到終點 (第 0 格)，給予 Bonus 獎勵！
        if (newPosition >= boardLength) {
            player.coins += 10; // 領取 10 個金幣的 Bonus！
            newPosition = newPosition % boardLength; // 讓位置重新繞回前面
        }
        
        player.position = newPosition;
        
        // 廣播擲骰子結果與更新後的玩家狀態給所有人
        io.emit('diceResult', { id: socket.id, steps: steps, player: player });
    });

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

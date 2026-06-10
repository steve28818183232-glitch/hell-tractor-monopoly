const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const players = {};
let turnOrder = [];
let currentTurnIndex = 0;

io.on('connection', (socket) => {
    socket.on('joinGame', (avatar) => {
        players[socket.id] = { id: socket.id, position: 0, coins: 0, avatar: avatar };
        turnOrder.push(socket.id);
        io.emit('currentPlayers', players);
        updateTurn();
    });

    socket.on('rollDice', () => {
        if (turnOrder[currentTurnIndex] !== socket.id) return;
        const player = players[socket.id];
        const steps = Math.floor(Math.random() * 6) + 1;
        player.position = (player.position + steps) % 14;
        if (player.position === 0) player.coins += 10;
        io.emit('diceResult', { id: socket.id, steps: steps, player: player });
        currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
        updateTurn();
    });

    socket.on('playerMove', (newPos) => {
        if (players[socket.id]) {
            players[socket.id].position = newPos;
            io.emit('playerMoved', { id: socket.id, position: newPos });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        turnOrder = turnOrder.filter(id => id !== socket.id);
        io.emit('currentPlayers', players);
        updateTurn();
    });

    function updateTurn() {
        if (turnOrder.length > 0) {
            io.emit('turnUpdate', { currentTurnId: turnOrder[currentTurnIndex], order: turnOrder });
        }
    }
});

server.listen(process.env.PORT || 3000);

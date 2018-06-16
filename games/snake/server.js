const fs = require("fs-extra");

function randomNumber(digits){
	return Math.floor(Math.random()*9*Math.pow(10, digits-1 || 3))+Math.pow(10, digits-1 || 3)
}
class server {
	constructor({wss, server, app}){
		this.wss = wss;
		this.app = app;
		
		this.lobbies = [];
		
		wss.on('connection', socket => {
			socket.on('snakeCreateGame', data => {
				let lobby = new snakeGame({
					wss,
					creatorSocket:socket
				});
				this.lobbies.push(lobby);
			});
			socket.on("snakeInput", data => {
				wss.publishToWorkers({
					event:"snakeInput",
					data,
				});
			});
		});
		
		app.get("/snake", async (req,res) => {
			res.send(await fs.readFile("games/snake/static/index.html", "utf8"));
		});
	}
}

class snakeGame {
	constructor({id, wss, creatorSocket}){
		this.id = id || "snake"+randomNumber(4);
		this.lastInputReceived = Date.now();
		creatorSocket.send('snake', {
			action:"joinLobby",
			id: this.id,
		});
		this.players = {};
		wss.setMiddleware('onMessageFromWorker', data => {
			if(data.event
			&& data.event === "snakeInput"
			&& data.data
			&& data.data.gameId == this.id
			&& data.data.playerId
			&& data.data.input
			&& typeof data.data.input === "string"){
				console.log(`Registered input ${data.data.input} from ${data.data.playerId} in snakeGame ${data.data.gameId}`);
				this.players[data.data.playerId] = this.players[data.data.playerId] || {};
				let player = this.players[data.data.playerId];
				player.input = data.data.input;
				this.lastInputReceived = Date.now();
			}
			console.log(`Current worker pid ${process.pid} got message: \n ${JSON.stringify(data, null, 4)}`);
		});
		
		// game logic
		let doGameTick = () => {
			// console.log("Gametick")
			for(let playerName in this.players){
				let player = this.players[playerName];
				if(!player.snake) player.snake = [];
				if(!player.score) player.score = 10;
				if(player.x === undefined) player.x = Math.floor(Math.random()*30)+10;
				if(player.y === undefined) player.y = Math.floor(Math.random()*30)+10;
				
				if(player.input){
					if(player.input == "up") player.y--;
					if(player.input == "down") player.y++;
					if(player.input == "left") player.x--;
					if(player.input == "right") player.x++;
				}
				if(player.x < 0) player.x = 49;
				if(player.x > 49) player.x = 0;
				if(player.y < 0) player.y = 49;
				if(player.y > 49) player.y = 0;
				
				player.snake.push({
					x:player.x,
					y:player.y,
				});
				while(player.snake.length > player.score){
					player.snake.shift();
				}
			}
			wss.publish(this.id, {
				players: this.players,
			});
			if(Date.now() > this.lastInputReceived +1000*60*5) clearInterval(this.gameTickInterval);
		}
		this.gameTickInterval = setInterval(doGameTick, 300);
	}
}

module.exports = {
	server
};

const fs = require("fs-extra");

function randomNumber(digits){
	return Math.floor(Math.random()*9*Math.pow(10, digits-1 || 3))+Math.pow(10, digits-1 || 3)
}
class server {
	constructor({wss, server, app, socketEmitter}){
		this.wss = wss;
		this.app = app;
		
		this.lobbies = [];
		
		socketEmitter.on('connection', socket => {
			socket.on('snakeCreateGame', data => {
				let lobby = new snakeGame({
					wss,
					creatorSocket:socket,
					server:this,
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
	constructor({id, wss, creatorSocket, server}){
		this.id = id || "snake"+randomNumber(4);
		this.lastInputReceived = Date.now();
		creatorSocket.send('snake', {
			action:"joinLobby",
			id: this.id,
		});
		this.players = {};
		this.food = [];
		this.settings = {
			startingScore: 5,
			foodScore: 4,
			mapWidth: 75,
			mapHeight: 75,
		};
		wss.setMiddleware('onMessageFromWorker', data => {
			if(data.event
			&& data.event === "snakeInput"
			&& data.data
			&& data.data.gameId == this.id
			&& data.data.playerId
			&& data.data.input
			&& typeof data.data.input === "string"){
				console.log(`Registered input "${data.data.input}" from ${data.data.playerId} in snakeGame ${data.data.gameId}`);
				this.players[data.data.playerId] = this.players[data.data.playerId] || {};
				let player = this.players[data.data.playerId];
				if(data.data.input == "left" && player.input != "right") player.input = data.data.input;
				if(data.data.input == "right" && player.input != "left") player.input = data.data.input;
				if(data.data.input == "up" && player.input != "down") player.input = data.data.input;
				if(data.data.input == "down" && player.input != "up") player.input = data.data.input;
				this.lastInputReceived = Date.now();
			}
		});
		
		// game logic
		let doGameTick = () => {
			// console.log("Gametick")
			for(let playerName in this.players){
				let player = this.players[playerName];
				if(!player.snake) player.snake = [];
				if(!player.score) player.score = this.settings.startingScore;
				if(player.x === undefined) player.x = Math.floor(Math.random()*30)+10;
				if(player.y === undefined) player.y = Math.floor(Math.random()*30)+10;
				
				if(player.input){
					if(player.input == "up") player.y--;
					if(player.input == "down") player.y++;
					if(player.input == "left") player.x--;
					if(player.input == "right") player.x++;
				}
				if(player.x < 0) player.x = this.settings.mapWidth-1;
				if(player.x > this.settings.mapWidth-1) player.x = 0;
				if(player.y < 0) player.y = this.settings.mapHeight-1;
				if(player.y > this.settings.mapHeight-1) player.y = 0;
				
				// THIS IS SUPER INEFFICIENT!
				// now we check every player for collisions against every player once per player
				checkCollisions(player, this.food);
				
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
				food: this.food,
			});
			if(Date.now() > this.lastInputReceived +1000*60*5){
				// lobby has been unused for 5 minutes
				console.log(`Lobby "${this.id}" unused for 5 minutes, killing main loop.`)
				clearInterval(this.gameTickInterval);
				server.lobbies.splice(server.lobbies.indexOf(this), 1);
			}
		}
		this.gameTickInterval = setInterval(doGameTick, 300);
		
		let checkCollisions = (player, food) => {
			let players = this.players;
			let snakes = [];
			for(let playerName in players){
				let player = players[playerName];
				snakes.push(player.snake);
			}
			snakes.forEach(snake => {
				if(snake){
					snake.forEach(j => {
						if(j.x == player.x && j.y == player.y){
							player.score = this.settings.startingScore;
						}
					});
				}
			});
			food.forEach((apple, i) => {
				if(player.x == apple.x && player.y == apple.y){
					player.score += this.settings.foodScore;
					food.splice(i, 1); // remove apple from the board
					addNewFood(food); // add new apple
				}
			});
		}
		let addNewFood = food => {
			food.push({
				x:Math.floor(Math.random()*(this.settings.mapWidth-1)),
				y:Math.floor(Math.random()*(this.settings.mapHeight-1)),
			})
		}
		while(this.food.length < 10){
			addNewFood(this.food);
		}
	}
}

module.exports = {
	server
};

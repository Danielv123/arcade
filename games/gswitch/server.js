const fs = require("fs-extra");
const gswitchPlatforms = require("./platforms.js")

function randomNumber(digits){
	return Math.floor(Math.random()*9*Math.pow(10, digits-1 || 3))+Math.pow(10, digits-1 || 3)
}
class server {
	constructor({wss, server, app, socketEmitter}){
		this.wss = wss;
		this.app = app;
		
		this.lobbies = [];
		socketEmitter.on('connection', socket => {
			socket.on('gswitchCreateGame', data => {
				let lobby = new gswitchGame({
					wss,
					creatorSocket:socket,
					server:this,
				});
				this.lobbies.push(lobby);
			});
			socket.on("gswitchInput", data => {
				wss.publishToWorkers({
					event:"gswitchInput",
					data,
				});
			});
		});
		
		app.get("/gswitch", async (req,res) => {
			res.send(await fs.readFile("games/gswitch/static/index.html", "utf8"));
		});
	}
}

class gswitchGame {
	constructor({id, wss, creatorSocket, server}){
		this.id = id || "gswitch"+randomNumber(4);
		console.log(`Created new game: ${this.id}`);
		this.lastInputReceived = Date.now();
		creatorSocket.send('gswitch', {
			action:"joinLobby",
			id: this.id,
		});
		this.players = {};
		this.platforms = [];
		wss.setMiddleware('onMessageFromWorker', data => {
			if(data.event
			&& data.event === "gswitchInput"
			&& data.data
			&& data.data.gameId == this.id
			&& data.data.playerId
			&& data.data.input
			&& typeof data.data.input === "string"){
				console.log(`Registered input ${data.data.input} from ${data.data.playerId} in gswitchGame ${data.data.gameId}`);
				this.players[data.data.playerId] = this.players[data.data.playerId] || {
					height:10,
					width:10,
				};
				let player = this.players[data.data.playerId];
				// player.input = data.data.input;
				registerInput(data.data.playerId, data.data.input);
				this.lastInputReceived = Date.now();
			}
		});
		this.settings = {
			gravity:5,
			speed:2,
		}
		// game logic
		this.tick = 0;
		let doGameTick = () => {
			this.tick += 1;
			// console.log("Gametick")
			
			// move players
			for(let playerName in this.players){
				let player = this.players[playerName];
				player.direction = player.direction || "down";
				if(player.x === undefined) player.x = 20;
				if(player.y === undefined) player.y = 200;
				
				let dir = 1;
				if(player.direction == "up") dir = -1;
				
				// get distance to nearest platform/thing to collide with
				let maxDistance = 9999;
				this.platforms.forEach(platform => {
					// console.log(platform.x + platform.width)
					if(platform.left < player.x + player.width
					&& platform.left + platform.width > player.x){
						if(dir > 0){
							// look for platforms below us
							var distance = platform.top - (player.y + player.height);
						} else if(dir < 0){
							// look for platforms above us
							var distance = player.y - platform.top - platform.height;
						}
						if(distance >= 0 && distance < maxDistance){
							maxDistance = distance;
						}
					}
				});
				for(let otherPlayerName in this.players){
					if(otherPlayerName != playerName // don't check collisions against yourself
					){
						let distance;
						let otherPlayer = this.players[otherPlayerName]
						if(dir > 0){
							// look for player below us (should be higher Y)
							distance = otherPlayer.y - player.y - player.height;
						} else if(dir < 0){
							// look for player above us (should be lower Y)
							distance = player.y - otherPlayer.y - otherPlayer.height;
						}
						if(distance >= 0 && distance < maxDistance){
							maxDistance = distance;
						}
					}
				}
				// move in y direction (but not farther than maxDistance)
				player.y += Math.min(this.settings.gravity, maxDistance) * dir;
				
				// toggle direction if maxDistance == 0 (we have collided)
				if(maxDistance === 0 && player.input == "switch" && this.tick - player.inputTick < 5){
					player.input == "";
					// valid keypress detected
					player.direction = player.direction == "down"? "up" : "down";
				}
			}
			// move in x direction
			// this can be probably be done my moving all the platforms
			// also, slightly move the player towards the center
			// so he won't fall off.
			this.platforms.forEach(platform => {
				platform.left -= this.settings.speed;
			});
			
			wss.publish(this.id, {
				players: this.players,
				platforms: this.platforms,
			});
			if(Date.now() > this.lastInputReceived +1000*60*5){
				// lobby has been unused for 5 minutes
				console.log(`Lobby "${this.id}" unused for 5 minutes, killing main loop.`)
				clearInterval(this.gameTickInterval);
				server.lobbies.splice(server.lobbies.indexOf(this), 1);
			}
		}
		this.gameTickInterval = setInterval(doGameTick, 16);
		
		let restartGame = () => {
			console.log("Game restarted")
			this.platforms = [];
			// roof platform
			this.platforms.push({
				width:	10000,
				height:	10,
				top:	0,
				left:	0,
			});
			this.platforms.push({
				width:	10000,
				height:	10,
				top:	490,
				left:	0,
			});
			gswitchPlatforms.tract({
				startDistanceFromCenter: 200,
				stopDistanceFromCenter: 0,
				startOffset: 700,
			}).forEach(platform => this.platforms.push(platform));
		}
		restartGame(); // generate the initial game
		let registerInput = (playerId, input) => {
			let player = this.players[playerId];
			player.inputTick = this.tick;
			player.input = input;
			if(input == "restartGame"){
				restartGame();
			}
		}
	}
}

module.exports = {
	server
};

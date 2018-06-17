const ClusterWS = require('clusterws')
const express = require('express')

const process = require("process");
process.title = "nodeArcade";
const fs = require('fs')

const clusterws = new ClusterWS({
    worker: Worker,
    // Enable ssl
    tlsOptions: {
       // You can pass the same options as in node js https guide:
       // https://nodejs.org/api/https.html
       // example:
       key: fs.readFileSync('database/certificates/cert.key'),
       cert: fs.readFileSync('database/certificates/cert.crt'),
    },
	workers: require('os').cpus().length,
	brokers: 2,
	restartWorkerOnFail: true,
	pingInterval: 5000,
	
});

function Worker() {
	const ejs = require("ejs");
	const path = require("path");
	const EventEmitter = require('events');
	class SocketEmitter extends EventEmitter {}
	const socketEmitter = new SocketEmitter();
	
	const arcadeTools = require("./arcadeTools.js");
	
    const wss = this.wss
    const server = this.server

    // Use your library/framework as you usually do
    const app = express();
	const bodyParser = require("body-parser");
	app.use(bodyParser.json());
	(async function(){
		const games = await arcadeTools.loadGames({}, {
			wss,
			server,
			app,
			socketEmitter,
		});
		console.log(games)
	})();
	// dynamic HTML generations with EJS
	app.set('views', path.join(__dirname, 'static'));
	app.set('view engine', 'html');
	app.engine('html', ejs.renderFile);

	// Set folder to serve static content from (the website)
	app.use(express.static('static'));
	
	// Connect ClusterWS and your library/framework 
	server.on('request', app)

	// Listen on WebSocket connection
	wss.on('connection', socket => {
		console.log("Got connection on PID:"+process.pid);
		socketEmitter.emit("connection", socket);
	});
}

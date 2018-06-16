// require external modules
/*

const needle = require("needle");
const ejs = require("ejs");
const bcrypt = require("bcrypt-promise");
const crypto = require("crypto");
const base64url = require("base64url");

const express = require("express");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");

// nodejs core requires
const fs = require("fs");
const cluster = require("cluster");


// Code to run if we're in the master process
if (cluster.isMaster) {
	// Count the machine's CPUs
    let cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (let i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
	cluster.on('exit', function (worker) {
		// Replace the dead worker,
		// we're not sentimental
		console.log('Worker %d died :(', worker.id);
		cluster.fork();
	});
// Code to run if we're in a worker process
} else {
	var app = express();
    // Add a basic route – index page
    app.get('/', function (req, res) {
        res.send('Hello from Worker ' + cluster.worker.id);
    });
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		parameterLimit: 100000,
		limit: '10mb',
		extended: true
	}));
	
	httpsServer = require("https").createServer({
		key: fs.readFileSync( 'database/certificates/cert.key' ),
		cert: fs.readFileSync( 'database/certificates/cert.crt' ),
	}, app).listen(443);
	
	console.log('Worker %d running!', cluster.worker.id);
	
	// crash after a set amount of time
	setTimeout(()=>{
		process.exit(0);
	}, Math.random()*1000*1000);
}

*/

const ClusterWS = require('clusterws')
const express = require('express')

const process = require("process");
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
	
	const arcadeTools = require("./arcadeTools.js");
	
    const wss = this.wss
    const server = this.server

    // Use your library/framework as you usually do
    const app = express();
	const bodyParser = require("body-parser");
	app.use(bodyParser.json());
	const games = arcadeTools.loadGames({}, {
		wss,
		server,
		app,
	});
	
	// dynamic HTML generations with EJS
	app.set('views', path.join(__dirname, 'static'));
	app.set('view engine', 'html');
	app.engine('html', ejs.renderFile);

	// Set folder to serve static content from (the website)
	app.use(express.static('static'));
	
	// Connect ClusterWS and your library/framework 
	server.on('request', app)

	// Listen on WebSocket connection
	wss.on('connection', (socket) => {
		console.log("Got connection on PID:"+process.pid);
		
	});
}

// require external modules
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

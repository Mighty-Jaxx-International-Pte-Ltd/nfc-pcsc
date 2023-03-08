//import dotenv from 'dotenv';
require('dotenv').config({ path: '../.env' });
const axios = require('axios');
// import dotenv from 'dotenv';
// dotenv.config({ path: '../.env' })
const queueName = process.env.QUEUE_NAME;
const dbName = '../' + process.env.DB_NAME;

// //
const VerySimpleQueue = require('very-simple-queue');
const verySimpleQueue = new VerySimpleQueue('sqlite3', {
	filePath: dbName,
  });

function sendData(payload) {
	try {
		console.log('payload', payload);
		const url = 'https://staging.mightyjaxx.technology/api/v4/ste-event-space/log-event-space';
		axios.post(url, payload)
		.then(async response => {
			console.log('Success posting to server');
			console.log(response.data);
		})
		.catch(async error => {
			console.log(`Error posting to server ${error}`);
			console.error(error);
		});
	} catch (error) {
		console.log(`Error ${error}`);
		console.error(error);
	}
}

async function start() {
	try {
		if (!queueName) {
			console.log('Please set QUEUE_NAME in .env');
			return;
		}
		if (!dbName) {
			console.log('Please set DB_NAME in .env');
			return;
		}
		console.log('start');
		console.log(`processJobQueue on queue ${queueName} in DB ${dbName} is ready`);
		//processJobQueue();
		await verySimpleQueue.handleJob((payload) =>
		sendData(payload)
		, queueName).catch((err) => { console.log(err); });

		await verySimpleQueue.work((payload) => sendData(payload), { queue: queueName });
		
		setTimeout(function() {
			console.log('Blah blah blah blah extra-blah');
		}, 5000);
	} catch (error) {
		console.log(`Error ${error}`);
		console.error(error);
	}
}

start();

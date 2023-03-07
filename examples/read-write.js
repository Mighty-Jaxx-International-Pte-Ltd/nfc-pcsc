"use strict";
require('dotenv').config();
// #############
// Example: Reading and writing data
// - should work well with any compatible PC/SC card reader
// - tested with MIFARE Ultralight cards but should work with many others (e.g. NTAG)
// - what is covered:
//   - example reading and writing data on from/to card
// - NOTE! for reading and writing data from/to MIFARE Classic please see examples/mifare-classic.js which explains MIFARE Classic specifics
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from '../src/index';
import pretty from './pretty-logger';

import { usb, getDeviceList } from 'usb';
const devices = getDeviceList();
const axios = require('axios');
const sound = require("sound-play");

const nfc = new NFC(); // const nfc = new NFC(pretty); // optionally you can pass logger to see internal debug logs

const correctAudio = 'audio/ding.mp3';
const incorrectAudio = 'audio/buzzer.mp3';

//FOR PHILIPS HUE
const { discovery, v3 } = require('node-hue-api');
const api = v3.api;
const host = '192.168.128.195';
const username = 'Blm2OVZZaMXokdWLNY4UClAodxaYE7rPTmhW3Dnk';
const LightState = require('node-hue-api').v3.lightStates.LightState;
const myLightState = new LightState().alertShort();
const LIGHT_NAME  = 'Hue 1';
let LIGHT_ID = 0;
let secure = null;

//
const options = { verbose: console.log };
const db = require('better-sqlite3')('ste.db', options);


async function getBridge() {
	// This will do a UPNP search for bridges on the local network
	try{
	// 	const results = await discovery.mdnsSearch();
	// 	// Results will be an array of bridges that were found
	// 	console.log('Hue Bridges Found: ' + JSON.stringify(results, null, 2));

		// console.log(secure);
		secure = await api.createLocal(host).connect(username);
		console.log('lights');
		// secure.lights.getLightState(LIGHT_ID)
		// .then(attributesAndState => {
		// 	// Display the details of the light
		// 	console.log(JSON.stringify(attributesAndState, null, 2));
		// });
		secure.lights.getLightByName(LIGHT_NAME)
			.then(lights => {
				LIGHT_ID = lights[0].id;
				// Display the details of the first light match
				//console.log('light found: ' + JSON.stringify(lights[0], null, 2));
			});

		// secure.lights.getAll()
		// 	.then(allLights => {
		// 		// Display the lights from the bridge
		// 		// secure.lights.getLightState(LIGHT_ID)
		// 		// .then(attributesAndState => {
		// 		// 	// Display the details of the light
		// 		// 	console.log(JSON.stringify(attributesAndState, null, 2));
		// 		// });
		// 		// allLights.forEach(element => {
		// 		// 	console.log(element.id);
		// 		// });
		// 		//console.log(JSON.stringify(allLights, null, 2));
		// 	});
		// const light = (await secure.lights.get)[0]
		// const state = stateFromOptions(options)
		// await secure.lights.setLightState(light.id, state)
	} catch (err) {
		console.log('Error searching for bridges', err);
	}
}

//getBridge();
nfc.on('reader', async reader => {

	getBridge();
	pretty.info(`device attached`, JSON.stringify(reader));

	// let idx = 1;
	// for (const device of devices) {
	// 	console.log(`device ${idx}: ${device}`); // Legacy device
	// 	console.log(device);
	// 	idx++;
	// }
	// enable when you want to auto-process ISO 14443-4 tags (standard=TAG_ISO_14443_4)
	// when an ISO 14443-4 is detected, SELECT FILE command with the AID is issued
	// the response is available as card.data in the card event
	// you can set reader.aid to:
	// 1. a HEX string (which will be parsed automatically to Buffer)
	reader.aid = 'F222222222';
	// 2. an instance of Buffer containing the AID bytes
	// reader.aid = Buffer.from('F222222222', 'hex');
	// 3. a function which must return an instance of a Buffer when invoked with card object (containing standard and atr)
	//    the function may generate AIDs dynamically based on the detected card
	// reader.aid = ({ standard, atr }) => {
	//
	// 	return Buffer.from('F222222222', 'hex');
	//
	// };

	reader.on('card', async card => {
		// example reading 4 bytes assuming containing 16bit integer
		// !!! note that we don't need 4 bytes - 16bit integer takes just 2 bytes !!!
		try {
			const roomID = process.env.ROOM_ID;
			const option = process.env.OPTION;
			const readerName = reader.name;

			pretty.info(`card detected`, card);
			pretty.info(`reader detected`, JSON.stringify(reader));
			pretty.info(JSON.stringify(nfc));
			pretty.info(`Loading reader for room: ${roomID} and option: ${option}`);

			const cardUid = card.uid;
			pretty.info(`Welcome to Stranger Things Event 2023`);
			pretty.info(`uid is ${cardUid}`);
			pretty.info(`Sending UID ${cardUid} with room ${roomID}, option ${option} and reader name '${readerName}' to MJ server`);
			// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start reading
			// - length - how many bytes to read
			// - blockSize - 4 for MIFARE Ultralight, 16 for MIFARE Classic
			// ! Caution! length must be divisible by blockSize (we have to read the whole block(s))

			// const data = await reader.read(4, 4);

			// pretty.info(`data read`, reader, data);

			// const payload = data.readInt16BE(0);

			// pretty.info(`data converted`, reader, payload);
			const url = 'https://mightyjaxx.technology/api/v4/ste-event-space/log-event-space';
			const data = {
				eventRoomId: roomID,
				uId: cardUid,
				readerName: readerName,
			};
			axios.post(url, data)
			.then(async response => {
				console.log('Success');
				console.log(response.data);

				secure.lights.setLightState(LIGHT_ID, myLightState)
				.then(result => {
					console.log(`Light state change for ${LIGHT_NAME} was successful? ${result}`);
				})
				try {
					await sound.play(correctAudio);
					console.log('done playing: correctAudio');
				  } catch (error) {
					console.log('audio success play success', error);
					console.error(error);
				  }
			})
			.catch(async error => {
				console.log('Error');
				console.error(error);
				try {
					await sound.play(incorrectAudio);
					console.log('done playing: incorrectAudio');
				  } catch (error) {
					console.log('audio success play error', error);
					console.error(error);
				  }
			});

		} catch (err) {
			pretty.error(`error when reading data`, reader, err);
			try {
				await sound.play(incorrectAudio);
				console.log('done playing: incorrectAudio');
			  } catch (error) {
				console.log('audio success play error', error);
				console.error(error);
			  }
		}


		// example write 4 bytes containing 16bit integer
		// !!! note that we don't need 16 bytes - 16bit integer takes just 2 bytes !!!
		// try {

		// 	// reader.write(blockNumber, data, blockSize = 4, packetSize = 16)
		// 	// - blockNumber - memory block number where to start writing
		// 	// - data - what to write
		// 	// - blockSize - 4 for MIFARE Ultralight, 16 for MIFARE Classic
		// 	// ! Caution! data.length must be divisible by blockSize (we have to write the whole block(s))

		// 	const data = Buffer.allocUnsafe(4).fill(0);
		// 	const randomNumber = Math.round(Math.random() * 1000);
		// 	data.writeInt16BE(randomNumber, 0);

		// 	await reader.write(4, data);

		// 	pretty.info(`data written`, reader, randomNumber, data);

		// } catch (err) {
		// 	pretty.error(`error when writing data`, reader, err);
		// }


	});

	reader.on('error', async err => {
		pretty.error(`an error occurred on reader`, reader, err);
		try {
			await sound.play(incorrectAudio);
			console.log('done playing: incorrectAudio');
		  } catch (error) {
			console.log('audio success play error', error);
			console.error(error);
		  }
	});

	reader.on('end', () => {
		pretty.info(`device removed`, reader);
	});


});

nfc.on('error', async err => {
	pretty.error(`an error occurred on nfc`, err);
	try {
		await sound.play(incorrectAudio);
		console.log('done playing: incorrectAudio');
	  } catch (error) {
		console.log('audio success play error', error);
		console.error(error);
	  }
});

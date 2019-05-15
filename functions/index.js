const functions = require('firebase-functions')
const { WebhookClient } = require('dialogflow-fulfillment')
const { dialogflow } = require('actions-on-google')

process.env.DEBUG = 'dialogflow:*' // enable lib debugging statements

const app = dialogflow({debug: true})

app.intent('Set player names', (conv, { playerNames }) => {
	console.log('got a game start intent')

	conv.data.names = playerNames
	conv.data.playerCount = playerNames.length
	conv.ask(`Ok, I setup a game for ${playerNames.length} players. How many points should each player start with?`)
})

app.intent('Apply operation', (conv, { operation, points, player }) => {
	console.log('got a apply operation intent')
	if (!conv.data.state) {
		// there are no names, should implement some kind of error handling
		console.log('no state stored')
	} else {
		console.log('there is state, so we can perform the operation')
		//console.log(conv.data.state.serialize())
		console.log(conv.data.state)
		if (player in conv.data.state) {
			// this player exists, so we can operate on it
			let currentPoints = conv.data.state[player]
			console.log(`found ${player} in the map, they have ${currentPoints} before the operation`)
			switch(operation) {
				case 'add':
					console.log('adding')
					currentPoints += points;
					break;
				case 'subtract':
					console.log('subtracting')
					currentPoints -= points;
					break;
				case 'set':
					console.log('setting')
					currentPoints = points;
					break;
			}
			conv.data.state[player] = currentPoints
			conv.ask(`${player} now has ${currentPoints}`)
		}
	}
})


app.intent('Set starting points', (conv, { startingPoints }) => {
	conv.data.state = new Map()
	for (const name of conv.data.names) {
		console.log(`giving ${name} ${startingPoints}`)
		conv.data.state[name] = startingPoints
	}
	conv.ask(`Started a game, everyone has ${startingPoints} points. Good luck!`)
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)

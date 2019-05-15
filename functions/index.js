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
		console.log(conv.data.state)
		if (player in conv.data.state) {
			// this player exists, so we can operate on it
			let currentPoints = Number(conv.data.state[player]) // have to parse the strings to a number so that they do math instead of concat
			let pointsNum = Number(points) // have to parse the strings to a number so that they do math instead of concat
			console.log(`found ${player} in the map, they have ${currentPoints} before the operation`)
			switch(operation) {
				case 'add':
					console.log('adding')
					currentPoints += pointsNum
					break;
				case 'subtract':
					console.log('subtracting')
					currentPoints -= pointsNum
					break;
				case 'set':
					console.log('setting')
					currentPoints = pointsNum
					break;
				case 'delete':
					console.log('deleting')
					currentPoints = 0
					break;
			}
			conv.data.state[player] = currentPoints
			conv.ask(`${player} now has ${currentPoints}`)
		}
	}
})

app.intent('List all points', (conv) => {
	if (!conv.data.state) {
		// there are no names, should implement some kind of error handling
		console.log('no state stored')
	} else {
		// there is state
		console.log(conv.data.state)

		let responseString = `Here are the scores`
		for (player in conv.data.state) {
			let playerPoints = conv.data.state[player]
			responseString += `${player} has ${playerPoints}, `
		}

		conv.ask(responseString)
	}
})

app.intent('Reset game', (conv) => {
	console.log('got intent to reset the game')
	conv.data.previousGameState = conv.data.state
	conv.data.state = null
	conv.ask(`I've reset the scores. Do you want to play another game?`)
})

app.intent('New game with same players', (conv) => {
	console.log('got intent for new game with same player list')
	conv.data.state = buildNewGameStateMap(conv.data.startingPoints, conv.data.names)
	conv.ask(`Great, another round! I've reset the scores, have fun!`)
})

app.intent('Edit player list', (conv, { operation, player }) => {
	if (!conv.data.state) {
		// there are no names, should implement some kind of error handling
		console.log('no state stored')
	} else {
		console.log('there is state, so we can edit the player list')
		console.log(conv.data.state)
		if (player in conv.data.state) {
			// this player exists, so we can operate on it
			console.log(`found ${player} in the map`)
			switch(operation) {
				case 'add':
				case 'set':
					console.log('adding')
					conv.data.state[player] = conv.data.startingPoints
					conv.ask(`I added a new player named ${player} and gave them ${conv.data.startingPoints} to start.`)
					break;
				case 'subtract':
				case 'delete':
					console.log('deleting')
					delete conv.data.state[player]
					conv.ask(`I've removed ${player}.`)
					break;
			}
		} else {
			conv.ask(`I had trouble finding that player; try again please.`)
		}
	}
})

app.intent('Query current points', (conv, { player }) => {
	if (!conv.data.state) {
		// there are no names, should implement some kind of error handling
		console.log('no state stored')
	} else {
		// there is state
		console.log(conv.data.state)
		if (player in conv.data.state) {
			let playerPoints = conv.data.state[player]
			conv.ask(`${player} has ${playerPoints}`)
		}
	}
})

app.intent('Set starting points', (conv, { startingPoints }) => {
	conv.data.state = buildNewGameStateMap(startingPoints, conv.data.names)
	conv.data.startingPoints = startingPoints
	conv.ask(`Started a game, everyone has ${startingPoints} points. Good luck!`)
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)

function buildNewGameStateMap(points, names) {
	let map = new Map()
	for (const name of names) {
		console.log(`giving ${name} ${points}`)
		map[name] = points
	}
	return map
}



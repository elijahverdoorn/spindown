const functions = require('firebase-functions')
const { WebhookClient } = require('dialogflow-fulfillment')
const { dialogflow } = require('actions-on-google')

process.env.DEBUG = 'dialogflow:*' // enable lib debugging statements

const app = dialogflow({debug: true})

app.intent('Welcome', (conv) => {
	// check if there is an ongoing game for this user
	if (userHasExistingGame(conv)) {
		// found stored data in the user. Restore that state and inform the user
		conv = restoreGameState(conv)
		conv.ask(`Resumed your ongoing game. Go ahead and tell me what to do!`)
	} else {
		conv.ask(`Welcome to Spindown! I'll keep track of points for you while you play. To get started, who is playing?`)
	}
})

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
		switch(operation) {
			case 'add':
			case 'set':
				console.log('adding')
				conv.data.state[player] = conv.data.startingPoints
				conv.ask(`I added a new player named ${player} and gave them ${conv.data.startingPoints} to start.`)
				break;
			case 'subtract':
			case 'delete':
				if (player in conv.data.state) {
					console.log('deleting')
					delete conv.data.state[player]
					conv.ask(`I've removed ${player}.`)
				} else {
					conv.ask(`I had trouble finding that player, please try again`)
				}
				break;
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
		} else {
			conv.ask(`I don't know about a player named ${player}. If you'd like to add a player to the game, just say "add a player"`)
		}
	}
})

app.intent('Set starting points', (conv, { startingPoints }) => {
	conv.data.state = buildNewGameStateMap(startingPoints, conv.data.names)
	conv.data.startingPoints = startingPoints
	conv.ask(`Started a game, everyone has ${startingPoints} points. Good luck!`)
})

app.intent('Exit callback', (conv) => {
	conv = persistGameState(conv)
	conv.close(`Saving the game and closing spindown.`)
})

// error handler, which is basically a fallback
app.catch((conv, error) => {
	console.log(error)
	conv.ask(`I'm sorry, I had a problem. Can you try that again?`)
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)

// returns a map of names to points
function buildNewGameStateMap(points, names) {
	let map = new Map()
	for (const name of names) {
		console.log(`giving ${name} ${points}`)
		map[name] = points
	}
	return map
}

// checks if the userStorage (persisted between conversations) has a game
function userHasExistingGame(conv) {
	if (conv.user.storage.hasOngoingGame) {
		return true
	} else {
		return false
	}
}

// takes the state from the userStorage and sets it up in the current conversation
function restoreGameState(conv) {
	if (userHasExistingGame(conv)) {
		conv.data.state = conv.user.storage.ongoingGame.state
		conv.data.names = conv.user.storage.ongoingGame.names
		conv.data.startingPoints = conv.user.storage.ongoingGame.startingPoints
	}
	return conv
}

// takes the conv object and returns an ongoingGame object to be stored to the userData
function persistGameState(conv) {
	if (conv.data.state) {
		conv.user.storage.ongoingGame = {}
		conv.user.storage.ongoingGame.names = conv.data.names
		conv.user.storage.ongoingGame.startingPoints = conv.data.startingPoints
		conv.user.storage.ongoingGame.state = conv.data.state
		conv.user.storage.hasOngoingGame = true
	} else {
		conv.user.storage.hasOngoingGame = false
	}
	return conv
}


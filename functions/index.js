const functions = require('firebase-functions')
const { WebhookClient } = require('dialogflow-fulfillment')
const { dialogflow } = require('actions-on-google')
const strings = require('./strings')

process.env.DEBUG = 'dialogflow:*' // enable lib debugging statements

const app = dialogflow({debug: true})

app.intent('Welcome', (conv) => {
	if (conv.user.last.seen) {
		// we've seen this user before
		// check if there is an ongoing game for this user
		if (userHasExistingGame(conv)) {
			// found stored data in the user. Restore that state and inform the user
			conv = restoreGameState(conv)
			conv.ask(strings.WELCOME_RESUME_GAME)
		} else {
			conv.ask(strings.WELCOME_NO_RESUME)
		}
	} else {
		conv.ask(strings.WELCOME_NEW_USER)
	}
})

// invoked when the user doesn't say anything
app.intent('Reprompt', (conv) => {
	conv = persistGameState(conv)
	conv.close(strings.REPROMPT_STANDARD)
})

app.intent('Set player names', (conv, { playerNames }) => {
	console.log('got a game start intent')

	conv.data.names = playerNames
	conv.data.playerCount = playerNames.length
	conv.ask(strings.SET_PLAYER_NAMES_CONFIRMATION(playerNames.length))
})

app.intent('Apply operation', (conv, { operation, points, player }) => {
	conv = restoreGameState(conv)
	if (player in conv.data.state) {
		// this player exists, so we can operate on it
		let currentPoints = Number(conv.data.state[player]) // have to parse the strings to a number so that they do math instead of concat
		let pointsNum = Number(points) // have to parse the strings to a number so that they do math instead of concat
		switch(operation) {
			case 'add':
				currentPoints += pointsNum
				break;
			case 'subtract':
				currentPoints -= pointsNum
				break;
			case 'set':
				currentPoints = pointsNum
				break;
			case 'delete':
				currentPoints = 0
				break;
		}
		conv.data.state[player] = currentPoints
		conv.ask(strings.APPLY_OPERATION_RESPONSE(player, currentPoints))
	}
})

app.intent('List all points', (conv) => {
	conv = restoreGameState(conv)
	let responseString = `Here are the scores: `
	for (player in conv.data.state) {
		let playerPoints = conv.data.state[player]
		responseString += `${player} has ${playerPoints}, `
	}
	responseString = responseString.substring(0, responseString.length - 2) // remove trailing ','
	responseString += `.` // add a '.'

	conv.ask(responseString)
})

app.intent('Reset game', (conv) => {
	conv = restoreGameState(conv)
	conv.data.previousGameState = conv.data.state
	conv.data.state = null
	conv = clearPersistedStorage(conv) // clear the game if it was saved to this user
	conv.ask(strings.RESET_GAME_CONFIRMATION)
})

app.intent('New game with same players', (conv) => {
	conv.data.state = null
	conv.data.state = buildNewGameStateMap(conv.data.startingPoints, conv.data.names)
	conv.ask(strings.NEW_GAME_SAME_PLAYERS_CONFIRMATION)
})

app.intent('Edit player list', (conv, { operation, player }) => {
	conv = restoreGameState(conv)
	switch(operation) {
		case 'add':
		case 'set':
			conv.data.state[player] = startingPoints
			conv.ask(strings.ADDED_NEW_PLAYER(player, conv.data.startingPoints))
			break;
		case 'subtract':
		case 'delete':
			if (player in conv.data.state) {
				delete conv.data.state[player]
				if (!stateMapHasPlayers(conv)) { // check if the user has removed all the players from the map
					conv.contexts.set('Resetgame-followup', 2, null) // set a reset game context, since we're asking the user if that's what they want
					conv.ask(strings.NO_REMAINING_PLAYERS)
				} else {
					conv.ask(strings.REMOVED_PLAYER(player))
				}
			} else {
				conv.ask(strings.ERROR_FINDING_PLAYER)
			}
			break;
	}
})

app.intent('Query current leader', (conv, { extreme }) => {
	conv = restoreGameState(conv)
	conv.ask(strings.STILL_LEARNING_QUERY)
	//if (!conv.data.state) {
		// there are no names, should implement some kind of error handling
		//console.log('no state stored')
	//} else {
		//// there is state
		//console.log(conv.data.state)
		//switch (extreme) {
			//case 'most':
				//break;
			//case 'least':
				//break;
		//}
	//}
})


app.intent('Query current points', (conv, { player }) => {
	conv = restoreGameState(conv)
	// there is state
	console.log(conv.data.state)
	if (player in conv.data.state) {
		let playerPoints = conv.data.state[player]
		conv.ask(strings.REPORT_PLAYER_POINTS(player, playerPoints))
	} else {
		conv.ask(strings.QUERY_CURRENT_POINTS_PLAYER_NOT_FOUND(player))
	}
})

app.intent('Set starting points', (conv, { startingPoints }) => {
	conv.data.state = buildNewGameStateMap(startingPoints, conv.data.names)
	conv.data.startingPoints = startingPoints
	conv.ask(strings.START_GAME(startingPoints))
})

app.intent('Exit callback', (conv) => {
	conv = persistGameState(conv)
	conv.close(strings.SAVING_GAME)
})

// error handler, which is basically a fallback
app.catch((conv, error) => {
	console.log(error)
	conv.ask(strings.ERROR_MESSAGE)
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)

// returns a map of names to points
function buildNewGameStateMap(points, names) {
	let map = {}
	for (const name of names) {
		map[name] = points
	}
	return map
}

// checks if the userStorage (persisted between conversations) has a game
function userHasExistingGame(conv) {
	return conv.user.storage.hasOngoingGame
}

function stateMapHasPlayers(conv) {
	console.log(conv.data)
	let res = conv.data.state !== null && !(Object.keys(conv.data.state).length === 0)
	return res
}


// takes the state from the userStorage and sets it up in the current conversation
function restoreGameState(conv) {
	if (stateMapHasPlayers(conv)) {
		console.log('state map has players, dont need to restore. returning.')
		// this is a part of an ongoing session and we don't need to restore the state
		return conv
	}
	if (userHasExistingGame(conv)) {
		console.log('user has a game, restoring state')
		conv.data.state = conv.user.storage.ongoingGame.state
		conv.data.previousGameState = conv.user.storage.previousGameState
		conv.data.names = conv.user.storage.ongoingGame.names
		conv.data.startingPoints = conv.user.storage.ongoingGame.startingPoints
	} else {
		console.log(`user has no stored game, can't restore state`)
	}
	return conv
}

// takes the conv object and returns an ongoingGame object to be stored to the userData
function persistGameState(conv) {
	if (stateMapHasPlayers(conv)) {
		console.log(`persisting game state`)
		conv.user.storage.ongoingGame = {}
		conv.user.storage.ongoingGame.previousGameState = conv.data.previousGameState
		conv.user.storage.ongoingGame.names = conv.data.names
		conv.user.storage.ongoingGame.startingPoints = conv.data.startingPoints
		conv.user.storage.ongoingGame.state = conv.data.state
		conv.user.storage.hasOngoingGame = true
	} else {
		console.log(`no state to persist, not persisting game state`)
		conv.user.storage.hasOngoingGame = false
	}
	return conv
}

function clearPersistedStorage(conv) {
	conv.user.storage = {}
	conv.user.storage.hasOngoingGame = false
	return conv
}


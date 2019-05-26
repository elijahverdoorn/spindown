const functions = require('firebase-functions')
const { WebhookClient } = require('dialogflow-fulfillment')
const { dialogflow } = require('actions-on-google')

process.env.DEBUG = 'dialogflow:*' // enable lib debugging statements

const app = dialogflow({debug: true})

app.intent('Welcome', (conv) => {
	if (conv.user.last.seen) {
		// we've seen this user before
		// check if there is an ongoing game for this user
		if (userHasExistingGame(conv)) {
			// found stored data in the user. Restore that state and inform the user
			conv = restoreGameState(conv)
			conv.ask(`Welcome back! I've resumed your ongoing game. Go ahead and tell me what to do!`)
		} else {
			conv.ask(`Welcome back to Keep Score! I didn't find any saved games for you, so I've made a new one. Who is playing this time?`)
		}
	} else {
		conv.ask(`Welcome to Keep Score! I can keep track of points for you while you play games. To get started, I need to know who is playing?`)
	}
})

// invoked when the user doesn't say anything
app.intent('Reprompt', (conv) => {
	conv = persistGameState(conv)
	conv.close(`I'll let you play now - when you need to update the scores, just ask!`)
})

app.intent('Set player names', (conv, { playerNames }) => {
	console.log('got a game start intent')

	conv.data.names = playerNames
	conv.data.playerCount = playerNames.length
	conv.ask(`Ok, I setup a game for ${playerNames.length} players. How many points should each player start with?`)
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
		conv.ask(`${player} now has ${currentPoints}`)
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
	conv.ask(`I've reset the scores. Do you want to play another game?`)
})

app.intent('New game with same players', (conv) => {
	conv.data.state = null
	conv.data.state = buildNewGameStateMap(conv.data.startingPoints, conv.data.names)
	conv.ask(`Great, another round! I've reset the scores, have fun!`)
})

app.intent('Edit player list', (conv, { operation, player }) => {
	conv = restoreGameState(conv)
	switch(operation) {
		case 'add':
		case 'set':
			conv.data.state[player] = startingPoints
			conv.ask(`I added a new player named ${player} and gave them ${conv.data.startingPoints} to start.`)
			break;
		case 'subtract':
		case 'delete':
			if (player in conv.data.state) {
				delete conv.data.state[player]
				if (!stateMapHasPlayers(conv)) { // check if the user has removed all the players from the map
					conv.contexts.set('Resetgame-followup', 2, null) // set a reset game context, since we're asking the user if that's what they want
					conv.ask(`There are no players left in the game, would you like to reset the game?`)
				} else {
					conv.ask(`I've removed ${player}.`)
				}
			} else {
				conv.ask(`I had trouble finding that player, please try again`)
			}
			break;
	}
})

app.intent('Query current leader', (conv, { extreme }) => {
	conv = restoreGameState(conv)
	conv.ask(`I'm still working on learning how to do that! Ask me again soon and I'm sure I'll have it figured out; in the meantime you can ask for all the scores, or you can ask for an individual player's score.`)
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
		conv.ask(`${player} has ${playerPoints}`)
	} else {
		conv.ask(`I don't know about a player named ${player}. If you'd like to add a player to the game, just say "add a player"`)
	}
})

app.intent('Set starting points', (conv, { startingPoints }) => {
	conv.data.state = buildNewGameStateMap(startingPoints, conv.data.names)
	conv.data.startingPoints = startingPoints
	conv.ask(`Started a game, everyone has ${startingPoints} points. Good luck!`)
})

app.intent('Exit callback', (conv) => {
	conv = persistGameState(conv)
	conv.close(`Saving the game and closing Keep Score.`)
})

// error handler, which is basically a fallback
app.catch((conv, error) => {
	console.log(error)
	conv.ask(`I'm sorry, I had a problem. Can you try that again?`)
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


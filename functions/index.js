const functions = require('firebase-functions')
const { WebhookClient } = require('dialogflow-fulfillment')
const { dialogFlow } = require('actions-on-google')

process.env.DEBUG = 'dialogflow:*' // enable lib debugging statements

exports.dialogFlowFirebaseFulfillment = functions.https.onRequest((request, response) => {
	const agent = new WebhookClient({ request, response })

	function gameStart(agent) {
		let conv = agent.conv() // get actions on google conversation object
		console.log('got a game.start intent')
		if (number <= 0) {
			// can't start with a negative
		} else {
			// got a non-negative number, we're good to set up the game
			conv.data.player1Name = player1
			conv.data.player2Name = player2
			conv.data.startingHp = number
			conv.ask('Ok. Starting a game between $player1 and $player2, each of you have $number HP to start. Good luck!')
		}

		agent.add(conv) // add the actions on google conversation back to the agent (with our changes)
	}

	let intentMap = new Map()
	intentMap.set('Game start', gameStart)
	agent.handleRequest(intentMap)
})


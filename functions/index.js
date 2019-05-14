const functions = require('firebase-functions')
const { WebhookClient } = require('dialogflow-fulfillment')
const { dialogFlow } = require('actions-on-google')

process.env.DEBUG = 'dialogflow:*' // enable lib debugging statements

exports.dialogFlowFirebaseFulfillment = functions.https.onRequest((request, response) => {
	const agent = new WebhookClient({ request, response })
	console.log('got a call to the webhook. agent below:')
	console.log(agent)
	console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
	console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

	function gameStart(agent) {
		console.log('agent passed to function: ' + agent)
		let conv = agent.conv() // get actions on google conversation object
		console.log('agent.conv in function: ' + conv)

		let player1Name = conv.params.player1Name
		let player2Name = conv.params.player2Name
		let startingHpNumber = conv.params.startingHp

		console.log('got a gameStart intent')
		if (number <= 0) {
			// can't start with a negative
		} else {
			// got a non-negative number, we're good to set up the game
			conv.data.player1.name = player1Name
			conv.data.player2.name = player2Name
			conv.data.player2.hp = startingHpNumber
			conv.data.player2.hp = startingHpNumber
			conv.data.startingHp = startingHpNumber
			conv.ask('Ok. Starting a game between $player1Name and $player2Name, each of you have $startingHpNumber HP to start. Good luck!')
		}

		agent.add(conv) // add the actions on google conversation back to the agent (with our changes)
	}

	function queryHp(agent) {
		let conv = agent.conv() // get conversation object

		console.log('got a query for HP intent')

		//if (conv.data.playe
	}

	let intentMap = new Map()
	intentMap.set('Game start', gameStart)
	agent.handleRequest(intentMap)
})


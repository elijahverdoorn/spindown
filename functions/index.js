const functions = require('firebase-functions')
const { WebhookClient } = require('dialogflow-fulfillment')
const { dialogflow } = require('actions-on-google')

process.env.DEBUG = 'dialogflow:*' // enable lib debugging statements

const app = dialogflow({debug: true})

app.intent('Game start', (conv) => {
	console.log('got a game start intent')
	conv.ask('a response from firebase')
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)

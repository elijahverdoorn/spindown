// Intent: Welcome
const WELCOME_NEW_USER = `Welcome to Keep Score! I can keep track of points for you while you play games. To get started, I need to know who is playing?`
const WELCOME_RESUME_GAME = `Welcome back! I've resumed your ongoing game. Go ahead and tell me what to do!`
const WELCOME_NO_RESUME = `Welcome back to Keep Score! I didn't find any saved games for you, so I've made a new one. Who is playing this time?`

// Intent: Reprompt
const REPROMPT_STANDARD = `I'll let you play now - when you need to update the scores, just ask!`

// Intent: Set player names
const SET_PLAYER_NAMES_CONFIRMATION = (len) => `Ok, I setup a game for ${len} players. How many points should each player start with?`

// Intent: Apply operation
const APPLY_OPERATION_RESPONSE = (player, points) => `${player} now has ${points}`

// Intent: Reset game
const RESET_GAME_CONFIRMATION = `I've reset the scores. Do you want to play another game?`

// Intent: New game with same players
const NEW_GAME_SAME_PLAYERS_CONFIRMATION = `Great, another round! I've reset the scores, have fun!`

// Intent: Edit player list
const ADDED_NEW_PLAYER = (player, points) =>`I added a new player named ${player} and gave them ${points} to start.`
const REMOVED_PLAYER = (player) => `I've removed ${player}.`
const ERROR_FINDING_PLAYER = `I had trouble finding that player, please try again`
const NO_REMAINING_PLAYERS = `There are no players left in the game, would you like to reset the game?`

// Intent: Query current leader
const STILL_LEARNING_QUERY =`I'm still working on learning how to do that! Ask me again soon and I'm sure I'll have it figured out; in the meantime you can ask for all the scores, or you can ask for an individual player's score.`

// Intent: Query current points
const REPORT_PLAYER_POINTS = (player, playerPoints) => `${player} has ${playerPoints}`
const QUERY_CURRENT_POINTS_PLAYER_NOT_FOUND = (player) => `I don't know about a player named ${player}. If you'd like to add a player to the game, just say "add a player"`


// Intent: Set starting points
const START_GAME = (startingPoints) => `Started a game, everyone has ${startingPoints} points. Good luck!`

// Intent: Exit callback
const SAVING_GAME = `Saving the game and closing Keep Score.`

// Error handler
const ERROR_MESSAGE = `I'm sorry, I had a problem. Can you try that again?`

module.exports = {
	WELCOME_NEW_USER: WELCOME_NEW_USER,
	WELCOME_RESUME_GAME: WELCOME_RESUME_GAME,
	WELCOME_NO_RESUME: WELCOME_NO_RESUME,
	REPROMPT_STANDARD: REPROMPT_STANDARD,
	SET_PLAYER_NAMES_CONFIRMATION: SET_PLAYER_NAMES_CONFIRMATION,
	APPLY_OPERATION_RESPONSE: APPLY_OPERATION_RESPONSE,
	RESET_GAME_CONFIRMATION: RESET_GAME_CONFIRMATION,
	NEW_GAME_SAME_PLAYERS_CONFIRMATION: NEW_GAME_SAME_PLAYERS_CONFIRMATION,
	ADDED_NEW_PLAYER: ADDED_NEW_PLAYER,
	REMOVED_PLAYER: REMOVED_PLAYER,
	ERROR_FINDING_PLAYER: ERROR_FINDING_PLAYER,
	NO_REMAINING_PLAYERS: NO_REMAINING_PLAYERS,
	STILL_LEARNING_QUERY: STILL_LEARNING_QUERY,
	REPORT_PLAYER_POINTS: REPORT_PLAYER_POINTS,
	QUERY_CURRENT_POINTS_PLAYER_NOT_FOUND: QUERY_CURRENT_POINTS_PLAYER_NOT_FOUND,
	START_GAME: START_GAME,
	ERROR_MESSAGE: ERROR_MESSAGE
}

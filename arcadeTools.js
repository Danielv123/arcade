const fs = require("fs-extra");

async function getGames(){
	let gameNames = await fs.readdir("games");
	return gameNames.map(x => {
		let game = require(`./games/${x}/config`);
		game.path = `./games/${x}`;
		return game;
	});
}
async function loadGames(options = {}, params = {}){
	let games = await getGames();
	return games.map(game => {
		return {
			config:game,
			server: new (require(`${game.path}/${game.entrypoint}`)).server(params),
		}
	});
}

module.exports = {
	getGames,
	loadGames,
};

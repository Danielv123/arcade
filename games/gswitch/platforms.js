
module.exports = {
	level: [],
	tract,
}

let level = module.exports.level;

tract({
	startDistanceFromCenter: 0,
	stopDistanceFromCenter: 100,
});
console.log(level);

function tract({startDistanceFromCenter, stopDistanceFromCenter, startOffset}){
	startOffset = startOffset || 100;
	let raiseFactor = 20;
	let lengthFactor = 70;
	let screenWidth = 500;
	
	let numPlatforms = Math.abs(Math.floor((startDistanceFromCenter - stopDistanceFromCenter)/raiseFactor));
	
	let tract = [];
	
	for(let i = numPlatforms; i; i--){
		let platform = {
			width:	lengthFactor,
			height:	10,
			top:	i*raiseFactor + (screenWidth/2) + stopDistanceFromCenter,
			left:	Math.abs(i - numPlatforms)*lengthFactor + startOffset,
		}
		let platform2 = {
			width:	lengthFactor,
			height:	10,
			top:	(screenWidth/2) - i*raiseFactor - stopDistanceFromCenter,
			left:	Math.abs(i - numPlatforms)*lengthFactor + startOffset,
		}
		tract.push(platform);
		tract.push(platform2);
		level.push(platform);
		level.push(platform2);
	}
	return tract;
}

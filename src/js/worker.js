var panda = require('pandatool');

process.on('message', function(data) {
	var command = data[0];
	var dir = data[1];
	var params = data[2];

	if (!panda[command]) return process.send('Command not found');

	panda[command](dir, function(result) {
		process.send(result || false);
	}, params);
});

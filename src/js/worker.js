var pandajs = require('pandajs');

process.on('message', function(data) {
	var command = data[0];
	var dir = data[1];
	var params = data[2];

	if (!pandajs[command]) return process.send('Command not found');

	pandajs[command](dir, params, function(err) {
		if (err) process.send(err);
		else process.send(false);
	});
});

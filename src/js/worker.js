var pandajs = require('pandajs');

process.on('message', function(data) {
	var command = data[0];
	var param = data[1];

	if (!pandajs[command]) return process.send('Command not found');

	pandajs[command](param, false, function(err) {
		if (err) process.send(err);
		else process.send(false);
	});
});

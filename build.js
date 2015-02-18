console.log('Building...');

var NwBuilder = require('node-webkit-builder');
var nw = new NwBuilder({
    files: './src/**/**',
    platforms: ['osx64'],
    version: '0.11.5'
});

nw.build(function(err) {
	if (err) {
		console.log(err);
	}
	else {
		console.log('Done');
	}
});

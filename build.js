console.log('Building...');

var NwBuilder = require('node-webkit-builder');
var nw = new NwBuilder({
    files: './src/**/**',
    platforms: ['osx64', 'win64'],
    appName: 'Panda App',
    version: '0.11.5',
    macIcns: './icons/panda.icns'
});

nw.build(function(err) {
	if (err) {
		console.log(err);
	}
	else {
		console.log('Done');
	}
});

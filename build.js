console.log('Building...');

var NwBuilder = require('node-webkit-builder');
var nw = new NwBuilder({
    files: './src/**/**',
    platforms: ['osx64'],
    appName: 'Panda App',
    // version: '0.11.5',
    macIcns: './icons/panda.icns',
    buildType: 'versioned'
});

nw.build(function(err) {
	if (err) {
		console.log(err);
	}
	else {
		console.log('Done');
	}
});

// Copy /usr/local/bin/node to
// OSX: Contents/Frameworks/node-webkit\ Helper.app/Contents/MacOS
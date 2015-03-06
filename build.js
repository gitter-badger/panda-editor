console.log('Building...');

var NwBuilder = require('node-webkit-builder');
var nw = new NwBuilder({
    files: './src/**/**',
    platforms: ['osx32'],
    appName: 'Panda Editor',
    // version: '0.11.5',
    macIcns: './res/icons/panda.icns',
    winIco: './res/icons/panda.ico',
    buildDir: './build',
    buildType: 'versioned'
});

nw.build(function(err) {
	if (err) console.log(err);
	else console.log('Done');
});

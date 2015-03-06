var NwBuilder = require('node-webkit-builder');
var platform = process.argv[2] || 'osx';

var config = {
    files: './src/**/**',
    appName: 'Panda Editor',
    // version: '0.11.5',
    buildDir: './build',
    buildType: 'versioned'
};

if (platform === 'osx') {
    config.platforms = ['osx32'];
    config.macIcns = './res/icons/panda.icns';
}
else {
    platform = 'win';
    config.platforms = ['win32'];
    config.winIco = './res/icons/panda.ico';
}

var nw = new NwBuilder(config);

console.log('Building for ' + platform + '...');
nw.build(function(err) {
	if (err) console.log(err);
	else console.log('Done');
});

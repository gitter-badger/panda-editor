var info = require('./src/package.json');
var NwBuilder = require('node-webkit-builder');
var platforms = process.argv[2] ? [process.argv[2]] : ['osx', 'win'];

var package = {
    run: function() {
        var platform = platforms.pop();
        if (!platform) {
            console.log('All done');
            return;
        }

        this[platform]();
    },

    win: function() {
        console.log('Packaging win...');
        var file_system = require('fs');
        var archiver = require('archiver');

        var output = file_system.createWriteStream('release/panda.js-editor-' + info.version + '.zip');
        var archive = archiver('zip');

        output.on('close', function () {
            console.log('Done');
            package.run();
        });

        archive.on('error', function(err){
            throw err;
        });

        archive.pipe(output);
        archive.bulk([
            { expand: true, cwd: './build/Panda Editor/win64', src: ['**'], dest: 'Panda Editor'}
        ]);
        archive.finalize();
    },

    osx: function() {
        console.log('Packaging osx...');
        var appdmg = require('appdmg');
        var ee = appdmg({ source: 'dmg.json', target: 'release/panda.js-editor-' + info.version + '.dmg' });

        ee.on('finish', function () {
            console.log('Done');
            package.run();
        });
    }
};

var config = {
    files: './src/**/**',
    appName: 'Panda Editor',
    platforms: ['osx64', 'win64'],
    macIcns: './res/icons/panda.icns',
    winIco: './res/icons/panda.ico',
    // version: '0.11.5',
    // buildType: 'versioned',
    buildDir: './build'
};

if (platforms.indexOf('win') === -1) {
    config.platforms = ['osx64'];
    delete config.winIco;
}
if (platforms.indexOf('osx') === -1) {
    config.platforms = ['win64'];
    delete config.macIcns;
}

var nw = new NwBuilder(config);

console.log('Building for ' + platforms.join(', ') + '...');

nw.build(function(err) {
	if (err) console.log(err);
	else package.run();
});

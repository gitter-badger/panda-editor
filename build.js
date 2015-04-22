var info = require('./src/package.json');
var NwBuilder = require('node-webkit-builder');
var platform = process.argv[2] || 'osx';
var fs = require('fs');

var package = {
    platforms: [],

    run: function() {
        var platform = this.platforms.pop();
        if (!platform) {
            console.log('All done');
            return;
        }

        this[platform]();
    },

    win: function() {
        console.log('Packaging win...');
        var archiver = require('archiver');

        var output = fs.createWriteStream('release/panda.js-editor-win-' + info.version + '.zip');
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
        var target = 'release/panda.js-editor-osx-' + info.version + '.dmg';

        if (fs.existsSync(target)) fs.unlinkSync(target);
        
        var ee = appdmg({ source: 'dmg.json', target: target });

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

if (platform === 'osx') {
    package.platforms.push('osx');
    config.platforms = ['osx64'];
    delete config.winIco;
}
else if (platform === 'win') {
    package.platforms.push('win');
    config.platforms = ['win64'];
    delete config.macIcns;
}
else if (platform === 'all') {
    package.platforms.push('win');
    package.platforms.push('osx');
}

var nw = new NwBuilder(config);

console.log('Building for ' + platform + '...');

nw.build(function(err) {
	if (err) console.log(err);
	else package.run();
});

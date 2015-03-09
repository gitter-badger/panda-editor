editor.Assets = Class.extend({
	assets: {},
	assetsToCopy: [],
	assetTypes: [
	    'image/png',
	    'image/jpeg',
	    'application/json',
	    'audio/x-m4a',
	    'audio/ogg'
	],
	count: 0,

	add: function(filename, id) {
	    if (filename.indexOf('.') === 0) return;
	    if (filename === 'Thumbs.db') return;
	    if (this.assets[filename]) return;

	    id = id || filename;
	    this.assets[filename] = id;
	    this.count++;

	    $('#assets .header').html('Assets (' + this.count + ')');

	    var div = document.createElement('div');
	    $(div).html(id);
	    $(div).click(this.click.bind(this, filename, div));
	    $(div).addClass('asset');
	    $(div).attr('data-name', filename);
	    $(div).appendTo($('#assets .content .list'));
	},

	copy: function(files) {
		this.assetsToCopy.length = 0;

		for (var i = 0; i < files.length; i++) {
		    var file = files[i];
		    if (this.assetTypes.indexOf(file.type) !== -1) {
		        this.assetsToCopy.push(file);
		    }
		}

		if (this.assetsToCopy.length > 0) this.copyAssets();
	},

	copyAssets: function() {
	    var file = this.assetsToCopy.pop();
	    if (!file) {
	        editor.project.modules['game.assets'].changed = true;
	        editor.saveChanges();
	        return;
	    }

	    console.log('Copying asset ' + file.path);
	    this.copyFile(file.path, editor.project.dir + '/media/' + file.name, this.assetCopied.bind(this, file.name));
	},

	copyFile: function(source, target, callback) {
	    var cbCalled = false;

	    var rd = editor.fs.createReadStream(source);
	    rd.on('error', function(err) {
	        done(err);
	    });
	    var wr = editor.fs.createWriteStream(target);
	    wr.on('error', function(err) {
	        done(err);
	    });
	    wr.on('close', function(ex) {
	        done();
	    });
	    rd.pipe(wr);

	    function done(err) {
	        if (!cbCalled) {
	            callback(err);
	            cbCalled = true;
	        }
	    }
	},

	assetCopied: function(filename, err) {
	    if (err) return console.error('Error copying asset ' + filename);
	    this.add(filename);
	    this.copyAssets();
	},

	click: function(filename, div, event) {
	    if (event.altKey) {
	        editor.editor.insert('\'' + this.assets[filename] + '\'');
	        editor.editor.focus();
	        return;
	    }
	    else if (event.shiftKey) {
	        newId = filename;
	    }
	    else {
	        var newId = prompt('New id for asset ' + filename, this.assets[filename]);
	        newId = editor.stripClassName(newId);
	        if (!newId) return console.error('Invalid asset id');
	        if (this.assets[newId] === newId) return console.error('Asset id already found');
	    }

	    this.assets[filename] = newId;
	    $(div).html(newId);

	    editor.project.modules['game.assets'].changed = true;
	    editor.saveChanges();
	},

	remove: function(filename, div) {
	    var sure = confirm('Remove asset ' + filename + '? (File will be deleted)');
	    if (!sure) return;

	    delete this.assets[filename];
	    $(div).remove();
	    editor.fs.unlink(this.project.dir + '/media/' + filename, function(err) {
	        if (err) console.error(err);
	    });
	    this.count--;
	    $('#assets .header').html('Assets (' + this.count + ')');

	    editor.project.modules['game.assets'].changed = true;
	    editor.saveChanges();
	}
});

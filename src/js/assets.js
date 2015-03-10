editor.Assets = Class.extend({
	assets: {},
	assetsToCopy: [],
	assetsToParse: [],
	assetTypes: [
	    'png',
	    'jpg',
	    'jpeg',
	    'json',
	    'm4a',
	    'ogg',
	    'wav',
	    'fnt'
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
		this.assetsToParse.length = 0;

		for (var i = 0; i < files.length; i++) {
		    var file = files[i];
		    // File already found
		    if (this.assets[file.name]) continue;
		    var ext = file.name.split('.')[1];
		    if (this.assetTypes.indexOf(ext) !== -1) {
		        this.assetsToCopy.push(file);
		    }
		    if (ext === 'json' || ext === 'fnt') {
		    	this.assetsToParse.push(file);
		    }
		}

		if (this.assetsToCopy.length > 0) this.copyAssets();
	},

	copyAssets: function(dontAdd) {
	    var file = this.assetsToCopy.pop();
	    if (!file) {
	    	this.parseAssets();
	        return;
	    }

	    console.log('Copying asset ' + file.path);
	    this.copyFile(file.path, editor.project.dir + '/media/' + file.name, this.assetCopied.bind(this, file.name, dontAdd));
	},

	parseAssets: function() {
		var file = this.assetsToParse.pop();
		if (!file) {
			if (this.assetsToCopy.length > 0) {
				this.copyAssets(true);
				return;
			}
		    editor.project.modules['game.assets'].changed = true;
		    editor.saveChanges();
		    return;
		}

		console.log('Parsing file ' + file.path);
		editor.fs.readFile(file.path, {
			encoding: 'utf-8'
		}, this.parseFile.bind(this, file));
	},

	parseFile: function(file, err, data) {
		if (err) return console.error(err);

		try {
			data = JSON.parse(data);
		}
		catch (e) {
			var parser = new DOMParser();
			data = parser.parseFromString(data, 'text/xml');
		}

		// Spritesheet
		if (data.meta && data.meta.image) {
			var image = data.meta.image;
			var path = file.path.replace(file.name, image);
			this.assetsToCopy.push({name: image, path: path});
		}
		// Bitmap font
		else {
			var font = data.getElementsByTagName('page')[0].getAttribute('file');
			var path = file.path.replace(file.name, font);
			this.assetsToCopy.push({name: font, path: path});
		}

		this.parseAssets();
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

	assetCopied: function(filename, dontAdd, err) {
	    if (err) return console.error(err);
	    if (!dontAdd) this.add(filename);
	    this.copyAssets(dontAdd);
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

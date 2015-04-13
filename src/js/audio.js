editor.Audio = Class.extend({
	audio: {},
	audioTypes: [
	    'm4a',
	    'ogg',
	    'wav'
	],
	audioFolder: 'audio',
	count: 0,
	audioToCopy: [],

	add: function(filename, id) {
	    if (filename.indexOf('.') === 0) return;
	    if (filename === 'Thumbs.db') return;
	    if (this.audio[filename]) return;

	    id = id || filename;
	    this.audio[filename] = id;
	    this.count++;

	    $('#audio .header').html('Audio (' + this.count + ')');

	    var div = document.createElement('div');
	    $(div).html(id);
	    $(div).click(this.click.bind(this, filename, div));
	    $(div).addClass('audio');
	    $(div).attr('data-name', filename);
	    $(div).appendTo($('#audio .content .list'));
	},

	clear: function() {
		this.audio = {};
		this.audioToCopy.length = 0;
		$('#audio .content .list').html('');
		$('#audio .header').html('Audio');
		this.count = 0;
	},

	copy: function(files) {
		this.audioToCopy.length = 0;

		for (var i = 0; i < files.length; i++) {
		    var file = files[i];
		    // File already found
		    if (this.audio[file.name]) continue;
		    var ext = file.name.split('.')[1];
		    if (this.audioTypes.indexOf(ext) !== -1) {
		        this.audioToCopy.push(file);
		    }
		}

		if (this.audioToCopy.length > 0) this.copyAudio();
	},

	copyAudio: function(dontAdd) {
	    var file = this.audioToCopy.pop();
	    if (!file) {
	    	editor.assets.changed = true;
	    	editor.saveChanges();
	    	editor.assets.changed = false;
	        return;
	    }

	    console.log('Copying audio ' + file.path);
	    this.copyFile(file.path, editor.project.dir + '/media/' + this.audioFolder + '/' + file.name, this.audioCopied.bind(this, file.name, dontAdd));
	},

	copyFile: function(source, target, callback) {
		if (source === target) return callback();
		
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

	audioCopied: function(filename, dontAdd, err) {
	    if (err) return console.error(err);
	    if (!dontAdd) this.add(filename);
	    this.copyAudio(dontAdd);
	},

	click: function(filename, div, event) {
	    if (event.altKey) {
	        editor.editor.insert('game.audio.playSound(\'' + this.audio[filename] + '\');');
	        editor.editor.focus();
	        return;
	    }
	    else if (event.shiftKey) {
	        newId = filename;
	    }
	    else {
	        var newId = prompt('New id for ' + filename, this.audio[filename]);
	        newId = editor.stripClassName(newId);
	        if (!newId) return console.error('Invalid audio id');
	        if (this.audio[newId] === newId) return console.error('Audio id already found');
	    }

	    this.audio[filename] = newId;
	    $(div).html(newId);

	    this.saveChanges();
	},

	remove: function(filename, div) {
	    var sure = confirm('Remove audio ' + filename + '? (File not deleted)');
	    if (!sure) return;

	    console.log('Removing audio ' + filename);
	    delete this.audio[filename];
	    $(div).remove();
	    this.count--;
	    $('#audio .header').html('Audio (' + this.count + ')');

	    editor.assets.changed = true;
	    editor.saveChanges();
	    editor.assets.changed = false;
	}
});

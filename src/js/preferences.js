editor.Preferences = Class.extend({
	// Default
	data: {
	    fontSize: 16,
	    port: 3000,
	    theme: 'sunburst'
	},

	init: function(editor) {
		this.editor = editor;

	    // Load saved preferences
	    var savedSettings = JSON.parse(this.editor.storage.get('preferences'));
	    for (var name in savedSettings) {
	        this.data[name] = savedSettings[name];
	    }
	    this.prevData = this.data;

	    for (var name in this.data) {
	        var label = document.createElement('label');
	        $(label).addClass('ace_keyword');
	        $(label).html(name);
	        label.for = name;

	        var input = document.createElement('input');
	        input.type = 'text';
	        input.id = name;
	        input.value = this.data[name];
	        
	        $(label).appendTo($('#preferences .content .list'));
	        $(input).appendTo($('#preferences .content .list'));
	    }

	    require('ace/config').setDefaultValue('session', 'useWorker', false);

	    this.apply(true);
	},

	apply: function() {
	    if (this.editor.editor) this.editor.editor.setTheme('ace/theme/' + this.data.theme);
	    document.body.className = 'ace-' + this.data.theme.replace(/\_/g, '-');

	    this.editor.setFontSize(parseInt(this.data.fontSize));

	    if (this.prevData.port !== this.data.port && this.editor.http) {
	    	this.editor.restartServer();
	    }
	},

	save: function() {
	    console.log('Saving preferences');

	    this.prevData = this.data;
	    var settings = {};
	    $('#preferences input').each(function(index, elem) {
	        var id = $(elem).attr('id');
	        var value = $(elem).val();
	        settings[id] = value;
	    });
	    this.data = settings;
	    this.editor.storage.set('preferences', JSON.stringify(this.data));
	},

	reset: function() {
	    this.editor.storage.set('preferences', null);
	}
});

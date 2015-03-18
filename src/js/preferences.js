editor.Preferences = Class.extend({
	data: {
	    fontSize: 16,
	    port: 3000,
	    theme: 'sunburst',
	    develop: 0,
	    loadLastProject: 0
	},

	init: function() {
	    // Load saved preferences
	    var savedSettings = JSON.parse(editor.storage.get('preferences'));
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
	    if (editor.editor) editor.editor.setTheme('ace/theme/' + this.data.theme);
	    document.body.className = 'ace-' + this.data.theme.replace(/\_/g, '-');

	    editor.setFontSize(parseInt(this.data.fontSize));

	    if (this.prevData.port !== this.data.port && editor.http) {
	    	editor.restartServer();
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
	    editor.storage.set('preferences', JSON.stringify(this.data));
	},

	reset: function() {
	    editor.storage.set('preferences', null);
	}
});

editor.Preferences = Class.extend({
	// Default
	data: {
	    fontSize: 16,
	    port: 3000,
	    theme: 'sunburst',
	    develop: false,
	    loadLastProject: false,
	    reloadOnSave: true,
	    assetsModule: 'game.main',
	    mainModule: 'game.main'
	},

	init: function() {
	    // Load saved preferences
	    var savedSettings = JSON.parse(editor.storage.get('preferences'));
	    for (var name in savedSettings) {
	        if (typeof this.data[name] !== 'undefined') this.data[name] = savedSettings[name];
	    }
	    this.prevData = this.data;
	    this.rawData = JSON.stringify(this.data, null, '    ');

	    // this.apply(true);
	},

	apply: function() {
	    if (editor.editor) editor.editor.setTheme('ace/theme/' + this.data.theme);
	    document.body.className = 'ace-' + this.data.theme.replace(/\_/g, '-');

	    editor.setFontSize(parseInt(this.data.fontSize));

	    if (this.prevData.port !== this.data.port && editor.server.http) {
	    	editor.server.restartServer();
	    }
	},

	save: function() {
	    console.log('Saving preferences');

	    this.rawData = editor.editor.getSession().getValue();
	    editor.storage.set('preferences', this.rawData);

	    this.prevData = this.data;
	    this.data = JSON.parse(this.rawData);

	    this.apply();

	    console.log('Preferences saved');
	},

	reset: function() {
	    editor.storage.set('preferences', null);
	}
});

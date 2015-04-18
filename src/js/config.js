editor.Config = Class.extend({
	init: function(project) {
		this.project = project;

		console.log('Loading config');

		this.configFile = project.dir + '/src/game/config.js';

		var data = editor.fs.readFileSync(this.configFile, {
			encoding: 'utf-8'
		});

		this.update(data);
		this.rawData = data;
	},

	save: function(dontReload) {
	    console.log('Saving config');

	    this.rawData = editor.editor.getSession().getValue();
	    editor.fs.writeFile(this.configFile, this.rawData, this.saveComplete.bind(this));
	},

	update: function(rawData) {
		eval(rawData);
		this.data = pandaConfig;
		if (!this.data.name) this.data.name = 'Untitled';
		if (!this.data.version) this.data.version = '0.0.0';
		delete pandaConfig;
	},

	saveComplete: function(err) {
		if (err) console.error('Error writing config file: ' + this.configFile);
		else {
			console.log('Config saved');
			this.update(this.rawData);
			editor.reloadAll();
			editor.projects.updateInfo();
		}
	}
});

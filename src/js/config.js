editor.Config = Class.extend({
	init: function(project) {
		this.project = project;

		console.log('Loading config');

		var configFile = project.dir + '/src/game/config.js';

		delete global.require.cache[configFile];

		try {
		    require(configFile);
		}
		catch(e) {
		    return console.error('File not found: ' + configFile);
		}

		this.data = global.pandaConfig;
		delete global.pandaConfig;

		this.data.system = this.data.system || {};
		this.data.debug = this.data.debug || {};

		// Default config
		if (typeof this.data.system.startScene === 'undefined') this.data.system.startScene = 'Main';
		if (typeof this.data.system.rotateScreen === 'undefined') this.data.system.rotateScreen = true;

		$('#projectName').val(this.data.name);
		$('#projectWidth').val(this.data.system.width);
		$('#projectHeight').val(this.data.system.height);
		$('#projectStartScene').val(this.data.system.startScene);
		$('#projectCenter').prop('checked', this.data.system.center);
		$('#projectScale').prop('checked', this.data.system.scale);
		$('#projectResize').prop('checked', this.data.system.resize);
		$('#projectRotateScreen').prop('checked', this.data.system.rotateScreen);
		$('#projectDebug').prop('checked', this.data.debug.enabled);
	},

	save: function(dontReload) {
	    console.log('Saving config');

	    this.data.name = $('#projectName').val();
	    this.data.system.width = parseInt($('#projectWidth').val());
	    this.data.system.height = parseInt($('#projectHeight').val());
	    this.data.system.startScene = $('#projectStartScene').val();
	    this.data.system.center = $('#projectCenter').is(':checked');
	    this.data.system.scale = $('#projectScale').is(':checked');
	    this.data.system.resize = $('#projectResize').is(':checked');
	    this.data.system.rotateScreen = $('#projectRotateScreen').is(':checked');
	    this.data.debug.enabled = $('#projectDebug').is(':checked');

	    editor.fs.writeFile(this.project.dir + '/src/game/config.js', 'pandaConfig = ' + JSON.stringify(this.data, null, 4) + ';', {
	        encoding: 'utf-8'
	    }, function(err) {
	        if (err) console.log('Error writing config');
	    });

	    if (!dontReload) editor.server.io.emit('command', 'reloadGame');

	    editor.projects.updateInfo();
	    this.project.updateModuleList();
	}
});

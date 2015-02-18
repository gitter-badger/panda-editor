var fs = require('fs');
var build = require('./js/build');
var pjson = require('./package.json');

panda = {
	id: 'net.pandajs.app',
	version: pjson.version,

	init: function() {
		this.projects = JSON.parse(localStorage.getItem(this.id + 'projects')) || [];
		
		$('#nav a').click(this.menuClick.bind(this));

		for (var i = 0; i < this.projects.length; i++) {
			this.initProject(this.projects[i].path);
		}

		this.status('Panda App ' + this.version);
	},

	menuClick: function(event) {
		event.preventDefault();
		var action = $(event.currentTarget).attr('href');
		if (this[action]) this[action]();
	},

	buttonClick: function(path, event) {
		var action = $(event.currentTarget).attr('href');
		if (this[action]) this[action](path);
	},

	buildProject: function(path) {
		if (this._building) return;
		this._building = true;

		this.status('Building...');
		$('#loader').show();

		setTimeout(this.startBuilding.bind(this, path), 200);
	},

	startBuilding: function(path) {
		build(path, this.buildComplete.bind(this));
	},

	buildComplete: function(err, output) {
		this._building = false;
		$('#loader').hide();
		
		if (err) {
			panda.error(err);
		}
		else {
			panda.success(output);
		}
	},

	openProject: function() {
		var input = document.createElement('input');
		input.type = 'file';
		input.nwdirectory = true;
		input.onchange = this.readProjectFolder.bind(this, input);
		input.click();
	},

	readProjectFolder: function(input) {
		var path = input.value;
		if (this.initProject(path)) {
			this.newProject(path);
			this.saveProjects();
		}
		else {
			console.log('Invalid project folder: ' + path);
		}
	},

	initProject: function(path) {
		delete global.pandaConfig;
		try {
			require(path + '/src/game/config.js');
		}
		catch (e) {
			return false;
		}
		var config = global.pandaConfig;
		if (!config) return false;

		var name = config.name || 'Untitled';
		var version = config.version || '0.0.0';

		var header = document.createElement('h6');
		$(header).html(name + ' ' + version);
		$(header).appendTo('#wrapper .content');

		var div = document.createElement('div');
		$(div).addClass('box');

		var button = document.createElement('button');
		$(button).attr('href', 'buildProject');
		$(button).html('Build');
		$(button).click(this.buttonClick.bind(this, path));
		$(div).append(button);

		$(div).appendTo('#wrapper .content');

		return true;
	},

	newProject: function(path) {
		this.projects.push({
			path: path
		});
	},

	saveProjects: function() {
		localStorage.setItem(this.id + 'projects', JSON.stringify(this.projects));
	},

	clearProjects: function() {
		localStorage.setItem(this.id + 'projects', null);
	},

	success: function(msg) {
		$('#footer').html(msg).css('background-color', 'green');
	},

	error: function(msg) {
		$('#footer').html(msg).css('background-color', 'red');
	},

	status: function(msg) {
		$('#footer').html(msg).css('background-color', 'black');
	}
};

$(function() {
	panda.init();
});

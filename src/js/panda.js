var fs = require('fs');
var info = require('./package.json');
var pandajs = require('pandajs');

panda = {
	id: 'net.pandajs.app',
	version: info.version,
	projects: {},

	init: function() {
		var projects = JSON.parse(localStorage.getItem(this.id + 'projects')) || [];
		
		$('#nav a').click(this.menuClick.bind(this));

		for (var i = 0; i < projects.length; i++) {
			this.initProject(projects[i].path);
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
		pandajs.build(path, false, this.buildComplete.bind(this));
	},

	buildComplete: function(err) {
		this._building = false;
		$('#loader').hide();
		
		if (err) {
			panda.error('Error building project');
		}
		else {
			panda.success('Build completed');
		}
	},

	openProject: function() {
		var input = document.createElement('input');
		input.type = 'file';
		input.nwdirectory = true;
		input.onchange = this.readProjectFolder.bind(this, input);
		input.click();
	},

	openFolder: function(callback) {
		var input = document.createElement('input');
		input.type = 'file';
		input.nwdirectory = true;
		input.onchange = function() {
			callback(input.value);
		};
		input.click();
	},

	readProjectFolder: function(input) {
		var path = input.value;

		if (this.projects[path]) {
			this.error('Project already exists.');
		}
		else if (this.initProject(path)) {
			this.newProject(path);
			this.saveProjects();
		}
		else {
			this.error('Invalid project folder');
		}
	},

	initProject: function(path) {
		delete global.pandaConfig;
		try {
			delete global.require.cache[path + '/src/game/config.js'];
			require(path + '/src/game/config.js');
		}
		catch (e) {
			return false;
		}
		var config = global.pandaConfig;
		if (!config) return false;

		var name = config.name || 'Untitled';
		var version = config.version || '0.0.0';

		var div = document.createElement('div');

		var header = document.createElement('h6');
		$(header).html(name + ' ' + version);
		$(header).appendTo(div);

		var content = document.createElement('div');
		$(content).addClass('box');

		var button = document.createElement('button');
		$(button).attr('href', 'buildProject');
		$(button).html('Build');
		$(button).click(this.buttonClick.bind(this, path));
		$(button).appendTo(content);

		var button = document.createElement('button');
		$(button).attr('href', 'removeProject');
		$(button).html('Remove');
		$(button).click(this.buttonClick.bind(this, path));
		$(button).appendTo(content);

		$(content).appendTo(div);
		$(div).appendTo('#wrapper .content');

		this.projects[path] = {
			div: div
		};

		return true;
	},

	removeProject: function(path) {
		if (confirm('Are you sure?')) {
			$(this.projects[path].div).remove();
			delete this.projects[path];
		}
		this.saveProjects();
	},

	newProject: function() {
		console.log('ok');
		if (this._creating) return;
		this._creating = true;

		this.status('Creating new project...');
		this.openFolder(function(folder) {
			console.log(folder);
			return;
			pandajs.create(folder, false, function(err) {
				if (err) {
					panda.error('Error creating project');
				}
				else {
					panda.success('New project created');
				}
			});
		});
	},

	saveProjects: function() {
		var projects = [];
		for (var path in this.projects) {
			projects.push({
				path: path
			});
		}
		
		localStorage.setItem(this.id + 'projects', JSON.stringify(projects));
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

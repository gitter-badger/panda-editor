var info = require('./package.json');
var fork = require('child_process').fork;

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

	buildProject: function(dir) {
		if (this._building) return;
		this._building = true;

		this.status('Building...');
		$('#loader').show();

		var worker = fork('js/worker.js', { execPath: './node' });
		worker.on('message', this.buildComplete.bind(this));
		worker.on('exit', this.buildComplete.bind(this));
		worker.send(['build', dir]);
	},

	buildComplete: function(err) {
		this._building = false;
		$('#loader').hide();
		
		if (err) this.error(err);
		else this.success('Build completed');
	},

	openProject: function() {
		this.openFolder(this.addProject.bind(this));
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

	addProject: function(dir) {
		if (this.projects[dir]) {
			this.error('Project already exists.');
		}
		else if (this.initProject(dir)) {
			this.saveProjects();
		}
		else {
			this.error('Invalid project folder.');
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

		$(div).prependTo('#wrapper .content');

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
		var name = prompt('Project name:');
		if (name) {
			name = name.replace(/\s/g, ''); // Remove spaces
			this.openFolder(this.createProject.bind(this, name));
		}
	},

	createProject: function(name, dir) {
		if (this._creating) return;
		this._creating = true;
		$('#loader').show();

		this.status('Creating new project...');

		var worker = fork('js/worker.js', { execPath: './node' });
		worker.on('message', this.projectCreated.bind(this, dir + '/' + name));
		worker.on('exit', this.projectCreated.bind(this, ''));
		worker.send(['create', dir, [name]]);
	},

	projectCreated: function(dir, err) {
		this._creating = false;
		$('#loader').hide();

		if (err) this.error(err);
		else {
			this.success('Project created');
			this.initProject(dir);
			this.saveProjects();
		}
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

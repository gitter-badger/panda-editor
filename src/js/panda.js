var info = require('./package.json');
var fork = require('child_process').fork;
var gui = require('nw.gui');
var fs = require('fs');
var clipboard = gui.Clipboard.get();

panda = {
	id: 'net.pandajs.app',
	version: info.version,
	projects: {},
	config: {
		editor: {
			splitView: true,
			theme: 'base16-dark'
		}
	},
	browserVisible: false,

	init: function() {
		$('#nav a').click(this.menuClick.bind(this));
		$('button').click(this.buttonClick.bind(this, false));

		window.addEventListener('resize', this.onResize.bind(this));

		gui.Window.get().show();

		console.log('Panda App ' + this.version);
		console.log('Panda Engine ' + game.version);
	},

	onResize: function() {
		return;
		var width = window.innerWidth - 54;
		if (this.browserVisible) {
			// var canvas = document.getElementById('canvas');
			// var canvasWidth = canvas.clientWidth;
			width = ~~(width / 2);
			// width -= canvasWidth;

			$('.tab').css('width', width + 'px');
			// $('#browser').css('width', canvasWidth + 'px');
		}
		else {
			$('.tab').css('width', width + 'px');
		}
	},

	menuClick: function(event) {
		event.preventDefault();
		var action = $(event.currentTarget).attr('href');
	
		if (this[action]) this[action]();
	},

	toggleModules: function() {
		var tab = $('#modules');
		if (tab.is(':visible')) {
			tab.hide();
		}
		else {
			tab.show();
		}
	},

	toggleBrowser: function() {
		this.browserVisible = !this.browserVisible;
		if (this.browserVisible) {
			$('#browser').show();
		}
		else {
			$('#browser').hide();
		}
		this.startGame();
		this.onResize();
	},

	switchTab: function(name) {
		var active = $('#nav a.active').attr('href');
		if (active === name) return;

		$('#' + active).hide();
		$('#nav a.active').removeClass('active');

		var target = $('#nav a[href="' + name + '"]').addClass('active');
		$('#' + name).show();
	},

	startGame: function() {
		if (!this.currentProject) return;
		if (this.gameStarted) return;
		this.gameStarted = true;

		require(this.currentProject + '/src/game/config.js');

		game.config = global.pandaConfig;

		// Force settings
		game.config.system = game.config.system || {};
		game.config.system.resize = false;
		game.config.system.scale = false;
		game.config.system.center = false;

		game.config.mediaFolder = this.currentProject + '/media';
		game.config.sourceFolder = this.currentProject + '/src';

		game.ready = function() {
			game.System.startScene = 'Title';
			game._start();
		};

		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = this.currentProject + '/src/game/main.js';
		script.onerror = function() {
		    console.log('Error starting game');
		};
		document.getElementsByTagName('head')[0].appendChild(script);
	},

	buttonClick: function(path, event) {
		event.preventDefault();
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
			console.log('Project already exists.');
		}
		else if (this.initProject(dir)) {
			this.saveProjects();
			console.log('Project added');
		}
		else {
			console.log('Invalid project folder.');
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
		$(div).addClass('project');
		$(div).addClass('closed');
		
		var header = document.createElement('h2');
		$(header).html(name);
		var span = document.createElement('span');
		$(span).addClass('version');
		$(span).html(version).appendTo(header);
		$(header).appendTo(div);

		var content = document.createElement('div');
		$(content).addClass('info');

		// $(content).html('blabalblalba');

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

		var button = document.createElement('button');
		$(button).attr('href', 'editProject');
		$(button).html('Edit');
		$(button).click(this.buttonClick.bind(this, path));
		$(button).appendTo(content);

		$(content).appendTo(div);

		$(div).prependTo('#projects .content');

		$(header).click(this.showProject.bind(this, div));

		this.projects[path] = {
			div: div
		};

		return true;
	},

	restartScene: function() {
		console.log('Restarting scene...');
		if (game.scene) game.system.setScene(game.system.sceneName);
	},

	restartGame: function() {
		console.log('Restarting game...');
		if (game.scene) game.system.setScene(game.System.startScene);
	},

	reloadModule: function() {
		console.log('Reloading module...');
		game.ready = function() {
			console.log('Done');
			if (this.assetQueue.length > 0 || this.audioQueue.length > 0) {
				console.log('Loading new assets...');
				this._loader = new this.Loader(game.system.sceneName);
				this._loader.start();
			}
			else {
				panda.restartScene();
			}
		};

		// Delete all classes in module
		for (var i = 0; i < game.modules[this.currentModule].classes.length; i++) {
			var className = game.modules[this.currentModule].classes[i];
			delete game[className];
			console.log('Deleting class ' + className);
		}

		// Delete module
		delete game.modules[this.currentModule];

		// Remove module script
		if (this.currentModuleScript) {
			document.getElementsByTagName('head')[0].removeChild(this.currentModuleScript);
		}

		// Reload module code
		var path = this.currentModule.replace(/\./g, '/') + '.js?' + Date.now();
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = this.currentProject + '/src/' + path;
		script.onerror = function() {
		    console.log('Error loading module');
		};
		document.getElementsByTagName('head')[0].appendChild(script);

		this.currentModuleScript = script;
	},

	showProject: function(div) {
		$(div).toggleClass('closed');
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

	loadEngineModules: function(callback) {
		if (game.moduleQueue.length === 0) return callback();
		console.log('Loading engine modules...');
		game.ready = function() {
			console.log('Done');
			callback();
		};
		game.config.autoStart = false;
		game._loadModules();
	},

	loadProject: function(dir) {
		dir = '/Users/eemelikelokorpi/Sites/yle/peka_ostbricka';

		$('#welcome').hide();
		if (game.moduleQueue.length > 0) {
			this.loadEngineModules(this.loadProject.bind(this, dir));
			return;
		}

		console.log('Loading project...');
		
		var file = dir + '/src/game/main.js';
		this.currentProject = dir;
		this.currentFile = file;
		this.currentModule = 'game.main';
		
		fs.readFile(file, {
			encoding: 'utf-8'
		}, this.projectLoaded.bind(this));
	},

	projectLoaded: function(err, data) {
		console.log('Done');

		$('#nav').show();
		$('#main').show();
		$('#editor').show();

		var textarea = document.createElement('textarea');
		$('#editor').append(textarea);

		var editor = CodeMirror.fromTextArea(textarea, {
			lineNumbers: true,
			theme: this.config.editor.theme,
			mode: 'javascript',
			indentUnit: 4,
			autofocus: true,
			hint: CodeMirror.hint.javascript,
			keyMap: 'sublime',
			autoCloseBrackets: true
		});
		editor.setValue(data);
		editor.setOption('extraKeys', {
			'Shift-Cmd-R': function() {
				// Restart game
				panda.restartGame();
			},
			'Cmd-R': function() {
				// Restart scene
				panda.restartScene();
			},
			'Cmd-X': function(cm) {
				// Cut
				clipboard.set(cm.getSelection(), 'text');
				cm.replaceSelection('');
			},
			'Cmd-C': function(cm) {
				// Copy
				clipboard.set(cm.getSelection(), 'text');
			},
			'Cmd-V': function(cm) {
				// Paste
				cm.replaceSelection(clipboard.get('text'));
			},
			'Cmd-S': function(cm) {
				if (cm.doc.history.lastSaveTime === cm.doc.history.lastModTime) {
					console.log('Nothing to save');
					return;
				}

				cm.doc.history.lastSaveTime = cm.doc.history.lastModTime;
				
				console.log('Saving ' + panda.currentFile);
				fs.writeFile(panda.currentFile, editor.getValue(), {
					encoding: 'utf-8'
				}, function(err) {
					if (err) console.log('Error saving file');
					else {
						console.log('Saved');
						panda.reloadModule('game.main');
					}
				});
			}
		});

		this.toggleBrowser();
	},

	saveProjectSettings: function() {
		console.log('saveProjectSettings');
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
	}
};

$(function() {
	panda.init();
});

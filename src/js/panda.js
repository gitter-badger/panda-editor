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
		$('.tab .resize').mousedown(this.mousedown.bind(this));
		$(document).mousemove(this.mousemove.bind(this));
		$(document).mouseup(this.mouseup.bind(this));

		game.createClass = this.createClass.bind(this);

		window.addEventListener('resize', this.onResize.bind(this));

		gui.Window.get().show();

		console.log('Panda App ' + this.version);
		console.log('Panda Engine ' + game.version);
	},

	createClass: function(name, extend, content) {
		if (game[name]) throw 'class ' + name + ' already created';

		if (typeof extend === 'object') {
		    content = extend;
		    extend = 'Class';
		}

		var newClass = game[name] = game[extend].extend(content);
		game._currentModule.classes[name] = {
		    extend: extend,
		    content: this.objToString(content)
		};
		return newClass;
	},

	mousedown: function(event) {
		this.resizing = true;
		this.resizeX = event.pageX;
		this.resizeTarget = $(event.currentTarget).parent('.tab');
		this.resizeWidth = this.resizeTarget.width();
		$(document.body).css('cursor', 'col-resize');
	},

	mousemove: function(event) {
		if (this.resizing) {
			var newWidth = this.resizeWidth + (event.pageX - this.resizeX);
			if (newWidth < 100) newWidth = 100;
			this.resizeTarget.width(newWidth);

			this.onResize();
		}
	},

	mouseup: function(event) {
		this.resizing = false;
		$(document.body).css('cursor', 'default');
	},

	onResize: function() {
		var totalWidth = 0;
		$('.tab .content').each(function() {
			if ($(this).is(':visible')) {
				totalWidth += $(this).parent('.tab').width();
			}
		});

		var browserWidth = window.innerWidth - totalWidth - $('#nav').width();

		$('#browser').width(browserWidth);
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
		this.onResize();
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

		console.log('Loading config...');

		require(this.currentProject + '/src/game/config.js');

		console.log('Done');

		game.config = global.pandaConfig;

		// Force settings
		game.config.debug = game.config.debug || {};
		game.config.debug.enabled = true;
		game.config.debug.color = '#90a959';
		game.config.system = game.config.system || {};
		game.config.system.resize = false;
		game.config.system.scale = false;
		game.config.system.center = false;
		game.config.mediaFolder = this.currentProject + '/media';
		game.config.sourceFolder = this.currentProject + '/src';
		game.config.autoStart = false;

		game.ready = function() {
			console.log('Done');

			panda.initModules();

			// console.log('Starting game...');
			// game._start();
		};

		console.log('Loading game modules...');

		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = this.currentProject + '/src/game/main.js';
		script.onerror = function() {
		    console.log('Error starting game');
		};
		document.getElementsByTagName('head')[0].appendChild(script);
	},

	initModules: function() {
		// Sort modules
		game.modules = game.ksort(game.modules);

		for (var module in game.modules) {
			// Sort classes
			game.modules[module].classes = game.ksort(game.modules[module].classes);
		}

		$('#modules .content .list').html('');
		for (var name in game.modules) {
			if (name.indexOf('game.') === 0) {
				var div = document.createElement('div');
				$(div).addClass('module');
				$(div).html(name.substr(5));
				$(div).appendTo($('#modules .content .list'));

				var button = document.createElement('button');
				$(button).html('+');
				$(button).click(this.newClass.bind(this, name));
				$(button).appendTo(div);

				var button = document.createElement('button');
				$(button).html('-');
				$(button).click(this.removeClass.bind(this));
				$(button).appendTo(div);

				for (var className in game.modules[name].classes) {
					if (game[className].prototype instanceof game.Scene) {
						var button = document.createElement('button');
						$(button).html('>');
						$(button).click(this.playScene.bind(this, className.replace('Scene', ''), button));
						$(button).appendTo($('#modules .content .list'));
					}

					var div = document.createElement('div');
					$(div).addClass('class');
					$(div).html('&nbsp;&nbsp;&nbsp;&nbsp;' + className);
					$(div).appendTo($('#modules .content .list'));
					$(div).click(this.editClass.bind(this, className, div, name));

					if (this.currentClass === className) {
						$(div).addClass('current');
					}
				}
			}
		}
	},

	playScene: function(name, button) {
		$('button.playing').html('>');
		$('button.playing').removeClass('playing');

		if (this.currentScene !== name) {
			this.currentScene = name;

			$(button).html('||');
			$(button).addClass('playing');

			if (!game.system) {
				game.System.startScene = name;
				game._start();
			}
			else {
				game.system.setScene(name);
				document.getElementById('pandaDebug').style.color = '#90a959';
			}
		}
		else {
			this.currentScene = null;
			game.system.pause();
		}
	},

	removeClass: function() {
		if (!this.currentClass) return;

		var areyousure = confirm('Delete class ' + this.currentClass + '?');
		if (!areyousure) return;

		delete game[this.currentClass];
		delete game.modules[this.currentModule].classes[this.currentClass];

		this.currentClass = null;
		this.editor.setValue('');

		this.saveCurrentModule();
	},

	newClass: function(moduleName) {
		this.currentModule = moduleName;

		var className = prompt('New class name:');
		className = className.replace('/\s/g', '');
		if (className) {
			if (game.modules[this.currentModule].classes[className]) return;

			var extend = 'Class';
			if (className.indexOf('Scene') === 0) extend = 'Scene';

			game._currentModule = game.modules[this.currentModule];

			this.createClass(className, extend, {
				init: function() {}
			});

			this.editClass(className);
			this.saveCurrentModule();
		}
	},

	objToString: function(obj) {
	    var str = '';
	    for (var p in obj) {
	    	if (str !== '') str += ',\n';
	        if (obj.hasOwnProperty(p)) {
	        	if (typeof obj[p] === 'function' && str !== '') str += '\n';
	            str += p + ': ' + obj[p];
	        }
	    }
	    return str;
	},

	editClass: function(name, div, module) {
		if (this.currentClass === name) return;
		if (module) this.currentModule = module;

		$('#modules .content .list .class.current').removeClass('current');
		$(div).addClass('current');

		this.currentClass = name;
		var value = game.modules[this.currentModule].classes[name].content;
		this.editor.setValue(value);

		this.editor.doc.history.lastSaveTime = this.editor.doc.history.lastModTime;

		$('#editor .content textarea').focus();
	},

	editModule: function(name, div) {
		if (this.currentModule === name) return;
		this.currentModule = name;

		$('#modules .current').removeClass('current');
		$(div).addClass('current');

		var path = this.currentProject + '/src/' + name.replace(/\./g, '/') + '.js';

		this.editFile(path);
	},

	newModule: function() {
		var name = prompt('New module name:');
		if (name) {
			if (game.modules['game.' + name]) return;

			var file = this.currentProject + '/src/game/' + name + '.js';

			var value = "game.module(\n    'game."+name+"'\n).body(function() {\n});";

			console.log('Saving ' + file);
			fs.writeFile(file, value, {
				encoding: 'utf-8'
			}, function(err) {
				if (err) console.log('Error saving file');
				else {
					console.log('Saved');
					// panda.initModules();
				}
			});
		}
	},

	editFile: function(path) {
		console.log('Loading file ' + path);
		this.currentFile = path;

		fs.readFile(path, {
			encoding: 'utf-8'
		}, this.fileLoaded.bind(this));
	},

	fileLoaded: function(err, data) {
		console.log('Done');
		this.editor.setValue(data);
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

	restartScene: function() {
		console.log('Restarting scene...');
		if (game.scene) game.system.setScene(game.system.sceneName);
		document.getElementById('pandaDebug').style.color = '#90a959';
	},

	restartGame: function() {
		console.log('Restarting game...');
		if (game.scene) game.system.setScene(game.System.startScene);
		document.getElementById('pandaDebug').style.color = '#90a959';
	},

	reloadCurrentModule: function() {
		if (!this.currentModule) return;
		console.log('Reloading module ' + this.currentModule);

		game.ready = function() {
			panda.initModules();
			if (this.assetQueue.length > 0 || this.audioQueue.length > 0) {
				// console.log('Loading new assets...');
				// this._loader = new this.Loader(game.system.sceneName);
				// this._loader.start();
			}
			else {
				// panda.restartScene();
			}
		};

		// Delete classes in module
		for (var className in game.modules[this.currentModule].classes) {
			delete game[className];
			// console.log('Deleting class ' + className);
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
		dir = '/Users/eemelikelokorpi/Sites/kurupanda';

		$('#welcome').hide();

		if (game.moduleQueue.length > 0) {
			this.loadEngineModules(this.loadProject.bind(this, dir));
			return;
		}
		
		this.currentProject = dir;
		this.currentModule = 'game.main';
		
		$('#nav').show();
		$('#main').show();
		$('#editor').show();
		$('#modules').show();

		console.log('Loading editor...');

		var textarea = document.createElement('textarea');
		$('#editor .content').append(textarea);

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
		editor.setOption('extraKeys', {
			'Ctrl-Tab': function() {
				panda.toggleModules();
			},
			'Cmd-R': function(cm) {
				panda.restartScene();
			},
			'Shift-Cmd-R': function(cm) {
				panda.restartGame();
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
				if (!panda.currentClass) return;
				if (cm.doc.history.lastSaveTime === cm.doc.history.lastModTime) {
					console.log('Nothing to save');
					return;
				}

				cm.doc.history.lastSaveTime = cm.doc.history.lastModTime;
				
				panda.saveCurrentModule();
			}
		});
		this.editor = editor;
		this.editor.on('focus', function() {
			// if (game.system) {
			// 	game.system.pause();
			// 	document.getElementById('pandaDebug').style.color = '#ac4142';
			// }
		});
		console.log('Done');

		this.toggleBrowser();
	},

	saveCurrentModule: function() {
		console.log('Saving module ' + this.currentModule);

		var module = game.modules[this.currentModule];

		if (this.currentClass) module.classes[this.currentClass].content = this.editor.getValue();

		var value = 'game.module(\n    \'' + this.currentModule + '\'\n)\n';

		if (module.requires.length > 0) {
			value += '.require(\n';
			for (var i = 0; i < module.requires.length; i++) {
				if (i > 0) value += ',\n';
				var moduleName = module.requires[i];
				value += '    \'' + moduleName + '\'';
			}
			value += '\n)\n';
		}

		value += '.body(function() {\n\n';

		for (var className in module.classes) {
			value += 'game.createClass(\'' + className + '\', \'' + module.classes[className].extend + '\', {\n';
			value += module.classes[className].content;
			value += '\n});\n\n';
		}

		value += '});\n\n';

		var file = this.currentProject + '/src/' + this.currentModule.replace(/\./g, '/') + '.js';

		fs.writeFile(file, value, {
			encoding: 'utf-8'
		}, function(err) {
			if (err) console.log('Error saving file');
			else {
				panda.reloadCurrentModule();
			}
		});
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

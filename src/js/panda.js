var editor = {
	info: require('./package.json'),
	fork: require('child_process').fork,
	gui: require('nw.gui'),
	fs: require('fs'),
	esprima: require('esprima'),

	init: function() {
		$('.tab .resize').mousedown(this.mousedown.bind(this));
		$(window).mousemove(this.mousemove.bind(this));
		$(window).mouseup(this.mouseup.bind(this));

		window.addEventListener('resize', this.onResize.bind(this));
		window.ondragover = this.dragover.bind(this);
		window.ondragleave = this.dragleave.bind(this);
		window.ondrop = this.filedrop.bind(this);

		this.onResize();
		this.loadEditor();

		this.clipboard = this.gui.Clipboard.get();

		this.window = this.gui.Window.get();
		
		this.initMenu();

		this.loadLastProject();

		this.window.show();
	},

	initMenu: function() {
		console.log('Loading menu...');

		var menubar = new this.gui.Menu({ type: 'menubar' });
		menubar.createMacBuiltin(this.info.description);

		var file = new this.gui.Menu();
		file.append(new this.gui.MenuItem({ label: 'New' }));
		var help = new this.gui.Menu();
		help.append(new this.gui.MenuItem({ label: 'About' }));
		
		menubar.insert(new this.gui.MenuItem({ label: 'File', submenu: file }), 1);
		menubar.append(new this.gui.MenuItem({ label: 'Help', submenu: help }));

		this.window.menu = menubar;
	},

	dragover: function() {
		return false;
	},

	dragleave: function() {
		return false;
	},

	filedrop: function(event) {
		event.preventDefault();
		var entry = event.dataTransfer.items[0].webkitGetAsEntry();
		if (entry.isDirectory) {
			var path = event.dataTransfer.files[0].path;
			this.loadProject(path);	
		}
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
			if (newWidth < 200) newWidth = 200;
			if (newWidth > 400) newWidth = 400;
			this.resizeTarget.width(newWidth);

			this.onResize();
		}
	},

	mouseup: function(event) {
		this.resizing = false;
		$(document.body).css('cursor', 'default');
	},

	onResize: function() {
		var modulesWidth = $('#modules').width();
		var editorWidth = window.innerWidth - modulesWidth;
		$('#editor').width(editorWidth);
		$('#editor').css('margin-left', modulesWidth + 'px');
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
		// this.startGame();
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

	ksort: function(obj, compare) {
	    if (!obj || typeof obj !== 'object') return false;

	    var keys = [], result = {}, i;
	    for (i in obj) {
	        keys.push(i);
	    }
	    
	    keys.sort(compare);
	    for (i = 0; i < keys.length; i++) {
	        result[keys[i]] = obj[keys[i]];
	    }

	    return result;
	},

	updateModuleList: function() {
		// Sort modules
		this.modules = this.ksort(this.modules);

		for (var module in this.modules) {
			// Sort classes
			this.modules[module].classes = this.ksort(this.modules[module].classes);
		}

		$('#modules .content .list').html('');
		for (var name in this.modules) {
			var div = document.createElement('div');
			$(div).addClass('module');
			$(div).html(name.substr(5));
			$(div).appendTo($('#modules .content .list'));

			var button = document.createElement('button');
			$(button).html('+');
			$(button).click(this.newClass.bind(this, name));
			$(button).appendTo(div);

			for (var className in this.modules[name].classes) {
				var div = document.createElement('div');
				$(div).addClass('class');
				$(div).html(className);
				$(div).appendTo($('#modules .content .list'));
				$(div).click(this.editClass.bind(this, className, name, div));

				this.modules[name].classes[className].div = div;

				if (this.currentClass === className) {
					$(div).addClass('current');
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

	deleteClass: function(name, module) {
		var areyousure = confirm('Delete class ' + name + ' from ' + module + '?');
		if (!areyousure) return;

		delete game[name];
		delete game.modules[module].classes[name];

		var patt = new RegExp('game\\.create\\w{5}\\([\'\"]' + name + '[\\s\\S]*?\\n\\}\\)\\;[\\n]', 'm');
		game.modules[module].data = game.modules[module].data.replace(patt, '');

		
	},

	newClass: function(module) {
		this.currentModule = module;
		this.currentClass = null;

		this.editor.setValue('{\n    init: function() {\n    }\n}');
		var line = 1;
		this.editor.setCursor(line, this.editor.getLine(line).length);
		this.editor.focus();
	},

	editClass: function(name, module, div) {
		if (this.currentClass === name) return;
		if (!module) return;

		if (div) {
			$('#modules .class.current').removeClass('current');
			$(div).addClass('current');
			this.currentClassDiv = div;
		}

		this.currentModule = module;
		this.currentClass = name;

		this.editor.doc.history.lastChangeTime = 0;
		this.editor.setValue(this.modules[module].classes[name].data);
		this.editor.doc.history.lastChangeTime = this.editor.doc.history.lastModTime;
		
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
			this.fs.writeFile(file, value, {
				encoding: 'utf-8'
			}, function(err) {
				if (err) console.log('Error saving file');
				else {
					console.log('Saved');
					// panda.updateModuleList();
				}
			});
		}
	},

	editFile: function(path) {
		console.log('Loading file ' + path);
		this.currentFile = path;

		this.fs.readFile(path, {
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

	reloadModule: function(name) {
		console.log('Reloading module ' + name);

		game.ready = function() {
			panda.updateModuleList();
			if (this.assetQueue.length > 0 || this.audioQueue.length > 0) {
				// console.log('Loading new assets...');
				// this._loader = new this.Loader(game.system.sceneName);
				// this._loader.start();
			}
			else {
				// panda.restartScene();
			}
		};

		// Delete module classes
		for (var className in game.modules[name].classes) {
			delete game[className];
		}

		// Remove module script
		if (this._moduleScripts[name]) {
			document.getElementsByTagName('head')[0].removeChild(this._moduleScripts[name]);
		}

		// Delete module
		delete game.modules[name];

		// Reload module script
		var path = name.replace(/\./g, '/') + '.js?' + Date.now();
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = this.currentProject + '/src/' + path;
		script.onerror = function() {
		    console.log('Error loading module');
		};
		document.getElementsByTagName('head')[0].appendChild(script);

		this._moduleScripts[name] = script;
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
		if (!name) return;
		name = name.replace(/\s/g, '');
		if (!name) return;
	},

	loadLastProject: function() {
		var lastProject = localStorage.getItem(this.info.id + 'lastProject');
		if (lastProject) this.loadProject(lastProject);
	},

	loadProject: function(dir) {
		if (!dir) return;

		if (this.currentProject) {
			var sure = confirm('Load new project?');
			if (!sure) return;
		}

		console.log('Loading project ' + dir);

		localStorage.setItem(this.info.id + 'lastProject', dir);

		this.currentProject = dir;

		this.modules = {};
		this.modules['game.main'] = {};

		console.log('Loading config...');

		try {
			require(dir + '/src/game/config.js');	
		}
		catch(e) {
			// Default config, if none found
			global.pandaConfig = {
				name: 'Untitled',
				version: '0.0.0'
			}
		}
		
		this.config = global.pandaConfig;

		this.window.title = this.info.description + ' - ' + this.config.name + ' ' + this.config.version;

		console.log('Loading modules...');
		this.loadModuleData();
	},

	loadModuleData: function() {
		for (var name in this.modules) {
			if (this.modules[name].data) continue;

			var file = this.currentProject + '/src/' + name.replace(/\./g, '/') + '.js';
			console.log('Reading file ' + file);
			this.fs.readFile(file, {
				encoding: 'utf-8'
			}, this.readModuleData.bind(this, name));
			return;
		}

		console.log('Loading classes...');
		this.getClassesFromModule();
	},

	getClassesFromModule: function() {
		for (var name in this.modules) {
			if (this.modules[name].classes) continue;

			this.modules[name].classes = {};

			console.log('Parsing module ' + name);

			var data = this.esprima.parse(this.modules[name].data, {
				range: true
			});

			var nodes = data.body[0].expression.arguments[0].body.body;

			for (var i = 0; i < nodes.length; i++) {
				var expName = nodes[i].expression.callee.property.name;
				if (expName === 'createClass' || expName === 'createScene') {
					var args = nodes[i].expression.arguments;
					// console.log(args[0].value);
					var lastArg = args[args.length - 1];
					// console.log(lastArg);

					var firstPropRange = lastArg.properties[0].range;
					var lastPropRange = lastArg.properties[lastArg.properties.length - 1].range;

					var strStart = firstPropRange[0];
					var strLength = lastPropRange[1] - strStart;

					var strData = this.modules[name].data.substr(lastArg.range[0], lastArg.range[1] - lastArg.range[0]);

					// console.log(strData);
					var className = args[0].value;
					if (expName === 'createScene') className = 'Scene' + className;
					this.modules[name].classes[className] = {
						data: strData,
						origData: strData
					};
				}
			}

			this.getClassesFromModule();

			return;
		}

		this.updateModuleList();
		this.editor.setValue('');
	},

	readModuleData: function(name, err, data) {
		var requires = 0;

		this.modules[name].data = data;

		// Read required modules from data
		// FIXME make this cleaner
		var index = data.indexOf('.require(');
		if (index !== -1) {
			var patt = /([^)]+)/;
			data = patt.exec(data.substr(index).replace('.require(', ''));
			if (data) {
				data = data[0].replace(/\s/g, '');
				data = data.replace(/\'/g, '');
				data = data.split(',');
				for (var i = 0; i < data.length; i++) {
					// Only include game modules
					if (data[i].indexOf('game.') !== 0) continue;
					this.modules[data[i]] = {};
					requires++;
				}
			}
		}

		this.loadModuleData();
	},

	loadEditor: function() {
		console.log('Loading editor...');

		var textarea = document.createElement('textarea');
		$('#editor .content').append(textarea);

		this.editor = CodeMirror.fromTextArea(textarea, {
			lineNumbers: true,
			theme: 'base16-dark',
			mode: 'javascript',
			indentUnit: 4,
			autofocus: true,
			hint: CodeMirror.hint.javascript,
			keyMap: 'sublime',
			autoCloseBrackets: true
		});
		this.editor.setOption('extraKeys', {
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
				editor.saveChanges();
			}
		});
		this.editor.on('change', this.onChange.bind(this));
	},

	onChange: function() {
		if (this.currentClass) {
			if (this.editor.doc.history.lastChangeTime && this.editor.doc.history.lastChangeTime < this.editor.doc.history.lastModTime) {
				$(this.currentClassDiv).html(this.currentClass + '*');
				this.modules[this.currentModule].classes[this.currentClass].changed = true;
				this.editor.doc.history.lastChangeTime = this.editor.doc.history.lastModTime;
			}

			// Save data (also undo)
			this.modules[this.currentModule].classes[this.currentClass].data = this.editor.getValue();
		}
	},

	saveChanges: function() {
		console.log('Saving changes');

		if (this.currentModule && !this.currentClass) {
			// New class
			var className = prompt('New class name for ' + this.currentModule + ':');
			if (className) className = className.replace(/[\s\W]/g, '');
			if (className) className = className.substr(0, 24);
			if (className && !this.modules[this.currentModule].classes[className]) {
				// TODO insert new module
				console.log('TODO');
			}
		}

		for (var module in this.modules) {
			var needToSave = false;
			for (var className in this.modules[module].classes) {
				var classObj = this.modules[module].classes[className];

				if (classObj.changed) {
					console.log('Saving class ' + className);
					var classOrigData = classObj.origData;

					// Save data
					this.modules[module].data = this.modules[module].data.replace(classOrigData, classObj.data);

					$(classObj.div).html(className);
					classObj.origData = classObj.data;
					classObj.changed = false;
					needToSave = true;
				}
			}

			if (needToSave) {
				var file = this.currentProject + '/src/' + module.replace(/\./g, '/') + '.js';

				console.log('Saving ' + file);
				this.fs.writeFile(file, this.modules[module].data, {
					encoding: 'utf-8'
				}, function(err) {
					if (err) console.log('Error saving module');
				});
			}
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
		
		localStorage.setItem(info.id + 'projects', JSON.stringify(projects));
	},

	clearProjects: function() {
		localStorage.setItem(info.id + 'projects', null);
	}
};

$(function() {
	editor.init();
});

var editor = {
	info: require('./package.json'),
	fork: require('child_process').fork,
	gui: require('nw.gui'),
	fs: require('fs'),
	esprima: require('esprima'),

	init: function() {
		// Tab resize
		$('.tab .resize').mousedown(this.resizeDown.bind(this));
		$(window).mousemove(this.resizeMove.bind(this));
		$(window).mouseup(this.resizeUp.bind(this));

		window.addEventListener('resize', this.onResize.bind(this));
		window.ondragover = this.dragover.bind(this);
		window.ondragleave = this.dragleave.bind(this);
		window.ondrop = this.filedrop.bind(this);

		this.loadEditor();
		this.onResize();

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

	resizeDown: function(event) {
		this.resizing = true;
		this.resizeX = event.pageX;
		this.resizeTarget = $(event.currentTarget).parent('.tab');
		this.resizeWidth = this.resizeTarget.width();
		$(document.body).css('cursor', 'col-resize');
	},

	resizeMove: function(event) {
		if (this.resizing) {
			var newWidth = this.resizeWidth + (event.pageX - this.resizeX);
			if (newWidth < 200) newWidth = 200;
			if (newWidth > 400) newWidth = 400;
			this.resizeTarget.width(newWidth);

			this.onResize();
		}
	},

	resizeUp: function(event) {
		this.resizing = false;
		$(document.body).css('cursor', 'default');
		this.editor.focus();
	},

	onResize: function() {
		var editorWidth = window.innerWidth;
		var modulesWidth = 0;
		
		if ($('#modules').is(':visible')) {
			modulesWidth = $('#modules').width();
			editorWidth -= modulesWidth;
		}

		$('#editor').width(editorWidth);
		$('#editor').css('margin-left', modulesWidth + 'px');

		this.editor.resize();
	},

	toggleModules: function() {
		var tab = $('#modules');
		if (tab.is(':visible')) tab.hide();
		else tab.show();
		this.onResize();
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
			$(div).html(name);
			$(div).appendTo($('#modules .content .list'));

			this.modules[name].div = div;

			var button = document.createElement('button');
			$(button).html('+');
			$(button).click(this.newClass.bind(this, name));
			$(button).appendTo(div);

			for (var className in this.modules[name].classes) {
				var div = document.createElement('div');
				$(div).addClass('class');
				$(div).html(className);
				$(div).appendTo($('#modules .content .list'));
				$(div).click(this.editClass.bind(this, className, name));

				this.modules[name].classes[className].div = div;

				if (this.currentClass === className) {
					$(div).addClass('current');
				}
			}
		}
	},

	newClass: function(module) {
		this.currentModule = module;
		this.currentClass = null;

		this.editor.setValue('{\n    init: function() {\n    }\n}');
		var line = 1;
		this.editor.setCursor(line, this.editor.getLine(line).length);
		this.editor.focus();
	},

	editClass: function(name, module) {
		if (this.currentClass === name) return;

		var classObj = this.getCurrentClassObject();
		if (classObj) $(classObj.div).removeClass('current');

		this.currentModule = module;
		this.currentClass = name;

		var classObj = this.getCurrentClassObject();
		$(classObj.div).addClass('current');

		this.editor.setValue(classObj.data, -1);
		if (this.editor.doc) this.editor.doc.clearHistory();
		this.editor.focus();
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

	readModuleData: function(name, err, data) {
		var requires = 0;

		this.modules[name].data = data;
		this.modules[name].requires = [];

		// Read required modules from data
		// FIXME use esprima
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
					this.modules[name].requires.push(data[i]);
					requires++;
				}
			}
		}

		this.loadModuleData();
	},

	getClassesFromModule: function() {
		for (var name in this.modules) {
			if (this.modules[name].classes) continue;

			this.modules[name].classes = {};

			console.log('Parsing module ' + name);

			var data = this.esprima.parse(this.modules[name].data, {
				range: true
			});

			var body = data.body[0].expression.arguments[0].body;
			var nodes = body.body;

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
						savedData: strData
					};
				}
			}

			this.getClassesFromModule();
			return;
		}

		this.updateModuleList();
		this.editor.setValue('');
	},

	revertClass: function() {
		var classObj = this.getCurrentClassObject();
		if (!classObj) return;

		var sure = confirm('Revert class data?');
		if (!sure) return;

		classObj.data = classObj.savedData;
		classObj.changed = false;
		this.editor.doc.clearHistory();
		this.editor.setValue(classObj.data);
		$(classObj.div).html(this.currentClass);
	},

	getCurrentClassObject: function() {
		if (!this.currentClass || !this.currentModule) return false;
		return this.modules[this.currentModule].classes[this.currentClass];
	},

	loadEditor: function() {
		console.log('Loading editor...');

		this.editor = ace.edit('editor');
		this.editor.setTheme('ace/theme/sunburst');
		this.editor.getSession().setMode('ace/mode/javascript');
		this.editor.getSession().setUseWorker(false);
		this.editor.setShowPrintMargin(false);
		this.editor.setHighlightActiveLine(false);
		this.editor.setShowFoldWidgets(false);
		this.editor.focus();

		return;

		var textarea = document.createElement('textarea');
		$('#editor .content').append(textarea);

		this.editor = CodeMirror.fromTextArea(textarea, {
			lineNumbers: true,
			theme: 'sunburst',
			mode: 'javascript',
			indentUnit: 4,
			autofocus: true,
			hint: CodeMirror.hint.javascript,
			keyMap: 'sublime',
			autoCloseBrackets: true
		});
		this.editor.setOption('extraKeys', {
			'Ctrl-Tab': this.toggleModules.bind(this),
			'Cmd-R': this.revertClass.bind(this),
			'Cmd-S': this.saveChanges.bind(this),
			'Cmd-X': this.cut.bind(this),
			'Cmd-C': this.copy.bind(this),
			'Cmd-V': this.paste.bind(this)
		});
		this.editor.on('change', this.onChange.bind(this));
	},

	cut: function() {
		this.copy();
		this.editor.replaceSelection('');
	},

	copy: function() {
		this.clipboard.set(this.editor.getSelection(), 'text');
	},

	paste: function() {
		var data = this.clipboard.get('text');
		data = data.replace(/^[\s]*/, ''); // Remove whitespace from start
		this.editor.replaceSelection(data);
	},

	onChange: function() {
		if (this.currentClass) {
			if (this.editor.doc.history.lastOrigin === 'setValue') return;

			var classObj = this.getCurrentClassObject();
			if (!classObj.changed) {
				$(classObj.div).html(this.currentClass + '*');
				$(classObj.div).addClass('changed');
				classObj.changed = true;
			}

			// Save data (also undo)
			classObj.data = this.editor.getValue();
		}
	},

	saveNewClass: function() {
		var classValue = this.editor.getValue();
		if (!classValue) return false;

		var className = prompt('New class name for ' + this.currentModule + ':');
		if (className) className = className.replace(/[\s\W]/g, '');
		if (className) className = className.substr(0, 24); // Max length
		if (!className) return false;
		if (this.modules[this.currentModule].classes[className]) return false;

		console.log('Saving new class ' + className);

		this.modules[this.currentModule].classes[className] = {
			data: classValue,
			savedData: classValue
		};

		this.currentClass = className;

		var classObj = this.getCurrentClassObject();
		$(classObj.div).addClass('current');

		return true;
	},

	saveChanges: function() {
		console.log('Saving changes');

		var needUpdate = false;

		for (var module in this.modules) {
			var needToSave = false;

			if (this.currentModule === module && !this.currentClass) {
				if (this.saveNewClass()) {
					needToSave = true;
					needUpdate = true;
				}
			}

			for (var className in this.modules[module].classes) {
				var classObj = this.modules[module].classes[className];

				if (classObj.changed) {
					if (classObj.data === '') {
						console.log('Deleting class ' + className);
						$(classObj.div).remove();
						delete this.modules[module].classes[className];
						needUpdate = true;
					}
					else {
						console.log('Saving class ' + className);
					}

					needToSave = true;
				}
			}

			if (needToSave) {
				console.log('Saving module ' + module);
				var file = this.currentProject + '/src/' + module.replace(/\./g, '/') + '.js';

				var data = 'game.module(\'' + module + '\')\n';
				if (this.modules[module].requires.length > 0) {
					var requires = this.modules[module].requires.join('\', \'');
					data += '.require(\'' + requires + '\')\n';
				}
				data += '.body(function() {\n\n';

				for (var className in this.modules[module].classes) {
					var funcName = 'createClass';
					var strClassName = className;
					if (className.indexOf('Scene') === 0) {
						funcName = 'createScene';
						strClassName = strClassName.replace('Scene', '');
					}
					data += 'game.' + funcName + '(\'' + strClassName + '\', ';
					data += this.modules[module].classes[className].data;
					data += ');\n\n';
				}

				data += '});\n';

				console.log('Writing file ' + file);
				this.fs.writeFile(file, data, {
					encoding: 'utf-8'
				}, this.moduleSaved.bind(this, module));
			}
		}

		if (needUpdate) this.updateModuleList();
	},

	moduleSaved: function(module, err) {
		if (err) return alert('Error saving module ' + module);
		
		for (var className in this.modules[module].classes) {
			var classObj = this.modules[module].classes[className];
			classObj.changed = false;
			classObj.savedData = classObj.data;
			$(classObj.div).removeClass('changed');
			$(classObj.div).html(className);
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
	}
};

$(function() {
	editor.init();
});

editor.Project = Class.extend({
	modules: {},
	filesToWrite: [],

	init: function(dir, loadCallback) {
		this.dir = dir;
	    this.loadCallback = loadCallback;
	    this.esprima = require('esprima');

	    console.log('Loading project ' + dir);

	    var folder = dir.split('/');
	    this.folder = folder[folder.length - 1];

	    this.config = new editor.Config(this);

	    console.log('Loading engine');
	    try {
	        var game = require(dir + '/src/engine/core.js');
	    }
	    catch(e) {
	        return loadCallback('Engine not found');
	    }

	    $('#engineVersion').html('Panda Engine: ' + game.version);

	    editor.currentClass = editor.currentModule = null;

	    this.modules['game.main'] = {};

	    editor.window.title = editor.info.description + ' - ' + this.config.data.name + ' ' + this.config.data.version;

	    console.log('Loading modules');
	    this.loadModuleData();
	},

	loadModuleData: function() {
	    for (var name in this.modules) {
	        if (this.modules[name].data) continue;

	        var file = this.dir + '/src/' + name.replace(/\./g, '/') + '.js';
	        console.log('Reading file ' + file);

	        editor.fs.readFile(file, {
	            encoding: 'utf-8'
	        }, this.readModuleData.bind(this, name));
	        return;
	    }

	    console.log('Loading classes');
	    this.getClassesFromModule();
	},

	readModuleData: function(name, err, data) {
	    if (err) return this.loadCallback('Module ' + name + ' not found');

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

	    // this.loadModuleData();
	    // Fake slow loading
	    setTimeout(this.loadModuleData.bind(this), 200);
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

	        var moduleData = '';

	        for (var i = 0; i < nodes.length; i++) {
	            if (!nodes[i].expression) {
	                continue;
	            }
	            if (!nodes[i].expression.callee) {
	                continue;
	            }
	            var expName = nodes[i].expression.callee.property.name;
	            if (expName === 'addAsset') {
	                var args = nodes[i].expression.arguments;
	                
	                var path = args[0].value;
	                var id = path;
	                if (args[1]) id = args[1].value;

	                editor.assets.add(path, id);
	            }
	            if (expName === 'addAudio') {
	            	var args = nodes[i].expression.arguments;
	            	
	            	var path = args[0].value;
	            	var id = path;
	            	if (args[1]) id = args[1].value;

	            	editor.audio.add(path, id);
	            }
	            if (expName === 'createClass' || expName === 'createScene') {
	                var args = nodes[i].expression.arguments;
	                // console.log(args[0].value);
	                var lastArg = args[args.length - 1];
	                // console.log(lastArg);

	                var classExtend = 'Class';
	                var secondArg = args[1];
	                if (secondArg.value) classExtend = secondArg.value;

	                var firstPropRange = lastArg.properties[0].range;
	                var lastPropRange = lastArg.properties[lastArg.properties.length - 1].range;

	                var strStart = firstPropRange[0];
	                var strLength = lastPropRange[1] - strStart;

	                var strData = this.modules[name].data.substr(lastArg.range[0], lastArg.range[1] - lastArg.range[0]);

	                // console.log(strData);
	                var className = args[0].value;
	                if (expName === 'createScene') {
	                    className = 'Scene' + className;
	                    classExtend = 'Scene';
	                }

	                var classObj = editor.newClassObject(className, name, strData, classExtend);
	                this.modules[name].classes[className] = classObj;
	            }
	        }

	        this.modules[name].session = ace.createEditSession(moduleData, 'ace/mode/javascript');

	        this.getClassesFromModule();
	        return;
	    }

	    this.updateModuleList();
	    this.loaded();
	},

	loaded: function() {
	    this.loadCallback();

	    editor.storage.set('lastProject', this.dir);
	    
	    var lastClass = editor.storage.get('lastClass', true);
	    var lastModule = editor.storage.get('lastModule', true);

	    if (this.modules[lastModule] && this.modules[lastModule].classes[lastClass]) {
	        editor.editClass(lastClass, lastModule);
	    }
	    else {
	        editor.editNextClass();
	    }
	},

	saveAll: function() {
		for (var module in this.modules) {
			this.modules[module].changed = true;
		}
		this.save();
	},

	save: function() {
	    console.log('Saving changes');

	    this.filesToWrite.length = 0;
	    for (var module in this.modules) {
	        var needToSave = false;

	        if (this.modules[module].changed) needToSave = true;

	        for (var className in this.modules[module].classes) {
	            var classObj = this.modules[module].classes[className];

	            if (classObj.changed) {
	                editor.errorHandler.clear(className);
	                needToSave = true;

	                var value = classObj.session.getValue();
	                if (value === '') {
	                	console.log('Removing class ' + className);
	                	delete this.modules[module].classes[className];
	                }
	                else {
	                	console.log('Saving class ' + className);
	                }
 	            }
	        }

	        if (needToSave) {
	            console.log('Saving module ' + module);
	            var file = this.dir + '/src/' + module.replace(/\./g, '/') + '.js';

	            var data = 'game.module(\n    \'' + module + '\'\n)\n';
	            if (this.modules[module].requires.length > 0) {
	                var requires = this.modules[module].requires.join('\',\n    \'');
	                data += '.require(\n    \'' + requires + '\'\n)\n';
	            }
	            data += '.body(function() {\n\n';

	            if (module === 'game.assets') {
	                for (var asset in editor.assets.assets) {
	                    data += 'game.addAsset(\'' + asset + '\'';
	                    if (asset !== editor.assets.assets[asset]) data += ', \'' + editor.assets.assets[asset] + '\'';
	                    data += ');\n';
	                }
	                for (var audio in editor.audio.audio) {
	                    data += 'game.addAudio(\'' + editor.audio.audioFolder + '/' + audio + '\'';
	                    if (audio !== editor.audio.audio[audio]) data += ', \'' + editor.audio.audio[audio] + '\'';
	                    data += ');\n';
	                }
	                data += '\n';
	            }

	            for (var className in this.modules[module].classes) {
	                var classObj = this.modules[module].classes[className];

	                var funcName = 'createClass';
	                var strClassName = className;
	                if (className.indexOf('Scene') === 0) {
	                    funcName = 'createScene';
	                    strClassName = strClassName.replace('Scene', '');
	                }
	                data += 'game.' + funcName + '(\'' + strClassName + '\', ';
	                if (classObj.extend !== 'Class' && classObj.extend !== 'Scene') {
	                    data += '\'' + classObj.extend +'\', ';
	                }
	                data += this.modules[module].classes[className].session.getValue();
	                data += ');\n\n';
	            }

	            data += '});\n';

	            this.modules[module].data = data;
	            this.modules[module].changed = true;

	            this.filesToWrite.push({
	            	file: file,
	            	data: data,
	            	module: module
	            });
	        }
	    }

	    this.writeFiles();
	},

	writeFiles: function() {
		var fileObj = this.filesToWrite.pop();
		if (!fileObj) return this.saved();

		console.log('Writing file ' + fileObj.file);
		editor.fs.writeFile(fileObj.file, fileObj.data, {
		    encoding: 'utf-8'
		}, this.moduleSaved.bind(this, fileObj.module));
	},

	saved: function() {
		console.log('Project saved');

		var changedModules = [];
		for (module in this.modules) {
			if (this.modules[module].changed) {
				this.modules[module].changed = false;
				changedModules.push(module);
			}
		}

		if (editor.server) {
		    console.log('Emit reloadModules ' + changedModules);
		    editor.server.io.emit('command', 'reloadModules', changedModules);
		}
	},

	moduleSaved: function(module, err) {
	    if (err) {
	    	console.error(err);
	    	return this.writeFiles();
	    }
	    
	    for (var className in this.modules[module].classes) {
	        var classObj = this.modules[module].classes[className];
	        classObj.changed = false;
	        classObj.savedData = classObj.data;
	        $(classObj.div).removeClass('changed');
	        $(classObj.div).html(editor.getClassName(className, classObj.extend));
	    }

	    this.writeFiles();
	},

	updateModuleList: function() {
	    // Sort modules
	    this.modules = editor.ksort(this.modules);

	    $('#modules .content .list').html('');

	    var classCount = 0;
	    for (var name in this.modules) {
	        if (name === 'game.assets') continue;
	        // if (name === 'game.main') continue;
	        var div = document.createElement('div');
	        $(div).addClass('module');
	        $(div).addClass('ace_string');
	        $(div).attr('data-name', name);
	        $(div).html(name.substr(5));
	        $(div).appendTo($('#modules .content .list'));
	        $(div).click(editor.foldModule.bind(editor, div));

	        this.modules[name].div = div;

	        var button = document.createElement('button');
	        $(button).html('+');
	        $(button).click(editor.newClass.bind(editor, name));
	        $(button).appendTo(div);

	        for (var className in this.modules[name].classes) {
	            classCount++;
	            var classObj = this.modules[name].classes[className];
	            var div = document.createElement('div');
	            $(div).addClass('class');
	            $(div).html(editor.getClassName(className, classObj.extend));
	            $(div).appendTo($('#modules .content .list'));
	            $(div).attr('data-name', className);
	            $(div).click(editor.editClass.bind(editor, className, name));

	            this.modules[name].classes[className].div = div;

	            if (editor.currentClass === className) {
	                $(div).addClass('current');
	            }
	            if (classObj.changed) {
	            	$(div).addClass('changed');
	            }
	        }
	    }

	    $('#modules .header').html('Classes (' + classCount + ')');
	}
});

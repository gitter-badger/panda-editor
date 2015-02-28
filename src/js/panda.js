// TODO
// Remove module
// Class Extending!

var editor = {
    info: require('./package.json'),
    fork: require('child_process').fork,
    gui: require('nw.gui'),
    fs: require('fs'),
    esprima: require('esprima'),
    express: require('express'),

    settings: {
        fontSize: 16,
        port: 3000
    },

    devices: [],

    init: function() {
        // Tab resize
        $('.tab .resize').mousedown(this.resizeDown.bind(this));
        $(window).mousemove(this.resizeMove.bind(this));
        $(window).mouseup(this.resizeUp.bind(this));
        $('#settings input').on('change', this.updateSettings.bind(this));

        window.addEventListener('resize', this.onResize.bind(this));
        window.ondragover = this.dragover.bind(this);
        window.ondragleave = this.dragleave.bind(this);
        window.ondrop = this.filedrop.bind(this);

        this.initEditor();
        this.onResize();

        this.clipboard = this.gui.Clipboard.get();
        this.window = this.gui.Window.get();
        
        this.initMenu();

        this.loadLastProject();

        this.window.show();
    },

    updateSettings: function(event) {
        var id = $(event.target).attr('id');
        var value = !!$(event.target).is(':checked');
        var label = $('label[for="' + id + '"]');

        if (!value) $(label).addClass('disabled');
        else $(label).removeClass('disabled');
        this.settings[id] = value;

        if (id.indexOf('device_') === 0) {
            this.io.emit('updateSettings', id, value);
        }
    },

    initEditor: function() {
        console.log('Initializing editor');

        this.currentFontSize = this.settings.fontSize;
        this.changeFontSize(0);

        require('ace/config').setDefaultValue('session', 'useWorker', false);

        this.editor = ace.edit('editor');
        this.editor.setTheme('ace/theme/sunburst');
        this.editor.getSession().setMode('ace/mode/javascript');
        this.editor.$blockScrolling = Infinity;
        
        this.editor.setOptions({
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true,
            showPrintMargin: false,
            displayIndentGuides: true,
            showFoldWidgets: false
        });
        this.editor.commands.addCommand({
            name: 'saveChanges',
            bindKey: { mac: 'Cmd-S', win: 'Ctrl-S' },
            exec: this.saveChanges.bind(this)
        });
        this.editor.commands.addCommand({
            name: 'newClass',
            bindKey: { mac: 'Cmd-N', win: 'Ctrl-N' },
            exec: this.newClass.bind(this, '')
        });
        this.editor.commands.addCommand({
            name: 'newModule',
            bindKey: { mac: 'Cmd-Shift-N', win: 'Ctrl-Shift-N' },
            exec: this.newModule.bind(this)
        });
        this.editor.commands.addCommand({
            name: 'editNextClass',
            bindKey: { mac: 'Alt-Shift-Down', win: 'Alt-Shift-Down' },
            exec: this.editNextClass.bind(this)
        });
        this.editor.commands.addCommand({
            name: 'editPrevClass',
            bindKey: { mac: 'Alt-Shift-Up', win: 'Alt-Shift-Up' },
            exec: this.editPrevClass.bind(this)
        });
        this.editor.commands.addCommand({
            name: 'setFontBigger',
            bindKey: { mac: 'Cmd-+', win: 'Ctrl-+' },
            exec: this.changeFontSize.bind(this, 1)
        });
        this.editor.commands.addCommand({
            name: 'setFontSmaller',
            bindKey: { mac: 'Cmd--', win: 'Ctrl--' },
            exec: this.changeFontSize.bind(this, -1)
        });
        this.editor.commands.addCommand({
            name: 'buildProject',
            bindKey: { mac: 'Cmd-B', win: 'Ctrl-B' },
            exec: this.buildProject.bind(this)
        });
        this.editor.commands.addCommand({
            name: 'newProject',
            bindKey: { mac: 'Cmd-P', win: 'Ctrl-P' },
            exec: this.createProject.bind(this)
        });
        this.editor.commands.addCommand({
            name: 'reloadGame',
            bindKey: { mac: 'Cmd-R', win: 'Ctrl-R' },
            exec: this.reloadGame.bind(this)
        });

        this.editor.focus();
    },

    reloadGame: function() {
        if (!this.io) return;
        console.log('Emit reloadGame');
        this.io.emit('command', 'reloadGame');
    },

    initMenu: function() {
        console.log('Initializing menu');

        var menubar = new this.gui.Menu({ type: 'menubar' });
        menubar.createMacBuiltin(this.info.description);

        // Project menu
        var project = new this.gui.Menu();
        project.append(new this.gui.MenuItem({ label: 'Open in browser', click: this.viewProject.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Edit config', click: this.editConfig.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Build project', click: this.buildProject.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Create new project', click: this.createProject.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Update engine', click: this.updateEngine.bind(this) }));
        
        // Show menu
        var show = new this.gui.Menu();
        $('.tab').each(this.addShowMenuItem.bind(this, show));

        // Help menu
        var help = new this.gui.Menu();
        help.append(new this.gui.MenuItem({ label: 'About' }));
        
        menubar.insert(new this.gui.MenuItem({ label: 'Project', submenu: project }), 1);
        menubar.append(new this.gui.MenuItem({ label: 'Show', submenu: show }));
        menubar.append(new this.gui.MenuItem({ label: 'Help', submenu: help }));

        this.window.menu = menubar;
    },

    addShowMenuItem: function(menu, index, tab) {
        var id = $(tab).attr('id');

        var name = id.charAt(0).toUpperCase() + id.substr(1);
        menu.append(new this.gui.MenuItem({ label: name, click: this.toggleTab.bind(this, id) }));

        this.editor.commands.addCommand({
            name: 'toggleTab' + name,
            bindKey: { mac: 'Cmd-' + (index + 1), win: 'Alt-' + (index + 1) },
            exec: this.toggleTab.bind(this, id)
        });
    },

    toggleTab: function(tab) {
        $('#' + tab).toggle();
        this.onResize();
    },

    viewProject: function() {
        this.gui.Shell.openExternal('http://localhost:' + this.settings.port + '/dev.html');
    },

    updateEngine: function() {
        console.log('TODO');
    },

    editConfig: function() {
        console.log('TODO');
    },

    editPrevClass: function() {
        if (!this.currentModule || !this.currentClass) return;

        var prevModule = this.currentModule;
        var prevClass = this.getPrevClass(prevModule, this.currentClass);

        while (!prevClass) {
            prevModule = this.getPrevModule(prevModule);
            if (!prevModule) return;
            prevClass = this.getPrevClass(prevModule);
        }

        this.editClass(prevClass, prevModule);
    },

    getPrevClass: function(inModule, beforeClass) {
        var lastClass = false;
        for (var className in this.modules[inModule].classes) {
            if (className === beforeClass) return lastClass;
            lastClass = className;
        }
        if (!beforeClass) return className;
        return false;
    },

    getPrevModule: function(forModule) {
        var prevModule = false;
        for (var module in this.modules) {
            if (module === forModule) return prevModule;
            prevModule = module;
        }
        return false;
    },

    editNextClass: function() {
        if (!this.currentModule || !this.currentClass) {
            this.currentModule = 'game.main';
        }

        var nextModule = this.currentModule;
        var nextClass = this.getNextClass(nextModule, this.currentClass);

        while (!nextClass) {
            nextModule = this.getNextModule(nextModule);
            if (!nextModule) return;
            nextClass = this.getNextClass(nextModule);
        }

        this.editClass(nextClass, nextModule);
    },

    getNextClass: function(inModule, afterClass) {
        var classFound = false;
        for (var className in this.modules[inModule].classes) {
            if (!afterClass) return className;
            if (classFound) return className;
            if (className === afterClass) classFound = true;
        }
        return false;
    },

    getNextModule: function(forModule) {
        var moduleFound = false;
        for (var module in this.modules) {
            if (moduleFound) return module;
            if (module === forModule) moduleFound = true;
        }
        return false;
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
        if (!entry) return;
        if (this.loading) return;
        if (entry.isDirectory) {
            var path = event.dataTransfer.files[0].path;
            
            if (this.currentProject) {
                var sure = confirm('Load new project? (Changes will be lost)');
                if (!sure) return;
            }

            this.loadProject(path); 
        }
    },

    resizeDown: function(event) {
        console.log('down');
        this.resizing = true;
        this.resizeX = event.pageX;
        this.resizeTarget = $(event.currentTarget).parent('.tab');
        this.resizeWidth = this.resizeTarget.width();
        $(document.body).css('cursor', 'col-resize');
    },

    resizeMove: function(event) {
        if (this.resizing) {
            var newWidth = this.resizeWidth + (event.pageX - this.resizeX);
            if (newWidth < 100) newWidth = 100;
            if (newWidth > 300) newWidth = 300;
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
        var tabsWidth = 0;
        
        $('.tab').each(function() {
            if ($(this).is('#editor')) return;
            if (!$(this).is(':visible')) return;
            tabsWidth += $(this).outerWidth(true);
        });

        editorWidth -= (tabsWidth + 1);

        $('#editor').width(editorWidth);

        this.editor.resize();
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

        // Sort classes
        for (var module in this.modules) {
            this.modules[module].classes = this.ksort(this.modules[module].classes);
        }

        $('#modules .content').html('');

        for (var name in this.modules) {
            var div = document.createElement('div');
            $(div).addClass('module');
            $(div).html(name.substr(5));
            $(div).appendTo($('#modules .content'));
            $(div).click(this.editClass.bind(this, null, name));

            this.modules[name].div = div;

            var button = document.createElement('button');
            $(button).html('+');
            $(button).click(this.newClass.bind(this, name));
            $(button).appendTo(div);

            for (var className in this.modules[name].classes) {
                var div = document.createElement('div');
                $(div).addClass('class');
                $(div).html(className);
                $(div).appendTo($('#modules .content'));
                $(div).click(this.editClass.bind(this, className, name));

                this.modules[name].classes[className].div = div;

                if (this.currentClass === className) {
                    $(div).addClass('current');
                }
            }
        }
    },

    changeFontSize: function(amount) {
        this.currentFontSize += amount;
        if (this.currentFontSize < 14) this.currentFontSize = 14;
        if (this.currentFontSize > 23) this.currentFontSize = 23;
        
        $('#editor').css('font-size', this.currentFontSize + 'px');
    },

    newModule: function() {
        var moduleName = prompt('New module name:');
        if (moduleName) moduleName = moduleName.replace(/[\s\W]/g, '');
        if (moduleName) moduleName = moduleName.substr(0, 16); // Max length
        if (!moduleName) return;
        moduleName = 'game.' + moduleName;
        if (this.modules[moduleName]) return;

        this.modules[moduleName] = {
            classes: {},
            requires: []
        };

        this.modules['game.main'].requires.push(moduleName);
        this.modules['game.main'].changed = true; // Force save

        this.updateModuleList();

        this.currentModule = moduleName;
        this.newClass();
    },

    newClass: function(module) {
        module = module || this.currentModule;
        if (!module) return;

        var classObj = this.getCurrentClassObject();
        if (classObj) $(classObj.div).removeClass('current');

        this.currentModule = module;
        this.currentClass = null;

        this.editor.setSession(ace.createEditSession('{\n    init: function() {\n    }\n}', 'ace/mode/javascript'));
        this.editor.gotoLine(2);
        this.editor.navigateLineEnd();
        this.editor.focus();
    },

    editClass: function(name, module) {
        if (this.currentClass === name && this.currentModule === module) return;

        var classObj = this.getCurrentClassObject();
        if (classObj) $(classObj.div).removeClass('current');

        this.currentModule = module;
        this.currentClass = name;
        var classObj = this.getCurrentClassObject();
        $(classObj.div).addClass('current');

        this.editor.setSession(classObj.session);
        this.editor.focus();
        
        var curPos = this.editor.getCursorPosition();
        if (this.currentClass && curPos.row === 0 && curPos.column === 0) {
            this.editor.gotoLine(2);
            this.editor.navigateLineEnd();
        }

        this.saveCurrentState();
    },

    buildProject: function() {
        if (!this.currentProject) return;
        if (this.loading) return;

        var sure = confirm('Build project?');
        if (!sure) return;

        this.showLoader();
        console.log('Building project');

        var worker = this.fork('js/worker.js', { execPath: './node' });
        worker.on('message', this.buildComplete.bind(this));
        worker.on('exit', this.buildComplete.bind(this));
        worker.send(['build', this.currentProject]);
    },

    buildComplete: function(err) {
        this.hideLoader();
        
        if (err) console.error(err);
        else console.log('Build completed');
    },

    loadLastProject: function() {
        var lastProject = this.getStorage('lastProject', true);
        if (lastProject) this.loadProject(lastProject);
    },

    loadProject: function(dir) {
        if (!dir) return;
        if (dir === this.currentProject) return;
        if (this.loading) return;

        console.log('Loading project ' + dir);

        console.log('Loading config');

        try {
            require(dir + '/src/game/config.js');   
        }
        catch(e) {
            return console.error('Config not found');
        }

        this.showLoader();

        this.currentClass = this.currentModule = null;
        this.currentProject = dir;
        this.setStorage('lastProject', this.currentProject, true);
        this.modules = {};
        this.modules['game.main'] = {};
        
        this.config = global.pandaConfig;

        this.window.title = this.info.description + ' - ' + this.config.name + ' ' + this.config.version;

        console.log('Loading modules');
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

        console.log('Loading classes');
        this.getClassesFromModule();
    },

    readModuleData: function(name, err, data) {
        if (err) return console.log('Module ' + name + ' not found');

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

            var moduleData = '';

            for (var i = 0; i < nodes.length; i++) {
                if (!nodes[i].expression) {
                    continue;
                }
                if (!nodes[i].expression.callee) {
                    continue;
                }
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

                    this.newClassObject(className, name, strData);
                }
                else {

                }
            }

            this.modules[name].session = ace.createEditSession(moduleData, 'ace/mode/javascript');

            this.getClassesFromModule();
            return;
        }

        this.updateModuleList();
        this.projectLoaded();
    },

    initServer: function() {
        if (this.io) {
            console.log('Server already started');
            this.staticServe = this.express.static(this.currentProject);
            this.io.emit('command', 'reloadGame');
            return;
        }
        
        var app = this.express();
        var http = require('http').Server(app);
        var io = require('socket.io')(http);

        var script = this.fs.readFileSync('js/reload.html', { encoding: 'utf-8' });

        app.post('/register', function(req, res) {
            res.sendStatus(200);
        });

        this.snippetScript = script;

        app.use(require('connect-inject')({ snippet: script }));

        this.staticServe = this.express.static(this.currentProject);

        app.use('/', function(req, res, next) {
            editor.staticServe(req, res, next);
        });

        io.on('connection', function(socket){
            console.log('Client connected');
            socket.on('disconnect', function() {
                console.log('Client disconnected');
                for (var i = editor.devices.length - 1; i >= 0; i--) {
                    var device = editor.devices[i];
                    if (this === device.socket) {
                        editor.devices.splice(i, 1);
                        if (device.div) editor.updateDeviceList();
                        break;
                    }
                }
            });
            socket.on('register', function(data) {
                data.socket = this;
                editor.registerDevice(data);
            });
        });

        http.listen(this.settings.port);

        console.log('Listening on port ' + this.settings.port);

        this.io = io;
    },

    registerDevice: function(data) {
        this.devices.push(data);
        this.updateDeviceList();
        console.log('Registered device ' + data.platform + ' ' + data.model);
    },

    updateDeviceList: function() {
        $('#devices .content').html('');
        for (var i = 0; i < this.devices.length; i++) {
            var device = this.devices[i];
            var div = document.createElement('div');
            $(div).addClass('device');
            $(div).html(device.platform + ' ' + device.model);
            $(div).appendTo($('#devices .content'));
            $(div).click(this.reloadDevice.bind(this, device));
            device.div = div;
        }
        this.onResize();
    },

    reloadDevice: function(device) {
        $(device.div).remove();
        device.div = null;
        device.socket.emit('command', 'reloadGame');
    },

    projectLoaded: function() {
        this.initServer();

        var lastClass = this.getStorage('lastClass');
        var lastModule = this.getStorage('lastModule');
        if (this.modules[lastModule] && this.modules[lastModule].classes[lastClass]) {
            this.editClass(lastClass, lastModule);
        }
        else {
            this.editNextClass();
        }

        this.hideLoader();
    },

    newClassObject: function(className, module, data) {
        var session = ace.createEditSession(data, 'ace/mode/javascript');
        var classObj = {
            name: className,
            session: session
        };
        session.on('change', this.onChange.bind(this, classObj));
        this.modules[module].classes[className] = classObj;
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
        if (!this.currentClass && !this.currentModule) return false;
        if (!this.currentClass) return this.modules[this.currentModule];
        return this.modules[this.currentModule].classes[this.currentClass];
    },

    onChange: function(classObj, event) {
        var hasUndo = classObj.session.getUndoManager().hasUndo();
        
        // FIXME why hasUndo is false, when inserting text?
        if (event.data.action === 'insertText') hasUndo = true;
        if (event.data.action === 'removeText') hasUndo = true;

        if (hasUndo && !classObj.changed) {
            classObj.changed = true;
            $(classObj.div).html(classObj.name + '*');
            $(classObj.div).addClass('changed');
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

        this.newClassObject(className, this.currentModule, classValue);

        this.currentClass = className;

        this.saveCurrentState();

        var classObj = this.getCurrentClassObject();
        $(classObj.div).addClass('current');
        var curPos = this.editor.getCursorPosition();
        this.editor.setSession(classObj.session);
        this.editor.gotoLine(curPos.row + 1, curPos.column);

        return true;
    },

    saveCurrentState: function() {
        this.setStorage('lastClass', this.currentClass);
        this.setStorage('lastModule', this.currentModule);
    },

    setStorage: function(key, data, global) {
        var id = this.info.id + key;
        if (!global) id += this.currentProject;
        localStorage.setItem(id, data);
    },

    getStorage: function(key, global) {
        var id = this.info.id + key;
        if (!global) id += this.currentProject;
        return localStorage.getItem(id);
    },

    saveChanges: function() {
        console.log('Saving changes');

        var needUpdate = false;

        for (var module in this.modules) {
            var needToSave = false;

            if (this.modules[module].changed) needToSave = true;

            if (this.currentModule === module && !this.currentClass) {
                if (this.saveNewClass()) {
                    needToSave = true;
                    needUpdate = true;
                }
            }

            for (var className in this.modules[module].classes) {
                var classObj = this.modules[module].classes[className];

                if (classObj.changed) {
                    if (classObj.session.getValue() === '') {
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
                    data += this.modules[module].classes[className].session.getValue();
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

        this.modules[module].changed = false;
        $(this.modules[module].div).removeClass('changed');
        $(this.modules[module].div).html(this.modules[module].name);

        if (this.io) {
            console.log('Emit reloadModule');
            this.io.emit('command', 'reloadModule', module);
        }
    },

    createProject: function() {
        if (this.loading) return;
        
        if (this.currentProject) {
            var sure = confirm('Create new project? (Changes will be lost)');
            if (!sure) return;
        }

        var name = prompt('Project name:');
        if (!name) return;

        this.currentProject = null;

        this.showLoader();

        console.log('Creating new project');

        var dir = '/Users/eemelikelokorpi/Sites/temp/';

        var worker = this.fork('js/worker.js', { execPath: './node' });
        worker.on('message', this.projectCreated.bind(this, dir + name));
        worker.on('exit', this.projectCreated.bind(this, ''));
        worker.send(['create', dir, [name]]);
    },

    projectCreated: function(dir, err) {
        this.hideLoader();

        if (err) console.error(err);
        else {
            console.log('Project created at ' + dir);
            this.loadProject(dir);
        }
    },

    showLoader: function() {
        this.loading = true;
        $('#loader').show();
    },

    hideLoader: function() {
        this.loading = false;
        $('#loader').hide();
    }
};

$(function() {
    editor.init();
});

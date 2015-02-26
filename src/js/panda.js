// TODO
// Remove module
// Add module global code (assets etc)

var editor = {
    info: require('./package.json'),
    fork: require('child_process').fork,
    gui: require('nw.gui'),
    fs: require('fs'),
    esprima: require('esprima'),
    settings: {
        fontSize: 16
    },

    init: function() {
        // Tab resize
        $('.tab .resize').mousedown(this.resizeDown.bind(this));
        $(window).mousemove(this.resizeMove.bind(this));
        $(window).mouseup(this.resizeUp.bind(this));

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

    initEditor: function() {
        console.log('Loading editor...');

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
            name: 'toggleModules',
            bindKey: { mac: 'Ctrl-Tab', win: 'Ctrl-Tab' },
            exec: this.toggleModules.bind(this)
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
            bindKey: { mac: 'Cmd-=', win: 'Ctrl-=' },
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

        this.editor.focus();
    },

    initMenu: function() {
        console.log('Loading menu...');

        var menubar = new this.gui.Menu({ type: 'menubar' });
        menubar.createMacBuiltin(this.info.description);

        // Project menu
        var project = new this.gui.Menu();
        project.append(new this.gui.MenuItem({ label: 'Build project', click: this.buildProject.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Create new project', click: this.createProject.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Update engine', click: this.updateEngine.bind(this) }));
        
        // Help menu
        var help = new this.gui.Menu();
        help.append(new this.gui.MenuItem({ label: 'About' }));
        
        menubar.insert(new this.gui.MenuItem({ label: 'Project', submenu: project }), 1);
        menubar.append(new this.gui.MenuItem({ label: 'Help', submenu: help }));

        this.window.menu = menubar;
    },

    updateEngine: function() {
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
        if (!this.currentModule || !this.currentClass) return;

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
        $('#modules').toggle();
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

        // Sort classes
        for (var module in this.modules) {
            this.modules[module].classes = this.ksort(this.modules[module].classes);
        }

        $('#modules .content .list').html('');
        for (var name in this.modules) {
            var div = document.createElement('div');
            $(div).addClass('module');
            $(div).html(name.substr(5));
            $(div).click(this.editClass.bind(this, 'global', name));
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

    changeFontSize: function(amount) {
        this.currentFontSize += amount;
        if (this.currentFontSize < 14) this.currentFontSize = 14;
        if (this.currentFontSize > 23) this.currentFontSize = 23;
        
        $('#editor').css('font-size', this.currentFontSize + 'px');
        $('#modules').css('font-size', this.currentFontSize + 'px');
        $('#modules').css('line-height', (this.currentFontSize + 8) + 'px');
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
        if (this.currentModule && !this.currentClass) {
            if (this.editor.getSession().getValue() !== '') {
                var wantSave = confirm('Save changes to new class?');
                if (wantSave) return this.saveChanges();    
            }
        }
        if (this.currentClass === name && this.currentModule === module) return;

        var classObj = this.getCurrentClassObject();
        if (classObj) $(classObj.div).removeClass('current');

        this.currentModule = module;
        this.currentClass = name;
        var classObj = this.getCurrentClassObject();
        $(classObj.div).addClass('current');

        this.editor.setSession(classObj.session);
        this.editor.focus();

        this.saveCurrentState();
    },

    buildProject: function() {
        if (!this.currentProject) return;
        if (this._building) return;
        this._building = true;

        var sure = confirm('Build project?');
        if (!sure) return;

        console.log('Building project...');

        var worker = this.fork('js/worker.js', { execPath: './node' });
        worker.on('message', this.buildComplete.bind(this));
        worker.on('exit', this.buildComplete.bind(this));
        worker.send(['build', this.currentProject]);
    },

    buildComplete: function(err) {
        this._building = false;
        
        if (err) console.log('Error: ' + err);
        else console.log('Build completed');
    },

    loadLastProject: function() {
        var lastProject = this.getStorage('lastProject', true);
        if (lastProject) this.loadProject(lastProject);
    },

    loadProject: function(dir) {
        if (!dir) return;

        if (this.currentProject) {
            var sure = confirm('Load new project?');
            if (!sure) return;
        }

        console.log('Loading project ' + dir);

        console.log('Loading config...');

        try {
            require(dir + '/src/game/config.js');   
        }
        catch(e) {
            return console.log('Config not found');
        }

        this.currentClass = this.currentModule = null;
        this.currentProject = dir;
        this.setStorage('lastProject', this.currentProject, true);
        this.modules = {};
        this.modules['game.main'] = {};
        
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
        if (err) return console.log('Module ' + name + ' not found');

        var requires = 0;

        this.modules[name].data = data;
        this.modules[name].requires = [];
        var session = ace.createEditSession('', 'ace/mode/javascript');
        this.modules[name].session = session;

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

                    this.newClassObject(className, name, strData);
                }
            }

            this.getClassesFromModule();
            return;
        }

        this.updateModuleList();

        var lastClass = this.getStorage('lastClass');
        var lastModule = this.getStorage('lastModule');
        if (this.modules[lastModule] && this.modules[lastModule].classes[lastClass]) {
            this.editClass(lastClass, lastModule);
        }
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
        if (!this.currentClass || !this.currentModule) return false;
        if (this.currentClass === 'global') return this.modules[this.currentModule];
        return this.modules[this.currentModule].classes[this.currentClass];
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
        else if (!hasUndo && classObj.changed) {
            // classObj.changed = false;
            // $(classObj.div).html(classObj.name);
            // $(classObj.div).removeClass('changed');   
        }
        return;

        if (this.currentClass) {
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

                this.modules[module].changed = false;

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

    createProject: function() {
        if (this._creating) return;
        this._creating = true;
        
        var name = prompt('Project name:');
        if (!name) {
            this._creating = false;
            return;
        }

        console.log('Creating new project...');

        var dir = '/Users/eemelikelokorpi/Sites/temp/';

        var worker = this.fork('js/worker.js', { execPath: './node' });
        worker.on('message', this.projectCreated.bind(this, dir + name));
        worker.on('exit', this.projectCreated.bind(this, ''));
        worker.send(['create', dir, [name]]);
    },

    projectCreated: function(dir, err) {
        this._creating = false;

        if (err) console.log(err);
        else {
            console.log('Project created at: ' + dir);
            this.loadProject(dir);
        }
    }
};

$(function() {
    editor.init();
});

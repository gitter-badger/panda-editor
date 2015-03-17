// TODO
// Add/remove module
// Asset subfolders
// Loading audio files

var editor = {
    info: require('./package.json'),
    child_process: require('child_process'),
    gui: require('nw.gui'),
    fs: require('fs'),
    opener: require('opener'),
    plugins: [],

    init: function() {
        console.warn('Panda Editor ' + this.info.version);

        this.storage = new this.Storage();
        this.preferences = new this.Preferences();
        this.projects = new this.Projects();
        this.initEvents();
        this.contextMenu = new this.ContextMenu();
        this.errorHandler = new this.ErrorHandler();
        this.assets = new this.Assets();
        this.audio = new this.Audio();
        this.initWindow();
        this.menu = new this.Menu();

        // this.loadLastProject();
        this.showTab('projects');
    },

    initEvents: function() {
        $('#menu .item').click(this.menuClick.bind(this));
        $('button').click(this.buttonClick.bind(this));
        window.addEventListener('resize', this.onResize.bind(this));
        window.ondragover = this.dragover.bind(this);
        window.ondragleave = this.dragleave.bind(this);
        window.ondrop = this.filedrop.bind(this);
    },

    savePreferences: function() {
        this.preferences.save();
        this.preferences.apply();
    },

    openProjectFolder: function(dir) {
        this.opener(dir);
    },

    initWindow: function() {
        this.window = this.gui.Window.get();
        this.window.on('close', function() {
            var sure = confirm('Do you want to close editor?');
            if (sure) this.close(true);
        });
        this.window.show();
    },

    buttonClick: function(event) {
        var target = $(event.currentTarget).attr('href');
        if (typeof this[target] === 'function') this[target]();
    },

    setStartScene: function(name) {
        name = name.replace('Scene', '');
        name = this.stripClassName(name);
        if (!name) return;
        if (this.project.config.data.system.startScene === name) {
            console.error('Scene is already start scene');
            return;
        }

        $('#projectStartScene').val(name);
        this.project.config.save();
    },

    changeScene: function(name) {
        name = name || '';
        name = name.replace('Scene', '');
        name = this.stripClassName(name);
        this.server.emit('changeScene', name);
    },

    onProjectLoaded: function() {
        this.project = this.projects.current;
        if (!this.editor) this.initEditor();
        this.initServer();

        this.showTab('modules');
    },

    menuClick: function(event) {
        if ($(event.currentTarget).hasClass('disabled')) return;

        var target = $(event.currentTarget).attr('data-target');
        this.showTab(target);
    },

    initEditor: function() {
        console.log('Initializing editor');

        this.editor = ace.edit('editor');
        this.editor.setTheme('ace/theme/' + this.preferences.data.theme);
        this.editor.getSession().setMode('ace/mode/javascript');
        this.editor.$blockScrolling = Infinity;
        
        this.editor.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
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
            name: 'reloadAll',
            bindKey: { mac: 'Cmd-Shift-R', win: 'Ctrl-Shift-R' },
            exec: this.reloadAll.bind(this)
        });
        this.editor.commands.addCommand({
            name: 'changeScene',
            bindKey: { mac: 'Cmd-R', win: 'Ctrl-R' },
            exec: this.changeScene.bind(this)
        });
        this.editor.commands.addCommand({
            name: 'toggleTabs',
            bindKey: { mac: 'Ctrl-Tab', win: 'Ctrl-Tab' },
            exec: this.toggleCurrentTab.bind(this)
        });

        this.editor.focus();
        this.onResize();
    },

    saveChanges: function() {
        if (this.project) this.project.save();
    },

    toggleCurrentTab: function() {
        var current = $('#menu .item.current').attr('data-target');
        if (!current) return;

        $('#' + current).toggle();

        this.onResize();
    },

    reloadAll: function() {
        console.log('Reloaded all devices');
        $('#devices .list').html('');
        this.server.devices.length = 0;
        this.server.emit('reloadGame');
    },

    showTab: function(tab) {
        $('.item.current').removeClass('current');
        $('.item[data-target="' + tab + '"]').addClass('current');

        $('.tab').hide();
        $('#' + tab).show();
        this.onResize();

        if (this.editor) this.editor.focus();
    },

    openBrowser: function() {
        if (!this.project) return;
        this.gui.Shell.openExternal('http://localhost:' + this.preferences.data.port + '/dev.html?' + Date.now());
    },

    updateEngine: function() {
        if (!this.project) return;

        var sure = confirm('Update engine to latest version?');
        if (!sure) return;

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
        for (var className in this.project.modules[inModule].classes) {
            if (className === beforeClass) return lastClass;
            lastClass = className;
        }
        if (!beforeClass) return className;
        return false;
    },

    getPrevModule: function(forModule) {
        var prevModule = false;
        for (var module in this.project.modules) {
            if (module === forModule) return prevModule;
            prevModule = module;
        }
        return false;
    },

    editNextClass: function() {
        if (!this.currentModule) {
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
        for (var className in this.project.modules[inModule].classes) {
            if (!afterClass) return className;
            if (classFound) return className;
            if (className === afterClass) classFound = true;
        }
        return false;
    },

    getNextModule: function(forModule) {
        var moduleFound = false;
        for (var module in this.project.modules) {
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
            this.projects.load(path);
        }
        else {
            this.assets.copy(event.dataTransfer.files);
            this.audio.copy(event.dataTransfer.files);
        }
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
        editorWidth -= $('#menu').outerWidth(true);

        $('#editor').width(editorWidth);

        if (this.editor) this.editor.resize();
    },

    ksort: function(obj) {
        if (!obj || typeof obj !== 'object') return false;

        var keys = [], result = {}, i;
        for (i in obj) {
            keys.push(i);
        }
        
        keys.sort();
        for (i = 0; i < keys.length; i++) {
            result[keys[i]] = obj[keys[i]];
        }

        return result;
    },

    foldModule: function(div) {
        if ($(div).hasClass('folded')) {
            $(div).nextUntil('div.module').show();
            $(div).removeClass('folded');
        }
        else {
            $(div).nextUntil('div.module').hide();
            $(div).addClass('folded');
        }
    },

    removeAsset: function(filename, div) {
        this.assets.remove(filename, div);
    },

    getClassName: function(className, extend) {
        if (extend !== 'Class' && extend !== 'Scene') {
            return extend + ' > ' + className;
        }
        return className;
    },

    renameClass: function(className) {
        var newName = prompt('New class name for ' + className + ':', className);
        newName = this.stripClassName(newName);
        if (!newName) {
            console.error('Invalid class name');
            return;
        }

        var classObj = this.getClassObjectForClassName(newName);
        if (classObj) {
            console.error('Class name already used');
            return;
        }

        var module = this.getModuleObjectForClassName(className);
        module.classes[newName] = module.classes[className];
        module.classes[newName].name = newName;
        delete module.classes[className];

        if (this.currentClass === className) this.currentClass = newName;

        // Update extends for new class name
        for (var _class in module.classes) {
            var classObj = module.classes[_class];
            if (classObj.extend === className) classObj.extend = newName;
        }

        this.sortClasses(module);

        module.changed = true;
        this.saveChanges();
        this.project.updateModuleList();
    },

    stripClassName: function(className) {
        if (!className) return;
        className = className.replace(/[\s\W]/g, '');
        className = className.substr(0, 16); // Max length
        return className;
    },

    changeFontSize: function(amount) {
        this.setFontSize(this.currentFontSize + amount);
        this.preferences.save();
    },

    setFontSize: function(size) {
        if (size < 14) size = 14;
        if (size > 23) size = 23;
        
        $('#editor').css('font-size', size + 'px');
        $('#preferences #fontSize').val(size);

        this.currentFontSize = size;
    },

    newModule: function() {
        var moduleName = prompt('New module name:');
        moduleName = this.stripClassName(moduleName);
        if (!moduleName) return;
        moduleName = 'game.' + moduleName;
        if (this.project.modules[moduleName]) return;

        this.project.modules[moduleName] = {
            classes: {},
            requires: []
        };

        this.project.modules['game.main'].requires.push(moduleName);
        this.project.modules['game.main'].changed = true; // Force save

        this.project.updateModuleList();

        this.currentModule = moduleName;
        this.newClass();
    },

    duplicateClass: function(className) {
        var classObj = this.getClassObjectForClassName(className);

        className = className.replace(/\d/g, '');

        var sameFound = 1;
        for (var module in this.project.modules) {
            for (var _class in this.project.modules[module].classes) {
                var name = _class.replace(/\d/g, '');
                if (name === className) sameFound++;
            }
        }

        className = className + sameFound;

        this.newClass(this.currentModule, className, classObj.session.getValue());
    },

    newClass: function(module, className, data) {
        module = module || this.currentModule;
        if (!module) return;

        if (typeof className !== 'string') className = prompt('New class name:');
        className = this.stripClassName(className);
        if (!className) {
            console.error('Invalid class name');
            return;
        }

        var classExists = this.getClassObjectForClassName(className);
        if (classExists) {
            console.error('Class already exists');
            return;
        }

        var classObj = this.getCurrentClassObject();
        if (classObj) $(classObj.div).removeClass('current');

        this.currentModule = module;

        console.log('Saving new class ' + className);

        var classObj = this.newClassObject(className, this.currentModule, data || '{\n    init: function() {\n    }\n}');
        this.project.modules[this.currentModule].classes[className] = classObj;

        this.editClass(className, this.currentModule);
        this.project.updateModuleList();

        this.project.modules[this.currentModule].changed = true;
        this.saveChanges();

        this.editor.gotoLine(2);
        this.editor.navigateLineEnd();
        this.editor.focus();
    },

    getModuleObjectForClassName: function(forClass) {
        for (var module in this.project.modules) {
            for (var className in this.project.modules[module].classes) {
                if (className === forClass) return this.project.modules[module];
            }
        }
    },

    getModuleNameForClassName: function(forClass) {
        for (var module in this.project.modules) {
            for (var className in this.project.modules[module].classes) {
                if (className === forClass) return module;
            }
        }
    },

    getClassObjectForClassName: function(className) {
        var module = this.getModuleObjectForClassName(className);
        if (!module) return;
        return module.classes[className];
    },

    extendClass: function(toClass) {
        var fromClass = this.currentClass;
        if (!fromClass) return;

        var classObj = this.getClassObjectForClassName(fromClass);
        if (!classObj) return;

        var toClassObj = this.getClassObjectForClassName(toClass);
        if (toClassObj.extend === 'Scene') {
            this.changeScene(toClass);
            return;
        }

        if (classObj.extend === 'Scene') {
            console.error('Can not extend from Scene');
            return;
        }

        var fromModule = this.getModuleObjectForClassName(fromClass);
        var toModule = this.getModuleObjectForClassName(toClass);
        if (fromModule !== toModule) return;
        if (fromClass === toClass) toClass = 'Class';
        if (classObj.extend === toClass) return;

        // Check that class is not extending to itself
        var parent = fromModule.classes[toClass];
        var extendToItself = false;
        while (parent) {
            if (parent.extend === classObj.name) {
                console.error('Can not extend to itself');
                extendToItself = true;
                break;
            }
            parent = fromModule.classes[parent.extend];
        }
        if (extendToItself) return;

        classObj.extend = toClass;
        var className = this.getClassName(classObj.name, classObj.extend);
        $(classObj.div).html(className);

        this.sortClasses(fromModule);

        fromModule.changed = true;
        this.saveChanges();
        this.project.updateModuleList();
    },

    sortClasses: function(module) {
        var classes = [];
        for (var className in module.classes) {
            classes.push(module.classes[className]);
        }

        module.classes = {};
        while (classes.length > 0) {
            var nextClass = classes.shift();

            // Check if class is extended
            if (nextClass.extend === 'Class' || nextClass.extend === 'Scene') {
                // Not extended
                module.classes[nextClass.name] = nextClass;
                continue;
            }

            // If extended, check if extended class already added
            var classAdded = false;
            for (var className in module.classes) {
                if (nextClass.extend === className) {
                    // Already added, put class to next in list and continue
                    module.classes[nextClass.name] = nextClass;
                    classAdded = true;
                    continue;
                }
            }
            if (classAdded) continue;

            // Extended class not added yet, put class back to end of array
            classes.push(nextClass);
        }
    },

    insertClassToEditor: function(name) {
        if (name.indexOf('Scene') === 0) {
            this.editor.insert('game.system.setScene(\'' + name.replace('Scene', '') + '\');');
        }
        else {
            this.editor.insert('new game.' + name + '();');
            var curPos = this.editor.getCursorPosition();
            this.editor.gotoLine(curPos.row + 1, curPos.column - 2);
        }

        this.editor.focus();
    },

    editClass: function(name, module, event) {
        if (event && event.altKey) return this.insertClassToEditor(name);
        if (event && event.shiftKey && this.currentClass) return this.extendClass(name);
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
        if (!this.project.dir) return;
        if (this.loading) return;

        var sure = confirm('Build project?');
        if (!sure) return;

        this.showLoader();
        console.log('Building project');

        var worker = this.child_process.fork('js/worker.js');
        worker.on('message', this.buildComplete.bind(this));
        worker.on('exit', this.buildComplete.bind(this));
        worker.send(['build', this.project.dir]);
    },

    buildComplete: function(err) {
        this.hideLoader();
        
        if (err) console.error(err);
        else console.log('Build completed');
    },

    addPlugin: function(file) {
        var name = file.split('.')[0];

        var div = document.createElement('div');
        $(div).html(name);
        $(div).click(this.removePlugin.bind(this, div, name));
        $(div).appendTo($('#plugins .content .list'));

        this.plugins.push(name);
        $('#plugins .header').html('Plugins (' + this.plugins.length + ')');
    },

    removeProject: function(dir, div) {
        this.projects.remove(dir, div);
    },

    removePlugin: function(div, name) {
        var sure = confirm('Remove plugin ' + name + '?');
        if (!sure) return;

        $(div).remove();

        var index = this.plugins.indexOf(name);
        this.plugins.splice(index, 1);
        $('#plugins .header').html('Plugins (' + this.plugins.length + ')');

        console.log('TODO');
    },

    initServer: function() {
        if (this.server) this.server.update();
        else this.server = new this.Server(this);
    },

    newClassObject: function(className, module, data, extend) {
        var session = ace.createEditSession(data, 'ace/mode/javascript');
        if (className.indexOf('Scene') === 0) extend = 'Scene';
        var classObj = {
            name: className,
            session: session,
            extend: extend || 'Class',
            errors: {}
        };
        session.on('change', this.onChange.bind(this, classObj));

        return classObj;
    },

    getCurrentClassObject: function() {
        if (!this.currentClass && !this.currentModule) return false;
        if (!this.currentClass) return this.project.modules[this.currentModule];
        return this.project.modules[this.currentModule].classes[this.currentClass];
    },

    onChange: function(classObj, event) {
        var hasUndo = classObj.session.getUndoManager().hasUndo();
        
        // FIXME why hasUndo is false, when inserting text?
        if (event.data.action === 'insertText' || event.data.action === 'removeText') {
            hasUndo = true;
            this.errorHandler.clear(classObj.name);
        }

        if (hasUndo && !classObj.changed) {
            classObj.changed = true;
            $(classObj.div).addClass('changed');
        }
    },

    saveCurrentState: function() {
        this.storage.set('lastClass', this.currentClass, true);
        this.storage.set('lastModule', this.currentModule, true);
    },

    removeClass: function(className) {
        var sure = confirm('Remove class ' + className + '?');
        if (!sure) return;

        if (this.project.config.startScene === className.replace('Scene', '')) {
            return console.error('Can not remove start scene');
        }

        var classObj = this.getClassObjectForClassName(className);
        classObj.changed = true;
        classObj.session.setValue('');
        this.editPrevClass();
        this.saveChanges();
        this.project.updateModuleList();
    },

    openFolder: function(callback) {
        var input = document.createElement('input');
        input.type = 'file';
        input.nwdirectory = true;
        input.click();
        input.onchange = function() {
            callback(input.value);
        };
    },

    createProject: function(dir) {
        if (this.loading) return;
        
        if (this.project && !dir) {
            var sure = confirm('Create new project? (Changes will be lost)');
            if (!sure) return;
        }

        if (!dir) return this.openFolder(this.createProject.bind(this));

        var folder = prompt('Project folder:');
        folder = this.stripClassName(folder);
        if (!folder) {
            console.error('Invalid project folder');
            return;
        }

        this.showLoader(true);

        console.log('Creating new project ' + dir + '/' + folder);

        var worker = this.child_process.fork('js/worker.js');
        worker.on('message', this.projectCreated.bind(this, dir + '/' + folder));
        worker.on('exit', this.projectCreated.bind(this, ''));
        var params = [folder];
        if (this.preferences.data.develop) params.push('dev');
        worker.send(['create', dir, params]);
    },

    saveConfig: function() {
        this.project.config.save();
    },

    projectCreated: function(dir, err) {
        this.hideLoader();

        if (err) {
            console.error(err);
        }
        else {
            console.log('Created project ' + dir);
            this.projects.current = {};
            this.loadProject(dir);
        }
    },

    loadProject: function(dir) {
        this.projects.load(dir);
    },

    showLoader: function(hideAll) {
        this.loading = true;
        $('#loader').show();

        if (hideAll) {
            $('#editor').hide();
            $('.tab').hide();
            $('#menu .item.current').removeClass('current');
            $('#menu .item').addClass('disabled');
        }
    },

    hideLoader: function() {
        this.loading = false;
        $('#loader').hide();
    },

    disconnectAll: function() {
        this.server.disconnectAll();
    }
};

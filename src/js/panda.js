// TODO
// Add/remove module
// Asset subfolders
// Asset id's
// Adding spritesheet json (copy png also)
// Adding audio files

// BUGS
// If rename class while other class has changed,
// it's title changes back to normal (without *)

var editor = {
    info: require('./package.json'),
    fork: require('child_process').fork,
    gui: require('nw.gui'),
    fs: require('fs'),
    esprima: require('esprima'),
    express: require('express'),

    devices: [],
    assets: {},
    assetCount: 0,
    assetTypes: [
        'image/png',
        'image/jpeg',
        'application/json',
        'audio/x-m4a',
        'audio/ogg'
    ],
    plugins: [],
    contextMenus: {},
    ipAddresses: [],
    prevSettings: {},
    assetsToCopy: [],
    projects: {},

    // Default settings
    settings: {
        fontSize: 16,
        port: 3000,
        theme: 'sunburst'
    },

    init: function() {
        this.initPreferences();
        this.initProjects();
        this.initEvents();
        this.initContextMenus();
        // this.initEditor();
        this.initWindow();

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
        $(document).bind('contextmenu', this.showContextMenu.bind(this));
    },

    initWindow: function() {
        this.window = this.gui.Window.get();
        this.window.on('close', function() {
            var sure = confirm('Do you want to close editor?');
            if (sure) this.close(true);
        });
        
        this.initMenu();

        this.window.show();
    },

    initContextMenus: function() {
        this.newContextMenu('class');
        this.addContextMenuItem('class', 'Extend', 'extendClass');
        this.addContextMenuItem('class', 'Rename', 'renameClass');
        this.addContextMenuItem('class', 'Duplicate', 'duplicateClass');
        this.addContextMenuItem('class', 'Remove', 'removeClass');

        this.newContextMenu('scene');
        this.addContextMenuItem('scene', 'Change scene', 'changeScene');
        this.addContextMenuItem('scene', 'Set start scene', 'setStartScene');
        this.addContextMenuItem('scene', 'Rename', 'renameClass');
        this.addContextMenuItem('scene', 'Remove', 'removeClass');

        this.newContextMenu('asset');
        this.addContextMenuItem('asset', 'Remove', 'removeAsset');

        this.newContextMenu('module');
        this.addContextMenuItem('module', 'New class', 'newClass');

        this.newContextMenu('project');
        this.addContextMenuItem('project', 'Remove', 'removeProject');
    },

    newContextMenu: function(name) {
        this.contextMenus[name] = new this.gui.Menu();
    },

    addContextMenuItem: function(menu, label, command) {
        var item = new this.gui.MenuItem({ label: label, click: this.contextMenuClick.bind(this, command) });
        this.contextMenus[menu].append(item);
    },

    contextMenuClick: function(command) {
        if (!this.contextMenuTargetName) return;
        if (typeof this[command] !== 'function') return;

        this[command](this.contextMenuTargetName, this.contextMenuTargetDiv);
    },

    showContextMenu: function(event) {
        var target = event.target;
        var targetClass = $(target).attr('class').split(' ')[0];
        this.contextMenuTargetDiv = target;
        this.contextMenuTargetName = $(target).attr('data-name');

        if (targetClass === 'class' && this.contextMenuTargetName.indexOf('Scene') === 0) targetClass = 'scene';

        if (this.contextMenus[targetClass]) this.contextMenus[targetClass].popup(event.originalEvent.x, event.originalEvent.y);
    },

    buttonClick: function(event) {
        var target = $(event.currentTarget).attr('href');
        if (typeof this[target] === 'function') this[target]();
    },

    resetPreferences: function() {
        localStorage.setItem('preferences', null);
    },

    setStartScene: function(name) {
        name = name.replace('Scene', '');
        if (this.config.system.startScene === name) return;

        $('#projectStartScene').val(name);
        this.saveConfig(true);
    },

    changeScene: function(name) {
        name = name || '';
        name = name.replace('Scene', '');
        console.log('Emit changeScene ' + name);
        this.io.emit('command', 'changeScene', name);
    },

    updateProjectInfo: function() {
        var project = this.projects[this.currentProject];
        if (!project) return;

        project.name = this.config.name;
        project.version = this.config.version;

        this.window.title = this.info.description + ' - ' + project.name + ' ' + project.version;
        $(project.div).html(project.name + ' ' + project.version);

        this.saveProjects();
    },

    addProject: function(project) {
        var div = document.createElement('div');
        $(div).addClass('project');
        $(div).html(project.name + ' ' + project.version);
        $(div).click(this.loadProject.bind(this, project.dir));
        $(div).attr('data-name', project.dir);
        $(div).appendTo($('#projects .list'));
        if (this.currentProject === project.dir) $(div).addClass('current');
        project.div = div;
        this.projects[project.dir] = project;
    },

    removeProject: function(dir, div) {
        var name = $(div).html();
        var sure = confirm('Remove project ' + name + ' from list?');
        if (!sure) return;

        delete this.projects[dir];
        $(div).remove();
        this.saveProjects();
        console.log('Removed project ' + dir);
    },

    initProjects: function() {
        var projects = JSON.parse(localStorage.getItem('projects'));

        for (var i = 0; i < projects.length; i++) {
            this.addProject(projects[i]);
        }
    },

    resetProjects: function() {
        localStorage.setItem('projects', null);
    },

    saveProjects: function() {
        var projects = [];
        for (var project in this.projects) {
            projects.push({
                name: this.projects[project].name,
                dir: this.projects[project].dir,
                version: this.projects[project].version
            });
        }
        localStorage.setItem('projects', JSON.stringify(projects));
    },

    initPreferences: function() {
        // Load saved preferences
        var savedSettings = JSON.parse(localStorage.getItem('preferences'));
        for (var name in savedSettings) {
            this.settings[name] = savedSettings[name];
        }
        this.prevSettings = this.settings;

        for (var name in this.settings) {
            var label = document.createElement('label');
            $(label).addClass('ace_keyword');
            $(label).html(name);
            label.for = name;

            var input = document.createElement('input');
            input.type = 'text';
            input.id = name;
            input.value = this.settings[name];
            
            $(label).appendTo($('#preferences .content .list'));
            $(input).appendTo($('#preferences .content .list'));
        }

        this.applyPreferences(true);
    },

    applyPreferences: function(dontSave) {
        if (!dontSave) this.savePreferences();

        if (this.editor) this.editor.setTheme('ace/theme/' + this.settings.theme);
        document.body.className = 'ace-' + this.settings.theme.replace(/\_/g, '-');

        this.setFontSize(parseInt(this.settings.fontSize));

        if (this.prevSettings.port !== this.settings.port && this.http) this.restartServer();
    },

    savePreferences: function() {
        console.log('Saving preferences');

        this.prevSettings = this.settings;
        var settings = {};
        $('#preferences input').each(function(index, elem) {
            var id = $(elem).attr('id');
            var value = $(elem).val();
            settings[id] = value;
        });
        this.settings = settings;
        localStorage.setItem('preferences', JSON.stringify(this.settings));
    },

    menuClick: function(event) {
        if ($(event.currentTarget).hasClass('disabled')) return;

        var target = $(event.currentTarget).attr('data-target');
        this.showTab(target);
    },

    initEditor: function() {
        console.log('Initializing editor');

        require('ace/config').setDefaultValue('session', 'useWorker', false);

        this.editor = ace.edit('editor');
        this.editor.setTheme('ace/theme/' + this.settings.theme);
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
            name: 'reloadGame',
            bindKey: { mac: 'Cmd-Shift-R', win: 'Ctrl-Shift-R' },
            exec: this.reloadGame.bind(this)
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

    toggleCurrentTab: function() {
        var current = $('#menu .item.current').attr('data-target');
        if (!current) return;

        $('#' + current).toggle();

        this.onResize();
    },

    reloadGame: function() {
        if (!this.io) return;

        for (var i = 0; i < this.devices.length; i++) {
            $(this.devices[i].div).remove();
        }
        this.devices.length = 0;
        this.io.emit('command', 'reloadGame');
    },

    initMenu: function() {
        console.log('Initializing menu');

        var menubar = new this.gui.Menu({ type: 'menubar' });
        menubar.createMacBuiltin(this.info.description);

        // Project menu
        var project = new this.gui.Menu();
        project.append(new this.gui.MenuItem({ label: 'Create new project', click: this.createProject.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Open in browser', click: this.openBrowser.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Build project', click: this.buildProject.bind(this) }));
        project.append(new this.gui.MenuItem({ label: 'Update engine', click: this.updateEngine.bind(this) }));
        
        // Help menu
        var help = new this.gui.Menu();
        help.append(new this.gui.MenuItem({ label: 'Report issue' }));
        help.append(new this.gui.MenuItem({ label: 'Homepage' }));
        help.append(new this.gui.MenuItem({ label: 'Tutorials' }));
        
        menubar.insert(new this.gui.MenuItem({ label: 'Project', submenu: project }), 1);
        menubar.append(new this.gui.MenuItem({ label: 'Help', submenu: help }));

        this.window.menu = menubar;
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
        if (!this.currentProject) return;

        this.gui.Shell.openExternal('http://localhost:' + this.settings.port + '/dev.html?' + Date.now());
    },

    updateEngine: function() {
        if (!this.currentProject) return;

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
        else {
            this.assetsToCopy.length = 0;

            for (var i = 0; i < event.dataTransfer.files.length; i++) {
                var file = event.dataTransfer.files[i];
                // console.log(file.type);
                if (this.assetTypes.indexOf(file.type) !== -1) {
                    this.assetsToCopy.push(file);
                }
            }

            if (this.assetsToCopy.length > 0) this.copyAssets();
        }
    },

    copyAssets: function() {
        var file = this.assetsToCopy.pop();
        if (!file) {
            this.modules['game.assets'].changed = true;
            this.saveChanges();
            return;
        }

        console.log('Copying asset ' + file.path);
        this.copyFile(file.path, this.currentProject + '/media/' + file.name, this.assetCopied.bind(this, file.name));
    },

    assetCopied: function(filename) {
        this.addAsset(filename);
        this.copyAssets();
    },

    copyFile: function(source, target, cb) {
        var cbCalled = false;

        var rd = this.fs.createReadStream(source);
        rd.on("error", function(err) {
            done(err);
        });
        var wr = this.fs.createWriteStream(target);
        wr.on("error", function(err) {
            done(err);
        });
        wr.on("close", function(ex) {
            done();
        });
        rd.pipe(wr);

        function done(err) {
            if (!cbCalled) {
                cb(err);
                cbCalled = true;
            }
        }
    },

    assetCopied: function(filename, err) {
        if (err) return console.log('Error copying asset');
        this.addAsset(filename);
        this.copyAssets();
    },

    addAsset: function(filename, id) {
        if (filename.indexOf('.') === 0) return;
        if (filename === 'Thumbs.db') return;
        if (this.assets[filename]) return;

        id = id || filename;
        this.assets[filename] = id;
        this.assetCount++;

        $('#assets .header').html('Assets (' + this.assetCount + ')');

        var div = document.createElement('div');
        $(div).html(id);
        $(div).click(this.clickAsset.bind(this, filename, div));
        $(div).addClass('asset');
        $(div).attr('data-name', filename);
        $(div).appendTo($('#assets .content .list'));
    },

    clickAsset: function(filename, div, event) {
        if (event.altKey) {
            this.editor.insert('\'' + this.assets[filename] + '\'');
            this.editor.focus();
            return;
        }
        else if (event.shiftKey) {
            newId = filename;
        }
        else {
            var newId = prompt('New id for asset ' + filename, this.assets[filename]);
            newId = this.stripClassName(newId);
            if (!newId) return console.log('Invalid asset id');
        }

        this.assets[filename] = newId;
        $(div).html(newId);

        this.modules['game.assets'].changed = true;
        this.saveChanges();
    },

    removeAsset: function(filename, div) {
        var sure = confirm('Remove asset ' + filename + '? (File will be deleted)');
        if (!sure) return;

        delete this.assets[filename];
        $(div).remove();
        this.fs.unlink(this.currentProject + '/media/' + filename, function(err) {
            if (err) console.log(err);
        });
        this.assetCount--;
        $('#assets .header').html('Assets (' + this.assetCount + ')');

        this.modules['game.assets'].changed = true;
        this.saveChanges();
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

    updateModuleList: function() {
        // Sort modules
        this.modules = this.ksort(this.modules);

        // Sort classes
        for (var module in this.modules) {
            // this.modules[module].classes = this.ksort(this.modules[module].classes);
        }

        $('#modules .content .list').html('');

        var classCount = 0;
        for (var name in this.modules) {
            if (name === 'game.assets') continue;
            if (name === 'game.main') continue;
            var div = document.createElement('div');
            $(div).addClass('module');
            $(div).addClass('ace_string');
            $(div).attr('data-name', name);
            $(div).html(name.substr(5));
            $(div).appendTo($('#modules .content .list'));
            $(div).click(this.foldModule.bind(this, div));

            this.modules[name].div = div;

            var button = document.createElement('button');
            $(button).html('+');
            $(button).click(this.newClass.bind(this, name));
            $(button).appendTo(div);

            for (var className in this.modules[name].classes) {
                classCount++;
                var classObj = this.modules[name].classes[className];
                var div = document.createElement('div');
                $(div).addClass('class');
                $(div).html(this.getClassName(className, classObj.extend));
                $(div).appendTo($('#modules .content .list'));
                $(div).attr('data-name', className);
                $(div).click(this.editClass.bind(this, className, name));

                this.modules[name].classes[className].div = div;

                if (this.currentClass === className) {
                    $(div).addClass('current');
                }
            }
        }

        $('#modules .header').html('Classes (' + classCount + ')');
    },

    getClassName: function(className, extend) {
        if (extend !== 'Class' && extend !== 'Scene') {
            return extend + ' > ' + className;
        }
        if (extend === 'Scene' || className.indexOf('Scene') === 0) {
            // return className.replace('Scene', '');
        }
        return className;
    },

    renameClass: function(className) {
        var newName = prompt('New class name for ' + className + ':', className);
        newName = this.stripClassName(newName);
        if (!newName) {
            console.log('Invalid class name');
            return;
        }

        var classObj = this.getClassObjectForClassName(newName);
        if (classObj) {
            console.log('Class name already used');
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
        this.updateModuleList();
    },

    stripClassName: function(className) {
        if (!className) return;
        className = className.replace(/[\s\W]/g, '');
        className = className.substr(0, 16); // Max length
        return className;
    },

    changeFontSize: function(amount) {
        this.setFontSize(this.currentFontSize + amount);
        this.savePreferences();
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

    duplicateClass: function(className) {
        var classObj = this.getClassObjectForClassName(className);

        className = className.replace(/\d/g, '');

        var sameFound = 1;
        for (var module in this.modules) {
            for (var _class in this.modules[module].classes) {
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
            console.log('Invalid class name');
            return;
        }

        var classExists = this.getClassObjectForClassName(className);
        if (classExists) {
            console.log('Class already exists');
            return;
        }

        var classObj = this.getCurrentClassObject();
        if (classObj) $(classObj.div).removeClass('current');

        this.currentModule = module;

        console.log('Saving new class ' + className);

        var classObj = this.newClassObject(className, this.currentModule, data || '{\n    init: function() {\n    }\n}');

        this.editClass(className, this.currentModule);
        this.updateModuleList();

        this.modules[this.currentModule].changed = true;
        this.saveChanges();

        this.editor.gotoLine(2);
        this.editor.navigateLineEnd();
        this.editor.focus();
    },

    getModuleObjectForClassName: function(forClass) {
        for (var module in this.modules) {
            for (var className in this.modules[module].classes) {
                if (className === forClass) return this.modules[module];
            }
        }
    },

    getModuleNameForClassName: function(forClass) {
        for (var module in this.modules) {
            for (var className in this.modules[module].classes) {
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
            console.log('Can not extend from Scene');
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
                console.log('Class extending to itself');
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
        this.updateModuleList();
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

    disconnectAll: function() {
        this.io.emit('command', 'exitGame');
    },

    buildComplete: function(err) {
        this.hideLoader();
        
        if (err) console.error(err);
        else console.log('Build completed');
    },

    loadLastProject: function() {
        var lastProject = this.getStorage('lastProject', true);
        if (lastProject) this.loadProject(lastProject);
        this.showTab('modules');
    },

    loadProject: function(dir, event) {
        if (!dir) return;
        if (dir === this.currentProject) return;
        if (this.loading) return;

        if (this.currentProject) {
            var name = $(event.target).html();
            var sure = confirm('Load project ' + name + '? (Changes will be lost)');
            if (!sure) return;
        }

        console.log('Loading project ' + dir);

        console.log('Loading config');

        delete global.require.cache[dir + '/src/game/config.js'];
        try {
            require(dir + '/src/game/config.js');   
        }
        catch(e) {
            return console.error('Config not found');
        }

        console.log('Loading engine');

        try {
            var game = require(dir + '/src/engine/core.js');
        }
        catch(e) {
            return console.log('Engine not found');
        }

        if (!this.editor) this.initEditor();

        $('#engineVersion').html('Panda Engine: ' + game.version);

        this.showLoader();

        this.currentClass = this.currentModule = null;
        this.currentProject = dir;
        this.setStorage('lastProject', this.currentProject, true);
        this.modules = {};
        this.modules['game.main'] = {};
        
        this.config = global.pandaConfig;
        this.config.system = this.config.system || {};
        this.config.debug = this.config.debug || {};

        this.window.title = this.info.description + ' - ' + this.config.name + ' ' + this.config.version;

        // Default config
        if (typeof this.config.system.startScene === 'undefined') this.config.system.startScene = 'Main';
        if (typeof this.config.system.rotateScreen === 'undefined') this.config.system.rotateScreen = true;

        $('#projectName').val(this.config.name);
        $('#projectWidth').val(this.config.system.width);
        $('#projectHeight').val(this.config.system.height);
        $('#projectStartScene').val(this.config.system.startScene);
        $('#projectCenter').prop('checked', this.config.system.center);
        $('#projectScale').prop('checked', this.config.system.scale);
        $('#projectResize').prop('checked', this.config.system.resize);
        $('#projectRotateScreen').prop('checked', this.config.system.rotateScreen);
        $('#projectDebug').prop('checked', this.config.debug.enabled);

        console.log('Loading modules');
        this.loadModuleData();
    },

    saveConfig: function(dontReload) {
        console.log('Saving config');
        this.config.name = $('#projectName').val();
        this.config.system.width = parseInt($('#projectWidth').val());
        this.config.system.height = parseInt($('#projectHeight').val());
        this.config.system.startScene = $('#projectStartScene').val();
        this.config.system.center = $('#projectCenter').is(':checked');
        this.config.system.scale = $('#projectScale').is(':checked');
        this.config.system.resize = $('#projectResize').is(':checked');
        this.config.system.rotateScreen = $('#projectRotateScreen').is(':checked');
        this.config.debug.enabled = $('#projectDebug').is(':checked');

        var project = this.projects[this.currentProject];
        project.name = this.config.name;

        this.updateProjectInfo();

        this.fs.writeFile(this.currentProject + '/src/game/config.js', 'pandaConfig = ' + JSON.stringify(this.config, null, 4) + ';', {
            encoding: 'utf-8'
        }, function(err) {
            if (err) console.log('Error writing config');
        });

        if (!dontReload) this.io.emit('command', 'reloadGame');

        this.updateModuleList();
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
                if (expName === 'addAsset') {
                    var args = nodes[i].expression.arguments;
                    
                    var path = args[0].value;
                    var id = path;
                    if (args[1]) id = args[1].value;

                    this.addAsset(path, id);
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

                    this.newClassObject(className, name, strData, classExtend);
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

    addPlugin: function(file) {
        var name = file.split('.')[0];

        var div = document.createElement('div');
        $(div).html(name);
        $(div).click(this.removePlugin.bind(this, div, name));
        $(div).appendTo($('#plugins .content .list'));

        this.plugins.push(name);
        $('#plugins .header').html('Plugins (' + this.plugins.length + ')');
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
        if (this.io) {
            console.log('Server already started');
            this.staticServe = this.express.static(this.currentProject);
            this.io.emit('command', 'reloadGame');
            return;
        }

        // Get ip addresses
        var os = require('os');
        var ifaces = os.networkInterfaces();
        for (var ifname in ifaces) {
            for (var i = 0; i < ifaces[ifname].length; i++) {
                var iface = ifaces[ifname][i];
                if ('IPv4' !== iface.family || iface.internal !== false) continue;
                this.ipAddresses.push(iface.address);
            }
        }
        
        var app = this.express();
        var http = require('http').Server(app);
        var io = require('socket.io')(http);

        var script = this.fs.readFileSync('js/reload.html', { encoding: 'utf-8' });

        app.post('/register', function(req, res) {
            res.sendStatus(200);
        });

        app.use(require('connect-inject')({ snippet: script }));

        this.staticServe = this.express.static(this.currentProject);

        app.use('/', function(req, res, next) {
            editor.staticServe(req, res, next);
        });

        io.on('connection', function(socket){
            console.log('Device connected');

            socket.on('disconnect', function() {
                console.log('Device disconnected');

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

        this.io = io;

        this.restartServer(http);
    },

    restartServer: function(http) {
        if (this.http) {
            this.http.close();
            this.disconnectAll();
        }
        if (http) this.http = http;
        this.http.listen(this.settings.port);
        console.log('Listening on port ' + this.settings.port);
        
        var text = '';
        for (var i = 0; i < this.ipAddresses.length; i++) {
            text += this.ipAddresses[i] + ':' + this.settings.port + '<br>';
        }
        $('#devices .content .drop').html(text);
    },

    registerDevice: function(data) {
        if (!data.platform) {
            data.platform = 'Desktop';
            data.model = 'browser';
        }
        if (data.platform === 'Win32NT') {
            data.platform = 'Window';
            data.model = 'Phone';
        }
        this.devices.push(data);
        this.updateDeviceList();
        console.log('Registered device ' + data.platform + ' ' + data.model);
    },

    updateDeviceList: function() {
        $('#devices .header').html('Devices (' + this.devices.length + ')');
        
        $('#devices .content .list').html('');
        for (var i = 0; i < this.devices.length; i++) {
            var device = this.devices[i];
            var div = document.createElement('div');
            $(div).addClass('device');
            $(div).html(device.platform + ' ' + device.model);
            $(div).appendTo($('#devices .content .list'));
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

        if (!this.projects[this.currentProject]) {
            this.addProject({
                dir: this.currentProject,
                name: this.config.name,
                version: this.config.version
            });
        }
        else {
            this.updateProjectInfo();
        }

        this.saveProjects();

        $('#projects .project.current').removeClass('current');
        $(this.projects[this.currentProject].div).addClass('current');

        var lastClass = this.getStorage('lastClass');
        var lastModule = this.getStorage('lastModule');
        if (this.modules[lastModule] && this.modules[lastModule].classes[lastClass]) {
            this.editClass(lastClass, lastModule);
        }
        else {
            this.editNextClass();
        }

        this.showTab('modules');
        $('#menu .item.disabled').removeClass('disabled');

        this.hideLoader();
    },

    newClassObject: function(className, module, data, extend) {
        var session = ace.createEditSession(data, 'ace/mode/javascript');
        if (className.indexOf('Scene') === 0) extend = 'Scene';
        var classObj = {
            name: className,
            session: session,
            extend: extend || 'Class'
        };
        session.on('change', this.onChange.bind(this, classObj));
        this.modules[module].classes[className] = classObj;
        return classObj;
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
            $(classObj.div).html($(classObj.div).html() + '*');
            $(classObj.div).addClass('changed');
        }
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

    removeClass: function(className) {
        var sure = confirm('Remove class ' + className + '?');
        if (!sure) return;

        if (this.config.startScene === className.replace('Scene', '')) return;

        var classObj = this.getClassObjectForClassName(className);
        classObj.changed = true;
        classObj.session.setValue('');
        this.saveChanges();
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

                if (module === 'game.assets') {
                    for (var asset in this.assets) {
                        data += 'game.addAsset(\'' + asset + '\', \'' + this.assets[asset] + '\');\n';
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
            $(classObj.div).html(this.getClassName(className, classObj.extend));
        }

        this.modules[module].changed = false;
        $(this.modules[module].div).removeClass('changed');
        $(this.modules[module].div).html(this.modules[module].name);

        if (this.io) {
            console.log('Emit reloadModule ' + module);
            this.io.emit('command', 'reloadModule', module);
        }
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
        
        if (this.currentProject) {
            var sure = confirm('Create new project? (Changes will be lost)');
            if (!sure) return;
        }

        this.currentProject = null;

        if (!dir) return this.openFolder(this.createProject.bind(this));

        var folder = prompt('Project folder:');
        folder = this.stripClassName(folder);
        if (!folder) {
            console.log('Invalid project folder');
            return;
        }

        this.showLoader();

        console.log('Creating new project');

        var worker = this.fork('js/worker.js', { execPath: './node' });
        worker.on('message', this.projectCreated.bind(this, dir + '/' + folder));
        worker.on('exit', this.projectCreated.bind(this, ''));
        worker.send(['create', dir, [folder]]);
    },

    projectCreated: function(dir, err) {
        this.hideLoader();

        if (err) {
            console.error(err);
        }
        else {
            console.log('Created project ' + dir);
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

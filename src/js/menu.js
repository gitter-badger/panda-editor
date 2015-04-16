editor.Menu = Class.extend({
	init: function() {
		if (process.platform !== 'darwin') return;

	    console.log('Initializing menu');

	    var menubar = new editor.gui.Menu({ type: 'menubar' });
	    if (menubar.createMacBuiltin) {
	    	menubar.createMacBuiltin(editor.info.description);
	    }

	    var file = new editor.gui.Menu();
	    file.append(new editor.gui.MenuItem({ label: 'New class', click: editor.newClass.bind(editor) }));
	    file.append(new editor.gui.MenuItem({ label: 'Save', click: editor.saveChanges.bind(editor) }));

	    var devices = new editor.gui.Menu();
	    devices.append(new editor.gui.MenuItem({ label: 'Reload all', click: editor.reloadAll.bind(editor) }));

	    var view = new editor.gui.Menu();
	    view.append(new editor.gui.MenuItem({ label: 'Console', click: editor.toggleConsole.bind(editor) }));
	    view.append(new editor.gui.MenuItem({ label: 'Debug bar', click: editor.toggleDebugBar.bind(editor) }));
	    view.append(new editor.gui.MenuItem({ label: 'Bounds', click: editor.toggleBounds.bind(editor) }));
	    view.append(new editor.gui.MenuItem({ label: 'Hit areas', click: editor.toggleHitAreas.bind(editor) }));
	    // // Project menu
	    // var project = new editor.gui.Menu();
	    // project.append(new editor.gui.MenuItem({ label: 'Create new project', click: editor.createProject.bind(editor) }));
	    // project.append(new editor.gui.MenuItem({ label: 'Open in browser', click: editor.openBrowser.bind(editor) }));
	    // project.append(new editor.gui.MenuItem({ label: 'Build project', click: editor.buildProject.bind(editor) }));
	    // project.append(new editor.gui.MenuItem({ label: 'Update engine', click: editor.updateEngine.bind(editor) }));
	    
	    // // Help menu
	    var help = new editor.gui.Menu();
	    // help.append(new editor.gui.MenuItem({ label: 'Report issue' }));
	    help.append(new editor.gui.MenuItem({ label: 'Homepage' }));
	    // help.append(new editor.gui.MenuItem({ label: 'Tutorials' }));
	    
	    var cmd = 'append';
	    if (menubar.createMacBuiltin) cmd = 'insert'
	    menubar[cmd](new editor.gui.MenuItem({ label: 'File', submenu: file }), 1);
		menubar[cmd](new editor.gui.MenuItem({ label: 'Devices', submenu: devices }), 3);
		menubar[cmd](new editor.gui.MenuItem({ label: 'View', submenu: view }), 4);
	    menubar.append(new editor.gui.MenuItem({ label: 'Help', submenu: help }));

	    editor.window.menu = menubar;
	}
});

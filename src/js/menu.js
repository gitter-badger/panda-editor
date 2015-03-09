editor.Menu = Class.extend({
	init: function() {
		if (process.platform !== 'darwin') return;

	    console.log('Initializing menu');

	    var menubar = new editor.gui.Menu({ type: 'menubar' });
	    if (!menubar.createMacBuiltin) return;
	    menubar.createMacBuiltin(editor.info.description);

	    // // Project menu
	    // var project = new editor.gui.Menu();
	    // project.append(new editor.gui.MenuItem({ label: 'Create new project', click: editor.createProject.bind(editor) }));
	    // project.append(new editor.gui.MenuItem({ label: 'Open in browser', click: editor.openBrowser.bind(editor) }));
	    // project.append(new editor.gui.MenuItem({ label: 'Build project', click: editor.buildProject.bind(editor) }));
	    // project.append(new editor.gui.MenuItem({ label: 'Update engine', click: editor.updateEngine.bind(editor) }));
	    
	    // // Help menu
	    // var help = new editor.gui.Menu();
	    // help.append(new editor.gui.MenuItem({ label: 'Report issue' }));
	    // help.append(new editor.gui.MenuItem({ label: 'Homepage' }));
	    // help.append(new editor.gui.MenuItem({ label: 'Tutorials' }));
	    
	    // var cmd = 'append';
	    // if (menubar.createMacBuiltin) cmd = 'insert'
	    // menubar[cmd](new editor.gui.MenuItem({ label: 'Project', submenu: project }), 1);
	    // menubar.append(new editor.gui.MenuItem({ label: 'Help', submenu: help }));

	    editor.window.menu = menubar;
	}
});

editor.Menu = Class.extend({
	init: function(editor) {
		this.editor = editor;
		this.gui = editor.gui;

	    console.log('Initializing menu');

	    var menubar = new this.gui.Menu({ type: 'menubar' });
	    menubar.createMacBuiltin(this.editor.info.description);

	    // Project menu
	    var project = new this.gui.Menu();
	    project.append(new this.gui.MenuItem({ label: 'Create new project', click: this.editor.createProject.bind(this.editor) }));
	    project.append(new this.gui.MenuItem({ label: 'Open in browser', click: this.editor.openBrowser.bind(this.editor) }));
	    project.append(new this.gui.MenuItem({ label: 'Build project', click: this.editor.buildProject.bind(this.editor) }));
	    project.append(new this.gui.MenuItem({ label: 'Update engine', click: this.editor.updateEngine.bind(this.editor) }));
	    
	    // Help menu
	    var help = new this.gui.Menu();
	    help.append(new this.gui.MenuItem({ label: 'Report issue' }));
	    help.append(new this.gui.MenuItem({ label: 'Homepage' }));
	    help.append(new this.gui.MenuItem({ label: 'Tutorials' }));
	    
	    menubar.insert(new this.gui.MenuItem({ label: 'Project', submenu: project }), 1);
	    menubar.append(new this.gui.MenuItem({ label: 'Help', submenu: help }));

	    this.editor.window.menu = menubar;
	}
});

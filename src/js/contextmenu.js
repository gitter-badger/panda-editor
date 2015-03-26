editor.ContextMenu = Class.extend({
	menus: {},

	init: function() {
		$(document).bind('contextmenu', this.showMenu.bind(this));

		this.createMenu('class');
		this.addMenuItem('class', 'Extend', 'extendClass');
		this.addMenuItem('class', 'Rename', 'renameClass');
		this.addMenuItem('class', 'Duplicate', 'duplicateClass');
		this.addMenuItem('class', 'Remove', 'removeClass');

		this.createMenu('scene');
		this.addMenuItem('scene', 'Change scene', 'changeScene');
		this.addMenuItem('scene', 'Set start scene', 'setStartScene');
		this.addMenuItem('scene', 'Rename', 'renameClass');
		this.addMenuItem('scene', 'Remove', 'removeClass');

		this.createMenu('asset');
		this.addMenuItem('asset', 'Remove', 'removeAsset');

		this.createMenu('audio');
		this.addMenuItem('audio', 'Remove', 'removeAudio');

		this.createMenu('module');
		this.addMenuItem('module', 'New class', 'newClass');

		this.createMenu('project');
		this.addMenuItem('project', 'Load', 'loadProject');
		this.addMenuItem('project', 'Open folder', 'openProjectFolder');
		this.addMenuItem('project', 'Remove', 'removeProject');
	},

	createMenu: function(name) {
	    this.menus[name] = new editor.gui.Menu();
	},

	addMenuItem: function(menu, label, command) {
	    var item = new editor.gui.MenuItem({ label: label, click: this.menuClick.bind(this, command) });
	    this.menus[menu].append(item);
	},

	menuClick: function(command) {
	    if (typeof editor[command] !== 'function') return;
	    editor[command](this.targetName, this.targetDiv);
	},

	showMenu: function(event) {
	    this.targetDiv = event.target;
	    this.targetName = $(this.targetDiv).attr('data-name');
	    if (!this.targetName) return;

	    var targetMenu = $(this.targetDiv).attr('class').split(' ')[0];

	    if (targetMenu === 'class' && this.targetName.indexOf('Scene') === 0) targetMenu = 'scene';

	    if (this.menus[targetMenu]) this.menus[targetMenu].popup(event.originalEvent.x, event.originalEvent.y);
	}
});

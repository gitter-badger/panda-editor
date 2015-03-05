editor.Storage = Class.extend({
	init: function(editor) {
		this.editor = editor;
	},

	set: function(key, data, forProject) {
	    if (forProject) key += this.editor.project.dir;
	    localStorage.setItem(key, data);
	},

	get: function(key, forProject) {
	    if (forProject) key += this.editor.project.dir;
	    return localStorage.getItem(key);
	},

	remove: function(key, forProject) {
		if (forProject) key += this.editor.project.dir;
		return localStorage.removeItem(key);
	}
});

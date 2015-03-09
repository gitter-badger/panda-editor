editor.Storage = Class.extend({
	set: function(key, data, forProject) {
	    if (forProject) key += editor.project.dir;
	    localStorage.setItem(key, data);
	},

	get: function(key, forProject) {
	    if (forProject) key += editor.project.dir;
	    return localStorage.getItem(key);
	},

	remove: function(key, forProject) {
		if (forProject) key += editor.project.dir;
		return localStorage.removeItem(key);
	}
});

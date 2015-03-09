editor.Projects = Class.extend({
	project: {},
	current: {},

	init: function() {
	    var projects = JSON.parse(editor.storage.get('projects')) || [];
	    for (var i = 0; i < projects.length; i++) {
	        this.add(projects[i]);
	    }
	},

	add: function(projObj) {
	    var div = document.createElement('div');
	    $(div).addClass('project');
	    $(div).html(projObj.name + ' ' + projObj.version);
	    $(div).click(this.load.bind(this, projObj.dir));
	    $(div).attr('data-name', projObj.dir);
	    $(div).appendTo($('#projects .list'));
	    if (this.current.dir === projObj.dir) $(div).addClass('current');
	    projObj.div = div;
	    this.project[projObj.dir] = projObj;
	},

	reset: function() {
	    editor.storage.remove('projects');
	},

	save: function() {
	    var projects = [];
	    for (var dir in this.project) {
	    	var projObj = this.project[dir];
	        projects.push({
	            name: projObj.name,
	            dir: projObj.dir,
	            version: projObj.version
	        });
	    }
	    editor.storage.set('projects', JSON.stringify(projects));
	},

	loadLast: function() {
	    var lastProject = editor.storage.get('lastProject');
	    if (lastProject) this.load(lastProject);
	},

	load: function(dir) {
		if (editor.loading) return;

		if (this.current.dir) {
			if (this.current.dir === dir) {
				console.error('Project already loaded');
				return;
			}
		    var sure = confirm('Load new project? (Current changes will be lost)');
		    if (!sure) return;
		}

		$('#assets .content .list').html('');

		editor.showLoader(true);
		this.current = new editor.Project(dir, this.loaded.bind(this));
	},

	loaded: function(error) {
		editor.hideLoader();

		$('#editor').show();

		if (error) return console.error(error);
		
		editor.onProjectLoaded();

		if (!this.project[this.current.dir]) {
		    this.add({
		        dir: this.current.dir,
		        name: this.current.config.data.name,
		        version: this.current.config.data.version
		    });
		}
		else {
		    this.updateInfo();
		}

		$('#projects .project.current').removeClass('current');
		$(this.project[this.current.dir].div).addClass('current');
		$('#menu .item.disabled').removeClass('disabled');

		this.save();
	},

	updateInfo: function() {
		var curProject = this.project[this.current.dir];
		curProject.name = this.current.config.data.name;
		curProject.version = this.current.config.data.version;

		editor.window.title = editor.info.description + ' - ' + curProject.name + ' ' + curProject.version;
		$(curProject.div).html(curProject.name + ' ' + curProject.version);
	},

	remove: function(dir, div) {
	    var name = $(div).html();
	    var sure = confirm('Remove project ' + name + ' from list?');
	    if (!sure) return;

	    delete this.project[dir];
	    $(div).remove();
	    console.log('Removed project ' + dir);
	    this.save();
	}
});

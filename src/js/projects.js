editor.Projects = Class.extend({
	project: {},
	current: {},

	init: function(editor) {
		this.editor = editor;

	    var projects = JSON.parse(this.editor.storage.get('projects')) || [];
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
	    this.editor.storage.remove('projects');
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
	    this.editor.storage.set('projects', JSON.stringify(projects));
	},

	loadLast: function() {
	    var lastProject = this.editor.storage.get('lastProject');
	    if (lastProject) this.load(lastProject);
	},

	load: function(dir) {
		if (this.editor.loading) return;
		if (this.current.dir === dir) return;

		if (this.current.dir) {
		    var sure = confirm('Load new project? (Current changes will be lost)');
		    if (!sure) return;
		}

		$('#editor').hide();
		$('.tab').hide();
		$('#menu .item.current').removeClass('current');
		$('#menu .item').addClass('disabled');
		$('#assets .content .list').html('');

		this.editor.showLoader();
		this.current = new this.editor.Project(this.editor, dir, this.loaded.bind(this));
	},

	loaded: function(error) {
		this.editor.hideLoader();

		$('#editor').show();

		if (error) return console.log(error);
		
		this.editor.onProjectLoaded();

		if (!this.project[this.current.dir]) {
		    this.add({
		        dir: this.current.dir,
		        name: this.current.config.data.name,
		        version: this.current.config.data.version
		    });
		}
		else {
		    this.update();
		}

		$('#projects .project.current').removeClass('current');
		$(this.project[this.current.dir].div).addClass('current');
		$('#menu .item.disabled').removeClass('disabled');

		this.save();
	},

	remove: function(dir, div) {
	    var name = $(div).html();
	    var sure = confirm('Remove project ' + name + ' from list?');
	    if (!sure) return;

	    delete this.project[dir];
	    $(div).remove();
	    console.log('Removed project ' + dir);
	    this.save();
	},

	update: function() {
	    var project = this.project[this.current.dir];
	    if (!project) return;

	    project.name = this.current.config.data.name;
	    project.version = this.current.config.data.version;

	    this.editor.window.title = this.editor.info.description + ' - ' + project.name + ' ' + project.version;
	    $(project.div).html(project.name + ' ' + project.version);
	}
});

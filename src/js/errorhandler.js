editor.ErrorHandler = Class.extend({
	receive: function(file, line, msg) {
	    var module = 'game.' + file.split('.')[0];

	    module = editor.project.modules[module];
	    if (!module) return;

	    var lines = module.data.split(/\r?\n/);
	    var errorLine = lines[line - 1];

	    var errorClass;
	    var errorClassLine;
	    for (var className in module.classes) {
	        var classObj = module.classes[className];
	        // TODO What if other classes have same line???
	        var isError = classObj.session.getValue().indexOf(errorLine);
	        if (isError > -1) {
	            errorClass = classObj.name;
	            var classLines = classObj.session.getValue().split(/\r?\n/);
	            for (var i = 0; i < classLines.length; i++) {
	                if (classLines[i].indexOf(errorLine) > -1) {
	                    errorClassLine = i + 1;
	                    break;
	                }
	            }
	            break;
	        }
	    }
	    // console.log('Error on class ' + errorClass + ' line ' + errorClassLine);
	    // console.log('Got error at ' + file + ' line ' + line + ': ' + msg);
	    console.error(file + ':' + line + ' ' + msg);

	    this.highlight(errorClass, errorClassLine);
	},

	highlight: function(className, lineNumber) {
	    var classObj = editor.getClassObjectForClassName(className);
	    if (!classObj) return;

	    if (classObj.errors[lineNumber]) return;

	    $(classObj.div).addClass('error');

	    var Range = ace.require('ace/range').Range;
	    var errorLine = classObj.session.addMarker(new Range(lineNumber - 1, 0, lineNumber - 1, 144), 'errorHighlight', 'fullLine');

	    classObj.errors[lineNumber] = errorLine;
	},

	clear: function(className) {
	    var classObj = editor.getClassObjectForClassName(className);
	    if (!classObj) return;

	    for (var errorLine in classObj.errors) {
	        classObj.session.removeMarker(classObj.errors[errorLine]);
	        delete classObj.errors[errorLine];
	    }

	    $(classObj.div).removeClass('error');
	}
});

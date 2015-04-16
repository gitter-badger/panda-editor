var previousConsole = window.console || {};
window.console = {
	colors: [
		'#fff',
		'#fc0',
		'#ff0000'
	],

	get: function(args, lineNumber, filename) {
		filename = filename.split('/');
		filename = filename[filename.length - 1];
		return args;
		return filename + ':' + lineNumber + ' ' + args;
	},

	log: function(msg) {
		previousConsole.log && previousConsole.log(msg);
		var logLine = this.get(Array.prototype.slice.call(arguments), this.__stack[1].getLineNumber(), this.__stack[1].getFileName());
		this.set(0, logLine);
	},

	warn: function(msg) {
		previousConsole.warn && previousConsole.warn(msg);
		var logLine = this.get(Array.prototype.slice.call(arguments), this.__stack[1].getLineNumber(), this.__stack[1].getFileName());
		this.set(1, logLine);
	},

	error: function(msg) {
		previousConsole.error && previousConsole.error(msg);
		var logLine = this.get(Array.prototype.slice.call(arguments), this.__stack[1].getLineNumber(), this.__stack[1].getFileName());
		this.set(2, logLine);
	},

	set: function(type, msg) {
		var div = document.createElement('div');
		$(div).html(msg);
		$(div).css('color', this.colors[type]);
		$(div).prependTo('#console .content');
	},

	clear: function() {
		$('#console .content').html('');
	}
};

Object.defineProperty(console, '__stack', {
	get: function(){
		var orig = Error.prepareStackTrace;
		Error.prepareStackTrace = function(_, stack){ return stack; };
		var err = new Error;
		Error.captureStackTrace(err, arguments.callee);
		var stack = err.stack;
		Error.prepareStackTrace = orig;
		return stack;
	}
});

window.onerror = function(msg, file, line) {
	var idx = file.lastIndexOf('/');
	if (idx > -1) file = file.substr(idx + 1);
	console.set(2, file + ':' + line + ' ' + msg);
};

$(window).on('keydown', function(event) {
    if (event.keyCode === 27 && event.ctrlKey) {
    	editor.toggleConsole();
    }
});

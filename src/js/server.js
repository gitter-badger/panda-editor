editor.Server = Class.extend({
	express: require('express'),
	ipAddresses: [],
	devices: [],

	init: function() {
		// Get ip addresses
		var os = require('os');
		var ifaces = os.networkInterfaces();
		for (var ifname in ifaces) {
		    for (var i = 0; i < ifaces[ifname].length; i++) {
		        var iface = ifaces[ifname][i];
		        if ('IPv4' !== iface.family || iface.internal !== false) continue;
		        this.ipAddresses.push(iface.address);
		    }
		}
		
		var app = this.express();
		var http = require('http').Server(app);
		var io = require('socket.io')(http);

		var script = editor.fs.readFileSync('device.html', { encoding: 'utf-8' });

		app.post('/register', function(req, res) {
		    res.sendStatus(200);
		});

		app.use(require('connect-inject')({ snippet: script }));

		this.staticServe = this.express.static(editor.project.dir);

		app.use('/', function(req, res, next) {
		    editor.server.staticServe(req, res, next);
		});

		io.on('connection', this.deviceConnected.bind(this));

		this.io = io;

		this.restartServer(http);
	},

	emit: function(data, params) {
		console.log('Emit ' + data);
		this.io.emit('command', data, params);
	},

	deviceConnected: function(socket) {
	    console.log('Device connected');

	    socket.on('disconnect', this.deviceDisconnected.bind(this, socket));
	    socket.on('register', this.registerDevice.bind(this, socket));
	    socket.on('errorMsg', editor.errorHandler.receive.bind(editor.errorHandler));
	},

	deviceDisconnected: function(socket) {
	    for (var i = this.devices.length - 1; i >= 0; i--) {
	        var device = this.devices[i];
	        if (device.socket === socket) {
	            console.log('Device disconnected');
	            this.devices.splice(i, 1);
	            if (device.div) this.updateDeviceList();
	            return;
	        }
	    }
	},

	registerDevice: function(socket, data) {
	    if (!data.platform) {
	        data.platform = 'Desktop';
	        data.model = 'browser';
	    }
	    if (data.platform === 'Win32NT') {
	        data.platform = 'Window';
	        data.model = 'Phone';
	    }
	    data.socket = socket;
	    this.devices.push(data);
	    this.updateDeviceList();
	    console.log('Registered device ' + data.platform + ' ' + data.model);
	},

	updateDeviceList: function() {
	    $('#devices .header').html('Devices (' + this.devices.length + ')');
	    
	    $('#devices .content .list').html('');
	    for (var i = 0; i < this.devices.length; i++) {
	        var device = this.devices[i];
	        var div = document.createElement('div');
	        $(div).addClass('device');
	        $(div).html(device.platform + ' ' + device.model);
	        $(div).appendTo($('#devices .content .list'));
	        $(div).click(this.reloadDevice.bind(this, device));
	        device.div = div;
	    }
	    editor.onResize();
	},

	reloadDevice: function(device) {
	    $(device.div).remove();
	    device.div = null;
	    device.socket.emit('command', 'reloadGame');
	},

	restartServer: function(http) {
	    if (this.http) {
	        this.http.close();
	        this.disconnectAll();
	    }
	    if (http) this.http = http;
	    this.http.listen(editor.preferences.data.port);
	    console.log('Listening on port ' + editor.preferences.data.port);
	    
	    var text = '';
	    for (var i = 0; i < this.ipAddresses.length; i++) {
	        text += this.ipAddresses[i] + ':' + editor.preferences.data.port + '<br>';
	    }
	    $('#devices .content .drop').html(text);
	},

	disconnectAll: function() {
	    this.io.emit('command', 'exitGame');
	},

	update: function() {
		console.log('Updating server');
		this.staticServe = this.express.static(editor.project.dir);
		this.io.emit('command', 'reloadGame');
	}
});

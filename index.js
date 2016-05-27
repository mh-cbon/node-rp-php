var url           = require('url');
var util          = require('util');
var http          = require('http');
var EventEmitter  = require('events');
var net           = require('net');
var spawn         = require('child_process').spawn;
EventEmitter.defaultMaxListeners = 100;


var clients = [];
var BackendsManager = new Backends();
setInterval(function () {
  console.log("Im alive !! : p")
}, 1000)

process.nextTick(function () {
  BackendsManager.on('can-handle', function (backend) {
    if (clients.length) {
      var client = clients.shift();
      console.log('handling via %s:%s', backend.host, backend.port)
      var errors = 0;
      var p = backend.handle(client.req, client.res)
      .on('error', function (err) {
        if (errors>5) {
          client.res.writeHead(err.statusCode || 500, {'Content-type': 'text/plain'});
          client.res.end(err.toString());
          return;
        }
        if (err.code==='ECONNREFUSED') {
          p.removeAllListeners();
          client.req.unpipe(p);
          clients.unshift(client)
          setTimeout(function () {
            BackendsManager.handleIfYouCan();
          }, 100)
        }
        errors++;
      })
    }
  })

  var server = http.createServer((req, res) => {
    clients.push({req: req, res: res})
    BackendsManager.handleIfYouCan();
  });
  server.listen(3000)
})

function Backends() {
  var backends = {};
  var available = [];
  var busyPorts = [];
  var maxWorkers = 30;
  var that = this;

  this.handleIfYouCan = function () {
    var that = this;
    var handled = false;
    Object.keys(backends).forEach(function (port) {
      var backend = backends[port];
      if (!backend.busy) {
        that.emit('can-handle', backend)
        handled = true;
      }
    })
    if (!handled) that.createBackend();
  }

  this.createBackend = function () {
    var port = this.getFreePort();
    if (port===false) return false;
    console.log('got free port %s', port)
    backends[port] = new PhpBackend(port, 'localhost', 'index.php', __dirname + '/public');
    backends[port].on('available', function (b){
      console.log('backend available %s:%s', b.host, b.port)
      available.push(b);
      that.emit('can-handle', b)
    });
    backends[port].on('busy', function (b){
      console.log('backend busy %s:%s', b.host, b.port)
      available = available.filter(function (backend) {
        return backend.port!==b.port;
      })
    });
    backends[port].once('port-busy', function (port){
      busyPorts.indexOf(port)===-1 && busyPorts.push(port);
      console.log('busy-port', port, busyPorts)
    });
    backends[port].once('destroy', function (b){
      console.log('backend left %s:%s', b.host, b.port)
      delete backends[port];
      b.destroy();
      process.nextTick(that.createBackend.bind(that))
    });
  }

  this.getFreePort = function () {
    var port = 8000;
    var MaxPort = port + maxWorkers;
    var ports = Object.keys(backends).map((p)=>{return parseInt(p);});
    var found = false;
    for(var i=port; i<MaxPort; i++) {
      if (ports.indexOf(i)===-1 && busyPorts.indexOf(i)===-1) {
        found = true;
        port = i;
        break;
      }
    }
    return found ? port : false;
  }
}
util.inherits(Backends, EventEmitter);

function PhpBackend(port, host, script, cwd) {
  var that = this;
  that.busy = true;
  that.port = port;
  that.host = host;
  that.script = script;
  that.child = spawn('php', ['-S', 'localhost:'+port, 'index.php'], {cwd: cwd});
  that.child.stdout.pipe(process.stderr);
  that.child.stderr.pipe(process.stderr);
  that.child.on('exit', console.error.bind(console));
  that.child.on('close', console.error.bind(console));
  that.child.on('error', console.error.bind(console))
  that.child.stderr.on('data', function (d) {
    if (d.toString().match(/reason: Address already in use/)) {
      that.emit('port-busy', port);
    }
  })
  that.child.on('exit', function(){
    that.emit('destroy', that);
  });
  var e;
  that.child.on('error', function (err) {
    e = err;
  })
  process.nextTick(function () {
    if (e) return that.emit('destroy', that);
    waitForPort(port, host, function (err) {
      if (err) return that.emit('destroy', that);
      that.busy = false;
      that.emit('available', that)
    })
  })


  var parsedSource = url.parse('http://localhost:'+port);
  that.handle = function (req, res) {
    that.busy = true;
    that.emit('busy', that)
    var proxyReqOtions = {
      method:     req.method,
      hostname:   parsedSource.hostname,
      port:       parsedSource.port,
      path:       req.url,
      headers:    JSON.parse(JSON.stringify(req.headers)),
    };
    proxyReqOtions.headers['host'] = parsedSource.hostname + ':' + parsedSource.port;
    return req.pipe(http.request(proxyReqOtions)).once('error', function (err){
      console.error(err);
    }).once('response', function(proxifiedRes) {
      res.writeHead(proxifiedRes.statusCode, {});
      proxifiedRes.pipe(res);
    }).once('finish', function (){
      that.handled++;
      that.busy = false;
      that.emit('available', that)
    });
  }

  that.destroy = function () {
    that.removeAllListeners();
  }
}
util.inherits(PhpBackend, EventEmitter);

var waitForPort = function (port, host, done, tried) {
  var tried = tried || 0;
  var client = net.createConnection({port: port, host: host}, () => {
    done();
    client.end();
  });
  client.once('error', () => {
    tried++;
    if (tried<10) setTimeout(function () {
      waitForPort(port, host, done, tried)
    }, 100)
    else done('cannot open');
  });
}

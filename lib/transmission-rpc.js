var http  = require('http'),
    url   = require('url');

function transmissionRpc (options, auth) {
    if (typeof options === 'string') {
        options = url.parse(options);
        options.host = options.hostname;
        options.port = options.port;
    }

    if (options.path === '/') {
        options.path = '/transmission/rpc';
    }

    options.method = 'POST';

    var headers = {
        'User-Agent'        : 'NodeJS TransmissionRPC',
        'Content-Type'      : 'application/json',
        'Connection'        : 'Keep-Alive',
        'Accept'            : 'application/json',
        'Accept-Charset'    : 'UTF8'
    };


    if (auth) {
        if (typeof auth === 'string') {
            headers.Authorization = auth;
        } else if (auth.username && auth.password) {
            auth = 'Basic ' + new Buffer(auth.username + ':' + auth.password).toString('base64');
            console.log(auth);
            headers.Authorization = auth;
        }
    }

    options.headers = headers;

    this.sessionId = null;

    this.options = options;
}

transmissionRpc.prototype.setSessionId = function (sessionId) {
    this.sessionId = sessionId;
    this.options.headers['x-transmission-session-id'] = sessionId;
};

transmissionRpc.prototype.getSessionId = function (callback) {
    var that = this;

    that.sessionId = null;
    that.options.headers['x-transmission-session-id'] = null;

    var request = http.request(this.options, function (response) {
        if (response.statusCode === 409) {
            that.setSessionId(response.headers['x-transmission-session-id']);
            callback(null);
        } else if (response.statusCode === 401) {
            callback(new Error('Wrong username or password'));
        } else {
            callback(new Error('Unexpected error'));
        }
    });

    request.on('error', function (error) {
        callback(error);
    });

    request.end();

};

transmissionRpc.prototype.sendRequest = function (method, args, tag, callback) {
    var that = this;

    var doit = function () {
        var payload = {
            'method': method,
            'arguments': args,
            'tag': tag
        };
        var jsonPayload = JSON.stringify(payload);

        var options = that.options;
        options.headers['Content-Length'] = Buffer.byteLength(jsonPayload, 'utf8');

        var request = http.request(options, function (response) {
            var body = '';

            response.on('data', function (chunk) {
                body += chunk;
            });

            response.on('end', function () {
                var data = JSON.parse(body);

                if (data.result === 'success') {
                    if (tag && tag !== data.tag) {
                        callback(new Error("Tags does not match"));
                    } else {
                        callback(null, data.arguments);
                    }
                } else {
                    callback(new Error(data.result));
                }
            });
        });

        request.write(jsonPayload, 'utf8');
        request.end();
    };

    if (!this.sessionId) {
        this.getSessionId(function (error) {
            if (!error) {
                doit();
            }
        });
    } else {
        doit();
    }
};

transmissionRpc.prototype.sessionGet = function (tag, callback) {
    this.sendRequest('session-get', null, tag, callback);
};

transmissionRpc.prototype.sessionStats = function (tag, callback) {
    this.sendRequest('session-stats', null, tag, callback);
};

module.exports = transmissionRpc;

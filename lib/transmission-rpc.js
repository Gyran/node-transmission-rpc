var http  = require('http'),
    url   = require('url');

function transmissionRpc (options, username, password) {
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

    if (username && password) {
        auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
        headers.Authorization = auth;
    }

    options.headers = headers;

    this.sessionId = null;

    this.options = options;
}

transmissionRpc.prototype.getSessionId = function (callback) {
    var that = this;

    that.sessionId = null;
    that.options.headers['x-transmission-session-id'] = null;

    var request = http.request(this.options, function (response) {
        if (response.statusCode === 409) {
            that.sessionId = response.headers['x-transmission-session-id'];
            that.options.headers['x-transmission-session-id'] = that.sessionId;
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

        var request = http.request(that.options, function (response) {
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

        request.write(JSON.stringify(payload));
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

module.exports = transmissionRpc;

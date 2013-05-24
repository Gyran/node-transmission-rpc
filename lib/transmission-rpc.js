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

transmissionRpc.prototype.sendRequest = function (method, args, tag, callback) {
    var that = this;

    var payload = {
        'method': method,
        'arguments': args,
        'tag': tag
    };
    var jsonPayload = JSON.stringify(payload);

    var options = that.options;
    options.headers['Content-Length'] = Buffer.byteLength(jsonPayload, 'utf8');

    var request = http.request(options, function (response) {
        if (response.statusCode === 200) {
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
        } else if (response.statusCode === 409) {
            that.setSessionId(response.headers['x-transmission-session-id']);
            that.sendRequest(method, args, tag, callback); // do the request again
        } else if (response.statusCode === 401) {
            callback(new Error('Wrong username or password'));
        } else {
            callback(new Error('Unexpected error'));
        }
    });

    request.write(jsonPayload, 'utf8');
    request.end();
};

transmissionRpc.prototype.torrentAction = function (action, ids, tag, callback) {
    var args = {};

    if (ids) {
        args.ids = ids;
    }

    this.sendRequest(action, args, tag, callback);
};

transmissionRpc.prototype.torrentStop = function (ids, tag, callback) {
    this.torrentAction('torrent-stop', ids, tag, callback);
};

transmissionRpc.prototype.torrentStart = function (ids, tag, callback) {
    this.torrentAction('torrent-start', ids, tag, callback);
};

transmissionRpc.prototype.torrentGet = function (ids, fields, tag, callback) {
    if (!(fields instanceof Array)) {
        fields = [
            'id', 'name', 'status', 'rateDownload', 'rateUpload', 'addedDate',
            'eta', 'percentDone', 'sizeWhenDone', 'downloadedEver',
            'uploadedEver', 'uploadRatio', 'error', 'leftUntilDone'
        ];
    }

    args = {
        'fields': fields
    };

    if (ids) {
        args.ids = ids;
    }

    this.sendRequest('torrent-get', args, tag, callback);
};

transmissionRpc.prototype.sessionGet = function (tag, callback) {
    this.sendRequest('session-get', null, tag, callback);
};

transmissionRpc.prototype.sessionStats = function (tag, callback) {
    this.sendRequest('session-stats', null, tag, callback);
};

transmissionRpc.prototype.portTest = function (tag, callback) {
    this.sendRequest('port-test', null, tag, callback);
};

transmissionRpc.prototype.torrentAdd = function (args, tag, callback) {
    if (args === null ||
        ((typeof args.filename === 'undefined' || args.filename === null) &&
        (typeof args.metainfo === 'undefined' || args.metainfo === null))) {

        callback(new Error('Filename or matainfo has to be included'));
        return;
    }

    this.sendRequest('torrent-add', args, tag, callback);
};

transmissionRpc.prototype.torrentAddFile = function (path, extra, tag, callback) {
    var args = extra;
    if (args === null) {
        args = {};
    }

    args.filename = path;

    this.torrentAdd(args, tag, callback);
};

transmissionRpc.prototype.torrentRemove = function (ids, localData, tag, callback) {
    var args = {
        'ids': ids,
        'delete-local-data': localData
    };

    this.sendRequest('torrent-remove', args, tag, callback);
};

module.exports = transmissionRpc;

var vows   = require('vows'),
    assert = require('assert'),
    transmission = require('../lib/transmission-rpc');

var optionsObject = {
    'host': 'localhost',
    'port': 9091
};
var optionsString = 'http://localhost:9091';

var authObject = {
    username: 'testuser',
    password: 'testpass'
};
var authString = 'Basic dGVzdHVzZXI6dGVzdHBhc3M=';

vows.describe('Transmission').addBatch({
    'Constructor': {
        'auth': {
            'With strings': {
                topic: function () {
                    var t = new transmission(optionsString, authString);
                    return t;
                },
                'has correct auth': function (topic) {
                    assert.equal(topic.options.headers.Authorization, authString);
                }
            },
            'With object': {
                topic: function () {
                    var t = new transmission(optionsString, authObject);
                    return t;
                },
                'has correct auth': function (topic) {
                    assert.equal(topic.options.headers.Authorization, authString);
                }
            },
            'With empty string': {
                topic: function () {
                    var t = new transmission(optionsString, '');
                    return t;
                },
                'has correct auth': function (topic) {
                    assert.isUndefined(topic.options.headers.Authorization);
                }
            },
            'With null': {
                topic: function () {
                    var t = new transmission(optionsString, null);
                    return t;
                },
                'has correct auth': function (topic) {
                    assert.isUndefined(topic.options.headers.Authorization);
                }
            }
        }
    },
    'Authorization': {
        'with correct auth': {
            topic: function () {
                var t = new transmission(optionsString, authString);
                t.torrentGet(null, null, null, this.callback);
            },
            'should result in an valid request': function (err, res) {
                assert.isNull(err);
                assert.isObject(res);
            }
        },
        'with incorrect auth': {
            topic: function () {
                var t = new transmission(optionsString, null);
                t.torrentGet(null, null, null, this.callback);
            },
            'should throw an error': function (err, res) {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'Wrong username or password');
            }
        }
    }
}).export(module);

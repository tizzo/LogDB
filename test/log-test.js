var should = require('should');
var es = require('event-stream');
var fs = require('fs');
var level = require('level')

var LogDB = require('../index.js');

var db = null;

describe('LogDB', function() {
  before(function(done) {
    db = level('/tmp/logdb-' + Date.now(), done);
  });
  it('should store a log and retrieve the contents of a log file', function(done) {
    var logdb = new LogDB(db);
    logdb.storeLogFile('test.log', function(error, logStream) {
      var source = fs.createReadStream(__dirname + '/fixtures/example1.log');
      var split = source.pipe(es.split());
      split.pipe(logStream);
      split
        .pipe(es.through(function(data) {
          if (data != '') {
            this.emit('data', data);
          }
        }))
        .pipe(es.writeArray(function(error, writtenData) {
        var readStream = logdb.readLogFile('test.log');
        // For better or worse, I can't figure out how to be sure this stuff will
        // come back without just waiting a bit.
        setTimeout(function() {
          readStream.pipe(es.writeArray(function(error, readData) {
            JSON.stringify(writtenData).should.equal(JSON.stringify(readData));
            done();
          }));
        }, 5);
      }));
    });
  });
});

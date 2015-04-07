var should = require('should');
var through2 = require('through2');
var es = require('event-stream');
var fs = require('fs');
var level = require('level')

var LogDB = require('../index.js');

var db = null;

describe('LogDB', function() {
  before(function(done) {
    db = level('/tmp/logdb-' + Date.now(), done);
  });
  it('should store a record of the log file', function(done) {
    done();
  });
  it('should store and retrieve a text stream for a log file in order', function(done) {
    var logdb = new LogDB(db);
    logdb.storeLogFile('test1.log', function(error, logStream) {
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
        var readStream = logdb.readLogFile('test1.log');
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
  it('should store a json stream for a log file in order', function(done) {
    var logdb = new LogDB(db);
    logdb.storeLogFile('test2.log', { valueEncoding: 'json' }, function(error, logStream) {
      var writtenData = [];
      var source = fs.createReadStream(__dirname + '/fixtures/example1.log')
        .pipe(es.split())
        .pipe(through2.obj(function(chunk, enc, done) {
          var item = {
            foo: 'bar',
            data: chunk.toString('utf8'),
          };
          this.push(item);
          writtenData.push(item);
          done();
        }));
      source.pipe(logStream);
      source.on('end', function() {
        setTimeout(function() {
          var readStream = logdb.readLogFile('test2.log', { valueEncoding: 'json' });
          readStream.pipe(es.writeArray(function(error, readData) {
            // Is there a better way to compare values of arrays of objects?
            JSON.stringify(readData).should.equal(JSON.stringify(writtenData));
            done();
          }));
        }, 5);
      });
    });
  });
});

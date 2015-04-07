var through2 = require('through2');
var LevelWriteStream = require('level-writestream');

var LogDB = function(db, options) {
  this.db = db;
  LevelWriteStream(this.db);
  this.options = options || {};
  this.options.padding = this.options.padding || '0000000';
  this.options.paddingLength = this.options.padding.length;
  this.storeLogFile = this.storeLogFile.bind(this);
};

/**
 * Stores a record for the log file and returns the write stream used to append lines to it.
 */
LogDB.prototype.storeLogFile = function(filename, options, done) {
  if (done == undefined) {
    done = options;
    options = {};
  }
  var prefix = options.prefix || 'logdb';
  var separator = options.separator || '!';
  var value = options.jobData || {
    date: Date.now(),
  };
  var self = this;
  var key = prefix + separator + Date.now() + separator + filename;
  this.db.put(key, value, { keyEncoding: 'json' }, function(error) {
    if (error) return done(error);
    var logStream = self.createLogWriteStream(filename, options);
    var dbWriteStream = self.db.createWriteStream();
    logStream.pipe(dbWriteStream);
    done(null, logStream);
  });
};

LogDB.prototype.getPaddedTimestamp = function(number) {
  String(this.options.padding + number).slice(this.options.paddingLength);
};

/**
 * Returns a through stream suitable for piping to a levelup writestream.
 *
 * @filename
 *   The name of the file we are logging to.
 * @options
 *   The options you can set.
 */
LogDB.prototype.createLogWriteStream = function(filename, options) {
  options = options || this.options;
  var line = 0;
  var prefix = options.prefix || 'logdb';
  var separator = options.separator || '!';
  var valueEncoding = options.valueEncoding || 'utf8';
  return through2.obj(function(data, enc, done) {
    if (data == '') return;
    var element = {
      key: prefix + separator + filename + separator + separator + line,
      valueEncoding: valueEncoding,
      value: data,
      type: 'put',
    };
    this.push(element)
    line++;
    done();
  });
};

/**
 * Streams the contents of a file out.
 *
 * @param filename
 *   The name of the log stream.
 */
LogDB.prototype.readLogFile = function(filename, options) {
  options = options || this.options;
  var prefix = options.prefix || 'logdb';
  var separator = options.separator || '!';
  var valueEncoding = options.valueEncoding || 'utf8';
  var baseKey = prefix + separator + filename + separator + separator;
  var config = {
    start: baseKey + '!',
    end: baseKey + '~',
    valueEncoding: valueEncoding,
  };
  return this.db.createValueStream(config);
}

module.exports = LogDB;

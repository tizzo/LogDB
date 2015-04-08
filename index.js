var through2 = require('through2');
var LevelWriteStream = require('level-writestream');

/**
 * LogDB Constructor.
 *
 * @param db
 *   A LevelUp compatible database.
 * @param options
 *   An array of options including:
 *     prefix: key prefix
 *     separator: separates key peices
 *     padding: pad the line number integers
 *     keyEncoding: encoding for the keys.
 *     valueEncoding: encoding for the values.
 */
var LogDB = function(db, options) {
  this.db = db;
  LevelWriteStream(this.db);
  this.options = options || {};
  this.options.padding = this.options.padding || '0000000';
  this.options.paddingLength = this.options.padding.length;
  this.storeLogFile = this.storeLogFile.bind(this);
  this.getPaddedNumber = this.getPaddedNumber.bind(this);
};

/**
 * Stores a record for the log file and returns the write stream used to append lines to it.
 *
 * @param filename
 *   The name of the log.
 * @param options
 *   An optinal array of options
 */
LogDB.prototype.storeLogFile = function(filename, options, done) {
  if (done == undefined && typeof options == 'function') {
    done = options;
    options = this.options;
  }
  options = options || this.options;
  var prefix = options.prefix || 'logdb';
  var separator = options.separator || '!';
  var value = options.jobData || {
    date: Date.now(),
  };
  var self = this;
  var key = prefix + separator + Date.now() + separator + filename;
  var logStream = self.createLogWriteStream(filename, options);
  var dbWriteStream = self.db.createWriteStream();
  logStream.pipe(dbWriteStream);
  this.db.put(key, value, { keyEncoding: 'json' }, function(error) {
    if (done) {
      done(error, logStream);
    }
  });
  return logStream;
};

/**
 * Returns an integer padded with leading zeros to create a predictable key length.
 *
 * @parma number
 *   The number to pad.
 */
LogDB.prototype.getPaddedNumber = function(number) {
  return String(this.options.padding + number).substr(String(number).length, this.options.padding.length);
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
  var self = this;
  return through2.obj(function(data, enc, done) {
    if (data == '') return;
    var element = {
      key: prefix + separator + filename + separator + separator + self.getPaddedNumber(line),
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
 * @param options
 *   An array of options.
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

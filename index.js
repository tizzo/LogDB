var through2 = require('through2');
var LevelWriteStream = require('level-writestream');

var LogDB = function(db, options) {
  this.db = db;
  LevelWriteStream(this.db);
  this.options = options || {};
  this.storeLogFile = this.storeLogFile.bind(this);
};

LogDB.prototype.storeLogFile = function(filename, options, done) {
  if (done == undefined) {
    done = options;
    options = {};
  }
  var logStream = this.createLogWriteStream(filename, options);
  var dbWriteStream = this.db.createWriteStream();
  dbWriteStream.on('finish', function() {
    logStream.emit('finish');
  });
  logStream.pipe(dbWriteStream);
  done(null, logStream);
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
  return through2.obj(function(data, enc, done) {
    if (data == '') return;
    var element = {
      key: prefix + separator + filename + separator + separator + line,
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
 */
LogDB.prototype.readLogFile = function(filename, options) {
  options = options || this.options;
  var prefix = options.prefix || 'logdb';
  var separator = options.separator || '!';
  var baseKey = prefix + separator + filename + separator + separator;
  var config = {
    start: baseKey + '!',
    end: baseKey + '~',
  };
  return this.db.createValueStream(config);
}

module.exports = LogDB;

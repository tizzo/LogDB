# LogDB
[![Build Status](https://travis-ci.org/tizzo/LogDB.svg)](https://travis-ci.org/tizzo/LogDB)
[![Coverage Status](https://coveralls.io/repos/tizzo/LogDB/badge.svg?branch=master)](https://coveralls.io/r/tizzo/LogDB?branch=master)

LogDB is a simple library that uses the [LevelUp](https://github.com/rvagg/node-levelup)
interface to log streams of records into job logs. It is intended for storing the log
output of jobs that are run and to deal with expiring old entries. It provides a simple
way to name a job and get a write stream object that can be used to record all of the
output. You hand in the LevelUp instance so you can use an alternate
[storage backend](https://github.com/rvagg/node-levelup/wiki/Modules#storage), though for
many workloads [LevelDB](https://github.com/google/leveldb) is a great fit given its speed
and the degree to whcih [lexicographical sorting](http://en.wikipedia.org/wiki/Lexicographical_order)
lends itself to ordered streams of data.

## Usage

```` javascript
var LogDB = require('LogDB');

var level = require('level');
var db = level('./logs-database');

var logdb = new LogDB(db);

logdb.storeLogFile('some-job.log', { valueEncoding: 'json' }, function(error, logStream) {
  logStream.write({'some', 'entry'});
  logStream.write({'stuff', 'happened'});
  logStream.end();
  var readStream = logdb.loadLogFile('some-job.log');
  readStream.on('data', function(data) {
    console.log(data);
  });
});
````

## How it works

LogDB adds an entry for each log file indexed by timestamp. The example above would create a key like
`logdb!1428417535674!some-job.log`. This entry will have a json encoded value of either
`{ date: Date.now()}` or whatever was passed in as options.jobData.

A new entry will then be created for each call to `write` with the properties listed below where prefix
and separator are configurable with the options array handed to the constructor, log file is the name
of this log entry, and line number is the line number incrementor starting from 0 and padded with a
configurable list.

    [prefix][separator][log file][separator][separator][line number]

Based on the example above, the following would be the pattern for the first entry:

    logdb!1428417535674!some-job.log!!0000000

## API

### LogDB()

The LogDB constructor is the object exported by the library.  It accepts two parameters, the first
is a LevelUp compatible database object. The second is an options hash with the following (optional)
parameters:

  - `separator`: The separator to use when building keys, defaults to `!`.
  - `prefix`: The prefix to use for the keys generated, defaults to `logdb`.
  - `padding`: The padding to use for log numbers, defaults to `0000000`.
  - `paddingLength`: The length the padded string should be, defaults to `options.padding.length`.
  - `jobData`: A json object used to store metadata about this job.



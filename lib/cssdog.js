var fs = require('fs');
var path = require('path');
var glob = require('glob');
var async = require('async');
var cp = require('child_process');
var casper = require.resolve('casperjs/bin/casperjs');

var ROOT = path.resolve(__dirname, '../');

var regressionTest = path.resolve(ROOT, './lib/casper/regression-test.js');

process.env.PHANTOMJS_EXECUTABLE = require.resolve('phantomjs/bin/phantomjs');

function cssdog(inputGlob, opts, callback) {
  opts = opts === undefined ? {} : opts;

  opts.artifactsDirectory = path.resolve(opts.artifactsDirectory === undefined ? './artifacts' : opts.artifactsDirectory);
  opts.baselinesDirectory = path.resolve(opts.baselinesDirectory === undefined ? path.join(opts.artifactsDirectory, './baselines') : opts.baselinesDirectory);
  opts.dirty = opts.dirty === undefined ? false : opts.dirty;
  opts.rebase = opts.rebase === undefined ? false : opts.rebase;
  opts.timeout = opts.timeout === undefined ? 5 : opts.timeout;
  opts.mismatchTolerance = opts.mismatchTolerance === undefined ? 0.01 : opts.mismatchTolerance;
  opts['no-colors'] = opts['no-colors'] === undefined ? false : opts['no-colors'];
  opts.verbose = opts.verbose === undefined ? false : opts.verbose;

  async.auto({

    inputFiles: function (done) {
      glob(inputGlob, {realpath: true}, function (err, files) {
        if (err) return done(new Error('error when executing input glob:' + err.message));
        if (!files) return done(new Error('no files found matching input glob'), null);
        return done(null, files);
      });
    }

  }, function (err, results) {
    if (err) return callback(err, false, 1);

    var inputs = results.inputFiles;

    var ARGS = [
      'test', regressionTest,
      '--cli',
      '--inputs=' + inputs.join(','),
      '--baselinesDirectory=' + opts.baselinesDirectory,
      '--timeout=' + opts.timeout,
      '--mismatchTolerance=' + opts.mismatchTolerance,
      '--artifactsDirectory=' + opts.artifactsDirectory
    ];

    if (opts.dirty) ARGS.push('--dirty');
    if (opts.rebase) ARGS.push('--rebase');
    if (opts.verbose) ARGS.push('--verbose');
    if (opts['no-colors']) ARGS.push('--no-colors');

    var diff = cp.spawn(casper, ARGS, {stdio: 'inherit', env: process.env});

    var fired = false;

    diff.once('error', function (err) {
      if (!fired) callback(err, false, 1);
      fired = true;
    });

    diff.once('exit', function (code/*, signal*/) {
      if (!fired) callback(null, code === 0, code);
      fired = true;
    });
  });

}
module.exports = cssdog;

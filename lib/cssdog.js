var fs = require('fs');
var path = require('path');
var glob = require('glob');
var async = require('async');
var cp = require('child_process');

var ROOT = path.resolve(__dirname, '../');

var casper = path.resolve(ROOT, './node_modules/.bin/casperjs');
var regressionTest = path.resolve(ROOT, './lib/casper/regression-test.js');

process.env.PHANTOMJS_EXECUTABLE = path.resolve(ROOT, './node_modules/casperjs/node_modules/.bin/phantomjs');

function cssdog(inputGlob, opts, callback) {
  opts = opts === undefined ? {} : opts;

  opts.artifactsDirectory = path.resolve(opts.artifactsDirectory === undefined ? './artifacts' : opts.artifactsDirectory);
  opts.baselinesDirectory = path.resolve(opts.baselinesDirectory === undefined ? path.join(opts.artifactsDirectory, './baselines') : opts.baselinesDirectory);
  opts.dirty = opts.dirty === undefined ? false : opts.dirty;
  opts.rebase = opts.rebase === undefined ? false : opts.rebase;
  opts.verbose = opts.verbose === undefined ? false : opts.verbose;
  opts.mismatchTolerance = opts.mismatchTolerance === undefined ? 0.01 : opts.mismatchTolerance;

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
      '--inputs=' + inputs.join(','),
      '--baselinesDirectory=' + opts.baselinesDirectory,
      '--mismatchTolerance=' + opts.mismatchTolerance,
      '--artifactsDirectory=' + opts.artifactsDirectory
    ];

    if (opts.dirty) ARGS.push('--dirty');
    if (opts.rebase) ARGS.push('--rebase');
    if (opts.verbose) ARGS.push('--verbose');

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

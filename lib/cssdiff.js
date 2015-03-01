var fs = require('fs');
var path = require('path');
var glob = require('glob');
var cp = require('child_process');

var ROOT_PATH = path.resolve(__dirname, '../');
var DEPS_EXES = path.resolve(ROOT_PATH, './node_modules/.bin');

var CASPERJS_EXECUTABLE = path.resolve(DEPS_EXES, './casperjs');
var SLIMERJS_EXECUTABLE = path.resolve(DEPS_EXES, './slimerjs');
var PHANTOMJS_EXECUTABLE = path.resolve(DEPS_EXES, './phantomjs');

var CMD = CASPERJS_EXECUTABLE;
process.env.SLIMERJS_EXECUTABLE = SLIMERJS_EXECUTABLE;
process.env.PHANTOMJS_EXECUTABLE = PHANTOMJS_EXECUTABLE;

function cssdiff(globStr, opts, callback) {
  opts = opts === undefined ? {} : opts;
  opts.engine = opts.engine === undefined ? 'phantomjs' : opts.engine;
  opts.verbose = opts.verbose === undefined ? false : opts.verbose;
  opts.logLevel = opts.logLevel === undefined ? 'info' : opts.logLevel;
  opts.rebase = opts.rebase === undefined ? false : opts.rebase;
  opts.dirty = opts.dirty === undefined ? false : opts.dirty;
  opts.mismatchTolerance = opts.mismatchTolerance === undefined ? 0.05 : opts.mismatchTolerance;
  opts.outputDir = opts.outputDir === undefined ? './out' : opts.outputDir;

  glob(globStr, function (err, files) {
    if (err) return callback(err, false);
    if (!files) return callback(new Error('no files found matching glob'), false);

    var ARGS = [
      'test', path.resolve(ROOT_PATH, './lib/casper-test-process.js'),
      '--files=' + files,
      '--engine=' + opts.engine,
      '--mismatchTolerance=' + opts.mismatchTolerance,
      '--outputDir=' + opts.outputDir
    ];

    if (opts.dirty) ARGS.push('--dirty');
    if (opts.rebase) ARGS.push('--rebase');
    if (opts.verbose) ARGS = ARGS.concat(['--verbose', '--log-level=' + opts.logLevel]);

    var diff = cp.spawn(CMD, ARGS, {stdio: 'inherit', env: process.env});

    fired = false;

    diff.once('error', function (err) {
      if (!fired) callback(err, false);
      fired = true;
    });

    diff.once('exit', function (code/*, signal*/) {
      if (!fired) callback(null, code === 0, code);
      fired = true;
    });

  })

}
module.exports = cssdiff;

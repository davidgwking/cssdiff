var system = require('system');
var path = require('path-browserify');

var __dirname = path.dirname(system.args[4]);

require(__dirname + '/process');
var util = require(__dirname + '/util');
var resembleContainerPath = path.join(__dirname, '../resemble/container.html');

var inputPaths = casper.cli.get('inputs');
if (inputPaths)
  inputPaths = inputPaths.split(',');
else
  throw new Error('No input files found.');

var artifactsDirectory = casper.cli.get('artifactsDirectory');
var resultsDirectory = path.join(artifactsDirectory, './results');
var failuresDirectory = path.join(artifactsDirectory, './failures');

var baselinesDirectory = casper.cli.get('baselinesDirectory');

var dirty = Boolean(util.defaultsTo(casper.cli.get('dirty'), false));
var rebase = Boolean(util.defaultsTo(casper.cli.get('rebase'), false));
var verbose = Boolean(util.defaultsTo(casper.cli.get('verbose'), false));
var timeoutMs = Number(util.defaultsTo(casper.cli.get('timeout'), 5.0)) * 1000;
var mismatchTolerance = Number(util.defaultsTo(casper.cli.get('mismatchTolerance'), 0.01));

var skips = 0;
var failures = 0;
var successes = 0;
function addSkip() { skips++; }
function addFailure() { failures++; }
function addSuccess() { successes++; }

casper.test.begin('Regression Test', function (test) {
  casper.start();

  casper.options.waitTimeout = timeoutMs;

  casper.on('remote.message', function(msg) {
    info(msg);
  });

  casper.on('page.error', function (msg) {
    error(msg);
  });

  casper.test.on("fail", addFailure);
  casper.test.on("success", addSuccess);

  // cleanup transient files
  cleanup();

  // localize input files
  var files = getFiles(inputPaths);

  // take screenshots
  casper.viewport(1024, 768).then(function () {
    info('Capturing baseline and comparison screenshots...');
    casper.eachThen(files, function (testFile) {
      testFile = testFile.data;

      casper.thenOpen(testFile.path, function () {
        casper.captureSelector(testFile.screenshotPath, ':root');
        verboseInfo('Captured comparison screenshot of ' + testFile.path + '\n' +
                    '\tto ' + testFile.screenshotPath);
      });

      casper.thenOpen(testFile.baselinePath, function () {
        // casper will kindly capture an empty image if the file doesn't exist...
        // we don't want to generate empty screenshots, however
        if (!util.isFile(testFile.baselinePath)) {
          verboseInfo('Failed to capture baseline screenshot.\n' +
                      '\tDid not find ' + testFile.baselinePath);
          return;
        }

        casper.captureSelector(testFile.baselineScreenshotPath, ':root');
        verboseInfo('Captured baseline screenshot of ' + testFile.baselinePath + '\n' +
                    '\tto ' + testFile.baselineScreenshotPath);
      });

    });
  });

  // regression test
  casper.then(function () {
    if (rebase) return;

    info('Starting regression testing...');
    info('Tests with a mismatch percentage greater than ' + mismatchTolerance + ' will fail.')
    casper.eachThen(files, function (testFile) {
      testFile = testFile.data;

      regressionTest(testFile);
    });
  });

  casper.run(function end() {
    casper.test.done();

    var exitCode = 0;

    // force baseline
    if (rebase) {
      info('Establishing new baseline...');

      util.resetDirectory(baselinesDirectory);
      files.forEach(function (file) {
        util.copyFile(file.path, file.baselinePath);
      });

      info('Finished establishing new baseline...');
      return exit(exitCode);
    }

    // report on no tests, but expected tests
    if (!files.some(function (file) { return file.tested; })) {
      warn('Detected that no tests were performed.\n' +
           '\t\tIs this your first run? If so, that is okay.\n' +
           '\t\tIf not, check your baselines directory path.');
      return exit(exitCode);
    }

    // warn on new files without a baseline match
    files.forEach(function (file) {
      if (!file.tested) {
        warn('File was not regression tested: ' + file.path + '\n' +
             '\t\tFile has screenshot path ' + file.screenshotPath + '\n' +
             '\t\tExpected to find a baseline artifact for this file, but did not.');
      }
    });

    // warn on untested baselines
    var baselinesTested = files.reduce(function (baselines, file) {
      baselines.push(file.baselinePath);
      return baselines;
    }, []);
    var baselinesUntested = util.lsr(baselinesDirectory).filter(function (baselinePath) {
      return baselinesTested.indexOf(baselinePath) === -1;
    });
    baselinesUntested.forEach(function (baseline) {
      warn('Baselined artifact was not regression tested: ' + baseline + '\n' +
           '\t\tIt appears we did not generate a screenshot to compare against this baseline artifact..');
    });

    if (failures > 0) exitCode = 1;

    return exit(exitCode);
  });
});

function cleanup() {
  util.resetDirectory(resultsDirectory);
  util.resetDirectory(failuresDirectory);
}

function getFiles(paths) {
  var allInputsAreFiles = inputPaths.every(util.isFile);
  if (!allInputsAreFiles)
    throw new Error('found that inputs contains non-files. check input file glob in correct.');

  var inputsRoot = util.findDeepestCommonDirectory(inputPaths);
  return paths.map(function (path) {
    return {
      tested: false,

      success: null,
      mismatchPercentage: null,

      path:                         path,
      baselinePath:                 getBaselinePath(path, inputsRoot),
      baselineScreenshotPath:       getBaselineScreenshotPath(path, inputsRoot),
      screenshotPath:               getScreenshotPath(path, inputsRoot),
      diffPath:                     getDiffPath(path, inputsRoot),
      failurePath:                  getFailurePath(path, inputsRoot)
    };
  });
}

function regressionTest(testFile) {
  var baselinePath = testFile.baselinePath;
  var baselineScreenshotPath = testFile.baselineScreenshotPath;
  var screenshotPath = testFile.screenshotPath;
  var diffPath = testFile.diffPath;
  var failurePath = testFile.failurePath;

  verboseInfo('Comparing screenshot at ' + screenshotPath + '\n' +
              '\tto baseline screenshot at ' + baselineScreenshotPath + '\n' +
              '\t\tgenerated from source html at ' + baselinePath + '\n' +
              '\tsaving diff to ' + diffPath + '\n' +
              '\tsaving failures to ' + failurePath);

  var exists = util.isFile(baselineScreenshotPath);
  if (!exists) {
    addSkip();
    return casper.test.skip(0, testFile.path);
  }

  casper.thenOpen(resembleContainerPath, function () {
    casper.page.injectJs('../../resemblejs/resemble.js');

    casper.thenEvaluate(function () {
      var div = document.createElement('div');
			div.style = "display:block;position:absolute;border:0;top:10px;left:0;";
      div.innerHTML = '<form id="image-diff-form">' +
	                      '<input type="file" id="image-diff-one" name="one"/>' +
				                '<input type="file" id="image-diff-two" name="two"/>' +
				              '</form>' +
                      '<div id="image-diff"></div>';
			document.body.appendChild(div);

      window._imagediff_ = {
        diffed: false,
        loaded: false,
        captured: false,
        hasResults: false,
        results: {
          success: null,
          mismatchPercentage: null
        }
      };
    });

    casper.then(function () {
      casper.fill('form#image-diff-form', {one: baselineScreenshotPath, two: screenshotPath});
    });

    casper.thenEvaluate(function (mismatchTolerance) {
      var baselineFile = document.getElementById('image-diff-one').files[0];
      var screenshotFile = document.getElementById('image-diff-two').files[0];

      resemble(baselineFile)
        .compareTo(screenshotFile)
        .ignoreAntialiasing()
        .onComplete(function (data) {
          window._imagediff_.diffed = true;

          // render image
          var img = new Image();
          img.onload = function () {
            window._imagediff_.loaded = true;
          };
          document.getElementById('image-diff').appendChild(img);
          img.src = data.getImageDataUrl();

          // save result
          var misMatchPercentageResult = Number(data.misMatchPercentage);
          if (misMatchPercentageResult > mismatchTolerance) {
            window._imagediff_.results.success = false;
            window._imagediff_.results.mismatchPercentage = misMatchPercentageResult;
          }
          else {
            window._imagediff_.results.success = true;
            window._imagediff_.results.mismatchPercentage = 0.0;
          }
          window._imagediff_.hasResults = true;
        });
    }, mismatchTolerance);

    casper.then(function () {
      casper.waitFor(function () {
        return casper.evaluate(function () {
          return window._imagediff_.diffed && window._imagediff_.loaded && window._imagediff_.hasResults;
        });
      }, function () {
        testFile.tested = true;

        casper.captureSelector(diffPath, 'img');
        casper.evaluate(function () {
          window._imagediff_.captured = true;
        });
      }, function () {
        casper.test.fail('[TIMEOUT] Failed to regression test ' +
                         testFile.screenshotPath + ' against ' + testFile.baselineScreenshotPath +
                         ' within ' + (timeoutMs/1000) + ' seconds. ');
      });
    });

    casper.then(function () {
      casper.waitFor(function () {
        return casper.evaluate(function () {
          return window._imagediff_.captured;
        });
      }, function () {
        var results = casper.evaluate(function () {
          return window._imagediff_.results;
        });

        testFile.success = results.success;
        testFile.mismatchPercentage = results.mismatchPercentage;

        if (results.success) {
          casper.test.pass(testFile.path);
        }
        else {
          util.copyFile(diffPath, failurePath);
          casper.test.fail(testFile.path + '; mismatch percentage=' + results.mismatchPercentage);
        }
      }, function () {
        casper.test.fail('[TIMEOUT] Failed to capture screenshot of differences between ' +
                         testFile.screenshotPath + ' and ' + testFile.baselineScreenshotPath +
                         ' within ' + (timeoutMs/1000) + ' seconds. ');
      });
    });
  });
}

function exit(code) {
  // cleanup files
  if (!dirty) {
    info('Cleaning up transient files...');

    util.resetDirectory(resultsDirectory);
  }

  info(successes + ' TESTS PASSED. ' +
       failures + ' TESTS FAILED. ' +
       skips + ' TESTS SKIPPED. ' +
       (successes + skips + failures) + ' TESTS TOTAL.');
  info("Exiting...");
  casper.exit(code);
}

function verboseInfo(str) {
  if (verbose) casper.echo('\n[INFO] ' + str + '\n', 'INFO');
}

function info(str) {
  casper.echo('\n[INFO] ' + str + '\n', 'INFO');
}

function warn(str) {
  casper.echo('\n[WARN] ' + str + '\n', 'WARNING');
}

function error(str) {
  casper.echo('\n[ERROR] ' + str + '\n', 'ERROR');
}

function getRelativePath(target, inputsRoot) {
  return path.relative(inputsRoot, target);
}

function getScreenshotPath(input, inputsRoot) {
  return path.join(resultsDirectory, getRelativePath(input, inputsRoot) + '.png');
}

function getBaselineScreenshotPath(input, inputsRoot) {
  return path.join(resultsDirectory, getRelativePath(input, inputsRoot) + '.baseline.png');
}

function getDiffPath(input, inputsRoot) {
  return path.join(resultsDirectory, getRelativePath(input, inputsRoot) + '.diff.png');
}

function getFailurePath(input, inputsRoot) {
  return path.join(failuresDirectory, getRelativePath(input, inputsRoot) + '.png');
}

function getBaselinePath(input, inputsRoot) {
  return path.join(baselinesDirectory, getRelativePath(input, inputsRoot));
}

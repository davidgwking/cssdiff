var fs = require('fs');
var path = require('path-browserify');
var phantomcss = require('phantomcss');

var LIBRARY_PATH = fs.absolute(phantom.libraryPath + '/../../phantomcss');

// Set Casper Options
casper.options.viewportSize = {width: 1027, height: 800};

var files = casper.cli.get('files');
files = files ? files.split(',') : [];

var outputDir = casper.cli.get('outputDir');
var screenshotsPath = fs.absolute(fs.workingDirectory + '/' + outputDir + '/screenshots');
var failuresPath = fs.absolute(fs.workingDirectory + '/' + outputDir + '/failures');
var resultsPath = fs.absolute(fs.workingDirectory + '/' + outputDir + '/results');
var rebase = casper.cli.get('rebase');


// Initialize PhantomCSS
phantomcss.init({
  libraryRoot: LIBRARY_PATH,
  screenshotRoot: screenshotsPath,
  comparisonResultRoot: resultsPath,
  failedComparisonsRoot: failuresPath,

  casper: casper,
  addLabelToFailedImage: true,
  rebase: rebase,
  cleanupComparisonImages: !casper.cli.get('dirty'),
  mismatchTolerance: casper.cli.get('mismatchTolerance'),

  fileNameGetter: fileNameGetter,
  onNewImage: onNewImage
});

var warnings = [];

casper.test.begin('CSS Difference Tests', function (test) {

  casper.start();

  casper.each(files, function (self, file) {
    if (!file) return;
    self.thenOpen(file, function () {
      phantomcss.screenshot(':root', file);
    });
  });

  casper.then(function reportMissingArtifacts() {
    if (rebase) return;

    var diffed = phantomcss.getCreatedDiffFiles().map(function (fName) {
      return path.basename(fName, '.diff.png');
    });

    var baselined = getFilesRecursively(screenshotsPath).map(function (fName) {
      return path.basename(fName, '.png');
    });

    var missing = baselined.reduce(function (memo, fName) {
      if (diffed.indexOf(fName) >= 0) return memo;
      memo.push(fName);
      return memo;
    }, []);

    missing.forEach(function (missingFileName) {
      warnings.push('[WARNING] Baselined artifact was not regression tested: ' +
                      missingFileName);
    });
  });

  casper.then(function compare() {
    phantomcss.compareAll();
  });

  casper.then(function printWarnings() {
    warnings.forEach(function (warning) {
      console.log('\n');
      casper.test.info(warning);
    });
  });

  casper.run(function end() {
    var code = phantomcss.getExitStatus();
    code = code === undefined ? 0 : code;

    test.done();
    casper.exit(code);
	});

});

function getFilesRecursively(path) {
  var list = fs.list(path);
  return list.reduce(function (memo, li) {
    if (li === '.' || li === '..') return memo;
    li = fs.absolute(path + '/' + li);
    if (fs.isFile(li)) memo.push(li);
    if (fs.isDirectory(li)) memo = memo.concat(getFilesRecursively(li));
    return memo;
  }, []);
}

function fileNameGetter( root, fileName ) {
  var name = root + fs.separator + fileName;
  if (isFile(name + '.png')) {
    return name + '.diff.png';
  } else {
    return name + '.png';
  }
}

function onNewImage(test) {
  if (rebase) {
    console.log('\n');
    casper.test.info('New baseline image at ' + test.filename);
  }
  else {
    var fileName = path.basename(test.filename, '.png');
    warnings.push('[WARNING] Detected new file that was not regression tested: ' + fileName);

   // clean up result html that was just added by phantomcss
   if (isFile(test.filename)) fs.remove(test.filename);

   // clean up baseline image that was just added by phantomcss
   files.forEach(function (file) {
     if (path.basename(file) === fileName) {
       var abs = fs.absolute(screenshotsPath + '/' + file + '.png');
       if (isFile(abs)) fs.remove(abs);
     }
   });
  }
}

function isFile( path ) {
	var exists = false;
	try {
		exists = fs.isFile(path);
	} catch ( e ) {
		if ( e.name !== 'NS_ERROR_FILE_TARGET_DOES_NOT_EXIST' && e.name !== 'NS_ERROR_FILE_NOT_FOUND' ) {
			// We weren't expecting this exception
			throw e;
		}
	}
	return exists;
}
var phantomcss = require('phantomcss');

const LIBRARY_PATH = fs.absolute(phantom.libraryPath + '/../../phantomcss');

// Set Casper Options
casper.options.viewportSize = {width: 1027, height: 800};

var files = casper.cli.get('files');
files = files ? files.split(',') : [];

var outputDir = casper.cli.get('outputDir');
var screenshotsPath = fs.absolute(fs.workingDirectory + '/' + outputDir + '/screenshots');
var failuresPath = fs.absolute(fs.workingDirectory + '/' + outputDir + '/failures');
var resultsPath = fs.absolute(fs.workingDirectory + '/' + outputDir + '/results');

// Initialize PhantomCSS
phantomcss.init({
  libraryRoot: LIBRARY_PATH,
  screenshotRoot: screenshotsPath,
  comparisonResultRoot: resultsPath,
  failedComparisonsRoot: failuresPath,

  casper: casper,
  addLabelToFailedImage: true,
  rebase: casper.cli.get('rebase'),
  cleanupComparisonImages: !casper.cli.get('dirty'),
  mismatchTolerance: casper.cli.get('mismatchTolerance')
});

casper.test.begin('CSS Difference Tests', function (test) {

  casper.start();

  casper.each(files, function (self, file) {
    if (!file) return;
    self.thenOpen(file, function () {
      phantomcss.screenshot(':root', file);
    });
  });

  casper.then(function compare() {
    phantomcss.compareAll();
  });

  casper.run(function end() {
    var code = phantomcss.getExitStatus();
    code = code === undefined ? 0 : code;

    test.done();
    casper.exit(code);
	});

});

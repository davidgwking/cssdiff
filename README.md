# cssdog

A small cli tool for performing root-level css regression testing on static html. This tool is also programmable from within *node*.

The implementation leverages [PhantomCSS](https://github.com/Huddle/PhantomCSS), launching [Casper](https://github.com/n1k0/casperjs) and [PhantomJS](https://github.com/ariya/phantomjs) as a child process.

Any generated artifacts will be stored in your current working directory.

File selection is powered by [glob](https://github.com/isaacs/node-glob).

```bash
$ cssdog "html/{,**/*}*.html" -h
node cssdog/bin/cssdog <glob> [options...]

Options:
  --version        Show version number
  -e, --engine     rendering engine of choice [phantomjs|slimerjs]
                                                          [default: "phantomjs"]
  -v, --verbose    whether to print log messages to stdout      [default: false]
  -l, --log-level  desired logging level [debug|info|warning|error]
                                                               [default: "info"]
  -r, --rebase     create a new baseline. this will delete your current
                   baseline snapshots.                          [default: false]
  -d, --dirty      do not clean up comparison artifacts and results following a
                   run.                                         [default: false]
  -t, --tolerance  Mismatch tolerance. Increasing this value will decrease test
                   coverage. Defaults to 0.05%.                  [default: 0.05]
  -o, --outputDir  specify the output artifacts and results directory.
                                                              [default: "./out"]
  -h               Show help

```

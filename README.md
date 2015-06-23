# cssdog

A small cli tool for performing root-level css regression testing on static html. This tool is also programmable from within *node*.

The implementation leverages [Resemble.js](https://github.com/Huddle/Resemble.js), launching [Casper](https://github.com/n1k0/casperjs) and [PhantomJS](https://github.com/ariya/phantomjs) as a child process.

File (input) selection is powered by [glob](https://github.com/isaacs/node-glob).

Unlike other css regression tools, *cssdog* does not baseline images. *cssdog* instead baselines the input html, seeking to ease the pains of performing cross-system visual regression testing. New screenshots of baselined html are captured during each regression test.

```bash
$ cssdog "html/{,**/}*.html" -h
node cssdog <input glob> [options...]

Options:
  --version                 Show version number                        [boolean]
  -a, --artifactsDirectory  location where intermediary results and failures are
                            stored.            [string] [default: "./artifacts"]
  -b, --baselinesDirectory  location where from where baselines are loaded and
                            stored. Defaults to ./{{artifactsDirectory}}/
                            baselines                                   [string]
  -d, --dirty               do not clean up comparison artifacts and results
                            following a run.          [boolean] [default: false]
  -r, --rebase              create a new baseline. this will delete your current
                            baseline snapshots.       [boolean] [default: false]
  -s, --timeout             regression test timeout in seconds. Defaults to 5
                            seconds.                                [default: 5]
  -t, --tolerance           mismatch tolerance. Increasing this value will
                            decrease test coverage. Defaults to 0.01%.
                                                                 [default: 0.01]
  -v, --verbose             whether to print log messages to stdout
                                                      [boolean] [default: false]
  --no-colors               disable colorized output  [boolean] [default: false]
  -h                        Show help                                  [boolean]
```

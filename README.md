# cssdog

A small cli tool for performing root-level css regression testing on static html. This tool is also programmable from within *node*.

The implementation leverages [Resemble.js](https://github.com/Huddle/Resemble.js), launching [Casper](https://github.com/n1k0/casperjs) and [PhantomJS](https://github.com/ariya/phantomjs) as a child process.

File (input) selection is powered by [glob](https://github.com/isaacs/node-glob).

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
  -t, --tolerance           Mismatch tolerance. Increasing this value will
                            decrease test coverage. Defaults to 0.05%.
                                                                 [default: 0.05]
  -v, --verbose             verbose logging to stdout and stderr
                                                      [boolean] [default: false]
  -h                        Show help                                  [boolean]
```

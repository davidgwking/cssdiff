var fs = require('fs');

global.process = {
  cwd: function () {
    return fs.workingDirectory;
  }
};

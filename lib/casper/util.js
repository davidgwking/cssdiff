var fs = require('fs');

/**
 * PATH UTILITIES
 */
function findDeepestCommonDirectory(inputPaths) {
  if (inputPaths.length === 1) return '.';

  inputDirs = inputPaths.map(function (input) {
    var i = input.split(fs.separator);
    return i.slice(0, i.length - 1);
  });

  var deepestCommonDirectory = inputDirs[0];
  inputDirs.forEach(function (inputDir) {
    var i;
    for (i = 0; i < deepestCommonDirectory.length; i++) {
      if (deepestCommonDirectory[i] === inputDir[i]) continue;

      deepestCommonDirectory = deepestCommonDirectory.slice(0, i);
      break;
    }
  });

  return deepestCommonDirectory.join(fs.separator);
}

/**
 * FILE SYSTEM UTILITIES
 */
function isFile(path) {
	var exists = false;
	try {
		exists = fs.isFile(path);
	} catch (e) {
		if (e.name !== 'NS_ERROR_FILE_TARGET_DOES_NOT_EXIST' && e.name !== 'NS_ERROR_FILE_NOT_FOUND')
			return false;
    throw e;
	}
	return exists;
}

function removeFile(sourcePath) {
  fs.remove(sourcePath);
}

function copyFile(sourcePath, targetPath) {
  makeDirectory(path.dirname(targetPath));
  fs.copy(sourcePath, targetPath);
}

function removeDirectory(path) {
  try {
    fs.removeTree(path);
  } catch (e) {
    throw new Error('failed to remove directory: ' + path);
  }
  return true;
}

function makeDirectory(path) {
  var success = fs.makeTree(path);

  if (!success) throw new Error('failed to make directory: ' + path);

  return success;
}

function resetDirectory(path) {
  util.removeDirectory(path);
  util.makeDirectory(path);
}

function lsr(path) {
  var list = fs.list(path);
  return list.reduce(function (memo, li) {
    if (li === '.' || li === '..') return memo;
    li = fs.absolute(path + '/' + li);
    if (fs.isFile(li)) memo.push(li);
    if (fs.isDirectory(li)) memo = memo.concat(lsr(li));
    return memo;
  }, []);
}

/**
 * MISC UTILITIES
 */
function defaultsTo(value, defaultValue) {
  return value === undefined || value === null ? defaultValue : value;
}

module.exports = {
  findDeepestCommonDirectory: findDeepestCommonDirectory,

  isFile: isFile,
  removeFile: removeFile,
  copyFile: copyFile,
  removeDirectory: removeDirectory,
  makeDirectory: makeDirectory,
  resetDirectory: resetDirectory,
  lsr: lsr,

  defaultsTo: defaultsTo
};

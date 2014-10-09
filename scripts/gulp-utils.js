var gulp = require('gulp');
var filter = require('gulp-filter');
var through2 = require('through2');

var path = require('path');

var getModuleInfo = require('../docs/util/ngModuleData.js');

var noop = function() { };

exports.pathForModule = function(name, paths, cb) {
  generateModulePathMap(paths, function(err, map) {
    if (err) return cb(err);
    return map[name] ? cb(null, map[name]) : cb(new Error('Could not find module ' + name));
  });
};


/* Build an object that resolves module names
 * to file paths
 */
var moduleMap;
function generateModulePathMap(paths, cb) {
  if (moduleMap) return cb(null, moduleMap);

  moduleMap = {};

  gulp.src(paths)
  .pipe(filter(['**/*.js', '!demo*/']))
  .pipe(through2.obj(function(file, enc, next) {
    var modName = getModuleInfo(file.contents).module;
    var modulePath = file.path.split(path.sep).slice(0, -1).join(path.sep);
    moduleMap[modName] = modulePath;
    return next();
  })
  .on('data', noop)
  .on('error', function(err) {
    cb(err, null);
  }).on('end', function() {
    cb(null, moduleMap);
  }));
}

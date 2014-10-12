var gulp = require('gulp');
var filter = require('gulp-filter');
var through2 = require('through2');
var gutil = require('gulp-util');
var Buffer = require('buffer').Buffer;

var path = require('path');

var getModuleInfo = require('../docs/util/ngModuleData.js');

var noop = function() { };


var pathsForModules = {
};

exports.filesForModule = function(name) {
  if (pathsForModules[name]) {
    return gulp.src(pathsForModule[name]);
  } else {
    return gulp.src('src/{services,components}/**')
      .pipe(through2.obj(function(file, enc, next) {
        var modName = getModuleInfo(file.contents).module;
        if (modName == name) {
          var modulePath = file.path.split(path.sep).slice(0, -1).join(path.sep);
          pathsForModules[name] = modulePath + '/**';
          var self = this;
          gulp.src(pathsForModules[name])
            .on('data', function(data) {
              self.push(data);
            });
        }
        next();
      }));
  }
};

exports.buildModuleBower = function(name, version) {
  return through2.obj(function(file, enc, next) {
    this.push(file);

    
    var moduleInfo = getModuleInfo(file.contents);
    if (moduleInfo.module) {
      var bowerDeps = {};

      moduleInfo.dependencies && moduleInfo.dependencies.forEach(function(dep) {
        var convertedName = 'material-design-' + dep.split('.').slice(-1);
        bowerDeps[convertedName] = version;
      });

      var bowerContents = JSON.stringify({
        name: 'material-design-' + name,
        version: version,
        dependencies: bowerDeps
      });
      var bowerFile = new gutil.File({
        base: file.base,
        path: file.base + '/bower.json',
        contents: new Buffer(bowerContents)
      });
      this.push(bowerFile);
    }
    next();
  });
};

exports.hoistScssVariables = function() {
  return through2.obj(function(file, enc, next) {
    var contents = file.contents.toString().split('\n');
    var lastVariableLine = -1;

    for( var currentLine = 0; currentLine < contents.length; ++currentLine) {
      var line = contents[currentLine];
      if (/^\$/.test(line)) {
        if (currentLine != lastVariableLine + 1) {
          var variable = contents.splice(currentLine, 1)[0];
          contents.splice(++lastVariableLine, 0, variable);
        }
      }
    }
    file.contents = new Buffer(contents.join('\n'));
    this.push(file);
    next();
  });
};

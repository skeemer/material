var Dgeni = require('dgeni');
var _ = require('lodash');
var concat = require('gulp-concat');
var fs = require('fs');
var gulpif = require('gulp-if');
var lazypipe = require('lazypipe');
var minifyCss = require('gulp-minify-css');
var minifyHtml = require('gulp-minify-html');
var mkdirp = require('mkdirp');
var ngHtml2js = require('gulp-ng-html2js');
var path = require('path');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var through2 = require('through2');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');

var DEMOS = [];

module.exports = function(gulp, argv) {
  gulp.task('docs', ['docs-js', 'docs-css']);

  gulp.task('demos', ['demo-files'], function(done) {
    var dest = path.resolve(__dirname, '../dist/docs/js');
    var file = "angular.module('docsApp').constant('DEMOS', " + 
      JSON.stringify(DEMOS, null, 2) + ");";
    mkdirp(dest, function() {
     fs.writeFile(dest + '/demo-data.js', file, done);
    });
  });

  gulp.task('demo-files', function() {

    return gulp.src('src/**/demo*/*.{html,css,js}')
      // .pipe(gulpif(/\.css$/, transformCss()))
      // .pipe(gulpif(/\.html$/, transformHtml()))
      // .pipe(gulpif(/\.js$/, transformJs()))
      .pipe(addFileToDemosIndex())
      .pipe(gulp.dest('dist/docs/demo-partials'));

    function transformCss() {
      return lazypipe()
        .pipe(through2.obj, function(file, enc, callback) {
          var demoId = getDemoId(file);
          file.contents = new Buffer(
            '.' + demoId + ' {\n' + file.contents.toString() + '\n}'
          );
          callback(null, file);
        })
        .pipe(sass)
        ();
    }

    function addFileToDemosIndex() {
      return through2.obj(function(file, enc, callback) {
        var moduleName = getModuleName(file);
        var demoId = getDemoId(file);
        var moduleDemos, demo;
        
        if ( !(moduleDemos = _.find(DEMOS, { name: moduleName })) ) {
          DEMOS.push(moduleDemos = {
            name: moduleName,
            label: labelFromModuleName(moduleName),
            demos: [],
            url: '/' + moduleName + '/demo'
          });
        }
        if ( !(demo = _.find(moduleDemos.demos, { name: demoId })) ) {
          moduleDemos.demos.push(demo = {
            name: demoId,
            label: labelFromDemoId(demoId)
          });
        }

        var fileType = path.extname(file.path).substring(1);

        if (path.basename(file.path) === 'index.html') {
          demo.index = toDemoObject(file);
        } else {
          demo[fileType] = demo[fileType] || [];
          demo[fileType].push(toDemoObject(file));
        }
        if (fileType === 'js') {
          demo.ngModule = demo.ngModule || getNgModule(file.contents.toString());
        }

        return callback(null, file);
      });
    }
  });
  
  gulp.task('docs-generate', ['build'], function() {
    var dgeni = new Dgeni([
      require('./config')
    ]);
    return dgeni.generate();
  });

  gulp.task('docs-app', ['docs-generate'], function() {
    return gulp.src(['docs/app/**/*', '!docs/app/partials/**/*.html'])
      .pipe(gulp.dest('dist/docs'));
  });

  gulp.task('docs-js', ['docs-app', 'docs-html2js', 'demos'], function() {
    return gulp.src([
      'bower_components/angularytics/dist/angularytics.js',
      'bower_components/hammerjs/hammer.js',
      'dist/angular-material.js',
      'dist/docs/js/**/*.js',
      'dist/docs/generated/**/demo/*.js',
      'dist/docs/demo-partials/**/*.js',
    ])
      .pipe(concat('docs.js'))
      .pipe(gulpif(argv.release, uglify()))
      .pipe(gulp.dest('dist/docs'));
  });

  gulp.task('docs-css', ['docs-app'], function() {
    return gulp.src([
      'dist/angular-material.css',
      'docs/app/css/highlightjs-github.css',
      'docs/app/css/layout-demo.css',
      'docs/app/css/style.css'
    ])
      .pipe(concat('docs.css'))
      .pipe(gulp.dest('dist/docs'));
  });

  gulp.task('docs-html2js', function() {
    return gulp.src('docs/app/**/*.tmpl.html')
      .pipe(ngHtml2js({
        moduleName: 'docsApp',
        declareModule: false
      }))
      .pipe(concat('docs-templates.js'))
      .pipe(gulp.dest('dist/docs/js'));
  });

};

function toDemoObject(file) {
  return {
    name: path.basename(file.path),
    label: labelFromModuleName(getModuleName(file)),
    contents: file.contents.toString(),
    outputPath: 'demo-partials/' + file.relative,
    fileType: path.extname(file.path).substring(1),
  };
}

function getModuleName(file) {
  var srcPath = file.path.replace(/^.*\/src\//, '');
  var split = srcPath.split('/');
  return 'material.' + split[0] + '.' + split[1];
}

function humanizeCamelCase(str) {
  return str.charAt(0).toUpperCase() +
    str.substring(1).replace(/[A-Z]/g, function($1) {
      return ' ' + $1.toUpperCase();
    });
}

function labelFromModuleName(moduleName) {
  return humanizeCamelCase( moduleName.split('.').pop() );
}

function labelFromDemoId(demoId) {
  return humanizeCamelCase( demoId.replace(/demo.*$/,'') );
}

function getDemoId(file) {
  var moduleName = getModuleName(file);
  var match = file.path.match(/\/demo.*?\//);
  if (!match) return;
  return moduleName.split('.').pop() + match[0].replace(/\//g, '');
}

function getNgModule(fileContent) {
  var NG_MODULE_REGEX = /\.module\(('[^']*'|"[^"]*")\s*,(?:\s*\[([^\]]+)\])?/g;
  var match = NG_MODULE_REGEX.exec(fileContent || '');
  var module = match && match[1] && match[1].slice(1, -1); //remove quotes
  return module || '';
}

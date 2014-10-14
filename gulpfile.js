
var _ = require('lodash');
var changelog = require('conventional-changelog');
var dgeni = require('dgeni');
var fs = require('fs');
var glob = require('glob').sync;
var gulp = require('gulp');
var karma = require('karma').server;
var pkg = require('./package.json');
var exec = require('child_process').exec;
var writeFile = require('fs').writeFile;

var argv = require('minimist')(process.argv.slice(2));

var concat = require('gulp-concat');
var footer = require('gulp-footer');
var gulpif = require('gulp-if');
var header = require('gulp-header');
var html2js = require('gulp-ng-html2js');
var jshint = require('gulp-jshint');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var stripDebug = require('gulp-strip-debug');
var template = require('gulp-template');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var replace = require('gulp-replace');
var uncss = require('gulp-uncss');

var buildConfig = require('./config/build.config');
var karmaConf = require('./config/karma.conf.js');

var IS_RELEASE_BUILD = !!argv.release;
if (IS_RELEASE_BUILD) {
  console.log(
    gutil.colors.red('--release:'),
    'Building release version (minified, debugs stripped)...'
  );
}

require('./docs/gulpfile')(gulp, argv);

gulp.task('default', ['build']);
gulp.task('build', ['scripts', 'sass', 'sass-src']);
gulp.task('validate', ['jshint', 'karma']);

gulp.task('watch', ['docs'], function() {
  gulp.watch(['src/**/*.{scss,js,html}', 'docs/app/**/*'], ['docs']);
});

gulp.task('changelog', function(done) {
  changelog({
    repository: 'https://github.com/angular/material',
    version: pkg.version,
    file: 'CHANGELOG.md'
  }, function(err, log) {
    fs.writeFileSync(__dirname + '/CHANGELOG.md', log);
  });
});

/**
 * JSHint
 */
gulp.task('jshint', function() {
  return gulp.src(
      buildConfig.paths.js.concat(buildConfig.paths.test)
    )
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter(require('jshint-summary')({
      fileColCol: ',bold',
      positionCol: ',bold',
      codeCol: 'green,bold',
      reasonCol: 'cyan'
    })))
    .pipe(jshint.reporter('fail'));
});

/**
 * Karma Tests
 */
argv.browsers && (karmaConf.browsers = argv.browsers.trim().split(','));
gulp.task('karma', function(done) {
  karma.start(_.assign(karmaConf, {singleRun: true}), done);
});

gulp.task('karma-watch', function(done) {
  karma.start(_.assign(karmaConf, {singleRun: false}), done);
});

gulp.task('karma-sauce', function(done) {
  karma.start(require('./config/karma-sauce.conf.js'), done);
});

/**
 * Build angular-material.js
 */
//TODO build components individually
//Factor scripts and scss out into a task that works on either
//an individual component or the whole bundle
gulp.task('scripts', function() {
  return gulp.src(buildConfig.paths.js)
    .pipe(concat('angular-material.js'))
    .pipe(header(_.template(buildConfig.componentsModule, {
      components: buildConfig.components.map(enquote)
    })))
    .pipe(header(buildConfig.closureStart))
    .pipe(footer(buildConfig.closureEnd))
    .pipe(header(buildConfig.banner))
    .pipe(gulp.dest(buildConfig.dist))
    .pipe(gulpif(IS_RELEASE_BUILD, uglify({
      preserveComments: 'some' //preverse banner
    })))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest(buildConfig.dist));
});

/**
 * Build angular-material.css
 */
gulp.task('sass', function() {
  return gulp.src(buildConfig.paths.scss)
    .pipe(header(buildConfig.banner))
    .pipe(sass({
      // Normally, gulp-sass exits on error. This is good during normal builds.
      // During watch builds, we only want to log the error.
      errLogToConsole: argv._.indexOf('watch') > -1
    }))
    .pipe(concat('angular-material.css'))
    .pipe(gulp.dest(buildConfig.dist))
    .pipe(gulpif(IS_RELEASE_BUILD, minifyCss()))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest(buildConfig.dist));
});

gulp.task('sass-src', function() {
  return gulp.src(buildConfig.paths.sassSrc)
    .pipe(gulp.dest(buildConfig.srcDist));
});

function enquote(str) {
  return '"' + str + '"';
}

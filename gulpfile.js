const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const uglifyes = require('uglify-es');
const composer = require('gulp-uglify/composer');
const uglify = composer(uglifyes, console);
const browserSync = require('browser-sync').create();

gulp.task('default', (done) => {
	gulp.watch('sass/**/*.scss', ['styles']);
	gulp.watch('js/**/*.js', ['scripts-dist']);
	gulp.watch('./*.html', ['copy-html']);
	gulp.watch('./dist/index.html').on('change', browserSync.reload);

	browserSync.init({
		server: './dist'
	});
	done();
});

gulp.task('scripts', (done) => {
	gulp.src(['js/dbhelper.js', 'js/main.js', 'js/swRegister.js'])
		.pipe(sourcemaps.init())
		.pipe(concat('all_main.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));

	gulp.src(['js/dbhelper_restaurant.js', 'js/restaurant_info.js', 'js/swRegister.js'])
		.pipe(sourcemaps.init())
		.pipe(concat('all_restaurant.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));

	gulp.src(['js/sw.js', 'js/postWorker.js'])
		.pipe(sourcemaps.init())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));

	done();
});

gulp.task('scripts-dist', (done) => {
	gulp.src(['js/dbhelper_main.js', 'js/main.js', 'js/swRegister.js'])
		.pipe(sourcemaps.init())
		.pipe(concat('all_main.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));

	gulp.src(['js/dbhelper_restaurant.js', 'js/restaurant_info.js', 'js/swRegister.js'])
		.pipe(sourcemaps.init())
		.pipe(concat('all_restaurant.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));

	gulp.src(['js/sw.js', 'js/postWorker.js'])
		.pipe(sourcemaps.init())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));

	done();
});

gulp.task('styles', (done) => {
	gulp.src('sass/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/css'))
		.pipe(browserSync.stream());

	browserSync.reload;
	done();
});

gulp.task('copy-html', (done) => {
	gulp.src('./*.html')
		.pipe(gulp.dest('./dist'));
	done();
});

gulp.task('copy-images', (done) => {
	gulp.src('img/*')
		.pipe(gulp.dest('dist/img'));
	done();
});

gulp.task('dist', ['copy-html', 'copy-images', 'styles', 'scripts-dist']);
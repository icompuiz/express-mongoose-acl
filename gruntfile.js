module.exports = function (grunt) {

	grunt.file.setBase(__dirname);

	// Load NPM Tasks
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-nodemon');

	/**
	 * Grunt Config
	 */
	grunt.initConfig({


        /**
         * Directory variables
         */
        indir: 'server',
        outdir: 'public',

        /**
         * JS Hint settings
         */
        jshint: {
            dev: {
                src: [
                    '<%= indir %>/**/*.js'
                ],
                options: {
                    jshintrc: '.jshintrc',
                    ignores: [
                        '<%= indir %>/vendor/**/*.js'
                    ]
                }
            }
        },

        /**
         * Nodemon settings
         */
        nodemon: {
            dev: {
                options: {
                    args: [],
                    ignoredFiles: ['README.md', 'node_modules/**'],
                    watchedExtensions: ['js'],
                    watchedFolders: ['server', 'server/**'],
                    delayTime: 1,
                    env: {
                        NODE_ENV: 'development',
                        PORT: '3000'
                    }
                }
            }
        },

        /**
         * Concurrent settings
         */
        concurrent: {
            'dev': {
                tasks: ['nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },

        /**
         * Watch settings
         */
        watch: {
            scripts: {
                files: ['<%= indir %>/**/*.js'],
                tasks: ['jshint']
            },
            views: {
                files: ['views/**/*']
            }
        }

	});

	

	// Register Tasks

    grunt.registerTask('default', [
        'jshint',
        'concurrent:dev'
    ]);

};

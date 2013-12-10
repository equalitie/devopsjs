module.exports = function(grunt) {
  var cwd = require("path").resolve(__dirname);
  var srcFiles = [
    'src/node/*.js',
    'src/node/lib/*.js',
    'src/node/lib/nrpe/*.js',
    'src/node/util/*.js',
    // frontend
    'src/widget/dojs/do.js'
  ];

  // Project configuration.
  grunt.initConfig({
    jshint: {
      files: srcFiles
    },
    mochaTest: {
      configTest: {
        options: {
          reporter: 'spec',
        },
        src: ['test/configuration.js']
      },
      devUnitTest: {
        options: {
          reporter: 'spec'
        },
        src: ['test/*.js']
      },
      prodTest: {
        options: {
          reporter: 'spec'
        },
        src: ['src/node/yadda/*-test.js']
      }
    },
    docco: {
      docs: {
        src: srcFiles,
        dest: 'docs/annotated-source'
      }
    },
    plato: {
      devopsjs: {
        files: {
          'reports': srcFiles
        }
      }
    },
    watch: {
      config: {
        files: [
          'config/*.js'
          ],
          tasks: ['jshint', 'mochaTest:configTest']
      },
    
      dev: {
        files: [
          '<%= jshint.files %>',
          'test/*.js',
        ],
        tasks: ['jshint', 'mochaTest:devTest']
      },
      devUnit: {
        files: [
          '<%= jshint.files %>',
          'test/*.js',
        ],
        tasks: ['jshint', 'mochaTest:devUnitTest']
      },
      prod: {
        files: [
          '<%= jshint.files %>',
          'src/node/yadda/generated/**/*.feature'
        ],
        tasks: ['jshint', 'mochaTest:prodTest']
      }
    }
  });

  // load the relevant plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-docco2');
  grunt.loadNpmTasks('grunt-plato');
  grunt.loadNpmTasks('grunt-mocha-test');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'mochaTest', 'docco', 'plato']);
  grunt.registerTask('sanity-test', ['jshint', 'mochaTest:configTest', 'mochaTest:devUnitTest']);

};

module.exports = function(grunt) {
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
      prodTest: {
        options: {
          reporter: 'json'
        },
        src: ['src/node/yadda-tests/*-test.js']
      },
      devUnitTest: {
        options: {
          reporter: 'spec'
        },
        src: ['src/node/yadda-tests/test/*-test.js']
      },
      devTest: {
        options: {
          reporter: 'spec',
          timeout : '5000'
        },
        src: ['src/node/yadda-tests/*-test.js']
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
      dev: {
        files: [
          '<%= jshint.files %>',
          'src/node/yadda-tests/*.js',
          'src/node/yadda-tests/**/*.js',
          'src/node/yadda-tests/generated/**/*.feature'
        ],
        tasks: ['jshint', 'mochaTest:devTest']
      },
      devUnit: {
        files: [
          '<%= jshint.files %>',
          'src/node/yadda-tests/*.js',
          'src/node/yadda-tests/**/*.js',
          'src/node/yadda-tests/generated/**/*.feature'
        ],
        tasks: ['jshint', 'mochaTest:devUnitTest']
      },
      prod: {
        files: [
          '<%= jshint.files %>',
          'src/node/yadda-tests/*.js',
          'src/node/yadda-tests/library/*.js',
          'src/node/yadda-tests/generated/**/*.feature'
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

};

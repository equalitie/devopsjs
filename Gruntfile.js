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
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['yadda-tests/*-test.js']
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
      files: [
        '<%= jshint.files %>',
        'yadda-tests/*.js',
        'yadda-tests/*.feature'
      ],
      tasks: ['jshint', 'mochaTest']
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


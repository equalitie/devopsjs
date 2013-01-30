module.exports = function () {
  global.Given = global.When = global.Then = this.defineStep;
};

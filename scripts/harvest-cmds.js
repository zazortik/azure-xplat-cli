var util = require('util');

var result = {};
var metedataArm = require('../lib/plugins.arm.json');
parse(metedataArm, '');
var cmdsArm = Object.keys(result);
console.log(util.inspect(cmdsArm));

console.log('********************************');
console.log('Done with ARM');
console.log('********************************');

result = {};
var metedataAsm = require('../lib/plugins.asm.json');
parse(metedataAsm, '');
var cmdsAsm = Object.keys(result);
console.log(util.inspect(cmdsAsm));

console.log('********************************');
console.log('The total number of commands for xplat-cli in ARM mode is: ' + cmdsArm.length);
console.log('The total number of commands for xplat-cli in ASM mode is: ' + cmdsAsm.length);
console.log('********************************');

function parse(cmdObj, category) {
  if (cmdObj !== null && typeof cmdObj === 'object') {
    Object.keys(cmdObj).forEach(function (key) {
      if (key === 'commands') {
        cmdObj[key].forEach(function (element) {
          var fullname = element.filePath + ': ' + category + ' ' + element.name;
          result[fullname] = fullname;
        });
      } else if (key === 'categories') {
        Object.keys(cmdObj[key]).forEach(function (subCategory) {
          parse(cmdObj[key][subCategory], category + ' ' + subCategory);
        });
      }
    });
  }
}
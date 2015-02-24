define("ace/theme/sunburst",["require","exports","module","ace/lib/dom"], function(require, exports, module) {

exports.isDark = true;
exports.cssClass = "ace-sunburst";
exports.cssText = require("../requirejs/text!./sunburst.css");

var dom = require("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});

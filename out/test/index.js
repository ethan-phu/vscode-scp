"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
var path = require("path");
var Mocha = require("mocha");
var glob = require("glob");
function run() {
    var mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000
    });
    var testsRoot = path.resolve(__dirname, '..');
    return new Promise(function (c, e) {
        glob('**/**.test.js', { cwd: testsRoot }, function (err, files) {
            if (err) {
                return e(err);
            }
            files.forEach(function (f) { return mocha.addFile(path.resolve(testsRoot, f)); });
            try {
                mocha.run(function (failures) {
                    if (failures > 0) {
                        c(new Error("".concat(failures, " failed tests")));
                    }
                    else {
                        c();
                    }
                });
            }
            catch (err) {
                console.error(err);
                e(err);
            }
        });
    });
}

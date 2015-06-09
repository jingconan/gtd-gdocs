#!/usr/bin/env node
var glob = require('glob'),
    path = require('path'),
    sys = require('sys'),
    fs = require('fs'),
    exec = require('child_process').exec;

var scriptFilePaths = [
    "scripts/namespace.js",
    "scripts/util.js",
    "scripts/task-thread.js",
    "scripts/script.js",
    "scripts/menu.js"
];

function concat_template(code) {
    var filepath;
    for(var i = 0; i < scriptFilePaths.length; ++i) {
        filepath = scriptFilePaths[i]
        console.log("Compile script: " + filepath);
        code += (fs.readFileSync(filepath).toString() + '\n\n');
    }
    code += "\n\n";

    // Compile frameworks
    var frameworkFilePaths = glob.sync("frameworks/*.js");
    for(var i = 0; i < frameworkFilePaths.length; ++i) {
        filepath = frameworkFilePaths[i]
        console.log("Compile framework: " + filepath);
        code += (fs.readFileSync(filepath).toString() + '\n\n');
    }

    // Compile templates
    var templateFilepaths = glob.sync("templates/*.html");
    for(var i = 0; i < templateFilepaths.length; ++i) {
        filepath = templateFilepaths[i]
        console.log("Compile template: " + filepath);
        key = path.basename(filepath, '.html');
        var templateCode = fs.readFileSync(filepath).toString();
        template = templateCode.replace(/\n/g, '').replace(/\"/g, '\'');
        code += ("GTD.templates." + key + " = \"" + template + "\";\n\n");
    }

    filepath = 'build/compiled_script.js';
    fs.writeFileSync(filepath, code);
}

var git_cmd = "git rev-parse HEAD";
child = exec(git_cmd, function (error, stdout, stderr) {
    if (error !== null) {
        console.log('exec ' + git_cmd + ' error: ' + error);
        return;
    }
    var code = "// compiled from git commit version: " + stdout;
    concat_template(code);
});

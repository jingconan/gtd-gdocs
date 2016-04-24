#!/usr/bin/env node
var glob = require('glob'),
    path = require('path'),
    sys = require('sys'),
    fs = require('fs'),
    exec = require('child_process').exec;

// JS files used in this project
var scripts = [
    'scripts/namespace.js',
    'scripts/util.js',
    'scripts/gtask.js',
    'scripts/task-thread.js',
    'scripts/script.js',
    'scripts/menu.js'
];

// Template files used in this project
var templates = [
    'templates/sidebar.html'
];

var walk = function(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) results = results.concat(walk(file));
        else results.push(file);
    });
    return results;
};

function concat_template(code) {
    var filepath;
    var scriptFilePaths = scripts;
    var i;
    for(i = 0; i < scriptFilePaths.length; ++i) {
        filepath = scriptFilePaths[i];
        console.log("Compile script: " + filepath);
        code += (fs.readFileSync(filepath).toString() + '\n\n');
    }
    code += "\n\n";

    // Compile frameworks
    // var frameworkFilePaths = walk('./frameworks');
    // for(var i = 0; i < frameworkFilePaths.length; ++i) {
    //     filepath = frameworkFilePaths[i]
    //     console.log("Compile framework: " + filepath);
    //     code += (fs.readFileSync(filepath).toString() + '\n\n');
    // }

    // Compile templates
    var templateFilepaths = templates;
    for(i = 0; i < templateFilepaths.length; ++i) {
        filepath = templateFilepaths[i];
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

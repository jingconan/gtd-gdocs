#!/usr/bin/env node
// console.log('good');
//
//
glob = require('glob');
path = require('path');
fs = require('fs');
function concat_template() {
    var filepath;
    var code = fs.readFileSync("script.js").toString();
    code += "\n\n";
    var templateFilepaths = glob.sync("templates/*.html");
    for(var i = 0; i < templateFilepaths.length; ++i) {
        filepath = templateFilepaths[i]
        console.log("Compile template: " + filepath);
        key = path.basename(filepath, '.html');
        var templateCode = fs.readFileSync(filepath).toString();
        template = templateCode.replace(/\n/g, '').replace(/\"/g, '\'');
        code += ("app.templates." + key + " = \"" + template + "\";\n\n");
    }

    var frameworkFilePaths = glob.sync("frameworks/*.js");
    for(var i = 0; i < frameworkFilePaths.length; ++i) {
        filepath = frameworkFilePaths[i]
        console.log("Compile framework: " + filepath);
        code += (fs.readFileSync(filepath).toString() + '\n\n');
    }

    filepath = 'build/compiled_script.js';
    fs.writeFileSync(filepath, code);




}

concat_template();

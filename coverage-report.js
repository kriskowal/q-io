"use strict";

var Q = require("q");
var FS = require("./fs");

FS.listTree(".coverage_data", function (name, stat) {
    return (/^\.coverage_data\/coveragefile/).test(name);
})
.then(function (list) {
    return Q.all(list.map(function (file) {
        return FS.read(file)
        .then(function (content) {
            return JSON.parse(content);
        })
        .then(function (coverage) {
            console.log("<table>");
            console.log("    <thead>");
            console.log("        <tr>");
            console.log("            <th>File</th>");
            console.log("            <th>Percentage</th>");
            console.log("            <th>Missing</th>");
            console.log("        </tr>");
            console.log("    </thead>");
            console.log("    <tbody>");
            var paths = Object.keys(coverage.files);
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                var file = files[path];
                path = FS.relativeFromDirectory(__dirname, path);
                if (/^spec/.test(path))
                    continue;
                console.log("        <tr>");
                console.log("            <td><code>" + path + "</code></td>");
                console.log("            <td>" + (file.stats.percentage * 100).toFixed(0) + "%</td>");
                console.log("            <td>" + file.stats.missing + "</td>");
                console.log("        </tr>");
            }
            console.log("    </tbody>");
            console.log("</table>");
        }, function (error) {
            error.message = "Can't parse " + file + " because " + error.message;
            throw error;
        })
    }))
})
.done()


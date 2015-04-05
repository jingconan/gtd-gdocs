// This file contails all the utility functions

function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

function debug(s) {
  DocumentApp.getActiveDocument().getBody().appendParagraph(s);
}

GTD.toISO = function(date) {
  function f(n) {
    // Format integers to have at least two digits.
    return n < 10 ? '0' + n : n;
  }
  return '[' + date.getFullYear()   + '-' +
       f(date.getMonth() + 1) + '-' +
       f(date.getDate())      + ' ' +
       f(date.getHours())     + ':' +
       f(date.getMinutes())   + ':' +
       f(date.getSeconds())   + '' + 
       ']';
}

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}


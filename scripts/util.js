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

Date.prototype.toISO = function (key) {
  function f(n) {
    // Format integers to have at least two digits.
    return n < 10 ? '0' + n : n;
  }
  return '[' + this.getFullYear()   + '-' +
       f(this.getMonth() + 1) + '-' +
       f(this.getDate())      + ' ' +
       f(this.getHours())     + ':' +
       f(this.getMinutes())   + ':' +
       f(this.getSeconds())   + '' + 
       ']';
};

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}


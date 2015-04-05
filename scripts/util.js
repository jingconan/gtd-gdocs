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
  return date.getFullYear()   + '-' +
       f(date.getMonth() + 1) + '-' +
       f(date.getDate())      + ' ' +
       f(date.getHours())     + ':' +
       f(date.getMinutes())   + ':' +
       f(date.getSeconds());
}

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}


GTD.appendTableInTableCell = function(cell, subCells) {
    //add a blank paragraph. Required because of a bug in app script.
    //See
    //https://code.google.com/p/google-apps-script-issues/issues/detail?id=894
    cell.appendParagraph(""); 
    if (subCells) {
        return cell.insertTable(1, subCells);
    } else {
        return cell.insertTable(1);
    }
};

GTD.insertTableAtCursor = function(cells) {
    var document = DocumentApp.getActiveDocument();
    var body = document.getBody();

    var cursor = document.getCursor();
    var ele = cursor.getElement();
    var index = body.getChildIndex(ele); 
    return body.insertTable(index, cells);
};

GTD.setCursorAfterTable = function(table) {
    var doc = DocumentApp.getActiveDocument();
    var position = doc.newPosition(table, table.getNumChildren());
    doc.setCursor(position);

    // Change the text color back to default color
    var cursor = DocumentApp.getActiveDocument().getCursor();
    var text = cursor.insertText('\n');
    if (text) {
        text.setForegroundColor('#000000');
    }


};

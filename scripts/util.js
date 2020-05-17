// This file contails all the utility functions

GTD.util = {};

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

GTD.util.toISO = function(date) {
    var timeZone = Session.getScriptTimeZone();
    return Utilities.formatDate(date, timeZone, "yyyy-MM-dd HH:mm:ss");
};

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}


GTD.util.appendTableInTableCell = function(cell, subCells) {
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

GTD.util.insertTableAtCursor = function(cells) {
    var document = DocumentApp.getActiveDocument();
    var body = document.getBody();

    var cursor = document.getCursor();
    if (!cursor) {
        GTD.util.alertNoCursor();
        return 'cursor_not_found';
    }
    var ele = cursor.getElement();
    // If cursor is in a table, body.insertTable will fail to find the
    // element.
    try {
        var index = body.getChildIndex(ele);
        var table = body.insertTable(index+1, cells);
        document.setCursor(document.newPosition(body, index+2));
        return table;
    } catch(err) {
        return 'element_not_found';
    }
};

GTD.util.insertTableAfterThreadHeader = function(options) {
    var body = DocumentApp.getActiveDocument().getBody();
    var index = body.getChildIndex(options.threadHeader);
    return body.insertTable(index+1, options.cells);
};

GTD.util.setCursorAtTable = function(table, offset) {
    var doc = DocumentApp.getActiveDocument();
    assert(offset.length == 2, 'unknow offset');
    var cell = table.getCell(offset[0], offset[1]);
    var position = doc.newPosition(cell, 0);
    doc.setCursor(position);
};

GTD.util.setCursorAtStart = function() {
    var doc = DocumentApp.getActiveDocument();
    var position = doc.newPosition(doc.getBody(), 0);
    doc.setCursor(position);
};

GTD.util.setCursorAfterFirstSeparator = function() {
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    var tables = body.getTables();
    for (var i = 0; i < tables.length; ++i) {
        var table = tables[i];
        if (GTD.Task.isSeparator(table)) {
            var index = body.getChildIndex(table);
            var position = doc.newPosition(body, index+1);
            doc.setCursor(position);
            return;
        } else if (GTD.Task.isThreadHeader(table)) {
            var index = body.getChildIndex(table);
            var position = doc.newPosition(body, index-1);
            doc.setCursor(position);
            GTD.Task.addThreadSeparator();
            return;
        }
    }
    // This means that the document doesn't contain any task separator,
    // we insert a separator after summay table
    var summayTable = GTD.Summary.getSummaryTable();
    var index = body.getChildIndex(summayTable);
    var position = doc.newPosition(body, index+1);
    doc.setCursor(position);
    GTD.Task.addThreadSeparator();
};


GTD.util.alertNoCursor = function() {
    DocumentApp.getUi().alert("Cannot find cursor, are you selecting texts? " +
                              "Please try without text selection.");

};

GTD.util.startsWith = function(A, str) {
    return (A.indexOf(str) === 0);
};

GTD.util.templateReplace = function(template, namespace) {
	for (var key in namespace) {
	    if (namespace.hasOwnProperty(key)) {
            template = template.replace('{{' + key + '}}', namespace[key]);
	    }
	}
    return template;
};

GTD.util.getID = function(s) {
    // Use timestamp as id if there is timestamp
    var res = s.split(']')[0].split('[')[1];
    //debug('string: ' + s + ' id: ' + res);

    if (typeof res === 'undefined') {
        return s;
    }
};

/* Get timestamp from task name
 */
GTD.util.getTimeStamp = function(taskName) {
    //timestamp is at the begining and has the format YYYY-mm-DD
    //HH:MM:SS. It is seperated by other content by \n;
    var tokens = taskName.split('\n');
    return tokens[0];
};

/* Get name from encoded task name
 */
GTD.util.getTaskName = function(taskName) {
    var tokens = taskName.split('\n');
    return tokens[1];
};

GTD.util.extractTextAndRemoveCursorElement = function() {
  var document = DocumentApp.getActiveDocument();
  var cursor = document.getCursor();
  if (!cursor) {
      GTD.util.alertNoCursor();
      return;
  }
  var ele = cursor.getElement();
  if (ele === null || typeof ele === 'undefined') {
      return null;
  }
  var text = ele.asText().getText();
  if (text !== '') {
    ele.editAsText().setText('');
  }
  return text;
}

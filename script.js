// This is a google app scripts that implements a GTD work flow using
// Google Docs. 
//
// Author: Jing Conan Wang 
// Email: hbhzwj@gmail.com
//
// This code is under GPL license. 
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
  return '[' + this.getUTCFullYear()   + '-' +
       f(this.getUTCMonth() + 1) + '-' +
       f(this.getUTCDate())      + ' ' +
       f(this.getUTCHours())     + ':' +
       f(this.getUTCMinutes())   + ':' +
       f(this.getUTCSeconds())   + '' + 
       ']';
};

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}



function insertDate() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var text = '\n' + new Date().toISO() + '\n';
  var element = cursor.insertText(text);
  doc.setCursor(doc.newPosition(element, text.length));
}
  

var app = {
  initTaskTable: function() {
   var tables = this.body.getTables();
   var taskTable;
   if (tables.length == 0 || !this._isTaskTable(tables[0])) {
     taskTable = this._createDefaultGTDTable(this.body);
   } else {
     taskTable = tables[0];
   }
   this.taskTable = taskTable;
  },
  
  getColIdx: function(name) {
    var i;
    if (typeof this.colIdx === 'undefined') {
      this.colIdx = {};
      for (i = 0; i < this.header.length; ++i) {
        this.colIdx[this.header[i]] = i;
      }
    }
    return this.colIdx[name];
  },
  
  _getID: function(s) {
    var res = s.split(']')[0].split('[')[1];
    //debug('s: ' + s + ' res: ' + res);

    if (typeof res == 'undefined') {
      return s;
    }
  },
  
  findFirstCell: function(col, target) {
    if (typeof col === 'string') {
      col = this.getColIdx(col);
    }
    if (typeof col === 'undefined') {
      return;
    }
    var i, cell, rowNum = this.taskTable.getNumRows();
    for (i = 0; i < rowNum; ++i) {
      cell = this.taskTable.getCell(i, col);
      if (this._getID(cell.getText()) == this._getID(target)) {
        return cell;
      }
    }
    return;
  },
  
  cleanTask: function(type, taskName, alert) {
    //debug('from: ' + type);
    var i;
    if (typeof type === 'undefined') {
      return;
    }
    if (type === 'All') {
      for (i = 0; i < this.header.length; ++i) {
        this.cleanTask(this.header[i], taskName);
      }
      return;
    }
    
    var cell = this.findFirstCell(type, taskName);   
    if (typeof cell === 'undefined') {
      if (alert) {
         DocumentApp.getUi().alert('cannot find task name');
      }
    } else {
      cell.clear();
    }
  },
  
  addTask: function(type, taskName) {
    cell = this.findFirstCell(type, '');
    if (typeof cell === 'undefined') {
      this.appendRow(1);
      cell = this.taskTable.getCell(this.taskTable.getNumRows() - 1, this.getColIdx(type));
    }
    cell.setText(taskName);
  },
  
  moveTask: function(from, to, taskName) {
    this.cleanTask(from, taskName);
    this.addTask(to, taskName);
  },
  
  mutateRow: function(row, rowContent) {
    var i;
    for (i = 0; i < rowContent.length; ++i) {
      row.appendTableCell(rowContent[i]);
    }
    return this;
  },
  
  appendRow: function(rowContent) {
    var i, rc = this._emptyRowContent();
    if (typeof rowContent === 'number') {
      for (i = 0; i < rowContent; ++i) {
        this.appendRow(rc);
      }
      return this
    }
    var row = this.taskTable.appendTableRow();
    this.mutateRow(row, rowContent);
    return this
  },
  
  appendLogEntry: function() {
  },
  
  _isTaskTable: function(table) {
    var i;
    for (i = 0; i < this.header.length; ++i) {
      if (table.getCell(0, i).getText() != this.header[i]) {
        return false;
      }
    }
    return true;
  },
  
  _emptyRowContent: function() {
    var rowContent = [], i;
    for (i = 0; i < this.header.length; ++i) {
      rowContent.push('');
    }
    return rowContent;
  },

  _createDefaultTableContent: function () {
    var tableContent = [this.header];
    var rowContent = [];
    var i;
    for (i = 0; i < this.header.length; ++i) {
      rowContent.push('');
    }
    for (i = 0; i < this.defaultRows; ++i) {
      tableContent.push(rowContent);
    }
    return tableContent;
  },
  
  _createDefaultGTDTable: function (body) {
    // Build a table from the header.
    var table = body.insertTable(0, this._createDefaultTableContent());
    assert(this.header.length === this.headerColor.length, 'wrong number of color');
    for (i = 0; i < this.header.length; ++i) {
      table.getCell(0, i)
        .editAsText()
        .setForegroundColor(this.headerColor[i]);
    }
    return table;
  },
  
  body: DocumentApp.getActiveDocument().getBody(),
  header: ['Actionable', 'Waiting For', 'Done'],
  headerColor: ['#ff0000', '#fffe06', '#16a031'], 
  defaultRows: 1,


};



function initTaskFunction() {
  app.initTaskTable();
  //app.appendRow(['a', 'b','c']);
//  app.findFirstEmptyCell('Actionable')
//    .editAsText()
//    .appendText('happy');
//    
//  app.findFirstEmptyCell('Waiting For')
//    .editAsText()
//    .appendText('bad');
}

function appendLogEntry() {
  insertDate();
  app.appendLogEntry();
}

app.initTaskTable();

function getSelectedTask() {
 var cursor = DocumentApp.getActiveDocument().getCursor();
 if (cursor) {
   return cursor.getElement().getText();
 }
 return undefined;
}

function createActionableTask() {
  var task = getSelectedTask();
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  app.cleanTask('All', task);
  app.addTask('Actionable', task);
}

function moveTaskToWaitingFor() {
  var task = getSelectedTask();
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  app.cleanTask('All', task);
  app.addTask('Waiting For', task);
}

function moveTaskToDone() {
  var task = getSelectedTask();
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  app.cleanTask('All', task);
  app.addTask('Done', task);
}



function onOpen() {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('GTD')
      .addItem('insert date', 'insertDate')
      .addItem('create task table', 'initTaskFunction')
      .addItem('create task', 'createActionableTask')
      .addItem('move to WaitingFor', 'moveTaskToWaitingFor')
      .addItem('move to Done', 'moveTaskToDone')
      .addToUi();
}

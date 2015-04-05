// This is a google app scripts that implements a GTD work flow using
// Google Docs. 
//
// Author: Jing Conan Wang 
// Email: hbhzwj@gmail.com
//
// This code is under GPL license. 

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
  
  getTaskTable: function() {
    return this.taskTable;
  },
  
  getAllTasksFromCol: function(col) {
    var i, cell, rowNum = this.taskTable.getNumRows(), res = [];
      for (i = 1; i < rowNum; ++i) {
        cell = this.taskTable.getCell(i, col);
        if (typeof cell !== 'undefined' && cell.getText() !== '') {
          res.push(cell.getText());
        }
    }
    return res;
  },
  
  getSideBarTableContent: function() {
    var i, j, tasks, thisTasks;
    var res = {
        task_queues: [],
    };
    for (i = 0; i < this.header.length; ++i) {
        tasks = this.getAllTasksFromCol(i);
        thisTasks = [];
        for (j = 0; j < tasks.length; ++j) {
            thisTasks.push({name: tasks[j]});
        }
        res.task_queues.push({
            index: (i + 1).toString(),
            type: this.header[i],
            color: this.headerColor[i],
            tasks: thisTasks
        });
    }
    return res;
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
  
  getID: function(s) {
    // Use timestamp as id if there is timestamp
    var res = s.split(']')[0].split('[')[1];
    //debug('string: ' + s + ' id: ' + res);

    if (typeof res === 'undefined') {
      return s;
    }
  },
  
  // this function returns the first empty cell in a column. 
  findFirstEmptyCell: function(col) {
    return this.findFirstCell(col, '', false);
  },
  
  findFirstCell: function(col, target, useID) {
    if (typeof col === 'string') {
      col = this.getColIdx(col);
    }
    if (typeof col === 'undefined') {
      return;
    }
    var i, cell, rowNum = this.taskTable.getNumRows();
    for (i = 0; i < rowNum; ++i) {
      cell = this.taskTable.getCell(i, col);
      if (useID && (this.getID(cell.getText()) === this.getID(target))) {
      // compare using ID 
        return cell;
      } else if (cell.getText() === target) {
      // compare the full string
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
        DocumentApp.getUi().alert('cannot find task name: ' + taskName);
      }
    } else {
      cell.clear();
    }
  },
  
  // Change the color of a task according to its current type
  setTaskColor: function(type, taskName) {
    setColor = (function (type, ele) {
      if (!ele) return;
      ele.asText().editAsText().setForegroundColor(this.headerColor[this.getColIdx(type)])
    }).bind(this, type);
    // Change the color of the task in the task table
    var timeStamp = this.getTimeStamp(taskName);
    var body = DocumentApp.getActiveDocument().getBody();
    var re = body.findText(timeStamp);
    setColor(re.getElement());
    
    // If the task exists in the main body, change its color, too. 
    re = body.findText(timeStamp, re);
    if (re) {
      setColor(re.getElement());
    }
    
  }, 
  
  addTask: function(type, taskName) {
    cell = this.findFirstEmptyCell(type);
    if (typeof cell === 'undefined') {
      this.appendRow(1);
      cell = this.taskTable.getCell(this.taskTable.getNumRows() - 1, this.getColIdx(type));
    }
    cell.setText(taskName);
    this.setTaskColor(type, taskName);
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
  
  getCurrentSelection: function() {
    var res = '';
    var selection = DocumentApp.getActiveDocument().getSelection();
    if (selection) {
      var elements = selection.getRangeElements();
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        
        // Only get text from elements that can be edited as text; skip images and other non-text elements.
        if (element.getElement().editAsText) {
          var text = element.getElement().editAsText();
          
          // Bold the selected part of the element, or the full element if it's completely selected.
          if (element.isPartial()) {
            res += text.getText().slice(element.getStartOffset(), element.getEndOffsetInclusive() + 1);
          } else {
            res += text.getText();
          }
        }
      }
    }
    return res;
  },
  
  getTimeStamp: function(s) {
    //FIXME now it only checks brackets
    return s.split(']')[0].split('[')[1];
  },
  
  selectBackwardToTimestamp: function() {
    var cursor = DocumentApp.getActiveDocument().getCursor();
    if (!cursor) {
      return;
    }
    var ele = cursor.getElement();
    var selectTexts = [], text, i;
    if (ele.getType() === DocumentApp.ElementType.TEXT) {
      ele = ele.getParent();
    }
    if (ele.getType() === DocumentApp.ElementType.PARAGRAPH) {
      for (i = 0; i < 10 && ele; ++i) {
        text = ele.asText().getText();
        if (typeof this.getTimeStamp(text) !== 'undefined') {
          selectTexts.push(text);          
          break;
        }
        selectTexts.push(text);
        ele = ele.getPreviousSibling();    
      } 
    }
    selectTexts.reverse();
    return selectTexts.join('\n');
  },

  
  // this function returns the selected task
  // if any text is selected, the function will return the selected text
  // else the function will return the surrounding text of current cursor.
  getSelectedTask: function() {
    var selectedText = this.getCurrentSelection();
    if (selectedText.length > 0) {
      return selectedText;
    }
    return this.selectBackwardToTimestamp();
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
  headerColor: ['#ff0000', '#9d922e', '#16a031'], 
  defaultRows: 1,
  templates: {},
};

app.TOC = {};

app.TOC.pullHeaders = function () {
  var doc = DocumentApp.getActiveDocument();
  headers = [];
  for (var i = 0; i < doc.getNumChildren(); i++) {
    var p = doc.getChild(i);
    if (p.getType() == DocumentApp.ElementType.TABLE_OF_CONTENTS) {
      var toc = p.asTableOfContents();
      for (var ti = 0; ti < toc.getNumChildren(); ti++) {
        var itemToc = toc.getChild(ti).asParagraph().getChild(0).asText();
        var itemText = itemToc.getText();
        var itemUrl = itemToc.getLinkUrl();
	headers.push({
	  toc: itemToc,
	  text: itemText,
	  url: itemUrl
	});
      }
      break;
    }
  }
  return {headers: headers};
  
};

app.initTaskTable();

function getTOCString() {
  return JSON.stringify(app.TOC.pullHeaders());
}

function getTasksString() {
    return JSON.stringify(app.getSideBarTableContent());
}



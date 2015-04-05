var GTD = {
  body: DocumentApp.getActiveDocument().getBody(),
  header: ['Actionable', 'Waiting For', 'Done'], //FIXME change to taskStatus
  headerColor: ['#ff0000', '#9d922e', '#16a031'], //FIXME change to taskStatusColor 
  defaultRows: 1,
  templates: {},
  TOC: {},
};


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


GTD.Task = {};

GTD.Task.createNewTask = function(name) {
    var body = DocumentApp.getActiveDocument().getBody(),
        taskEle = body.appendTable();
    this.status = 0;
    this.subTasksTotal = 0;
    this.subTasksDone = 0;
    
    this.addHeader(name);
    // this.addBody(bodyCell);
};

GTD.Task.addHeader = function( name) {
    var currentTime = GTD.toISO(new Date());
    var taskStatus = GTD.header[this.status];
    var subTaskStatus = this.subTasksDone + '/' + this.subTasksTotal;

    var headerTable = GTD.insertTableAtCursor([
        [currentTime, name, taskStatus, subTaskStatus],
    ]);

    // set table color
    var taskColor = GTD.headerColor[this.status];
    headerTable.editAsText().setForegroundColor(taskColor);

    var i;
    for (i = 0; i < 4; ++i) {
        headerTable.getCell(0, i).setBackgroundColor('#dde4e6');
    }

    GTD.setCursorAfterTable(headerTable);

};

// GTD.Task.addBody = function(cell) {
//     var doc = DocumentApp.getActiveDocument();
//     var position = doc.newPosition(cell, 0);
//     doc.setCursor(position);
// };

GTD.Task.insertComment = function() {
    var user = Session.getActiveUser().getEmail().split("@")[0];
    var currentTime = GTD.toISO(new Date());
    var table = GTD.insertTableAtCursor([[user + '\n' + currentTime, '']]);

    var text = table.getCell(0, 0).editAsText();
    text.setFontSize(user.length+1, text.getText().length-1, 7);

    var width = Math.max(11 * user.length, 80);
    table.getCell(0, 0)
        .setWidth(width)
        .setBackgroundColor('#dde4e6');
    table.getCell(0, 1)
        .setBackgroundColor('#f7f7f7');
    GTD.setCursorAfterTable(table);
}


// This is a google app scripts that implements a GTD work flow using
// Google Docs. 
//
// Author: Jing Conan Wang 
// Email: hbhzwj@gmail.com
//
// This code is under GPL license. 

GTD.initTaskTable = function() {
    var tables = this.body.getTables();
    var taskTable;
    if (tables.length == 0 || !this._isTaskTable(tables[0])) {
        taskTable = this._createDefaultGTDTable(this.body);
    } else {
        taskTable = tables[0];
    }
    this.taskTable = taskTable;
};

GTD.getTaskTable = function() {
    return this.taskTable;
};

GTD.getAllTasksFromCol = function(col) {
    var i, cell, rowNum = this.taskTable.getNumRows(), res = [];
    for (i = 1; i < rowNum; ++i) {
        cell = this.taskTable.getCell(i, col);
        if (typeof cell !== 'undefined' && cell.getText() !== '') {
            res.push(cell.getText());
        }
    }
    return res;
};
  

GTD.getSideBarTableContent = function() {
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
}
 

GTD.getColIdx = function(name) {
    var i;
    if (typeof this.colIdx === 'undefined') {
        this.colIdx = {};
        for (i = 0; i < this.header.length; ++i) {
            this.colIdx[this.header[i]] = i;
        }
    }
    return this.colIdx[name];
};

GTD.getID = function(s) {
    // Use timestamp as id if there is timestamp
    var res = s.split(']')[0].split('[')[1];
    //debug('string: ' + s + ' id: ' + res);

    if (typeof res === 'undefined') {
        return s;
    }

};

// this function returns the first empty cell in a column. 
GTD.findFirstEmptyCell = function(col) {
    return this.findFirstCell(col, '', false);
};

GTD.findFirstCell = function(col, target, useID) {
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
};


GTD.cleanTask = function(type, taskName, alert) {
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
};

// Change the color of a task according to its current type
GTD.setTaskColor = function(type, taskName) {
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

};

GTD.addTask = function(type, taskName) {
    cell = this.findFirstEmptyCell(type);
    if (typeof cell === 'undefined') {
        this.appendRow(1);
        cell = this.taskTable.getCell(this.taskTable.getNumRows() - 1, this.getColIdx(type));
    }
    cell.setText(taskName);
    // this.setTaskColor(type, taskName);
};

GTD.moveTask = function(from, to, taskName) {
    this.cleanTask(from, taskName);
    this.addTask(to, taskName);
};

GTD.mutateRow = function(row, rowContent) {
    var i;
    for (i = 0; i < rowContent.length; ++i) {
        row.appendTableCell(rowContent[i]);
    }
    return this;
};

GTD.appendRow = function(rowContent) {
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
};


GTD.getTimeStamp = function(s) {
    //FIXME now it only checks brackets
    return s.split(']')[0].split('[')[1];
};

GTD.getTaskHeader = function() {
 var cursor = DocumentApp.getActiveDocument().getCursor();
 if (!cursor) {
    debug('no cursor');
    return;
 }
 var ele = cursor.getElement();
 if (ele.getType() === DocumentApp.ElementType.TEXT) {
    ele = ele.getParent();
 }
 if (ele.getType() === DocumentApp.ElementType.PARAGRAPH) {
    ele = ele.getParent();
 }
 if (ele.getType() === DocumentApp.ElementType.TABLE_CELL) {
    ele = ele.getParent();
 }
 if (ele.getType() === DocumentApp.ElementType.TABLE_ROW) {
    ele = ele.getParent();
 }
 if (!ele || ele.getType() != DocumentApp.ElementType.TABLE) {
    DocumentApp.getUi().alert('Cannot find task header under cursor! ele.type: ' + ele.getType());
    return;
 }
 return ele;
}


// this function returns the task under cursor
GTD.getSelectedTask = function(type) {
    var taskHeader = this.getTaskHeader();
    var colIdx = this.getColIdx(type);
    taskHeader.editAsText().setForegroundColor(this.headerColor[colIdx]);
    taskHeader.getCell(0, 2).setText(type);
    return taskHeader.getCell(0, 0).getText() + '\n' + taskHeader.getCell(0, 1).getText();
};

GTD.appendLogEntry = function() {
};

GTD._isTaskTable = function(table) {
    var i;
    for (i = 0; i < this.header.length; ++i) {
        if (table.getCell(0, i).getText() != this.header[i]) {
            return false;
        }
    }
    return true;
};

GTD._emptyRowContent = function() {
    var rowContent = [], i;
    for (i = 0; i < this.header.length; ++i) {
        rowContent.push('');
    }
    return rowContent;
};

GTD._createDefaultTableContent = function () {
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
};

GTD._createDefaultGTDTable = function (body) {
    // Build a table from the header.
    var table = body.insertTable(0, this._createDefaultTableContent());
    assert(this.header.length === this.headerColor.length, 'wrong number of color');
    for (i = 0; i < this.header.length; ++i) {
        table.getCell(0, i)
        .editAsText()
        .setForegroundColor(this.headerColor[i]);
    }
    return table;
};
 

GTD.TOC.pullHeaders = function () {
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

GTD.insertTask = function(name) {
    GTD.Task.createNewTask(name);
};

GTD.insertComment = function() {
    GTD.Task.insertComment();
}

GTD.initTaskTable();

function getTOCString() {
  return JSON.stringify(GTD.TOC.pullHeaders());
}

function getTasksString() {
    return JSON.stringify(GTD.getSideBarTableContent());
}


function onOpen() {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('GTD')
      .addItem('insert date', 'insertDate')
      .addItem('insert task', 'insertTask')
      .addItem('insert comment', 'insertComment')
      .addItem('create task table', 'initTaskFunction')
      .addItem('move to Actionable', 'createActionableTask')
      .addItem('move to WaitingFor', 'moveTaskToWaitingFor')
      .addItem('move to Done', 'moveTaskToDone')
      .addItem('show task sidebar', 'showSidebar')
      .addToUi();
}

function insertComment() {
    GTD.insertComment();
}

function insertTask() {
    var ui = DocumentApp.getUi();
    GTD.insertTask('test2');

    // var result = ui.prompt(
    //     'Let\'s start!',
    //     'Please enter a short task description:',
    // ui.ButtonSet.OK_CANCEL);

    // var button = result.getSelectedButton();
    // var text = result.getResponseText();
    // if (button == ui.Button.OK) {
    //     GTD.insertTask(text);
    // } else {
    //     return;
    // }


}

function insertDate() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var text = '\n' + GTD.toISO(new Date()) + '\n';
  var element = cursor.insertText(text);
  doc.setCursor(doc.newPosition(element, text.length));
}

function initTaskFunction() {
  GTD.initTaskTable();
}

function createActionableTask() {
  var task = GTD.getSelectedTask('Actionable');
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  GTD.cleanTask('All', task);
  GTD.addTask('Actionable', task);
}

function moveTaskToWaitingFor() {
  var task = GTD.getSelectedTask('Waiting For');
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  GTD.cleanTask('All', task);
  GTD.addTask('Waiting For', task);
}

function moveTaskToDone() {
  var task = GTD.getSelectedTask('Done');
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  GTD.cleanTask('All', task);
  GTD.addTask('Done', task);
}

function showSidebar() {
  var html = HtmlService.createHtmlOutput(GTD.templates.sidebar)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('My task list')
      .setWidth(300);
      
  DocumentApp.getUi() // Or DocumentApp or FormApp.
      .showSidebar(html);
}




GTD.templates.sidebar = "<link rel='stylesheet' href='https://ssl.gstatic.com/docs/script/css/add-ons.css'><script src='https://code.jquery.com/jquery-2.1.3.min.js'></script><script src='https://cdnjs.cloudflare.com/ajax/libs/mustache.js/0.8.1/mustache.min.js'></script><style>.collapse{  font-size: 20px;  display:block;}.collapse + input{  display:none;}.collapse + input + *{  display:none;}.collapse+ input:checked + *{  display:block;}</style><div align='right'>    <input type='button' value='Refresh' onclick='google.script.run.showSidebar()' /></div><div id='task_queue' style='display:none'>{{#task_queues}}<div>    <label class='collapse' style='color: {{color}}' for='_{{index}}'>{{type}}</label>    <input id='_{{index}}' type='checkbox' checked='checked'>    <div>        <ul>        {{#tasks}}            <li>{{name}}</li>        {{/tasks}}        </ul>    </div></div>{{/task_queues}}</div><div id='table_of_content' style='display:none'><label class='collapse' style='color: black' for='_5'>Table of Content</label><input id='_5' type='checkbox' checked='checked'><div><ul>{{#headers}}<li id='{{toc}}'>{{text}}</li>{{/headers}}{{^headers}}Please insert a table of content in the document using insert->table of content{{/headers}}</ul></div></div><script>SB = {};SB.buildTaskQueue = function (result) {    var taskQueue = document.getElementById('task_queue');    var content = JSON.parse(result);    taskQueue.innerHTML = Mustache.to_html(taskQueue.innerHTML, content);    taskQueue.style.display = 'block';};SB.buildToC = function (result){  var content = JSON.parse(result);  var list = document.getElementById('table_of_content');  list.innerHTML = Mustache.to_html(list.innerHTML, content);  list.style.display = 'block';};google.script.run.withSuccessHandler(SB.buildTaskQueue).getTasksString();google.script.run.withSuccessHandler(SB.buildToC).getTOCString();</script>";


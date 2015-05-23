// This is a google app scripts that implements a GTD work flow using
// Google Docs. 
//
// Author: Jing Conan Wang 
// Email: hbhzwj@gmail.com
//
// This code is under GPL license. 


// FIXME need to factor the script.js to several smaller files

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


GTD.getTimeStamp = function(taskName) {
    //timestamp is at the begining and has the format YYYY-mm-DD
    //HH:MM:SS. It is seperated by other content by \n;
    var tokens = taskName.split('\n');
    return tokens[0];
};


// this function returns the task under cursor
GTD.getSelectedTask = function(type) {
    var taskHeader = GTD.Task.getTaskThreadHeader();
    if (!GTD.Task.isValidTaskThreadHeader(taskHeader)) {
        return {
            error: 'To change status of a task, please ' +
                   'put cursor in the task description ' +
                   'table in the main body.'
        };
    }
    GTD.Task.setThreadHeaderStatus(taskHeader, type);
    var taskDesc = GTD.Task.getTaskDesc(taskHeader);
    if (!taskDesc) {
        return {
            error: 'cannot find task name'
        }
    }
    return {
        taskDesc: taskDesc
    }
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
    return GTD.Task.createNewTask(name);
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

function findAndFocusOnTask(taskName) {
    var timeStamp = GTD.getTimeStamp(taskName);
    var body = DocumentApp.getActiveDocument().getBody();
    var re = body.findText(timeStamp);
    var position;
    //debug('timeStamp: ' + timeStamp);
    var doc = DocumentApp.getActiveDocument();
    if (!re) {
        DocumentApp.getUi().alert('cannot find task name: ' + taskName);
    }

    // The second appearance is the task in the body
    re = body.findText(timeStamp, re);
    if (!re) {
        DocumentApp.getUi().alert('cannot find task name: ' + taskName);
    }
    position = doc.newPosition(re.getElement(), 0);
    doc.setCursor(position);
}

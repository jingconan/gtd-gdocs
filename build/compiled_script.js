// compiled from git commit version: 9cc0b254b4706b0987ad455963b619db24dc3bde
var GTD = {
  body: DocumentApp.getActiveDocument().getBody(),
  header: ['Actionable', 'Waiting For', 'Done', 'Someday'], //FIXME change to taskStatus
  headerColor: ['#ff0000', '#9d922e', '#16a031', '#808080'], //FIXME change to taskStatusColor 
  bodyMargins: [7.2, 7.2, 7.2, 7.2], // L, T, R, D unit is point
  commentStyle: {
      foregroundColor: '#000000'
  },
  defaultRows: 1,
  templates: {},
  TOC: {},
  gtask: {
      listName: 'GTD Lists',
      statusSymbols: {
          'Actionable': '(x)',
          'Waiting For': '/!\\',
          'Someday': '(~)',
          'Unknown': ''
      }
  },
  initialized: false
};

GTD.startsWith = function(str) {
    return (this.indexOf(str) === 0);
};


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
    // var position = doc.newPosition(rg.getElement().getParent(), 1);
};


GTD.util.alertNoCursor = function() {
    DocumentApp.getUi().alert("Cannot find cursor, are you selecting texts? " +
                              "Please try without text selection.");

};

GTD.util.startsWith = function(A, str) {
    return (A.indexOf(str) === 0);
};


/**
 * These functions are used to sync data between google docs and gmail tasks
 *
 * In order to provide a coherent view of multiple gtd documents, we
 * display tasks from all documents in one google task list view.
 * Each document corresponds to one tasks, which is referred to as
 * parent task in the code. All tasks in this document become sub-tasks
 * of this task (i.e., with one more indentation).
 *
 * The status of tasks are encoded in title. Title has the format
 * <status_symbol>:<task_name>. Each status has a unique symbol, and
 * please see GTD.gtask.statusSymbols for a complete lists of status
 * symbols.
 *
 */

GTD.gtask.isInitialized = function() {
    return (typeof Tasks !== 'undefined');
};

/**
 * Find list ID based on task list name
 * @param {String} name The name for the task list, you must create such
 *     a list manually in google tasks.
 * @return {{id:String,title:String,status:String}}
 */
GTD.gtask.findListIdByName = function(name) {
    var taskLists = Tasks.Tasklists.list();
    var ret = {};
    if (taskLists.items) {
        for (var i = 0; i < taskLists.items.length; i++) {
            var taskList = taskLists.items[i];
            if (taskList.title !== name) {
                continue;
            }
            ret.id = taskList.id;
            ret.title = taskList.title;
            ret.status = 'SUCCESS';
            return ret;
        }
    }

    ret.status = 'NOT_FOUND';
    return ret;
};

/**
 * Get task by its name. The status is ignored in the matching process
 * @param {String} taskListId ID of the tasks list
 * @param {String} taskName Name of the task
 * @return {{id:String,idx:Number,task:Object}}
 */
GTD.gtask.findTaskByName = function(taskListId, taskName) {
    var tasks = Tasks.Tasks.list(taskListId);
    var ret = {};
    var retTask, taskId, position;
    if (tasks.items) {
        for (var i = 0; i < tasks.items.length; i++) {
            var task = tasks.items[i];
            var name = GTD.gtask.decodeTaskTitle(task.title).taskName;
            if(taskName == name){ 
                taskId = task.id;
                retTask = task;
                Logger.log('Task with title "%s" and ID "%s" was found.', task.title, task.id);
            }
            //lets pick up the last child task's position in order to insert the new task below
            if(taskId == task.parent) position = task.position;
        }
        ret.id = taskId;
        ret.idx = position;
        ret.task = retTask;
    } 
    return ret;
};

/* Get parent task name from document name
 * The [Log] prefix is trimed and digits are removed. Leading and
 * trailing spaces are also trimed.
 * @param {String} docName document name
 * @return {String}
 */
GTD.gtask.getParentTaskNameFromDocName = function(docName) {
    return docName.replace(/^\[Log\] /, '')
                  .replace(/[0-9]/g, '')
                  .trim();
};

/* Encode the taskName and status together.
 * We stores status as prefix of task name.
 */
GTD.gtask.encodeTaskTitle = function(taskName, status) {
    var symbols = GTD.gtask.statusSymbols;
    var sym = symbols[status];
    var ret = sym + taskName;
    return ret;
};

/* Decode status from taskName.
 * Loop through all the status and return status if the corresponding
 * symbol exists.
 */
GTD.gtask.decodeTaskTitle = function(title) {
    var symbols = GTD.gtask.statusSymbols;
    var ret = {}, sym, status;
    for (status in symbols) {
        if (!symbols.hasOwnProperty(status)) {
            continue;
        }

        sym = symbols[status];
        if (GTD.util.startsWith(title, sym)) {
            ret.taskName = title.replace(sym, '');
            ret.status = status;
            return ret;
        }
    }
    ret.taskName = title;
    ret.status = 'Unknown';
    return ret;
};

GTD.gtask.findOrInsertTask = function(taskListId, parentTask, taskDetails) {
    var taskName = GTD.gtask.decodeTaskTitle(taskDetails.title).taskName;
    var ret = GTD.gtask.findTaskByName(taskListId, taskName);
    // Create task if not exists
    if (!ret.id) {
        if (parentTask) {
            taskDetails.parent = parentTask.id;
            taskDetails.position = parentTask.idx;
        }
        var newTask = Tasks.newTask().setTitle(taskDetails.title);
        newTask = Tasks.Tasks.insert(newTask, taskListId, taskDetails);
        if (parentTask) {
            newTask.setParent(parentTask.id);
        }

        ret.id = newTask.id;
        ret.idx = newTask.position;
        ret.task = newTask;
    }
    return ret;
};

/* Update details of a task, if the task doesn't exist, then a new task
 * will be inserted and updated
 */
GTD.gtask.updateTask = function(taskListId, parentTask, taskDetails) {
    var tmp = GTD.gtask.decodeTaskTitle(taskDetails.title);
    var taskRet = GTD.gtask.findOrInsertTask(taskListId, parentTask,
                                             taskDetails);
    var task = taskRet.task;
    task.title = GTD.gtask.encodeTaskTitle(tmp.taskName, taskDetails.status);
    // If task is done, mark it as completd and use simple title.
    // Otherwise, encode the status in title.
    if (taskDetails.status === 'Done') {
        task.setStatus('completed');
        task.setTitle(tmp.taskName);
    } else {
        task.setStatus('needsAction');
        task.setCompleted(null);
    }
    task.setNotes(taskDetails.notes);
    var updatedTask = Tasks.Tasks.patch(task, taskListId, task.id);
};

/* Get active task list based on the current document name
 */
GTD.gtask.getActiveTaskList = function() {
    // Get Current Name
    var listName = GTD.gtask.listName;
    var ret = GTD.gtask.findListIdByName(listName);
    if (ret.status !== 'SUCCESS') {
        DocumentApp.getUi().alert('Cannot find task list with name: ' +
                                  listName);
        return;
    }
    var taskListId = ret.id;
    var doc = DocumentApp.getActiveDocument();
    var parentTaskName = GTD.gtask.getParentTaskNameFromDocName(doc.getName());
    var parentTask = GTD.gtask.findOrInsertTask(taskListId,
                                                undefined,
                                                {title: parentTaskName});
    return {
        taskListId: taskListId,
        parentTask: parentTask
    };
};

/* List all subtasks of a document that corresponds to a parent task
 */
GTD.gtask.listAllSubtasksOfParentTask = function(taskListId, parentTask) {
    var tasks = Tasks.Tasks.list(taskListId);
    var retTasks = [];
    if (tasks.items) {
        for (var i = 0; i < tasks.items.length; i++) {
            var task = tasks.items[i];
            if (!task.getParent() || (task.getParent() !== parentTask.id)) {
                continue;
            }
            retTasks.push(task);
        }
    } else {
        Logger.log('No tasks found.');
    }
    return retTasks;
};


GTD.Task = {
    CONTENT_ROW: 1,
    SIZE: [2, 3],
    // THREAD_HEADER_WIDTH: [100, 350, 70, 60]
    THREAD_HEADER_WIDTH: [70, 450, 70],
    NOTE_FORMAT: {
        'code': {
            'color': '#D9EAD3',
            'font-family': 'Consolas',
            'font-size': 9
        },
        'email': {
            'color': '#80D8FF',
            'font-family': 'Times New Roman',
            'font-size': 12
        },
        'checklist': {
            'color': '#FFFF8D',
            'font-family': 'Arial',
            'font-size': 12
        }
    }
};

GTD.Task.createNewTask = function(name, statusName) {
    var statusCode = 0;
    for (var i = 0; i < GTD.header.length; ++i) {
        if (GTD.header[i] === statusName) {
            statusCode = i;
        }
    }
    this.status = statusCode;
    this.subTasksTotal = 0;
    this.subTasksDone = 0;

    return this.insertThreadHeader(name);
};

GTD.Task.addThreadSeparator = function() {
    var table = GTD.util.insertTableAtCursor([['Task Separator']]);
    table.editAsText().setForegroundColor('#ffffff');
    GTD.Task.setBackgroundColor(table, '#4285F4', [0, 1, 0, 1]);
    table.setBorderWidth(0);
};

GTD.Task.insertThreadHeader = function( name) {
    var currentTime = GTD.util.toISO(new Date());
    var taskStatus = GTD.header[this.status];
    // var subTaskStatus = this.subTasksDone + '/' + this.subTasksTotal;

    var headerTable = GTD.util.insertTableAtCursor([
        ['Timestamp', 'Name', 'Status'],
        [currentTime, name, taskStatus],
    ]);

    // set table column width
    this.setColumnWidth(headerTable);

    // set table color
    var taskColor = GTD.headerColor[this.status];
    headerTable.editAsText().setForegroundColor(taskColor);
    headerTable.setBorderWidth(0);

    GTD.Task.setBackgroundColor(headerTable, '#666666', [0, 1, 0, this.SIZE[1]]);
    GTD.Task.setForegroundColor(headerTable, '#ffffff', [0, 1, 0, this.SIZE[1]]);
    GTD.Task.setBackgroundColor(headerTable, '#dde4e6', [1, this.SIZE[0], 0, this.SIZE[1]]);

    // Add a bookmark
    var taskDesc = currentTime + '\n' + name;
    var position = DocumentApp.getActiveDocument().newPosition(headerTable, 0);
    var bookmark = position.insertBookmark();

    // Store the correspondence of taskDesc and bookmark Id.
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty(taskDesc, bookmark.getId());

    // return task here
    return {
      taskDesc: taskDesc,
      statusBefore: 'NotExist'
    };

};

GTD.Task.setColumnWidth = function(table) {
    var i;
    for (i = 0; i < this.THREAD_HEADER_WIDTH.length; ++i) {
        table.setColumnWidth(i, this.THREAD_HEADER_WIDTH[i]);
    }
};

GTD.Task.insertNote = function(noteType) {
    var document = DocumentApp.getActiveDocument();
    var cursor = document.getCursor();
    if (!cursor) {
        GTD.util.alertNoCursor();
        return;
    }
    var ele = cursor.getElement();
    var noteCell = ele;
    // Search up until we find a table cell or return.
    while (noteCell.getType() !== DocumentApp.ElementType.TABLE_CELL) {
        noteCell = noteCell.getParent();
        if (noteCell.getType() == DocumentApp.ElementType.DOCUMENT) {
            // cannot find a Table cell. Probably because the current cursor is
            // not inside a table.
            return;
        }
    }
    // format the table cell.
    noteCell.setBackgroundColor(GTD.Task.NOTE_FORMAT[noteType]['color']);
    noteCell.editAsText().setFontFamily(GTD.Task.NOTE_FORMAT[noteType]['font-family']);
    noteCell.editAsText().setFontSize(GTD.Task.NOTE_FORMAT[noteType]['font-size']);
    // A workaround to make sure the format of the text is cleared.
    var text = noteCell.getText();
    noteCell.clear();
    noteCell.setText(text);
};

// GTD.Task.addBody = function(cell) {
//     var doc = DocumentApp.getActiveDocument();
//     var position = doc.newPosition(cell, 0);
//     doc.setCursor(position);
// };
GTD.Task.insertComment = function(options) {
    if (typeof options === 'undefined') {
      options = {'location': 'cursor'};
    }

    var user = Session.getActiveUser().getEmail().split("@")[0];
    var currentTime = GTD.util.toISO(new Date());
    if (options.location === 'cursor') {
      table = GTD.util.insertTableAtCursor([[user + ' ' + currentTime], ['']]);
    } else if (options.location === 'thread') {
      table = GTD.util.insertTableAfterThreadHeader({
        threadHeader: options.threadHeader,
        cells: [[user + ' ' + currentTime], [options.message]]
      });
    }

    if (table === 'cursor_not_found') {
        return;
    }
    if (table === 'element_not_found') {
      Logger.log('Fail to insert comment table!');
      DocumentApp.getUi().alert('Please make sure your cursor is not in ' +
          'any table when inserting comment');
      return;
    }

    table.editAsText().setForegroundColor(GTD.commentStyle.foregroundColor);
    var text = table.getCell(0, 0).editAsText();
    text.setFontSize(user.length+1, text.getText().length-1, 7);

    table.getCell(0, 0)
        .setBackgroundColor('#dde4e6');
    table.getCell(1, 0)
        .setBackgroundColor('#f7f7f7');
    table.setBorderWidth(0);

    GTD.util.setCursorAtTable(table, [1, 0]);
};

// Get task header from its name
GTD.getTaskHeader = function(task) {
    var doc = DocumentApp.getActiveDocument();
    var taskDesc = task.taskDesc;
    var position = GTD.getTaskThreadPosition(task);
    if (!position) {
        return;
    }
    return GTD.Task.getTaskThreadHeader(position.getElement());
}

// getTaskThreadHeader returns the task thread header under the cursor
GTD.Task.getTaskThreadHeader = function(ele) {
    var cursor, task, res = {};
    if (typeof ele === 'undefined') {
        cursor = DocumentApp.getActiveDocument().getCursor();
        if (!cursor) {
            GTD.util.alertNoCursor();
            return {};
        }
        ele = cursor.getElement();
    }

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
        return res;
    }
    
    if (!GTD._isTaskTable(ele)) {
      res.header = ele;
      res.status = 'cursor_in_header';
      return res;
    }

    // If the cursor is in the summary table, then find the
    // corresponding header by its name.
    if (GTD._isTaskTable(ele)) {
      // Get task name.
      task = GTD.getTaskFromSummaryTable(cursor);
      if (task) {
          res.header = GTD.getTaskHeader(task).header;
          res.status = 'cursor_in_summary_table';
      }
    }

    return res;
};

GTD.Task.isValidTaskThreadHeader = function(table) {
    if (table.getNumRows() !== 2) {
        return false;
    }

    if (table.getCell(0, 0).editAsText().getText() !== 'Timestamp') {
        return false;
    }
    return true;
};

GTD.Task.setBackgroundColor = function(headerTable, color, range) {
    var i, j;
    assert(range.length === 4, 'wrong format of range');
    for (i = range[0]; i < range[1]; ++i) {
        for (j = range[2]; j < range[3]; ++j) {
            headerTable.getCell(i, j).setBackgroundColor(color);
        }
    }
};

GTD.Task.setForegroundColor = function(headerTable, color, range) {
    var i, j;
    assert(range.length === 4, 'wrong format of range');
    for (i = range[0]; i < range[1]; ++i) {
        for (j = range[2]; j < range[3]; ++j) {
            headerTable.getCell(i, j).editAsText().setForegroundColor(color);
        }
    }
};


GTD.Task.setThreadHeaderStatus = function(threadHeader, status) {

    // Change color
    var colIdx = GTD.getColIdx(status);
    var color = GTD.headerColor[colIdx];
    GTD.Task.setForegroundColor(threadHeader, color, [1, this.SIZE[0], 0, this.SIZE[1]]);

    // Change text
    threadHeader.getCell(this.CONTENT_ROW, 2).setText(status);
};

GTD.Task.getThreadHeaderStatus = function(threadHeader) {
    return threadHeader.getCell(this.CONTENT_ROW, 2).getText();
}

GTD.Task.getTaskDesc = function(threadHeader) {
    return threadHeader.getCell(this.CONTENT_ROW, 0).getText() + '\n' + threadHeader.getCell(this.CONTENT_ROW, 1).getText();
};

GTD.Task.isThreadHeader = function(table) {
    return (table.getNumRows() === this.SIZE[0]) && 
           (table.getRow(0).getNumChildren() === this.SIZE[1]) &&
           (table.getCell(0, 0).getText() == 'Timestamp');
};

GTD.Task.isSeparator = function(table) {
    return table.getText() === 'Task Separator';
};


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
    if (tables.length === 0 || !this._isTaskTable(tables[0])) {
        taskTable = this._createDefaultGTDTable(this.body);
    } else {
        taskTable = tables[0];
    }
    this.taskTable = taskTable;
};

GTD.initPageMargin = function() {
    this.body.setMarginLeft(this.bodyMargins[0]);
    this.body.setMarginTop(this.bodyMargins[1]);
    this.body.setMarginRight(this.bodyMargins[2]);
    this.body.setMarginBottom(this.bodyMargins[3]);
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
};


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


GTD.cleanTask = function(type, task, alert) {
    var taskName = task.taskDesc;
    var i;
    if (typeof type === 'undefined') {
        return;
    }
    if (type === 'All') {
        for (i = 0; i < this.header.length; ++i) {
            this.cleanTask(this.header[i], {taskDesc: taskName});
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
GTD.setTaskColor = function(type, task) {
    var taskName = task.taskDesc;
    // setColor = (function (type, ele) {
    //     if (!ele) return;
    //     ele.asText().editAsText().setForegroundColor(this.headerColor[this.getColIdx(type)]);
    // }).bind(this, type);
    // Change the color of the task in the task table
    var timeStamp = this.getTimeStamp(taskName);
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    // the first element is in the document header table.
    var re = body.findText(timeStamp);
    // setColor(re.getElement());

    // If the task exists in the main body, change its color, too.
    re = body.findText(timeStamp, re);
    if (!re) {
        DocumentApp.getUi().alert('cannot find tash thread table for task: ' + taskName);
        return;
    }

    // setColor(re.getElement());
    // change color of the task header.
    var taskThreadHeader = GTD.Task.getTaskThreadHeader(re.getElement()).header;
    if (!GTD.Task.isValidTaskThreadHeader(taskThreadHeader)) {
        DocumentApp.getUi().alert('find invalid table thread header when changing color of task: ' + taskName);
        return;
    }
    GTD.Task.setThreadHeaderStatus(taskThreadHeader, type);
};

GTD.addTask = function(type, task) {
    var taskName = task.taskDesc;
    cell = this.findFirstEmptyCell(type);
    if (typeof cell === 'undefined') {
        this.appendRow(1);
        cell = this.taskTable.getCell(this.taskTable.getNumRows() - 1, this.getColIdx(type));
    }
    cell.setText(taskName);
    // this.setTaskColor(type, taskName);
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
        return this;
    }
    var row = this.taskTable.appendTableRow();
    this.mutateRow(row, rowContent);
    return this;
};


GTD.getTimeStamp = function(taskName) {
    //timestamp is at the begining and has the format YYYY-mm-DD
    //HH:MM:SS. It is seperated by other content by \n;
    var tokens = taskName.split('\n');
    return tokens[0];
};

GTD.getTaskName = function(taskName) {
    var tokens = taskName.split('\n');
    return tokens[1];
};


// this function returns the task under cursor
GTD.getSelectedTask = function(type) {
    var taskHeaderResult = GTD.Task.getTaskThreadHeader();
    var taskHeader = taskHeaderResult.header;
    if (!GTD.Task.isValidTaskThreadHeader(taskHeader)) {
        return {
            error: 'To change status of a task, please ' +
                   'put cursor in the task description ' +
                   'table in the main body.'
        };
    }
    var statusBefore = GTD.Task.getThreadHeaderStatus(taskHeader);
    GTD.Task.setThreadHeaderStatus(taskHeader, type);
    var taskDesc = GTD.Task.getTaskDesc(taskHeader);
    if (!taskDesc) {
        return {
            error: 'cannot find task name'
        };
    }
    return {
        taskDesc: taskDesc,
        threadHeader: taskHeader,
        statusBefore: statusBefore,
        cursorStatus: taskHeaderResult.status
    };
};

GTD.appendLogEntry = function() {
};

GTD._isTaskTable = function(table) {
    if (table.getNumRows() === 0) {
        return false;
    }
    var headerRow = table.getRow(0);
    if (headerRow.getNumChildren() !== this.header.length) {
        return false;
    }
    var i;
    for (i = 0; i < this.header.length; ++i) {
        if (headerRow.getCell(i).getText() != this.header[i]) {
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
    GTD.util.setCursorAtStart();
    var table = GTD.util.insertTableAtCursor(this._createDefaultTableContent());
    if (!table) {
        DocumentApp.getUi().alert('Cannot create task summary table!');
        return;
    }

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

/**
 * changeTaskStatus
 *
 * @param {object} options.task object
 * @param {string} options.task.taskDesc task description
 * @param {boolean} options.disableGTask indicate whether GTask service
 *     needs to be updated 
 * @param {boolean} options.setTaskColor indicate whether we should
 *     update task color
 * @param {string} options.status {'Actionable'|'Waiting
 *     For'|'Done'|'SomDay'}, a string that represents the status
 */
GTD.changeTaskStatus = function(options) {
    var task = options.task;

    // Update Summary table
    GTD.cleanTask('All', task);
    GTD.addTask(options.status, task);
    if (options.setTaskColor) {
        GTD.setTaskColor(options.status, task);
    }

    // Update gtask service
    if (!options.disableGTask && GTD.gtask.isInitialized()) {
        var tl = GTD.gtask.getActiveTaskList();
        var timestamp = GTD.getTimeStamp(task.taskDesc);
        var title = task.taskDesc.replace(timestamp + '\n', '');
        GTD.gtask.updateTask(tl.taskListId, tl.parentTask, {
            title: title,
            notes: timestamp + ' moved from [' + task.statusBefore + '] to [' + options.status + ']',
            status: options.status
        });
    }
};

/**
 * Insert task and update information in summary table
 *
 * @param {string} name task name
 * @param {string} status status of task
 * @param {boolean} disableGTask indicate whether gtask service needs to
 *     be updated
 * @returns {object} task object
 */
GTD.insertTask = function(name, status, disableGTask) {
    if (typeof disableGTask === 'undefined') {
        disableGTask = false;
    }
    var task = GTD.Task.createNewTask(name, status);
    // Update task's status in summary table.
    GTD.changeTaskStatus({
        task: task,
        status: status,
        disableGTask: disableGTask
    });

    return task;
};

GTD.insertComment = function() {
    GTD.Task.insertComment();
};

GTD.initialize = function() {
    if (GTD.initialized === true) {
        return;
    }

    // Set background of document to be solarized light color
    var style = {};
    style[DocumentApp.Attribute.BACKGROUND_COLOR] = '#eee8d5';
    var doc = DocumentApp.getActiveDocument().getBody();
    doc.setAttributes(style);

    GTD.initTaskTable();
    GTD.initPageMargin();
    GTD.initialized = true;
};

GTD.searchBookmarkIdBasedOnTaskDesc = function(taskDesc) {
    var doc = DocumentApp.getActiveDocument();
    var bookmarks = doc.getBookmarks();
    var i, header, desc;
    for (i = 0; i < bookmarks.length; ++i) {
        header = GTD.Task.getTaskThreadHeader(bookmarks[i].getPosition().getElement()).header;
        if (!GTD.Task.isValidTaskThreadHeader(header)) {
            continue;
        }
        desc = GTD.Task.getTaskDesc(header);
        if (taskDesc === desc) {
            return bookmarks[i].getId();
        }
    }
};

GTD.getTaskThreadPosition = function(task) {
    var doc = DocumentApp.getActiveDocument();
    var documentProperties = PropertiesService.getDocumentProperties();
    var bookmarkId = documentProperties.getProperty(task.taskDesc);
    if (!bookmarkId) {
        Logger.log('PropertiesService unsynced!');
        bookmarkId =  GTD.searchBookmarkIdBasedOnTaskDesc(task.taskDesc);
        if (bookmarkId) {
            documentProperties.setProperty(task.taskDesc, bookmarkId);
        } else {
            DocumentApp.getUi().alert('Cannot find bookmark ID for task: ' + task.taskDesc);
            return;
        }
    }
    var bookmark = doc.getBookmark(bookmarkId);
    if (bookmark) {
        return bookmark.getPosition();
    }
};

// Find the task header, set the cursor there and select the whole
// header to highlight it.
GTD.jumpAndFocusOnTask = function(task) {
    var doc = DocumentApp.getActiveDocument();
    var taskDesc = task.taskDesc;
    var position = GTD.getTaskThreadPosition(task);
    if (!position) {
        return;
    }

    doc.setCursor(position);

    // Make the task to be selected. This gives user a visual indicator
    // of the start of the task.
    var rangeBuilder = doc.newRange();
    var header = GTD.Task.getTaskThreadHeader(position.getElement()).header;
    rangeBuilder.addElement(header);
    doc.setSelection(rangeBuilder.build());
};

GTD.changeTaskStatusMenuWrapper = function(options) {
    GTD.initialize();
    var statusAfter = options.statusAfter;
    var ret = GTD.getSelectedTask(statusAfter);
    if (ret.error) {
        DocumentApp.getUi().alert(ret.error);
        return;
    }

    var comment = 'Move from ' + ret.statusBefore + ' to ' + statusAfter;

    // if cursor is in summary table, display a dialog for comment
    if (ret.cursorStatus === 'cursor_in_summary_table') {
        var task;
        var ui = DocumentApp.getUi();
        var result = ui.prompt('Update status',
                               'Please enter your comment:',
                               ui.ButtonSet.OK_CANCEL);

        var button = result.getSelectedButton();
        var text = result.getResponseText();
        if (button == ui.Button.OK) {
            comment = comment + '\n' + text;
        } else {
            return;
        }

    }

    GTD.changeTaskStatus({task: ret, status: statusAfter});
    GTD.Task.insertComment({
      threadHeader: ret.threadHeader,
      message: comment,
      location: 'thread'
    });

    // if cursor was in summary table before the change, move the cursor
    // back to the summary table
    if (ret.cursorStatus === 'cursor_in_summary_table') {
        var doc = DocumentApp.getActiveDocument();
        var position = doc.newPosition(GTD.getTaskTable(), 0);
        doc.setCursor(position);
    }
};

// This function assume cursor is inside summary table and find the task
// description from the summary table.
GTD.getTaskFromSummaryTable = function(cursor) {
    var ele = cursor.getElement();
    if (ele.getType() === DocumentApp.ElementType.TEXT) {
        ele = ele.getParent();
    }
    if (ele.getType() === DocumentApp.ElementType.PARAGRAPH) {
        ele = ele.getParent();
    }
    if (!ele || ele.getType() != DocumentApp.ElementType.TABLE_CELL) {
        DocumentApp.getUi().alert('Cannot find task under cursor!' );
        return;
    }

    return {
        taskDesc: ele.editAsText().getText()
    };
};

GTD.updateTaskStatusInBatch = function(gTasksInfo) {
    // Create a table to search for status of existing tasks
    var existingTasks = {};
    for (var i = 0; i < this.header.length; ++i) {
        var tasks = this.getAllTasksFromCol(i);
        thisTasks = [];
        for (var j = 0; j < tasks.length; ++j) {
            var taskName = GTD.getTaskName(tasks[j]);
            existingTasks[taskName] = {
                'status': this.header[i],
                'task': tasks[j]
            }
        }
    }
    // debug('existingTasks: ' + JSON.stringify(existingTasks));

    for (var i = 0; i < gTasksInfo.length; ++i) {
        var info = GTD.gtask.decodeTaskTitle(gTasksInfo[i].getTitle());
        // If task is marked completed in gtask, the corresponding
        // status should be 'Done' regardless of symbol encoded in
        // title.
        if (gTasksInfo[i].getStatus() === 'completed') {
            info.status = 'Done';
        }
        if (info.status === 'Unknown') {
            //TODO(hbhzwj): right now we don't process tasks whose status is
            //unknown. Need to think whether this is the best approach
            continue;
        }
        var existingInfo = existingTasks[info.taskName];
        // If the task doesn't exist in the document yet, then create it
        if (typeof existingInfo === 'undefined') {
            GTD.util.setCursorAfterFirstSeparator();
            GTD.insertTask(info.taskName, info.status, true);
            // GTD.Task.insertComment({
            //     threadHeader: ret.threadHeader,
            //     location: 'thread',
            //     message: gTasksInfo[i].getNotes()
            // });
            continue;
        }

        // Update task status if the status of gtasks and document doesn't matches
        if (existingInfo.status !== info.status) {
            // debug('change task with description: ' + existingInfo.task + ' from ' + 
            //       existingInfo.status + ' to status ' + info.status);
            GTD.changeTaskStatus({
                task: {
                    taskDesc: existingInfo.task
                },
                status: info.status,
                setTaskColor: true,
                disableGTask: true
            });
        }
    }
};


// GTD.initTaskTable();

/////////////////////////////////////////////////////////////
// These functions are used by javascript for sidebar view.
/////////////////////////////////////////////////////////////

function getTOCString() {
  GTD.initialize();
  return JSON.stringify(GTD.TOC.pullHeaders());
}

function getTasksString() {
    GTD.initialize();
    return JSON.stringify(GTD.getSideBarTableContent());
}

function changeTaskStatus(taskDesc, status) {
    GTD.initialize();
    return GTD.changeTaskStatus({
        task: {taskDesc: taskDesc},
        status: status,
        setTaskColor: true
    });
}

function findAndFocusOnTask(taskName) {
    GTD.initialize();
    GTD.jumpAndFocusOnTask({taskDesc:taskName});
}


function onOpen(e) {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('GTD')
      // .addItem('insert date', 'insertDate')
      .addItem('Initialize', 'initTaskFunction')
      .addItem('Insert task', 'insertTask')
      .addItem('Insert comment', 'insertComment')
      .addItem('Mark as Actionable', 'createActionableTask')
      .addItem('Mark as WaitingFor', 'moveTaskToWaitingFor')
      .addItem('Mark as Done', 'moveTaskToDone')
      .addItem('Mark as Someday', 'moveTaskToSomeday')
      .addItem('Insert separator', 'insertSeparator')
      .addItem('Jump to task', 'jumpToTask')
      .addItem('Show sidebar', 'showSidebar')
      .addItem('Sync From GTasks', 'syncFromGTasks')
      .addSeparator()
      .addSubMenu(ui.createMenu('Note')
        .addItem('Format as code', 'insertNoteCode')
        .addItem('Format as email', 'insertNoteEmail')
        .addItem('Format as checklist', 'insertNoteChecklist'))
      .addToUi();

  if (e && e.authMode == ScriptApp.AuthMode.FULL) {
      syncFromGTasks();
  }
}

function onInstall(e) {
  onOpen(e);
}

function syncFromGTasks() {
  if (!GTD.gtask.isInitialized()) {
      Logger.log('gtask service is not initialized');
      return;
  }
  GTD.initTaskTable();
  var atl = GTD.gtask.getActiveTaskList();
  var gTasksInfo = GTD.gtask.listAllSubtasksOfParentTask(atl.taskListId, atl.parentTask);
  GTD.updateTaskStatusInBatch(gTasksInfo);
}

function insertSeparator() {
    GTD.Task.addThreadSeparator();
}

function insertComment() {
    GTD.insertComment();
}

function insertNoteCode() {
  GTD.Task.insertNote('code');
}

function insertNoteEmail() {
  GTD.Task.insertNote('email');
}

function insertNoteChecklist() {
  GTD.Task.insertNote('checklist');
}

function insertTask() {
    GTD.initialize();

    var task;
    var ui = DocumentApp.getUi();
    var result = ui.prompt(
        'Let\'s start!',
        'Please enter a short task description:',
    ui.ButtonSet.OK_CANCEL);

    var button = result.getSelectedButton();
    var text = result.getResponseText();
    if (button == ui.Button.OK) {
        task = GTD.insertTask(text, 'Actionable');
    } else {
        return;
    }
}

function jumpToTask() {
    var doc = DocumentApp.getActiveDocument();
    var cursor = doc.getCursor();
    if (!cursor) {
        debug('no cursor');
        return;
    }

    var task = GTD.getTaskFromSummaryTable(cursor);
    if (task) {
        GTD.jumpAndFocusOnTask(task);
    }
}

function insertDate() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var text = '\n' + GTD.toISO(new Date()) + '\n';
  var element = cursor.insertText(text);
  doc.setCursor(doc.newPosition(element, text.length));
}

function initTaskFunction() {
    GTD.initialize();
}

function createActionableTask() {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: 'Actionable'
    });
}

function moveTaskToWaitingFor() {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: 'Waiting For'
    });
}

function moveTaskToDone() {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: 'Done'
    });
}

function moveTaskToSomeday() {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: 'Someday'
    });
}

function showSidebar() {
    var html = HtmlService.createHtmlOutput(GTD.templates.sidebar)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setTitle('My task list')
        .setWidth(300);

    DocumentApp.getUi() // Or DocumentApp or FormApp.
        .showSidebar(html);
}




GTD.templates.sidebar = "<link rel='stylesheet' href='https://ssl.gstatic.com/docs/script/css/add-ons.css'><script src='https://code.jquery.com/jquery-2.1.3.min.js'></script><script src='https://cdnjs.cloudflare.com/ajax/libs/mustache.js/0.8.1/mustache.min.js'></script><style>.collapse{  font-size: 20px;  display:block;}.collapse + input{  display:none;}.collapse + input + *{  display:none;}.collapse+ input:checked + *{  display:block;}.task:hover {    color: #4d90fe;    cursor: pointer;     cursor: hand;}</style><div align='right'>    <input type='button' value='Refresh' onclick='google.script.run.showSidebar()' /></div><div id='task_queue' style='display:none'>{{#task_queues}}<div id={{type}}>    <label class='collapse' ondrop='SB.onDrop(event)' ondragover='SB.allowDrop(event)', ondragleave='SB.dragLeave(event)' style='color: {{color}}' for='_{{index}}'>{{type}}</label>    <input id='_{{index}}' type='checkbox' checked='checked'>    <div class='task_list' ondragover=''>        <ul>        {{#tasks}}            <li class='task' draggable='true' id={{name}}            ondragstart='SB.onDrag(event)'>{{name}}</li>        {{/tasks}}        </ul>    </div></div>{{/task_queues}}</div><div id='table_of_content' style='display:none'><label class='collapse' style='color: black' for='_5'>Table of Content</label><input id='_5' type='checkbox' checked='checked'><div><ul>{{#headers}}<li id='{{toc}}'>{{text}}</li>{{/headers}}{{^headers}}Please insert a table of content in the document using insert->table of content{{/headers}}</ul></div></div><script>SB = {};SB.findTaskHandler = function (result) {    console.log('findTaskHandler res: ' + result);};SB.addClickHandler = function () {    $('.task').click(function (e) {        var task = $(this).parents('li').add(this).map(function () {            return $.trim(this.firstChild.nodeValue)        }).get();        console.log('test run here task: ' + task);        google.script.run.withSuccessHandler(SB.findTaskHandler)            .findAndFocusOnTask(task[0]);    });};SB.onDrag = function (ev) {    console.log('onDrag called');    ev.dataTransfer.setData('task', ev.target.id);};SB.onDrop = function (ev) {    ev.preventDefault();    var data = ev.dataTransfer.getData('task');    var ele = document.getElementById(data);    ev.target.parentNode.getElementsByTagName('ul')[0].appendChild(ele);    $('#task_queue label').css({        'background-color': 'white'    });    google.script.run.withSuccessHandler(SB.changeStatusSuccess)        .changeTaskStatus(ele.textContent, ev.target.textContent);};SB.allowDrop = function (ev) {    ev.preventDefault();    $(ev.target).css({        'background-color': '#4d90fe'    });};SB.dragLeave = function (ev) {    console.log('dragleave: ');    console.dir(ev);    debugger;    $('#task_queue label').css({        'background-color': 'white'    });};SB.buildTaskQueue = function (result) {    var taskQueue = document.getElementById('task_queue');    var content = JSON.parse(result);    taskQueue.innerHTML = Mustache.to_html(taskQueue.innerHTML, content);    taskQueue.style.display = 'block';    SB.addClickHandler();};SB.buildToC = function (result) {  var content = JSON.parse(result);  var list = document.getElementById('table_of_content');  list.innerHTML = Mustache.to_html(list.innerHTML, content);  list.style.display = 'block';};SB.changeStatusSuccess = function () {    console.log('status changed');};google.script.run.withSuccessHandler(SB.buildTaskQueue).getTasksString();google.script.run.withSuccessHandler(SB.buildToC).getTOCString();</script>";


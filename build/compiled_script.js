// compiled from git commit version: 26f5300c4273d397a9d50891d4bff0b90a2fe66c
var GTD = {
    // Commonly used DOM object
    document: DocumentApp.getActiveDocument(),
    body: DocumentApp.getActiveDocument().getBody(),

    // A map between status and a emoji symbol used
    // to represent the status.
    statusSymbol: {
        'Actionable': '\uD83C\uDD70\uFE0F',
        'Waiting For': '\uD83C\uDD86',
        'Done': '\u2705',
        'Someday': '\uD83C\uDD82',
    },
    header: ['Actionable', 'Waiting For', 'Done', 'Someday'], //FIXME change to taskStatus
    headerColor: ['#f92929', '#cc317c', '#229819', '#cccccc'], //FIXME change to taskStatusColor
    commentStyle: {
        foregroundColor: '#000000'
    },
    defaultRows: 1,
    templates: {},
    TOC: {},
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

GTD.util.insertTableAtBegining = function(cells) {
    var document = DocumentApp.getActiveDocument();
    var body = document.getBody();
    var table = body.insertTable(0, cells);
    return table;
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

GTD.util.insertText = function(text) {
  var document = DocumentApp.getActiveDocument();
  var cursor = document.getCursor();
  if (!cursor) {
      GTD.util.alertNoCursor();
      return;
  }
  var ele = cursor.insertText(text);
  return ele;
}

GTD.util.extractElementUnderCursor = function() {
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
  return ele;
}


GTD.Summary = GTD.Summary || {};

/* Delete tasks of a certain type in summary table.
 */
GTD.Summary.cleanTask = function(type, task, alert) {
    var taskName = task.taskDesc;
    var i;
    if (typeof type === 'undefined') {
        return;
    }
    if (type === 'All') {
        for (i = 0; i < GTD.header.length; ++i) {
            GTD.Summary.cleanTask(GTD.header[i], {taskDesc: taskName});
        }
        return;
    }

    var cell = GTD.Summary.findFirstCell(type, taskName);
    if (typeof cell === 'undefined') {
        if (alert) {
            DocumentApp.getUi().alert('cannot find task name: ' + taskName);
        }
    } else {
        cell.clear();
    }
};

GTD.Summary._emptyRowContent = function() {
    var rowContent = [], i;
    for (i = 0; i < GTD.header.length; ++i) {
        rowContent.push('');
    }
    return rowContent;
};

GTD.Summary.mutateRow = function(row, rowContent) {
    var i;
    for (i = 0; i < rowContent.length; ++i) {
        row.appendTableCell(rowContent[i]);
    }
    return GTD;
};

GTD.Summary.appendRow = function(rowContent) {
    var i, rc = GTD.Summary._emptyRowContent();
    if (typeof rowContent === 'number') {
        for (i = 0; i < rowContent; ++i) {
            GTD.Summary.appendRow(rc);
        }
        return GTD;
    }
    var row = GTD.taskTable.appendTableRow();
    GTD.Summary.mutateRow(row, rowContent);
    return GTD;
};

// GTD function returns the first empty cell in a column.
GTD.Summary.findFirstEmptyCell = function(col) {
    return GTD.Summary.findFirstCell(col, '', false);
};

GTD.Summary.findFirstCell = function(col, target, useID) {
    var summaryTable = GTD.Summary.getSummaryTable();
    if (typeof col === 'string') {
        col = GTD.TM.getColIdx(col);
    }
    if (typeof col === 'undefined') {
        return;
    }
    var i, cell, rowNum = summaryTable.getNumRows();
    for (i = 0; i < rowNum; ++i) {
        cell = summaryTable.getCell(i, col);
        if (useID && (GTD.util.getID(cell.getText()) === GTD.util.getID(target))) {
            // compare using ID
            return cell;
        } else if (cell.getText() === target) {
            // compare the full string
            return cell;
        }
    }
    return;
};

/* Add a task to summary table
 */
GTD.Summary.addTask = function(type, task) {
    var taskName = task.taskDesc;
    var summaryTable = GTD.Summary.getSummaryTable();
    cell = GTD.Summary.findFirstEmptyCell(type);
    if (typeof cell === 'undefined') {
        GTD.Summary.appendRow(1);
        cell = summaryTable.getCell(summaryTable.getNumRows() - 1, GTD.TM.getColIdx(type));
    }
    cell.setText(taskName);
};

GTD.Summary.getSummaryTable = function() {
    if (!GTD.taskTable) {
        GTD.initSummaryTable();
    }
    return GTD.taskTable;
};

/* Get tasks from a particular column
 */
GTD.Summary.getAllTasksFromCol = function(col) {
    var summaryTable = GTD.Summary.getSummaryTable();
    var i, cell, rowNum = summaryTable.getNumRows(), res = [];
    for (i = 1; i < rowNum; ++i) {
        cell = summaryTable.getCell(i, col);
        if (typeof cell !== 'undefined' && cell.getText() !== '') {
            res.push(cell.getText());
        }
    }
    return res;
};

GTD.Summary.searchTaskSummaryTable = function() {
    var tables = GTD.body.getTables();
    for (var i = 0; i < tables.length; ++i) {
        if (GTD.Summary.isTaskSummaryTable(tables[i])) {
            return tables[i];
        }
    }
    return null;
}

GTD.Summary.isTaskSummaryTable = function(table) {
    if (table.getNumRows() === 0) {
        return false;
    }
    var headerRow = table.getRow(0);
    if (headerRow.getNumChildren() !== GTD.header.length) {
        return false;
    }
    var i;
    for (i = 0; i < GTD.header.length; ++i) {
        if (headerRow.getCell(i).getText() != GTD.header[i]) {
            return false;
        }
    }
    return true;
};

GTD.Summary._createDefaultTableContent = function () {
    var tableContent = [GTD.header];
    var rowContent = [];
    var i;
    for (i = 0; i < GTD.header.length; ++i) {
        rowContent.push('');
    }
    for (i = 0; i < GTD.defaultRows; ++i) {
        tableContent.push(rowContent);
    }
    return tableContent;
};

GTD.Summary.createSummaryTable = function (body) {
    GTD.util.setCursorAtStart();
    var summayTableContent = GTD.Summary._createDefaultTableContent();
    var table = GTD.util.insertTableAtBegining(summayTableContent);
    if (table === 'element_not_found' || table === 'cursor_not_found') {
        DocumentApp.getUi().alert('Cannot create task summary table!');
        return;
    }

    assert(GTD.header.length === GTD.headerColor.length, 'wrong number of color');
    for (i = 0; i < GTD.header.length; ++i) {
        table.getCell(0, i)
        .setBackgroundColor('#fafbfc')
        .editAsText()
        .setForegroundColor(GTD.headerColor[i])
        .setBold(true);
    }
    table.setBorderColor('#c0d3eb');
    table.setBorderWidth(1);
    return table;
};


GTD.TM = GTD.TM || {};


GTD.TM.getColIdx = function(status) {
    var i;
    // lazy initialization of colIdx table
    if (typeof GTD.colIdx === 'undefined') {
        GTD.colIdx = {};
        for (i = 0; i < GTD.header.length; ++i) {
            GTD.colIdx[GTD.header[i]] = i;
        }
    }
    return GTD.colIdx[status];
};


GTD.Task = {
    CONTENT_ROW: 0,
    SIZE: [2, 3],
};

GTD.Task.createNewTask = function(ele, statusName) {
    // var statusCode = 0;
    // for (var i = 0; i < GTD.header.length; ++i) {
    //     if (GTD.header[i] === statusName) {
    //         statusCode = i;
    //     }
    // }
    // this.status = statusCode;
    return this.insertThreadHeader(ele);
};

GTD.Task.addThreadSeparator = function() {
    var table = GTD.util.insertTableAtCursor([['Task Separator']]);
    if (table === 'element_not_found' || table === 'cursor_not_found') {
      DocumentApp.getUi().alert('Please make sure your cursor is not in ' +
          'any table when inserting separator');
      return;
    }

    table.editAsText().setForegroundColor('#ffffff').setBold(true);
    GTD.Task.setBackgroundColor(table, '#4285F4', [0, 1, 0, 1]);
    table.setBorderWidth(0);
};

// Insert a bookmark. If ele is set, it will try to insert
// a bookmark for the position of insert. Otherwise, it will
// try to insert at the current cursor.
GTD.Task.insertBookmark = function(name, ele) {
  var taskDesc = name;
  var doc = DocumentApp.getActiveDocument();

  var bookmark;
  if (typeof ele === 'undefined') {
    var cursor = doc.getCursor();
    bookmark = doc.addBookmark(cursor);
  } else {
    var position = DocumentApp.getActiveDocument().newPosition(ele, 0);
    bookmark = position.insertBookmark();
  }
  var documentProperties = PropertiesService.getDocumentProperties();
  documentProperties.setProperty(name, bookmark.getId());
}

GTD.Task.insertThreadHeader = function(threadHeaderEle) {
    // If threadHeaderEle is just a string, then we insert
    // the text to the current cursor to create an element.
    if (typeof threadHeaderEle === 'string') {
      threadHeaderEle = GTD.util.insertText(statusSymbol + ' ' + name);
    }

    // return task here
    return {
      taskDesc: GTD.Task.getTaskDesc(threadHeaderEle),
      statusBefore: 'NotExist',
      threadHeader: threadHeaderEle
    };

};

/* Insert a comment in current cursor or to a specific thread.
 * If insert to a thread, need to input threadHeader, which is the table
 * element of the thread.
 *
 * Note: If you only have taskDesc, you can get its task header by
 * calling getTaskHeader
 */
GTD.Task.insertComment = function(options) {
    if (typeof options === 'undefined') {
      options = {'location': 'cursor'};
    }

    var user = Session.getActiveUser().getEmail().split("@")[0];
    var currentTime = GTD.util.toISO(new Date());
    if (options.location === 'cursor') {
      table = GTD.util.insertTableAtCursor([[user + ' ' + currentTime], ['']]);
    } else if (options.location === 'thread') {
      // Move cursor to the position
      var doc = DocumentApp.getActiveDocument();
      var position = doc.newPosition(sometext, 11);
      table = GTD.util.insertTableAtCursor([[user + ' ' + currentTime], ['']]);
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
        .setBackgroundColor('#f1f8ff');
    table.getCell(1, 0)
        .setBackgroundColor('#ffffff');
    table.setBorderWidth(1);
    table.setBorderColor('#c0d3eb')

    GTD.util.setCursorAtTable(table, [1, 0]);
};

/* Get task header from its name
 * Return an object ret that is equal to the return value of
 * getTaskThreadHeader if thread position can be found and {} otherwise
 */
GTD.getTaskHeader = function(task) {
    var doc = DocumentApp.getActiveDocument();
    var taskDesc = task.taskDesc;
    var position = GTD.getTaskThreadPosition(task);
    if (!position) {
        return {};
    }
    return position.getElement();
}

/* Returns the task thread header that is parent of an element.
 *
 * It will search upward from ele to find the first task thread header.
 * If ele is not set, the current element under cursor is used.
 * If element or cursor is in summary table, then the task name is used
 * to retrievel the task thread header position.
 *
 * Returns an object ret
 * ret.header: the DOM object of task header
 * ret.status: {'not_found', 'cursor_in_header', 'cursor_in_summary_table'}
 */
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

    if ((ele.getType() === DocumentApp.ElementType.TEXT) ||
        (ele.getType() === DocumentApp.ElementType.PARAGRAPH) ||
        (ele.getType() === DocumentApp.ElementType.LIST_ITEM)) {
        if (GTD.Task.isValidTaskThreadHeader(ele)) {
            res.header = ele;
            res.status = 'cursor_in_header';
            return res;
        }
    }
    ele = ele.getParent();

    if (ele && ele.getType() === DocumentApp.ElementType.PARAGRAPH) {
        ele = ele.getParent();
    }

    if (ele && ele.getType() === DocumentApp.ElementType.TABLE_CELL) {
        ele = ele.getParent();
    }
    if (ele.getType() === DocumentApp.ElementType.TABLE_ROW) {
        ele = ele.getParent();
    }

    // DocumentApp.getUi().alert('ele.Type: ' + ele.getType());
    if (!ele || ele.getType() != DocumentApp.ElementType.TABLE) {
        res.status = 'not_found'
        return res;
    }

    if (!GTD.Summary.isTaskSummaryTable(ele)) {
      res.header = ele;
      res.status = 'cursor_in_header';
      return res;
    } else {
      // Get task name.
      task = cursor.getElement().editAsText().getText();
      if (task) {
          var position = GTD.getTaskThreadPosition({'taskDesc': task});
          if (!position) {
              res.status = 'not_found'
          } else {

            res.header =  position.getElement();
            res.status = 'cursor_in_summary_table';
          }
      }
    }

    return res;
};

// We assume task thread head is a table with only one row.
GTD.Task.isValidTaskThreadHeader = function(ele) {
    var text = ele.getText();
    for (var key in GTD.statusSymbol) {
        // check if the property/key is defined in the object itself, not in parent
        if (GTD.statusSymbol.hasOwnProperty(key)) {
            if (text.startsWith(GTD.statusSymbol[key])) {
                return true;
            }
        }
    }
    return false;
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
    var symbol = GTD.statusSymbol[status];
    threadHeader = GTD.Task.clearTaskStatus(threadHeader);
    threadHeader.insertText(0, symbol + ' ');
    var taskDesc = GTD.Task.getTaskDesc(threadHeader);
    GTD.Task.insertBookmark(taskDesc, threadHeader);
};

// We assume the first part of the content is the status.
GTD.Task.getThreadHeaderStatus = function(threadHeader) {
    // var text = threadHeader.getCell(this.CONTENT_ROW, 0).getText();
    var text = threadHeader.getText();
    var tokens = text.split(' ');
    var symbol = tokens[0];
    return GTD.symbolStatusMap[symbol];
}

// We assume the remaining part of the content is the task description.
GTD.Task.clearTaskStatus = function(threadHeader) {
  var text = threadHeader.getText();
  for (var key in GTD.statusSymbol) {
      // check if the property/key is defined in the object itself, not in parent
      if (GTD.statusSymbol.hasOwnProperty(key)) {
        if (text.startsWith(GTD.statusSymbol[key] + ' ')) {
            threadHeader = threadHeader.editAsText().deleteText(0, GTD.statusSymbol[key].length);
            return threadHeader;
        }
      }
  }
  return threadHeader;
};


// We assume the remaining part of the content is the task description.
GTD.Task.getTaskDesc = function(threadHeader) {
  var text = threadHeader.getText();
  for (var key in GTD.statusSymbol) {
    // check if the property/key is defined in the object itself, not in parent
    if (GTD.statusSymbol.hasOwnProperty(key)) {
      var prefix = GTD.statusSymbol[key] + ' ';
       if (text.startsWith(prefix)) {
         text = text.replace(prefix, '');
         return text;
        }
      }
  }
  return text;
};

GTD.Task.isSeparator = function(table) {
    return table.getText() === 'Task Separator';
};


// This is a google app scripts that implements a GTD work flow using
// Google Docs.
//
// Author: Jing Conan Wang
// Email: jingconanwang@gmail.com
//
// This code is under GPL license.

// FIXME need to factor the script.js to several smaller files

GTD.initSummaryTable = function() {
  var taskTable = GTD.Summary.searchTaskSummaryTable();
  if (taskTable === null) {
    taskTable = GTD.Summary.createSummaryTable(GTD.body);
    if (taskTable === null || (typeof taskTable === 'undefined')) {
      return false;
    }
  }

  GTD.taskTable = taskTable;
  return true;
};

/* Get the task under cursor
 */
GTD.getSelectedTask = function(type) {
    var ret = {};
    var taskHeaderResult = GTD.Task.getTaskThreadHeader();
    var taskHeader = taskHeaderResult.header;
    if (!taskHeader) {
        ret.status = 'NO_TASK_FOUND';
        return ret;
    }
    if (!GTD.Task.isValidTaskThreadHeader(taskHeader)) {
        ret.status = 'INVALID_TASK_THREAD_HEADER';
        return ret;
    }
    var statusBefore = GTD.Task.getThreadHeaderStatus(taskHeader);
    var taskDesc = GTD.Task.getTaskDesc(taskHeader);
    if (!taskDesc) {
        ret.status = 'NO_VALID_TASK_NAME'
        return ret;
    }
    ret.taskDesc = taskDesc;
    ret.threadHeader = taskHeader;
    ret.statusBefore = statusBefore;
    ret.cursorStatus = taskHeaderResult.status;
    ret.status = 'SUCCESS';
    return ret;
};

/**
 * changeTaskStatus
 *
 * @param {object} options.task object
 * @param {string} options.task.taskDesc task description
 * @param {boolean} options.disableGTask indicate whether GTask service
 *     needs to be updated
 * @param {string} options.status {'Actionable'|'Waiting
 *     For'|'Done'|'SomDay'}, a string that represents the status
 */
GTD.changeTaskStatus = function(options) {
    var task = options.task;

    // Update Summary table
    GTD.Summary.cleanTask('All', task);
    GTD.Summary.addTask(options.status, task);

    // Update Task thread header
    GTD.Task.setThreadHeaderStatus(task.threadHeader, options.status);
};

/**
 * Insert task and update information in summary table
 *
 * @param {Text} Google docs Text element for which the task will be created.
 * @param {string} status status of task
 * @returns {object} task object
 */
GTD.insertTask = function(ele, status) {
    var task = GTD.Task.createNewTask(ele, status);
    if (task === null || (typeof task === 'undefined')) {
        return;
    }

    if (GTD.initialize() !== true) {
      return;
    }

    // Update task's status in summary table.
    GTD.changeTaskStatus({
        task: task,
        status: status
    });

    return task;
};

GTD.insertComment = function() {
    GTD.Task.insertComment();
};

GTD.initialize = function() { 
  if (GTD.initialized === true) {
    return true;
  }

  // Set background of document to be solarized light color
  var style = {};
  var doc = DocumentApp.getActiveDocument().getBody();
  doc.setAttributes(style);

  // symbolStatusMap is a mapping from a symbol to the actual
  // status. In the task thread, we only use symbol to indicate
  // task staus, this map will be used to do lookup to get
  // the actual status.
  GTD.symbolStatusMap = {};
  for (var key in GTD.statusSymbol) {
    if (GTD.statusSymbol.hasOwnProperty(key)) {
      GTD.symbolStatusMap[GTD.statusSymbol[key]] = key;
    }
  }


  if (GTD.initSummaryTable() === false) {
    return false;
  }
  GTD.initialized = true;
  return true;
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

/* Get position of thread header for a task
 * Returns Position if the position can be found, and undfined
 * otherwise.
 */
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
            return;
        }
    }
    var bookmark = doc.getBookmark(bookmarkId);

    if (bookmark) {
        return bookmark.getPosition();
    }
};


GTD.changeTaskStatusMenuWrapper = function(options) {
    if (GTD.initialize() !== true) {
      return;
    }
    var statusAfter = options.statusAfter;
    var ret = GTD.getSelectedTask(statusAfter);
    if (ret.status !== 'SUCCESS') {
        DocumentApp.getUi().alert('Cannot find a valid task under cursor. ' +
                                  'Please put cursor in a task in summary table ' +
                                  'or thread header');
        return;
    }
    GTD.changeTaskStatus({task: ret, status: statusAfter});

    // if cursor was in summary table before the change, move the cursor
    // back to the summary table
    if (ret.cursorStatus === 'cursor_in_summary_table') {
        var doc = DocumentApp.getActiveDocument();
        var position = doc.newPosition(GTD.Summary.getSummaryTable(), 0);
        doc.setCursor(position);
    }
};


function onOpen(e) {
    var ui = DocumentApp.getUi();
    ui.createMenu('GTD')
        .addItem('Create task', 'insertTask')
        .addItem('Insert update', 'insertComment')
        .addItem('Mark task as Actionable', 'createActionableTask')
        .addItem('Mark task as WaitingFor', 'moveTaskToWaitingFor')
        .addItem('Mark task as Done', 'moveTaskToDone')
        .addItem('Mark task as Someday', 'moveTaskToSomeday')
        .addItem('Insert date', 'insertDate')
        .addItem('Insert separator', 'insertSeparator')
        .addToUi();

}

function onInstall(e) {
  onOpen(e);
}


function insertSeparator() {
    GTD.Task.addThreadSeparator();
}

function insertComment() {
    GTD.insertComment();
}

function insertTask() {
  // We need to get the whole element instead of just text here.
  var text = GTD.util.extractElementUnderCursor();
  if (text === null || (typeof text === 'undefined') || text === '' ) {
      DocumentApp.getUi().alert('Could not find text to create task. ' +
                                'Please put your cursor in the line whose text ' +
                                'should be used as task description (do not select the text).');
      return;
  }
  GTD.insertTask(text, 'Actionable');
}

function insertDate() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var text = '\n' + GTD.util.toISO(new Date()) + '\n';
  var element = cursor.insertText(text);
  doc.setCursor(doc.newPosition(element, text.length));
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





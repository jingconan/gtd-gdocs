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

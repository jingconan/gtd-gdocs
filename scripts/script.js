// This is a google app scripts that implements a GTD work flow using
// Google Docs.
//
// Author: Jing Conan Wang
// Email: hbhzwj@gmail.com
//
// This code is under GPL license.

// FIXME need to factor the script.js to several smaller files

/* Verify whether the current document is a GTD document
 * Returns true if the document contains a summary table and the page
 * setting is as expected, and false otherwise.
 */
GTD.isGtdDocument = function() {
    // Verify that the document contains a summary task table
    if (GTD.Summary.searchTaskSummaryTable() === null) {
        return false;
    }

    // Verify that the margin of the document is okay
    bodyAttr = GTD.body.getAttributes();
    marginLeft = bodyAttr[DocumentApp.Attribute.MARGIN_LEFT];
    marginTop = bodyAttr[DocumentApp.Attribute.MARGIN_TOP];
    marginRight = bodyAttr[DocumentApp.Attribute.MARGIN_RIGHT];
    marginBottom = bodyAttr[DocumentApp.Attribute.MARGIN_BOTTOM];
    if ((marginLeft === GTD.bodyMargins[0]) &&
        (marginTop === GTD.bodyMargins[1]) &&
        (marginRight === GTD.bodyMargins[2]) &&
        (marginBottom === GTD.bodyMargins[3])) {
        return true;
    }
    return false;
};

GTD.initSummaryTable = function() {
    var taskTable = GTD.Summary.searchTaskSummaryTable();
    if (taskTable === null) {
        taskTable = GTD.Summary.createSummaryTable(GTD.body);
        taskTable.setBorderWidth(0);
    }
    GTD.taskTable = taskTable;
};

GTD.initPageMargin = function() {
    this.body.setMarginLeft(this.bodyMargins[0]);
    this.body.setMarginTop(this.bodyMargins[1]);
    this.body.setMarginRight(this.bodyMargins[2]);
    this.body.setMarginBottom(this.bodyMargins[3]);
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
 * @param {string} name task name
 * @param {string} status status of task
 * @returns {object} task object
 */
GTD.insertTask = function(name, status) {
    var task = GTD.Task.createNewTask(name, status);
    if (task === null || (typeof task === 'undefined')) {
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
        return;
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

    GTD.initSummaryTable();
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

GTD.Task = {
    CONTENT_ROW: 1,
    SIZE: [2, 3],
    // THREAD_HEADER_WIDTH: [100, 350, 70, 60]
    THREAD_HEADER_WIDTH: [70, 450, 70]
};

GTD.Task.createNewTask = function(name) {
    this.status = 0;
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
    var taskDesc = currentTime + '\n' + name
    var position = DocumentApp.getActiveDocument().newPosition(headerTable, 0);
    var bookmark = position.insertBookmark();

    // Store the correspondence of taskDesc and bookmark Id.
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty(taskDesc, bookmark.getId());

    // return task here
    return {
      taskDesc: taskDesc
    };

};

GTD.Task.setColumnWidth = function(table) {
    var i;
    for (i = 0; i < this.THREAD_HEADER_WIDTH.length; ++i) {
        table.setColumnWidth(i, this.THREAD_HEADER_WIDTH[i]);
    }
};

// GTD.Task.addBody = function(cell) {
//     var doc = DocumentApp.getActiveDocument();
//     var position = doc.newPosition(cell, 0);
//     doc.setCursor(position);
// };

GTD.Task.insertComment = function() {
    var user = Session.getActiveUser().getEmail().split("@")[0];
    var currentTime = GTD.util.toISO(new Date());
    var table = GTD.util.insertTableAtCursor([[user + ' ' + currentTime], ['']]);
    if (!table) {
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

// getTaskThreadHeader returns the task thread header under the cursor
GTD.Task.getTaskThreadHeader = function(ele) {
    if (typeof ele === 'undefined') {
        var cursor = DocumentApp.getActiveDocument().getCursor();
        if (!cursor) {
            debug('no cursor');
            return;
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
        return;
    }
    return ele;
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
    assert(range.length === 4, 'wrong format of range')
    for (i = range[0]; i < range[1]; ++i) {
        for (j = range[2]; j < range[3]; ++j) {
            headerTable.getCell(i, j).setBackgroundColor(color);
        }
    }
};

GTD.Task.setForegroundColor = function(headerTable, color, range) {
    var i, j;
    assert(range.length === 4, 'wrong format of range')
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

GTD.Task.getTaskDesc = function(threadHeader) {
    return threadHeader.getCell(this.CONTENT_ROW, 0).getText() + '\n' + threadHeader.getCell(this.CONTENT_ROW, 1).getText();
};

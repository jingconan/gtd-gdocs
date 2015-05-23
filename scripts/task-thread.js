GTD.Task = {
    CONTENT_ROW: 1,
    SIZE: [2, 3],
    // THREAD_HEADER_WIDTH: [100, 350, 70, 60]
    THREAD_HEADER_WIDTH: [70, 450, 70]
};

GTD.Task.createNewTask = function(name) {
    var body = DocumentApp.getActiveDocument().getBody(),
        taskEle = body.appendTable();
    this.status = 0;
    this.subTasksTotal = 0;
    this.subTasksDone = 0;
    
    return this.addThreadHeader(name);
    // this.addBody(bodyCell);
};

GTD.Task.addThreadSeparator = function() {
    var table = GTD.util.insertTableAtCursor([['Task Separator']]);
    table.editAsText().setForegroundColor('#ffffff');
    this.setBackgroundColor(table, '#4285F4', [1, 1]);
    table.setBorderWidth(0);
    GTD.util.setCursorAtTable(table);
};

GTD.Task.addThreadHeader = function( name) {
    var currentTime = GTD.util.toISO(new Date());
    var taskStatus = GTD.header[this.status];
    var subTaskStatus = this.subTasksDone + '/' + this.subTasksTotal;

    var headerTable = GTD.util.insertTableAtCursor([
        ['Timestamp', 'Name', 'Status'],
        [currentTime, name, taskStatus],
    ]);

    // set table column width
    this.setColumnWidth(headerTable);

    // set table color
    var taskColor = GTD.headerColor[this.status];
    headerTable.editAsText().setForegroundColor(taskColor);

    this.setBackgroundColor(headerTable, '#dde4e6', this.SIZE);

    GTD.util.setCursorAtTable(headerTable);

    // return task description here
    return currentTime + '\n' + name;

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
    var table = GTD.util.insertTableAtCursor([[user + '\n' + currentTime, '']]);

    var text = table.getCell(0, 0).editAsText();
    text.setFontSize(user.length+1, text.getText().length-1, 7);

    var width = Math.max(7 * user.length, 60);
    table.getCell(0, 0)
        .setWidth(width)
        .setBackgroundColor('#dde4e6');
    table.getCell(0, 1)
        .setBackgroundColor('#f7f7f7');
    GTD.util.setCursorAtTable(table, [0, 1]);
}

// getTaskThreadHeader returns the task thread header under the cursor
GTD.Task.getTaskThreadHeader = function() {
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

GTD.Task.setBackgroundColor = function(headerTable, color, tableSize) {
    var i, j;
    for (i = 0; i < tableSize[0]; ++i) {
        for (j = 0; j < tableSize[1]; ++j) {
            // headerTable.getCell(0, i).setBackgroundColor('#dde4e6');
            headerTable.getCell(i, j).setBackgroundColor(color);
        }
    }

}

GTD.Task.setThreadHeaderStatus = function(threadHeader, status) {

    // Change color
    var colIdx = GTD.getColIdx(status);
    var color = GTD.headerColor[colIdx];
    threadHeader.editAsText().setForegroundColor(color);

    // Change text
    threadHeader.getCell(this.CONTENT_ROW, 2).setText(status);
};

GTD.Task.getTaskDesc = function(threadHeader) {
    return threadHeader.getCell(this.CONTENT_ROW, 0).getText() + '\n' + threadHeader.getCell(this.CONTENT_ROW, 1).getText();
}

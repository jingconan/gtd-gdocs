GTD.Task = {};

GTD.Task.createNewTask = function(name) {
    var body = DocumentApp.getActiveDocument().getBody(),
        taskEle = body.appendTable();
    this.status = 0;
    this.subTasksTotal = 0;
    this.subTasksDone = 0;
    
    this.addThreadHeader(name);
    // this.addBody(bodyCell);
};

GTD.Task.addThreadHeader = function( name) {
    var currentTime = GTD.util.toISO(new Date());
    var taskStatus = GTD.header[this.status];
    var subTaskStatus = this.subTasksDone + '/' + this.subTasksTotal;

    var headerTable = GTD.util.insertTableAtCursor([
        [currentTime, name, taskStatus, subTaskStatus],
    ]);

    // set table color
    var taskColor = GTD.headerColor[this.status];
    headerTable.editAsText().setForegroundColor(taskColor);

    var i;
    for (i = 0; i < 4; ++i) {
        headerTable.getCell(0, i).setBackgroundColor('#dde4e6');
    }

    GTD.util.setCursorAfterTable(headerTable);

};

// GTD.Task.addBody = function(cell) {
//     var doc = DocumentApp.getActiveDocument();
//     var position = doc.newPosition(cell, 0);
//     doc.setCursor(position);
// };

GTD.Task.insertComment = function() {
    var user = Session.getActiveUser().getEmail().split("@")[0];
    var currentTime = GTD.util.toISO(new Date());
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
}

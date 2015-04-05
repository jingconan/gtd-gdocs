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

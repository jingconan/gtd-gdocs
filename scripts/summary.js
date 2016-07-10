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

    var cell = GTD.findFirstCell(type, taskName);
    if (typeof cell === 'undefined') {
        if (alert) {
            DocumentApp.getUi().alert('cannot find task name: ' + taskName);
        }
    } else {
        cell.clear();
    }
};

/* Add a task to summary table
 */
GTD.Summary.addTask = function(type, task) {
    var taskName = task.taskDesc;
    var summaryTable = GTD.Summary.getSummaryTable();
    cell = GTD.findFirstEmptyCell(type);
    if (typeof cell === 'undefined') {
        this.appendRow(1);
        cell = summaryTable.getCell(summaryTable.getNumRows() - 1, GTD.TM.getColIdx(type));
    }
    cell.setText(taskName);
    // this.setTaskColor(type, taskName);
};

GTD.Summary.getSummaryTable = function() {
    if (!GTD.taskTable) {
        GTD.initTaskTable();
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

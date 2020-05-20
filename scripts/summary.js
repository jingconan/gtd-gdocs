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

// GTD function assume cursor is inside summary table and find the task
// description from the summary table.
GTD.Summary.getTaskFromCursor = function(cursor) {
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
    var table = GTD.util.insertTableAtCursor(GTD.Summary._createDefaultTableContent());
    if (!table) {
        DocumentApp.getUi().alert('Cannot create task summary table!');
        return;
    }

    assert(GTD.header.length === GTD.headerColor.length, 'wrong number of color');
    for (i = 0; i < GTD.header.length; ++i) {
        table.getCell(0, i)
        .setBackgroundColor('#fafbfc')
        .editAsText()
        .setForegroundColor(GTD.headerColor[i]);
    }
    table.setBorderColor('#c0d3eb');
    table.setBorderWidth(1);
    return table;
};

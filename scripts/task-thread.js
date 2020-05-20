GTD.Task = {
    CONTENT_ROW: 0,
    SIZE: [2, 3],
    // THREAD_HEADER_WIDTH: [100, 350, 70, 60]
    THREAD_HEADER_WIDTH: [70, 450, 70],
    NOTE_FORMAT: {
        'code': {
            'color': '#D9EAD3',
            'font-family': 'Consolas',
            'font-size': 11
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
    if (table === 'element_not_found' || table === 'cursor_not_found') {
      DocumentApp.getUi().alert('Please make sure your cursor is not in ' +
          'any table when inserting separator');
      return;
    }

    table.editAsText().setForegroundColor('#ffffff').setBold(true);
    GTD.Task.setBackgroundColor(table, '#4285F4', [0, 1, 0, 1]);
    table.setBorderWidth(0);
};

GTD.Task.insertBookmark = function(name) {
  var taskDesc = name;
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var bookmark = doc.addBookmark(cursor);
  DocumentApp.getUi().alert('documentProperties.setProperty: taskDesc ' + taskDesc + ' bookmark: ' + bookmark);

  var documentProperties = PropertiesService.getDocumentProperties();
  documentProperties.setProperty(name, bookmark.getId());
  DocumentApp.getUi().alert('documentProperties.setProperty: taskDesc ' + taskDesc + ' bookmarkID: ' + bookmark.getId());

}

GTD.Task.insertThreadHeader = function(name) {
    var taskStatus = GTD.header[this.status];

    var statusSymbol = GTD.statusSymbol[taskStatus]
    var threadHeaderEle = GTD.util.insertText(statusSymbol + ' ' + name);

    GTD.Task.insertBookmark(name);

    // return task here
    return {
      taskDesc: name,
      statusBefore: 'NotExist',
      threadHeader: threadHeaderEle
    };

};

GTD.Task.setColumnWidth = function(table) {
    var i;
    for (i = 0; i < this.THREAD_HEADER_WIDTH.length; ++i) {
        table.setColumnWidth(i, this.THREAD_HEADER_WIDTH[i]);
    }
};

/* Format the table under the cursor to be a certain format based on
 * types.
 * TODO(hbhzwj): change the function name, which is a misnomer.
 */
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
        DocumentApp.getUi().alert('Cannot find task header under cursor! ele.type: ' + ele.getType());
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
              DocumentApp.getUi().alert('Not found task: ' + task);
              res.status = 'not_found'
          } else {

            res.header =  position.getElement();
            DocumentApp.getUi().alert('Found position: ' + res.header.getText());
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
    var taskDesc = GTD.Task.getTaskDesc(threadHeader);
    // threadHeader.getCell(this.CONTENT_ROW, 0).setText(symbol + ' ' + taskDesc);
    threadHeader.setText(symbol + ' ' + taskDesc);
    GTD.Task.insertBookmark(taskDesc);
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
GTD.Task.getTaskDesc = function(threadHeader) {
    var text = threadHeader.getText();
    var tokens = text.split(' ');
    return tokens.slice(1).join(' ');
};

GTD.Task.isThreadHeader = function(table) {
    return (table.getNumRows() === this.SIZE[0]) &&
           (table.getRow(0).getNumChildren() === this.SIZE[1]) &&
           (table.getCell(0, 0).getText() == 'Timestamp');
};

GTD.Task.isSeparator = function(table) {
    return table.getText() === 'Task Separator';
};

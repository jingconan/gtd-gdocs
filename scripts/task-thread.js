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

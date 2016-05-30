GTD.TM = GTD.TM || {};


GTD.TM.getColIdx = function(status) {
    var i;
    // lazy initialization of colIdx table
    if (typeof GTD.colIdx === 'undefined') {
        GTD.colIdx = {};
        for (i = 0; i < GTD.header.length; ++i) {
            GTD.colIdx[GTD.header[i]] = i;
        }
    }
    return GTD.colIdx[status];
};

/* Get tasks with a particular status
 */
GTD.TM.getTasksWithStatus = function(status) {
    var colIdx = GTD.TM.getColIdx(status);
    return GTD.Summary.getAllTasksFromCol(colIdx);
};

/* Create a task search table for tasks whose status is in statusList
 */
GTD.TM.createTaskSearchTable = function(statusList) {
    var existingTasks = {};
    for (var i = 0; i < statusList.length; ++i) {
        var tasks = GTD.TM.getTasksWithStatus(statusList[i]);
        var thisTasks = [];
        for (var j = 0; j < tasks.length; ++j) {
            var taskName = GTD.getTaskName(tasks[j]);
            existingTasks[taskName] = {
                'status': statusList[i],
                'task': tasks[j]
            }
        }
    }
    return existingTasks;
};

/* Check whether a line is automatically generated (rather than manually added)
 * 1. Any line starts with timestamps
 * 2. Empty line
 * 3. Line starts with #
 */
GTD.TM.isAutoText = function (line) {
  var re = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/i;
  return !line ||
         line.startsWith('#') ||
         line.match(re);
};

/* parse gtask note and group by lines by functionality
 */
GTD.TM.parseNote = function(note) {
  var lines = note.split('\n');
  var line, autoLines = [], manualLines = [];
  for (var i = 0; i < lines.length; ++i) {
    line = lines[i];
    if (GTD.TM.isAutoText(line)) {
      autoLines.push(line);
    } else {
      manualLines.push(line);
    }
  }
  return {
    auto: autoLines,
    manual: manualLines
  };
};

/* Geneate a new note in which manual note is commented
 * Input: parseNote which is return value of parseNote
 * Output: a string that will be writen to google task's note section
 */
GTD.TM.commentManualNote = function(parsedNote) {
   var resTokens = [];
   if (parsedNote.auto.length > 0) {
     resTokens.push(parsedNote.auto.join('\n'));
   }

   var currentTime = GTD.util.toISO(new Date());
   resTokens.push('\n' + currentTime + ' Added comment\n#');
   if (parsedNote.manual.length > 0) {
      resTokens.push(parsedNote.manual.join('\n# '));
   }
   return resTokens.join('');
};

/* Update tasks status bases on information from google tasks
 */
GTD.TM.updateTaskStatusInBatch = function(gTasksInfo) {
    // Create a table to search for status of existing tasks
    var existingTasks = GTD.TM.createTaskSearchTable(GTD.header);

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
            continue;
        } else {
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

        var parsedNote = GTD.TM.parseNote(gTasksInfo[i].getNotes());
        // Insert comment to task if the notes section contains manually
        // edit notes
        if (parsedNote.manual.length > 0) {
          // Insert manual note to task thread
          GTD.Task.insertComment({
              threadHeader: GTD.getTaskHeader({taskDesc: existingInfo.task}).header,
              location: 'thread',
              message: parsedNote.manual.join('\n')
          });

          // comment manual note in google tasks
          var tl = GTD.gtask.getActiveTaskList();
          GTD.gtask.updateTask(tl.taskListId, tl.parentTask, {
            title: gTasksInfo[i].getTitle(),
            notes: GTD.TM.commentManualNote(parsedNote),
            status: info.status
          });
        }
    }
};

/* Mark all tasks that are not in google tasks as done
 */
GTD.TM.markMissingTasksAsDone = function(gTasksInfo) {
    var existingTasks = GTD.TM.createTaskSearchTable(['Actionable', 'Waiting For']);

    // delete all tasks that is in gTasksInfo
    for (var i = 0; i < gTasksInfo.length; ++i) {
        var info = GTD.gtask.decodeTaskTitle(gTasksInfo[i].getTitle());
        delete existingTasks[info.taskName];
    }

    for (var key in existingTasks) {
        if (existingTasks.hasOwnProperty(key)) {
            GTD.changeTaskStatus({
                task: {
                    taskDesc: existingTasks[key].task
                },
                status: 'Done',
                setTaskColor: true,
                disableGTask: true
            });
        }
    }
};

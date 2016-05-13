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
        debug('run headers with: ' + statusList[i]);
        var thisTasks = [];
        for (var j = 0; j < tasks.length; ++j) {
            var taskName = GTD.getTaskName(tasks[j]);
            existingTasks[taskName] = {
                'status': statusList[i],
                'task': tasks[j]
            }
        }
    }
    debug('existing Tasks:' + JSON.stringify(existingTasks));
    return existingTasks;
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
            // GTD.Task.insertComment({
            //     threadHeader: ret.threadHeader,
            //     location: 'thread',
            //     message: gTasksInfo[i].getNotes()
            // });
            continue;
        }

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
};

/* Mark all tasks that are not in google tasks as done
 */
GTD.TM.markMissingTasksAsDone = function(gTasksInfo) {
    var existingTasks = GTD.TM.createTaskSearchTable(['Actionable', 'Waiting For']);
    debug('run line 94 ');

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

/////////////////////////////////////////////////////////////////////////////
// These functions are used to sync data between google docs and gmail tasks
////////////////////////////////////////////////////////////////////////////
GTD.gtask.findListIdByName = function(name) {
    var taskLists = Tasks.Tasklists.list();
    var ret = {};
    if (taskLists.items) {
        for (var i = 0; i < taskLists.items.length; i++) {
            var taskList = taskLists.items[i];
            if (taskList.title !== name) {
                continue;
            }
            ret.id = taskList.id;
            ret.title = taskList.title;
            ret.status = 'SUCCESS';
            return ret;
        }
    }

    ret.status = 'NOT_FOUND';
    return ret;
};

// Get task by its name
GTD.gtask.findTaskByName = function(taskListId, taskName) {
    var tasks = Tasks.Tasks.list(taskListId);
    var ret = {};
    var retTask, taskId, position;
    if (tasks.items) {
        for (var i = 0; i < tasks.items.length; i++) {
            var task = tasks.items[i];
            var name = GTD.gtask.decodeTaskTitle(task.title).taskName;
            if(taskName == name){ 
                taskId = task.id;
                retTask = task;
                Logger.log('Task with title "%s" and ID "%s" was found.', task.title, task.id);
            }
            //lets pick up the last child task's position in order to insert the new task below
            if(taskId == task.parent) position = task.position;
        }
        ret.id = taskId;
        ret.idx = position;
        ret.task = retTask;
    } 
    return ret;
};

// Get parent task name from document name
// The [Log] prefix is trimed and digits are removed. Leading and
// trailing spaces are also trimed.
GTD.gtask.getParentTaskNameFromDocName = function(docName) {
    return docName.replace(/^\[Log\] /, '')
                  .replace(/[0-9]/g, '')
                  .trim();
};

// Encode the taskName and status together. We stores status as prefix
// of task name.
GTD.gtask.encodeTaskTitle = function(taskName, status) {
    var symbols = GTD.gtask.statusSymbols;
    var sym = symbols[status];
    var ret = sym + taskName;
    return ret;
};

// Decode status from taskName.
// Loop through all the status and return status if the corresponding
// symbol exists.
GTD.gtask.decodeTaskTitle = function(title) {
    var symbols = GTD.gtask.statusSymbols;
    var ret = {}, sym, status;
    for (status in symbols) {
        if (!symbols.hasOwnProperty(status)) {
            continue;
        }

        sym = symbols[status];
        if (GTD.util.startsWith(title, sym)) {
            ret.taskName = title.replace(sym, '');
            ret.status = status;
            return ret;
        }
    }
    ret.taskName = title;
    ret.status = 'Unknown';
    return ret;
};

// GTD.gtask.removeStatusCodeFromTaskName = function(taskName) {
//     return taskName.replace(/[^\w\s]/gi, '')
//                    .trim();
// }


GTD.gtask.listTaskLists = function() {
    var taskLists = Tasks.Tasklists.list();
    if (taskLists.items) {
        for (var i = 0; i < taskLists.items.length; i++) {
            var taskList = taskLists.items[i];
            debug('Task list with title "%s" and ID "%s" was found.' +
                    taskList.title + taskList.id);
        }
    } else {
        debug('No task lists found.');
    }
};

GTD.gtask.findOrInsertTask = function(taskListId, parentTask, taskDetails) {
    var taskName = GTD.gtask.decodeTaskTitle(taskDetails.title).taskName;
    var ret = GTD.gtask.findTaskByName(taskListId, taskName);
    // Create task if not exists
    if (!ret.id) {
        if (parentTask) {
            taskDetails.parent = parentTask.id;
            taskDetails.position = parentTask.idx;
        }
        var newTask = Tasks.newTask().setTitle(taskDetails.title);
        newTask = Tasks.Tasks.insert(newTask, taskListId, taskDetails);
        if (parentTask) {
            newTask.setParent(parentTask.id);
        }

        ret.id = newTask.id;
        ret.idx = newTask.position;
        ret.task = newTask;
    }
    return ret;
};

// Update details of a task, if the task doesn't exist, then a new task
// will be inserted and updated
GTD.gtask.updateTask = function(taskListId, parentTask, taskDetails) {
    var tmp = GTD.gtask.decodeTaskTitle(taskDetails.title);
    var taskRet = GTD.gtask.findOrInsertTask(taskListId, parentTask,
                                             taskDetails);
    var task = taskRet.task;
    task.title = GTD.gtask.encodeTaskTitle(tmp.taskName, taskDetails.status);
    // If task is done, mark it as completd and use simple title.
    // Otherwise, encode the status in title.
    if (taskDetails.status === 'Done') {
        task.setStatus('completed');
        task.setTitle(tmp.taskName);
    } else {
        task.setStatus('needsAction');
        task.setCompleted(null);
    }
    task.setNotes(taskDetails.notes);
    var updatedTask = Tasks.Tasks.patch(task, taskListId, task.id);
};

GTD.gtask.getActiveTaskList = function() {
    // Get Current Name
    var listName = GTD.gtask.listName;
    var ret = GTD.gtask.findListIdByName(listName);
    if (ret.status !== 'SUCCESS') {
        DocumentApp.getUi().alert('Cannot find task list with name: ' +
                                  listName);
        return;
    }
    var taskListId = ret.id;
    var doc = DocumentApp.getActiveDocument();
    var parentTaskName = GTD.gtask.getParentTaskNameFromDocName(doc.getName());
    var parentTask = GTD.gtask.findOrInsertTask(taskListId,
                                                undefined,
                                                {title: parentTaskName});
    return {
        taskListId: taskListId,
        parentTask: parentTask
    };
};

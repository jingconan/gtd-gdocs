function onOpen(e) {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  if (GTD.isGtdDocument()) {
      ui.createMenu('GTD')
          .addItem('Insert task', 'insertTask')
          .addItem('Insert comment', 'insertComment')
          .addItem('Insert task separator', 'insertSeparator')
          .addItem('Jump to task thread', 'jumpToTask')
          .addSubMenu(ui.createMenu('Mark task as')
                  .addItem('Actionable', 'createActionableTask')
                  .addItem('WaitingFor', 'moveTaskToWaitingFor')
                  .addItem('Done', 'moveTaskToDone')
                  .addItem('Someday', 'moveTaskToSomeday'))
          .addSubMenu(ui.createMenu('Format comment as')
                  .addItem('Code', 'insertNoteCode')
                  .addItem('Email', 'insertNoteEmail')
                  .addItem('Checklist', 'insertNoteChecklist'))
          .addItem('Sync from google tasks', 'syncFromGTasks')
          .addToUi();

      if (e && e.authMode == ScriptApp.AuthMode.FULL) {
          syncFromGTasks();
      }

  } else {
      ui.createMenu('GTD')
          .addItem('Initialize', 'initTaskFunction')
          .addToUi();
  }
}

function onInstall(e) {
  onOpen(e);
}

function syncFromGTasks() {
  if (!GTD.gtask.isInitialized()) {
      Logger.log('gtask service is not initialized');
      return;
  }
  GTD.initTaskTable();
  var atl = GTD.gtask.getActiveTaskList();
  var gTasksInfo = GTD.gtask.listAllSubtasksOfParentTask(atl.taskListId, atl.parentTask);
  GTD.updateTaskStatusInBatch(gTasksInfo);
}

function insertSeparator() {
    GTD.Task.addThreadSeparator();
}

function insertComment() {
    GTD.insertComment();
}

function insertNoteCode() {
  GTD.Task.insertNote('code');
}

function insertNoteEmail() {
  GTD.Task.insertNote('email');
}

function insertNoteChecklist() {
  GTD.Task.insertNote('checklist');
}

function insertTask() {
    GTD.initialize();
    var html = HtmlService.createHtmlOutput(GTD.templates.insert_task_diag)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setWidth(400)
        .setHeight(300);
    DocumentApp.getUi() // Or DocumentApp or FormApp.
        .showModalDialog(html, 'Dialog to insert new task');
}

function jumpToTask() {
    var doc = DocumentApp.getActiveDocument();
    var cursor = doc.getCursor();
    if (!cursor) {
        debug('no cursor');
        return;
    }

    var task = GTD.getTaskFromSummaryTable(cursor);
    if (task) {
        GTD.jumpAndFocusOnTask(task);
    }
}

function insertDate() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var text = '\n' + GTD.toISO(new Date()) + '\n';
  var element = cursor.insertText(text);
  doc.setCursor(doc.newPosition(element, text.length));
}

function initTaskFunction() {
    GTD.initialize();
    onOpen();
}

function createActionableTask() {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: 'Actionable'
    });
}

function moveTaskToWaitingFor() {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: 'Waiting For'
    });
}

function moveTaskToDone() {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: 'Done'
    });
}

function moveTaskToSomeday() {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: 'Someday'
    });
}

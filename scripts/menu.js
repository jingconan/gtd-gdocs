function onOpen(e) {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('GTD')
      // .addItem('insert date', 'insertDate')
      .addItem('Initialize', 'initTaskFunction')
      .addItem('Insert task', 'insertTask')
      .addItem('Insert comment', 'insertComment')
      .addItem('Mark as Actionable', 'createActionableTask')
      .addItem('Mark as WaitingFor', 'moveTaskToWaitingFor')
      .addItem('Mark as Done', 'moveTaskToDone')
      .addItem('Mark as Someday', 'moveTaskToSomeday')
      .addItem('Insert separator', 'insertSeparator')
      .addItem('Jump to task', 'jumpToTask')
      .addItem('Show sidebar', 'showSidebar')
      .addItem('Sync From GTasks', 'syncFromGTasks')
      .addSeparator()
      .addSubMenu(ui.createMenu('Note')
        .addItem('Format as code', 'insertNoteCode')
        .addItem('Format as email', 'insertNoteEmail')
        .addItem('Format as checklist', 'insertNoteChecklist'))
      .addToUi();

  if (e && e.authMode == ScriptApp.AuthMode.FULL) {
      syncFromGTasks();
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

    var task;
    var ui = DocumentApp.getUi();
    var result = ui.prompt(
        'Let\'s start!',
        'Please enter a short task description:',
    ui.ButtonSet.OK_CANCEL);

    var button = result.getSelectedButton();
    var text = result.getResponseText();
    if (button == ui.Button.OK) {
        task = GTD.insertTask(text, 'Actionable');
    } else {
        return;
    }
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

function showSidebar() {
    var html = HtmlService.createHtmlOutput(GTD.templates.sidebar)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setTitle('My task list')
        .setWidth(300);

    DocumentApp.getUi() // Or DocumentApp or FormApp.
        .showSidebar(html);
}

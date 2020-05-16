function onOpen(e) {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  if (GTD.isGtdDocument()) {
      ui.createMenu('GTD')
          .addItem('Insert task', 'insertTask')
          .addItem('Insert comment', 'insertComment')
          .addItem('Mark as Actionable', 'createActionableTask')
          .addItem('Mark as WaitingFor', 'moveTaskToWaitingFor')
          .addItem('Mark as Done', 'moveTaskToDone')
          .addItem('Mark as Someday', 'moveTaskToSomeday')
          .addItem('Insert separator', 'insertSeparator')
          .addSubMenu(ui.createMenu('Format comment as')
                  .addItem('Code', 'insertNoteCode')
                  .addItem('Email', 'insertNoteEmail')
                  .addItem('Checklist', 'insertNoteChecklist'))
          .addToUi();

  } else {
      ui.createMenu('GTD')
          .addItem('Initialize', 'initTaskFunction')
          .addToUi();
  }
}

function onInstall(e) {
  onOpen(e);
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
        .setHeight(200);
    DocumentApp.getUi() // Or DocumentApp or FormApp.
        .showModalDialog(html, 'Dialog to insert new task');
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

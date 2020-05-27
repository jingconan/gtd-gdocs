function onOpen(e) {
    var ui = DocumentApp.getUi();
    ui.createMenu('GTD')
        .addItem('Create task', 'insertTask')
        .addItem('Insert update', 'insertComment')
        .addItem('Mark task as Actionable', 'createActionableTask')
        .addItem('Mark task as WaitingFor', 'moveTaskToWaitingFor')
        .addItem('Mark task as Done', 'moveTaskToDone')
        .addItem('Mark task as Someday', 'moveTaskToSomeday')
        .addItem('Insert date', 'insertDate')
        .addItem('Insert separator', 'insertSeparator')
        .addToUi();

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

function insertTask() {
  // We need to get the whole element instead of just text here.
  var text = GTD.util.extractElementUnderCursor();
  if (text === null || (typeof text === 'undefined') || text === '' ) {
      DocumentApp.getUi().alert('Could not find text to create task. ' +
                                'Please put your cursor in the line whose text ' +
                                'should be used as task description (do not select the text).');
      return;
  }
  GTD.insertTask(text, 'Actionable');
}

function insertDate() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var text = '\n' + GTD.util.toISO(new Date()) + '\n';
  var element = cursor.insertText(text);
  doc.setCursor(doc.newPosition(element, text.length));
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

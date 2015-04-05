function onOpen() {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('GTD')
      .addItem('insert date', 'insertDate')
      .addItem('insert task', 'insertTask')
      .addItem('insert comment', 'insertComment')
      .addItem('create task table', 'initTaskFunction')
      .addItem('move to Actionable', 'createActionableTask')
      .addItem('move to WaitingFor', 'moveTaskToWaitingFor')
      .addItem('move to Done', 'moveTaskToDone')
      .addItem('show task sidebar', 'showSidebar')
      .addToUi();
}

function insertComment() {
    GTD.insertComment();
}

function insertTask() {
    var ui = DocumentApp.getUi();
    var result = ui.prompt(
        'Let\'s start!',
        'Please enter a short task description:',
    ui.ButtonSet.OK_CANCEL);

    var button = result.getSelectedButton();
    var text = result.getResponseText();
    if (button == ui.Button.OK) {
        GTD.insertTask(text);
    } else {
        return;
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
  GTD.initTaskTable();
}

function createActionableTask() {
  var task = GTD.getSelectedTask('Actionable');
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  GTD.cleanTask('All', task);
  GTD.addTask('Actionable', task);
}

function moveTaskToWaitingFor() {
  var task = GTD.getSelectedTask('Waiting For');
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  GTD.cleanTask('All', task);
  GTD.addTask('Waiting For', task);
}

function moveTaskToDone() {
  var task = GTD.getSelectedTask('Done');
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  GTD.cleanTask('All', task);
  GTD.addTask('Done', task);
}

function showSidebar() {
  var html = HtmlService.createHtmlOutput(GTD.templates.sidebar)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('My task list')
      .setWidth(300);
      
  DocumentApp.getUi() // Or DocumentApp or FormApp.
      .showSidebar(html);
}

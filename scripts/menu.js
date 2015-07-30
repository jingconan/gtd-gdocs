function onOpen() {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('GTD')
      // .addItem('insert date', 'insertDate')
      .addItem('Create task table', 'initTaskFunction')
      .addItem('Insert task', 'insertTask')
      .addItem('Insert comment', 'insertComment')
      .addItem('Mark as Actionable', 'createActionableTask')
      .addItem('Mark as WaitingFor', 'moveTaskToWaitingFor')
      .addItem('Mark as Done', 'moveTaskToDone')
      .addItem('Insert separator', 'insertSeparator')
      .addItem('Show sidebar', 'showSidebar')
      .addToUi();
}

function insertSeparator() {
    GTD.Task.addThreadSeparator();
}

function insertComment() {
    GTD.insertComment();
}

function insertTask() {
    var task;
    var ui = DocumentApp.getUi();
    var result = ui.prompt(
        'Let\'s start!',
        'Please enter a short task description:',
    ui.ButtonSet.OK_CANCEL);

    var button = result.getSelectedButton();
    var text = result.getResponseText();
    if (button == ui.Button.OK) {
        task = GTD.insertTask(text);
        // By default, mark this task as Actionable task
        GTD.cleanTask('All', task);
        GTD.addTask('Actionable', task);
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
    var ret = GTD.getSelectedTask('Actionable');
    if (ret.error) {
        DocumentApp.getUi().alert(ret.error);
        return;
    }
    GTD.changeTaskStatus({task: ret.taskDesc, status: 'Actionable'});
}

function moveTaskToWaitingFor() {
    var ret = GTD.getSelectedTask('Waiting For');
    if (ret .error) {
        DocumentApp.getUi().alert(ret.error);
        return;
    }
    GTD.changeTaskStatus({task: ret.taskDesc, status: 'Waiting For'});
}

function moveTaskToDone() {
    var ret = GTD.getSelectedTask('Done');
    if (ret .error) {
        DocumentApp.getUi().alert(ret.error);
        return;
    }
    GTD.changeTaskStatus({task: ret.taskDesc, status: 'Done'});
}

function showSidebar() {
  var html = HtmlService.createHtmlOutput(GTD.templates.sidebar)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('My task list')
      .setWidth(300);
      
  DocumentApp.getUi() // Or DocumentApp or FormApp.
      .showSidebar(html);
}

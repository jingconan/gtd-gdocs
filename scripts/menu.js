function onOpen() {
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
      .addItem('Insert separator', 'insertSeparator')
      .addItem('Jump to task', 'jumpToTask')
      .addItem('Show sidebar', 'showSidebar')
      .addToUi();
}

function onInstall(e) {
  onOpen();
}

function insertSeparator() {
    GTD.Task.addThreadSeparator();
}

function insertComment() {
    GTD.insertComment();
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
        task = GTD.insertTask(text);
        // By default, mark this task as Actionable task
        // task = GTD.cleanTask('All', task);
        GTD.addTask('Actionable', task);
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
    var ele = cursor.getElement();
    if (ele.getType() === DocumentApp.ElementType.TEXT) {
        ele = ele.getParent();
    }
    if (ele.getType() === DocumentApp.ElementType.PARAGRAPH) {
        ele = ele.getParent();
    }
    if (!ele || ele.getType() != DocumentApp.ElementType.TABLE_CELL) {
        DocumentApp.getUi().alert('Cannot find task under cursor!' );
        return;
    }

    GTD.jumpAndFocusOnTask({
        taskDesc: ele.editAsText().getText()
    });
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
    GTD.initialize();
    var ret = GTD.getSelectedTask('Actionable');
    if (ret.error) {
        DocumentApp.getUi().alert(ret.error);
        return;
    }
    GTD.changeTaskStatus({task: ret, status: 'Actionable'});
}

function moveTaskToWaitingFor() {
    GTD.initialize();
    var ret = GTD.getSelectedTask('Waiting For');
    if (ret .error) {
        DocumentApp.getUi().alert(ret.error);
        return;
    }
    GTD.changeTaskStatus({task: ret, status: 'Waiting For'});
}

function moveTaskToDone() {
    GTD.initialize();
    var ret = GTD.getSelectedTask('Done');
    if (ret .error) {
        DocumentApp.getUi().alert(ret.error);
        return;
    }
    GTD.changeTaskStatus({task: ret, status: 'Done'});
}

function showSidebar() {
    var html = HtmlService.createHtmlOutput(GTD.templates.sidebar)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setTitle('My task list')
        .setWidth(300);

    DocumentApp.getUi() // Or DocumentApp or FormApp.
        .showSidebar(html);
}

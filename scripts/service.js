/////////////////////////////////////////////////////////////
// These functions are used by javascript HTML services
/////////////////////////////////////////////////////////////
/* Insert task
 */
function runInsertTask(text, status) {
    return GTD.insertTask(text, status);
}

/* Change task status
 */
function changeTaskStatus(comment, statusAfter) {
    GTD.changeTaskStatusMenuWrapper({
      statusAfter: statusAfter,
      comment: comment
    });
}

var GTD = {
  body: DocumentApp.getActiveDocument().getBody(),
  header: ['Actionable', 'Waiting For', 'Done'], //FIXME change to taskStatus
  headerColor: ['#ff0000', '#9d922e', '#16a031'], //FIXME change to taskStatusColor 
  defaultRows: 1,
  templates: {},
  TOC: {},
};

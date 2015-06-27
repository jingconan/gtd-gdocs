var GTD = {
  body: DocumentApp.getActiveDocument().getBody(),
  header: ['Actionable', 'Waiting For', 'Done'], //FIXME change to taskStatus
  headerColor: ['#ff0000', '#9d922e', '#16a031'], //FIXME change to taskStatusColor
  commentStyle: {
      foregroundColor: '#000000'
  },
  defaultRows: 1,
  templates: {},
  TOC: {},
};

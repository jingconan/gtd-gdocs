var GTD = {
  body: DocumentApp.getActiveDocument().getBody(),
  header: ['Actionable', 'Waiting For', 'Done'], //FIXME change to taskStatus
  headerColor: ['#ff0000', '#9d922e', '#16a031'], //FIXME change to taskStatusColor 
  bodyMargins: [0.1, 1, 0.1, 1], // L, T, R, D
  commentStyle: {
      foregroundColor: '#000000'
  },
  defaultRows: 1,
  templates: {},
  TOC: {},
};

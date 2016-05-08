var GTD = {
    // Commonly used DOM object
    document: DocumentApp.getActiveDocument(),
    body: DocumentApp.getActiveDocument().getBody(),

    header: ['Actionable', 'Waiting For', 'Done', 'Someday'], //FIXME change to taskStatus
    headerColor: ['#ff0000', '#9d922e', '#16a031', '#808080'], //FIXME change to taskStatusColor 
    bodyMargins: [7.2, 7.2, 7.2, 7.2], // L, T, R, D unit is point
    commentStyle: {
        foregroundColor: '#000000'
    },
    defaultRows: 1,
    templates: {},
    TOC: {},
    gtask: {
        listName: 'GTD Lists',
        statusSymbols: {
            'Actionable': '(x)',
            'Waiting For': '/!\\',
            'Someday': '(~)',
            'Unknown': ''
        }
    },
    initialized: false
};

GTD.startsWith = function(str) {
    return (this.indexOf(str) === 0);
};

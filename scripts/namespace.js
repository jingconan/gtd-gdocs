var GTD = {
    // Commonly used DOM object
    document: DocumentApp.getActiveDocument(),
    body: DocumentApp.getActiveDocument().getBody(),

    statusSymbol: {
        'Actionable': '\uD83C\uDD70\uFE0F',
        'Waiting For': '\uD83C\uDD86',
        'Done': '\u2705',
        'Someday': '\uD83C\uDD82',
    },
    header: ['Actionable', 'Waiting For', 'Done', 'Someday'], //FIXME change to taskStatus
    headerColor: ['#ff0000', '#9d922e', '#16a031', '#808080'], //FIXME change to taskStatusColor 
    bodyMargins: [36, 36, 36, 36], // L, T, R, D unit is point
    commentStyle: {
        foregroundColor: '#000000'
    },
    defaultRows: 1,
    templates: {},
    TOC: {},
    initialized: false
};

GTD.startsWith = function(str) {
    return (this.indexOf(str) === 0);
};

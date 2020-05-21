var GTD = {
    // Commonly used DOM object
    document: DocumentApp.getActiveDocument(),
    body: DocumentApp.getActiveDocument().getBody(),

    // A map between status and a emoji symbol used
    // to represent the status.
    statusSymbol: {
        'Actionable': '\uD83C\uDD70\uFE0F',
        'Waiting For': '\uD83C\uDD86',
        'Done': '\u2705',
        'Someday': '\uD83C\uDD82',
    },
    header: ['Actionable', 'Waiting For', 'Done', 'Someday'], //FIXME change to taskStatus
    headerColor: ['#f92929', '#cc317c', '#229819', '#cccccc'], //FIXME change to taskStatusColor
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

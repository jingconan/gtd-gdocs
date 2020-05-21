GTD.TM = GTD.TM || {};


GTD.TM.getColIdx = function(status) {
    var i;
    // lazy initialization of colIdx table
    if (typeof GTD.colIdx === 'undefined') {
        GTD.colIdx = {};
        for (i = 0; i < GTD.header.length; ++i) {
            GTD.colIdx[GTD.header[i]] = i;
        }
    }
    return GTD.colIdx[status];
};

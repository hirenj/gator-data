var READER_CONF = (function() {
    var vals = {};
    for (var i = 0; i < arguments.length; i+= 2) {
        if (! arguments[i] || typeof arguments[i] == 'undefined') {
            continue;
        }
        vals[arguments[i]] = arguments[i+1];
        if (MASCP.LOCALSERVER) {        
            vals[arguments[i]].url = ((vals[arguments[i]].url || arguments[i].SERVICE_URL).indexOf('?') >= 0) ? '/data/latest/gator' : '/data/latest/gator/';
        }
    }
    return vals;
})(
    MASCP.SnpReader, {
        'definition'    : MASCP.SnpReader,
        'nicename'      : 'Snps',
        'result'        : function() {
        },
        'layers'        : ['insertions_controller','insertions']
    }
);

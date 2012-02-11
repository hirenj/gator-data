var READER_CONF = (function() {
    var vals = {};
    for (var i = 0; i < arguments.length; i+= 2) {
        if (! arguments[i] || typeof arguments[i] == 'undefined') {
            continue;
        }
        vals[arguments[i]] = arguments[i+1];
        if (MASCP.LOCALSERVER) {        
            vals[arguments[i]].url = ((vals[arguments[i]].url || arguments[i].SERVICE_URL).indexOf('?') >= 0) ? '/data/latest/gator' : '/data/latest/gator/';
        } else {
            vals[arguments[i]].url = ((vals[arguments[i]].url || arguments[i].SERVICE_URL).indexOf('?') >= 0) ? 'http://gator.glycocode.com/data/latest/gator' : 'http://gator.glycocode.com/data/latest/gator/';
        }
    }
    return vals;
})(
    MASCP.SnpReader, {
        'definition'    : MASCP.SnpReader,
        'nicename'      : 'Snps',
        'result'        : function() {
                var positions = [];
                var self = this;
                self.result.getAccessions().forEach(function(acc) {
                    var posns = self.result.getSnp(acc);
                    for (var i = 0; i < posns.length; i++) {
                        if (positions.indexOf(posns[i][0]) < 0) {
                            positions.push(posns[i][0]);
                        }
                    }
                });
                MASCP.positions = positions.sort();
        },
        'layers'        : ['insertions_controller','insertions']
    }
);

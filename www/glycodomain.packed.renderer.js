function renderData(seq,doms) {
console.log(doms);

var return_data = [];

var render_domain = function(domain) {
    console.log(domain);
    if (((domain.end - domain.start) / seq.length) >= 0.8) {
    	return;
    }
    var dom = { "aa": domain.start, "type" : "shape" , "width" : (domain.end - domain.start), "options" : { "offset" : 2.5, "height" : 5, "fill" : "#999", "shape" : "hexagon", "stroke" : "#000", "stroke_width" : "0.5"  }};
    return_data.push(dom);
};

doms.forEach(render_domain);

return return_data;


}

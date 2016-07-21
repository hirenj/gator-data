function renderData(seq,doms) {
console.log(doms);

var return_data = [];

var render_domain = function(domain) {
    console.log(domain);
    var pep_line = { "aa": domain.start, "type" : "box" , "width" : (domain.end - domain.start), "options" : { "offset" : 0, "height_scale" : 0.5, "fill" : "#999", "merge" : false  }};
    return_data.push(pep_line);
};

doms.forEach(render_domain);

return return_data;


}

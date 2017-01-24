function renderData(seq,cleavage_data) {

return_data = {};

var seen_sites = {};

var render_cleavage_sites = function(cleavage) {
	var base_offset = -5;
	if (seen_sites[cleavage.uniprot+cleavage.site]) {
		return;
	}
	seen_sites[cleavage.uniprot+cleavage.site] = true;
	var c_tails_methods = ['C-TAILS','COFRADIC'];
	if (c_tails_methods.indexOf(cleavage.method) >= 0) {
		return_data[cleavage.uniprot].push({ "aa" : cleavage.site, "type" : "marker" , "width" : 1, "options" : {  "content" : "#ui_cterminus", "fill" : "#000", "border" : "none", "height": 18, "offset" : base_offset - 2.5, "bare_element" : true, "no_tracer" : true }});
	} if (cleavage.merops) {
		// Add +1 for N-terminii from MEROPS
		return_data[cleavage.uniprot].push({ "aa" : cleavage.site+1, "type" : "marker" , "width" : 1, "options" : {  "content" : "#ui_nterminus", "fill" : "#000", "border" : "none", "height": 18, "offset" : base_offset - 2.5, "bare_element" : true, "no_tracer" : true }});
	} else {
		return_data[cleavage.uniprot].push({ "aa" : cleavage.site, "type" : "marker" , "width" : 1, "options" : {  "content" : "#ui_nterminus", "fill" : "#000", "border" : "none", "height": 18, "offset" : base_offset - 2.5, "bare_element" : true, "no_tracer" : true }});
	}
};

var current = [];
cleavage_data.forEach(function(cleavage) {
	return_data[cleavage.uniprot] = return_data[cleavage.uniprot] || [];
	render_cleavage_sites(cleavage);
});
return return_data;
}

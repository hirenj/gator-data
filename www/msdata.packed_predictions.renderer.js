function renderData(seq,peptides) {
prediction_sets = peptides['application/json+msdata-prediction'] || [];
console.log(prediction_sets);

return_data = {};

var seen_sites = {};

var render_sites = function(peptide) {
	var depth = 1;
	var base_offset = 6+4*(-2+depth);
	var has_site = false;
	(peptide.sites || []).forEach(function renderSite(site_block) {
		var site = site_block[0];
		has_site = true;
		var composition = site_block[1];
		if (composition === "HexNAc") {
			composition = 'light_galnac';
		}
		if (composition === "HexHexNAc") {
			composition = 'gal(b1-3)galnac';
		}
		if (composition == 'HexHex') {
			composition = 'man(a1-2)man';
		}
		if (composition === 'Hex') {
			composition = 'man';
		}

		if (composition === 'Phospho') {
			composition = 'phospho';
		}

		if (composition.toLowerCase() == 'glcnac(b1-4)glcnac') {
			composition = composition.toLowerCase();
		}

		if ( seen_sites[site+composition]  ) {
			return;
		} else {
			seen_sites[site+composition] = true;
		}

		if (composition == 'galnac' || composition == 'man') {
			return_data[peptide.acc].push({ "aa" : site, "type" : "marker" , "options" : { "content" :  '#sugar_'+composition , "fill" : "none", "text_fill" : "#f00", "border" : "none", "height": 8, "offset" : base_offset - 2.5, "bare_element" : true }});
		} else {
			return_data[peptide.acc].push({ "aa" : site, "type" : "marker" , "options" : { "content" :  '#sugar_'+composition , "fill" : "none", "text_fill" : "#f00", "border" : "none", "height": 10, "offset" : base_offset - 5, "bare_element" : true }});
		}
	});
	// return_data.push({"aa" : peptide.end, "type" : "marker", "options" : {  "alt_content" : "#ui_revealmore", "content" :  peptide.source.split('_'), "stretch": "right", "height" : 6, "fill" : "#000", "text_fill" : "#fff", "border" : "none", "no_tracer" : true, "bare_element" : true, "zoom_level" : "text", "offset" : base_offset + 3 }});
};

var current = [];

prediction_sets.forEach( set => {
	return_data[set.acc] = return_data[set.acc] || [];
	render_sites(set);
	if (return_data[set.acc].length > 0) {
		return_data[set.acc][0].coalesce = { 'fill' : '#ffffb3','stroke' : '#a6a635', 'stroke_width' : 0.5 };
	}
});

return return_data;
}

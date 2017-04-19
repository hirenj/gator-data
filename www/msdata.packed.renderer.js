function renderData(seq,peptides) {
peptides = peptides['application/json+msdata'] || [];
console.log(peptides);
var intervals = [];

var return_data = {};

peptides.forEach(function(glycopep,i) {
	if ( ! return_data[glycopep.acc] ) {
		return_data[glycopep.acc] = [];
	}
	if ( ! glycopep.peptide_start ) {
		intervals.push({ "index" : i, "start" : true,  "pep" : i });
		intervals.push({ "index" : i, "start" : false , "pep" : i });
		return;
	}
	var start;
	var end;
	start = glycopep.peptide_start;
	if (glycopep.peptide_end) {
		end = glycopep.peptide_end;
	} else if (glycopep.sequence) {
		end = start + glycopep.sequence.length - 1;
	} else {
		console.log("Missing data to get peptide end position, using start");
		end = start;
	}
	glycopep.start = start;
	glycopep.end = end;
	intervals.push({ "index" : start, "start" : true,  "pep" : i });
	intervals.push({ "index" : end, "start" : false , "pep" : i });
});

intervals.sort(function(a,b) {
	if (a.index < b.index ) {
		return -1;
	}
	if (a.index > b.index ) {
		return 1;
	}
	if (a.index == b.index) {
		return a.start ? -1 : 1;
	}
});

var guess_composition = function(composition) {
	var comp_string = composition.replace(/\d+x/,'').toLowerCase();
	if (comp_string == 'hexhexnac') {
		return '#sugar_gal(b1-3)galnac';
	}
	if (comp_string == 'hexnac') {
		return '#sugar_hexnac';
	}
	if (comp_string == 'hex') {
		return '#sugar_hex';
	}
	if (comp_string == 'phospho') {
		return '#sugar_phospho';
	}
	return comp_string;
};

var seen_sites = {};

var render_peptide = function(peptide) {
	var depth = 0;
	var base_offset = 6+4*(-2+depth);

	var pep_line = { "aa": peptide.start, "type" : "box" , "width" : (peptide.end - peptide.start), "options" : { "offset" : base_offset, "height_scale" : 0.1, "fill" : "#999", "merge" : false  }}

	return_data[peptide.acc] = [pep_line].concat(return_data[peptide.acc]);

	if ( ! peptide.sites || peptide.sites.length == 0) {
		return_data[peptide.acc].push({ "aa" : Math.floor(0.5*peptide.start + 0.5*peptide.end), "type" : "marker" , "options" : { "content" : guess_composition(peptide.composition[0]), "stretch": true, "height" : 10, "width": 3, "fill" : "none", "text_fill" : "#555", "border" : "#ddd", "no_tracer" : true, "bare_element" : false, "zoom_level" : "text", "offset" : base_offset + 2.5 }});
	}
	var has_site = false;
	(peptide.sites || []).forEach(function renderSite(site_block) {
		var site = site_block[0];
		has_site = true;
		var composition = site_block[1];
		if (composition === "HexNAc") {
			composition = 'galnac';
		}
		if (composition == 'GlcNAc') {
			composition = 'glcnac';
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

		composition = composition.toLowerCase();

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

intervals.forEach(function(interval) {
	if (interval.start) {
		render_peptide(peptides[interval.pep]);
		current.push(interval.pep);
	} else {
		var idx = current.indexOf(interval.pep);
		current.splice(idx,1,null);
		while (current[current.length - 1] === null) {
			current.splice(current.length - 1,1);
		}
	}
});

return return_data;
}

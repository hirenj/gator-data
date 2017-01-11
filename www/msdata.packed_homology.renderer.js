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
	end = glycopep.peptide_end ?  glycopep.peptide_end : start + glycopep.sequence.length - 1;
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

var seen_sites = {};

var render_peptide = function(peptide) {
	var depth = 0;
	var base_offset = 6+4*(-2+depth);

	var pep_line = { "aa": peptide.start, "type" : "box" , "width" : (peptide.end - peptide.start), "options" : { "offset" : base_offset, "height_scale" : 0.1, "fill" : "#999", "merge" : false  }}
	return_data[peptide.acc] = [pep_line].concat(return_data[peptide.acc]);

	if (peptide.species) {
		return_data[peptide.acc] = [ (Object.assign({}, return_data[peptide.acc][0])) ].concat( return_data[peptide.acc] )
		return_data[peptide.acc][0].track = 'tax'+peptide.species;
	}

	if ( ! peptide.sites ) {
		// return_data.push({ "aa" : Math.floor(0.5*peptide.start + 0.5*peptide.end), "type" : "marker" , "options" : { "content" : peptide.composition[0], "stretch": true, "height" : 5, "fill" : "none", "text_fill" : "#555", "border" : "none", "no_tracer" : true, "bare_element" : true, "zoom_level" : "text", "offset" : base_offset + 2.5 }});
	}
	var has_site = false;
	(peptide.sites || []).forEach(function renderSite(site_block) {
		var site = site_block[0];
		has_site = true;
		var composition = site_block[1];
		if (composition === "HexNAc") {
			composition = 'galnac';
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
		if (peptide.species) {
			return_data[peptide.acc].push(Object.assign({}, return_data[peptide.acc][return_data[peptide.acc].length - 1]))
			return_data[peptide.acc][return_data[peptide.acc].length - 1].track = 'tax'+peptide.species;
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

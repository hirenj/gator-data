function renderData(seq,peptides) {
var intervals = [];

var return_data = [];

peptides.forEach(function(glycopep,i) {
	var start;
	var end;
	start = glycopep.peptide_start;
	end = start + glycopep.sequence.length - 1;
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

var render_peptide = function(peptide,depth) {
	var base_offset = 6+4*(-2+depth);

	var pep_line = { "aa": peptide.start, "type" : "box" , "width" : (peptide.end - peptide.start), "options" : { "offset" : base_offset, "height_scale" : 0.1, "fill" : "#999", "merge" : false  }}

	return_data.push(pep_line);

	if ( ! peptide.sites ) {
		return_data.push({ "aa" : Math.floor(0.5*peptide.start + 0.5*peptide.end), "type" : "marker" , "options" : { "content" : peptide.composition[0], "stretch": true, "height" : 5, "fill" : "none", "text_fill" : "#555", "border" : "none", "no_tracer" : true, "bare_element" : true, "zoom_level" : "text", "offset" : base_offset + 2.5 }});
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
		if (composition == 'galnac' || composition == 'man') {
			return_data.push({ "aa" : site, "type" : "marker" , "options" : { "content" :  '#sugar_'+composition , "fill" : "none", "text_fill" : "#f00", "border" : "none", "height": 8, "offset" : base_offset - 2.5, "bare_element" : true }});
		} else {
			return_data.push({ "aa" : site, "type" : "marker" , "options" : { "content" :  '#sugar_'+composition , "fill" : "none", "text_fill" : "#f00", "border" : "none", "height": 10, "offset" : base_offset - 5, "bare_element" : true }});
		}
	});
	if (peptide.quant) {
		var content = { "type" : "circle", "fill" : "#f00", "stroke" : "#000", "stroke-width" : 1, "fill-opacity" : 1 };
		var value = peptide.quant.quant;
		if (value) {
			content['fill-opacity'] = 0.25 + 0.75*Math.abs(Math.log10(value) / 5);
			if (Math.log10(value) > 0) {
				content['fill'] = '#00f';
			}
		} else {
			content['fill'] = '#aaa';
		}
		if (isNaN(parseFloat(value))) {
			content['fill'] = '#555';
			content['fill-opacity'] = 1;
		}
		return_data.push({ "aa" : peptide.start - 1, "type" : "marker", "options" : { "alt_content" : content, "content" :  [ isNaN(parseFloat(value)) ? value : Math.log10(peptide.quant.quant).toFixed(2) ] , "height" : 6, "stretch" : "left", "text_fill" : "#000", "fill" : "#fff", "no_tracer" : true, "bare_element" : true, "offset" : base_offset + 6 } });
	}
	if (peptide.hexnac_type) {
		console.log(peptide.hexnac_type);
		if (peptide.hexnac_type.indexOf('GlcNAc') > -1) {
			return_data.push({"aa" : peptide.end, "type" : "marker", "options" : {  "alt_content" : "#sugar_glcnac", "content" :  peptide.hexnac_ratio, "stretch": "right", "height" : 6, "fill" : "#000", "text_fill" : "#fff", "border" : "none", "no_tracer" : true, "bare_element" : true, "zoom_level" : "text", "offset" : base_offset - 3 }});
		}
	}
	return_data.push({"aa" : peptide.end, "type" : "marker", "options" : {  "alt_content" : "#ui_revealmore", "content" :  peptide.source.split('_'), "stretch": "right", "height" : 6, "fill" : "#000", "text_fill" : "#fff", "border" : "none", "no_tracer" : true, "bare_element" : true, "zoom_level" : "text", "offset" : base_offset + 3 }});
};

var current = [];

intervals.forEach(function(interval) {
	if (interval.start) {
		render_peptide(peptides[interval.pep],current.length*1.5);3
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

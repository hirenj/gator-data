function renderData(seq,peptides) {
peptides = peptides['application/json+msdata'] || [];
console.log(peptides);
var intervals = [];

let glyphs_at_site = {};

var return_data = {};
var peptide_lines = [];
var ambiguous_shapes = [];

let form_stack = function(site_block,base_offset) {
	site_block.options.content = [site_block.options.content ];
	site_block.options.alt_content = '#ui_revealmore';
	site_block.is_stack = true;
	site_block.options.height = 10;
	site_block.options.offset = base_offset-10;
	site_block.options.fill = '#000';
	return site_block;
};

let push_stack = function(stack,site_block) {
	stack.options.content.push(site_block.options.content);
	console.log(stack.options.content.join(','));
}

peptides.forEach(function(glycopep,i) {
	if ( ! return_data[glycopep.acc] ) {
		return_data[glycopep.acc] = [];
		peptide_lines[glycopep.acc] = [];
		ambiguous_shapes[glycopep.acc] = [];
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
	if (Array.isArray(composition)) {
		composition = composition[0];
	}
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
	var base_offset = 12+4*(-2+depth);

	var pep_line = { "aa": peptide.start, "type" : "box" , "width" : (peptide.end - peptide.start), "options" : { "offset" : base_offset, "height_scale" : 0.1, "fill" : "#999", "merge" : false  }}

	peptide_lines[peptide.acc].push(pep_line);

	if ( ! peptide.sites || peptide.sites.length == 0) {
		var peptide_key = peptide.start + '-' + peptide.end + guess_composition(peptide.composition);
		if ( seen_sites[ peptide_key ] ) {
			return;
		}
		seen_sites[ peptide_key ] = true;
		// ambiguous_shapes[peptide.acc].push({ "aa" : Math.floor(0.5*peptide.start + 0.5*peptide.end), "type" : "marker" , "options" : { "content" : guess_composition(peptide.composition), "stretch": true, "height" : 10, "width": 3, "fill" : "none", "text_fill" : "#555", "border" : "#ddd", "no_tracer" : true, "bare_element" : false, "zoom_level" : "text", "offset" : base_offset + 2.5 }});
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
			composition = 'man(a1-3)[man(a1-6)]man(b1-4)glcnac(b1-4)glcnac';
		}

		composition = composition.toLowerCase();

		if ( seen_sites[site+composition]  ) {
			return;
		} else {
			seen_sites[site+composition] = true;
		}

		let rendered_block = { "aa" : site, "type" : "marker" , "options" : { "content" :  '#sugar_'+composition , "fill" : "none", "text_fill" : "#f00", "border" : "none", "height": 8, "offset" : base_offset - 2.5, "bare_element" : true }};


		if (composition.indexOf(')') < 0 && (composition.match(/\d/) || []).length < 1) {
			rendered_block.options.offset = base_offset - 2.5;
			rendered_block.options.height = 8;
		} else {
			rendered_block.options.offset = base_offset - 9;
			rendered_block.options.height = 16;
		}

		if (glyphs_at_site[site]) {
			let current_glyph = glyphs_at_site[site];
			if ( ! current_glyph.is_stack) {
				let stack_el = form_stack(current_glyph,base_offset);
				return_data[peptide.acc].splice(return_data[peptide.acc].indexOf(current_glyph),1, stack_el );
				current_glyph = glyphs_at_site[site] = stack_el;
			}
			push_stack(current_glyph,rendered_block);
		} else {
			return_data[peptide.acc].push(rendered_block);
			glyphs_at_site[site] = rendered_block;
		}
	});
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


Object.keys(return_data).forEach( function(acc) {
	return_data[acc] = peptide_lines[acc].concat(ambiguous_shapes[acc]).concat(return_data[acc]);
});

return return_data;
}

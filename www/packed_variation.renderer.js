function renderData(seq,variation) {
console.log(variation);

let variation_by_site = {};

let short_names = (res) => {
	let mappings = {
		'Ala' : 'A',
		'Ile' : 'I',
		'Leu' : 'L',
		'Met' : 'M',
		'Val' : 'V',
		'Phe' : 'F',
		'Trp' : 'W',
		'Tyr' : 'Y',
		'Asn' : 'N',
		'Cys' : 'C',
		'Gln' : 'Q',
		'Ser' : 'S',
		'Thr' : 'T',
		'Asp' : 'D',
		'Glu' : 'E',
		'Arg' : 'R',
		'His' : 'H',
		'Lys' : 'K',
		'Gly' : 'G',
		'Pro' : 'P'
	}
	return mappings[res] || 'X';
};

let is_glyco_site = (site,seq) => {
	// NXX, NX[ST], [STY]
	let context = seq.substring(site-2-1,site+2);
	if (context.match(/^N.[ST]/) || context.match(/..N.[ST]/) || context.match(/..[STY]../)) {
		return true;
	}
	return false;
}

let return_data = {};

let sites = [];

for (let variant of variation) {
	variation_by_site[variant.site] = variation_by_site[variant.site] || [];
	if (variation_by_site[variant.site].map( variant => variant.rsid ).indexOf(variant.rsid) < 0) {
		variation_by_site[variant.site].push(variant);
	}
	if (sites.indexOf(variant.site) < 0 ) {
		sites.push(variant.site);
	}
}

sites = sites.sort((a,b) => a-b);
console.log(sites);

let target_acc;

if (sites.length > 0) {
	target_acc = variation[0].uniprot;
	return_data[target_acc] = [];
}

for (let site of sites) {
	let substitutions = variation_by_site[site].map( variant => variant.variant ).map( short_names );
	let is_glyco = is_glyco_site(site,seq);
	let rendered_block = { "aa" : site,
												 "type" : "marker" ,
												 "options" : {
														"content" : substitutions,
														"alt_content" : "#ui_revealmore",
														"fill" : "none",
														"text_fill" : is_glyco ? "#f00" : "#000",
														"border" : "none",
														"height": 8,
														"offset" : -6,
														"bare_element" : true,
														"events" : [{
															"type" : "click,touchstart",
															"data" : variation_by_site[site].map( variant => variant.rsid )
														}]
													},
												};
	if (substitutions.length < 2) {
		rendered_block.options.content = substitutions[0];
		rendered_block.options.offset = 0;
		rendered_block.options.height = 6;
		delete rendered_block.options.alt_content;
	}
	return_data[target_acc].push(rendered_block);
}

return return_data;
}

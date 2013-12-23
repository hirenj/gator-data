
/* Bootstrap up the experimental sites */
watch_spreadsheet("0Ai48KKDu9leCdC1ESDlXVzlkVEZfTkVHS01POFJ1a0E",function(datablock) {
	var data = {};
	for (var i = 0; i < datablock.data.length; i++) {
		var row = datablock.data[i];
		id = row[2];
		if ( ! data[id] ) {
	    	data[id] = { "data" : { "sites" : [] }, "retrieved" : datablock.retrieved, "etag" : datablock.etag };
		}
		data[id].data.sites.push(parseInt(row[1].substr(1)));
	}
	return data;
});

/* Bootstrap up the predicted sites */
watch_file("./predictions.txt",function(datablock) {
	var data = {};
	for (var i = 0; i < datablock.length; i++) {
		var row = datablock[i];
		id = row[0];
		if ( ! data[id] ) {
	    	data[id] = { "data" : { "sites" : [] }, "retrieved" : datablock.retrieved, "etag" : datablock.etag };
		}
		var sites = (row[1] || "").split(/,/);
		sites.forEach(function(site) {
			data[id].data.sites.push(parseInt(site.substr(1)));
		});
	}
	return data;
},"predictions");

/* Bootstrap up the predicted sites for NetOGlyc 3.1 */
watch_file("./netoglyc31_predictions.txt",function(datablock) {
	var data = {};
	for (var i = 0; i < datablock.length; i++) {
		var row = datablock[i];
		id = row[0];
		if ( ! data[id] ) {
			data[id] = { "data" : { "sites" : [] }, "retrieved" : datablock.retrieved, "etag" : datablock.etag };
		}
		var sites = (row[1] || "").split(/,/);
		sites.forEach(function(site) {
			data[id].data.sites.push(parseInt(site.substr(1)));
		});
	}
	return data;
},"predictions31");

/* Bootstrap in the wanted domains */
watch_spreadsheet("0Ai48KKDu9leCdHM5ZXRjdUdFWnQ4M2xYcjM3S0Izdmc",function(datablock) {
	var data = {};
	for (var i = 0; i < datablock.data.length; i++) {
		var row = datablock.data[i];
		var id = row[1];
		var json = JSON.parse(row[2]);
		if ( ! data[id] ) {
			data[id] = { "data" : {"domains" : [] }, "retrieved" : datablock.retrieved, "etag" : datablock.etag };
		}
		for (var dom in json) {
			data[id].data.domains.push(dom.replace(/dom:/,''));
		}
	}
	return data;
});

/* Bootstrap in the experimental peptides */
watch_spreadsheet("0Ai48KKDu9leCdHVYektENmlwcVVqOHZHZzZBZVVBYWc",function(datablock) {
	var data = {};
	for (var i = 0; i < datablock.data.length; i++) {
		var row = datablock.data[i];
		var id = row[0];
		var start = parseInt(row[1]);
		var end = parseInt(row[2]);
		if ( ! data[id] ) {
			data[id] = { "data" : {"peptides" : [] }, "retrieved" : datablock.retrieved, "etag" : datablock.etag };
		}
		data[id].data.peptides.push([start,end]);
	}
	return data;
});


/* Bootstrap in the reference domain data */
watch_file("./domains.txt.gz",function(data_array) {
	var data = {};
	for (var i = 0; i < data_array.length; i++) {
		var row = data_array[i];
		var id = row[0];
		if ( ! data[id] ) {
			data[id] = { "data": {} };
		}
		if ( ! data[id].data[row[3]] ) {
			data[id].data[row[3]] = { "peptides" : [] };
		}
		data[id].data[row[3]].peptides.push([ row[1], row[2] ]);
		data[id].data[row[3]].name = row[3];

		if (row[4] && row[5]) {
			data[id].data[row[3]].name = row[4];
			data[id].data[row[3]].description = row[5];
		}
	}
	return data;
},"domains");

/* Bootstrap in the reference domain data */
watch_file("./domains_all_uniprot_cdd_tmhmm.txt.gz",function(data_array) {
	var data = {};
	for (var i = 0; i < data_array.length; i++) {
		var row = data_array[i];
		var id = row[0];
		if ( ! data[id] ) {
			data[id] = { "data": {} };
		}
		if ( ! data[id].data[row[4]] ) {
			data[id].data[row[4]] = { "peptides" : [] };
		}
		data[id].data[row[4]].peptides.push([ row[1], row[2] ]);
		data[id].data[row[4]].name = row[4];
		data[id].data[row[4]].evalue = row[3];

		if (row[5] && row[6]) {
			data[id].data[row[4]].name = row[5];
			data[id].data[row[4]].description = row[6];
		}
	}
	return data;
},"CddRunner");

/*
We want the mapping file HUMAN_MOUSE_RAT_idmapping_selected.tab.gz
Grab from ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/idmapping/by_organism/
We only want the idmapping_selected.dat.gz files
We want to run with the --mappings option set to the .gz file with all the mappings in it.
*/

watch_file("./homologene_with_cho.data",function(lines) {
	var data = {};
	var curr_group = null;
	var group_data = null;

	for ( var i = 0; i < lines.length; i++ ) {
		var bits = lines[i];
		var group_id = bits[0];
		if (curr_group != group_id) {
			if (group_data !== null) {
				// Human, Yeast, Mouse, Rat, Zebrafish, Drosophila, CHO
				[9606,4932,10090,10116,7955,7227,10029].forEach(function(tax_id) {
					if (group_data[tax_id]) {
						if ( ! data[group_data[tax_id]] ) {
							data[group_data[tax_id]] = { "data" : { "orthologs" : {} } } ;
						}
						for (var othertax in group_data) {
							data[group_data[tax_id]].data.orthologs[othertax] = group_data[othertax].toLowerCase();
						}
						delete data[group_data[tax_id]].data.orthologs[tax_id];
					}
				});
			}
			group_data = {};
		}

		curr_group = group_id;

		var tax_id = bits[1];
		var prot_id = bits[5];
		if (prot_id.indexOf('_') >= 0) {
			prot_id = this.map_id(prot_id);
		}
		if (prot_id) {
			group_data[tax_id] = prot_id.toLowerCase();
		}
	}
	return data;
},"homologene");

set_rkeys("homologene",["orthologs"],["taxid","ortholog_uniprot"]);

live_update("fulldomains",MASCP.UnionDomainReader,function(old_data,new_data)  {
        if ( ! old_data ) {
                return new_data;
        }
        if ( ! new_data ) {
                return old_data;
        }
        for (var key in new_data.data) {
                old_data.data[key] = new_data.data[key];
        }
        return old_data;
});

live_update("pride",MASCP.PrideRunner,function(old_data,new_data)  {
        if ( ! old_data ) {
                return new_data;
        }
        if ( ! new_data ) {
                return old_data;
        }
        for (var key in new_data.data) {
                old_data.data[key] = new_data.data[key];
        }
        return old_data;
});
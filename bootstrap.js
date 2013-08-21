
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

watch_file("./homologene.data",function(lines) {
	var data = {};
	var curr_group = null;
	var id;
	for ( var i = 0; i < lines.length; i++ ) {
		var bits = lines[i];
		var group_id = bits[0];
		if (curr_group != group_id) {
			id = null;
		}
		var tax_id = bits[1];
		var prot_id = this.map_id(bits[5]);
		if (tax_id == 9606) {
			id = prot_id;
			curr_group = group_id;
		}
		if ( id  === null ) {
			continue;
		}
		if ( ! data[id] ) {
	    	data[id] = { "data" : { "orthologs" : {} } };
		} else {
			data[id].data.orthologs[tax_id] = prot_id;
		}
	}
	return data;
},"homologene");

watch_file("./cho_hs_orthologs",function(lines) {
	var data = {};
	for ( var i = 0; i < lines.length; i++ ) {
		var id = lines[i][1];
		var cho = lines[i][0];
		if ( ! id || id === "") {
			continue;
		}
		if ( ! data[id] ) {
	    	data[id] = { "data" : { "orthologs" : {} } };
	    }
		data[id].data.orthologs[10029] = cho;
	}
	return data;
},"cho_orthologs");

live_update("homologene","cho_orthologs",function(old_data,new_data) {
    if ( ! old_data ) {
        return new_data;
    }
    if ( ! new_data ) {
        return old_data;
    }
    for (var key in new_data.data.orthologs) {
        old_data.data.orthologs[key] = new_data.data.orthologs[key];
    }
    return old_data;
});

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
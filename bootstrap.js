
watch_spreadsheet("0Ai48KKDu9leCdEpuVGd6d1VpVFFoZkJJMVRobjdJZmc",function(datablock) {
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

watch_file("./domains.txt",function(data_array) {
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


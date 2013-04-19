(function(win) {
  var autocomplete;

  var do_http_request = function(url,cback) {
      var xmlhttp =  new XMLHttpRequest();
      if (xmlhttp) {
          xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                if (xmlhttp.status == 200) {
                    cback(null,JSON.parse(xmlhttp.responseText));
                } else {
                    cback({"error" : xmlhttp.status });
                }
            }
          };
          xmlhttp.addEventListener('error',function() { cback({"error" : "XMLHTTP error"}); },false);
      }
      xmlhttp.open("GET", url, true);
      xmlhttp.setRequestHeader("Content-type",
          "application/x-www-form-urlencoded");
      xmlhttp.send('');
  };

  var test_mygene = function(success,failure) {
    do_http_request('http://mygene.info/gene/1',function(err,val) {
      if (err) {
        failure();
        failure = function() {};
        return;
      }
      success();
      success = function() {};
    });
  }

  var searchTimeout = null;
  var search_cache = {};

  var show_persistent_message = function(message) {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
    autocomplete.element.parentNode.setAttribute('data-hint',message);
  };

  var flash_message = function(message,time) {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
    if (! time ) {
      time = 2000;
    }
    autocomplete.element.parentNode.setAttribute('data-hint',message);
    searchTimeout = setTimeout(function() {
      autocomplete.element.parentNode.removeAttribute('data-hint');
    },time);
  };

  var clear_messages = function() {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
    autocomplete.element.parentNode.removeAttribute('data-hint');
  };


  var autocomplete_with_mygene = function(newValue) {
    if (! newValue || newValue.length < 1) {
      return;
    }
    if (search_cache[newValue]) {
      clear_messages();
      return search_cache[newValue];
    }
    show_persistent_message('Searching..');
    do_http_request('http://mygene.info/query?q='+newValue+'*+AND+species:human',function(err,val) {
      if (err) {
        flash_message('Error searching');
        return;
      }
      clear_messages();
      var prots = [];
      (val.rows || []).forEach(function(prot) {
        var val = { "name" : prot.name, "id" : prot.id, "symbol" : prot.symbol };
        val.toString = function() {
          return this.name + " ("+ this.symbol +")";
        };
        prots.push(val);
      });
      if (prots.length == 0) {
        flash_message('No matches');
      } else {
        clear_messages();
      }
      search_cache[newValue] = prots;
      autocomplete.addValues(prots);
    });
  };

  var get_mygene_uniprotid = function(id,callback) {
    do_http_request('http://mygene.info/gene/'+id,function(err,data) {
      if ( err || ! data.uniprot ) {
        flash_message('No matches');
        callback(err || { "error" : "No matches"});
        return;
      }
      var uniprot = data.uniprot['Swiss-Prot'] || data.uniprot['TrEMBL'][0];
      callback.call(setup,null,uniprot);
    });
  };

  var setup = function(element,callback) {
    if ( ready === false ) {
      console.log("MyGene not available");
      return;
    }
    autocomplete = new Autocomplete(element,{
      srcType : "dom",
      useNativeInterface : false,
      onInput : autocomplete_with_mygene
    });
    autocomplete.element.addEventListener('change',function() {
      if (! this.rawValue ) {
        return;
      }
      if ( ! this.value ) {
        return;
      }
      get_mygene_uniprotid(this.rawValue.id,callback);
    });
  };

  setup.flash_message = flash_message;

  var ready = null;

  setup.ready = function(callback) {
    if ( ready === null ) {
      ready = callback;
    } else {
      callback(ready);
    }
  };

  test_mygene(function() {
    if ( ready && typeof(ready) === 'function') {
      ready(true);
    }
    ready = true
  },function() {
    if ( ready && typeof(ready) === 'function') {
      ready(false);
    }
    ready = false;
  });

  win.MyGeneCompleter = setup;

})(window);
(function(win) {
  var autocomplete;
  var ready = null;


  var readyfunc = function(callback) {
    if ( ready === null ) {
      ready = callback;
    } else {
      callback(ready);
    }
  };


  win.MyGeneCompleter = function() {};
  win.MyGeneCompleter.ready = readyfunc;




  var do_http_request = function(url,cback,timeout) {
      var xmlhttp =  new XMLHttpRequest();
      if(window.XDomainRequest) {
        xmlhttp = new XDomainRequest();
      }
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
          if (window.XDomainRequest) {
            xmlhttp.onload = function() {
              cback(null,JSON.parse(xmlhttp.responseText));
            };
          }
          if (xmlhttp.addEventListener) {
            xmlhttp.addEventListener('error',function() { cback({"error" : "XMLHTTP error"}); cback = function() {}; },false);
            xmlhttp.addEventListener('timeout',function() { cback({"error" : "XMLHTTP error"}); cback = function() {}; },false);
          }
      }
      xmlhttp.open("GET", url, true);
      if (timeout) {
        xmlhttp.timeout = timeout;
      }
      if (xmlhttp.setRequestHeader) {
        xmlhttp.setRequestHeader("Content-type",
            "application/x-www-form-urlencoded");
      }
      xmlhttp.send('');
  };

  var test_mygene = function(success,failure) {
    do_http_request('http://mygene.info/v2/metadata',function(err,val) {
      if (err) {
        failure();
        failure = function() {};
        return;
      }
      success();
      success = function() {};
    },2000);
  }

  var searchTimeout = null;
  var search_cache = {};

  var show_persistent_message = function(message) {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
    setTimeout(function() {
      autocomplete.element.parentNode.setAttribute('data-hint',message);
    },0);
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
    var done_alias = false;

    do_http_request('http://mygene.info/v2/query?species=human&fields=symbol,name,uniprot,accession.protein&q='+newValue+'*',function(err,val) {
      if (err) {
        flash_message('Error searching');
        return;
      }
      clear_messages();
      if ( ! done_alias && val && val.hits && val.hits.length < 1 ) {
        done_alias = true;
        do_http_request('http://mygene.info/v2/query?species=human&fields=symbol,name,alias,uniprot,accession.protein&q=alias:'+newValue,arguments.callee);
        return;
      }
      var prots = [];
      var uprot_re1 = /^([A-N]|[R-Z])[0-9][A-Z]([A-Z]|[0-9])([A-Z]|[0-9])[0-9]$/;
      var uprot_re2 = /^[OPQ][0-9]([A-Z]|[0-9])([A-Z]|[0-9])([A-Z]|[0-9])[0-9]$/;


      (val.hits || []).forEach(function(prot) {
        var val = { "name" : prot.name, "id" : prot['_id'], "symbol" : prot.symbol };
        var uniprot;
        if (prot.uniprot) {
          uniprot =  prot.uniprot['Swiss-Prot'] || prot.uniprot['TrEMBL'];
          if (uniprot instanceof Array) {
            for (var i = 0; i < uniprot.length; i++) {
              if (! prot['accession.protein'] || prot['accession.protein'].indexOf(uniprot[i]) >= 0 ) {
                uniprot = uniprot[i];
                break;
              }
            }
          }
        } else if (prot['accession.protein']) {
          for (var i = 0; i < prot['accession.protein'].length; i++ ) {
            if (prot['accession.protein'][i].match(uprot_re1) || prot['accession.protein'][i].match(uprot_re2)) {
              uniprot = prot['accession.protein'][i];
              break;
            }
          }
        }
        val.uniprot = uniprot;
        val.toString = function() {
          return this.name + " ("+ this.symbol +")";
        };

        if (prot.alias) {
          val.toString = function() {
            return this.name + " ("+ this.symbol + "/" + prot.alias.join('/') +")";
          };
        }

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
    do_http_request('http://mygene.info/v2/gene/'+id,function(err,data) {
      if ( err || ! data.uniprot ) {
        flash_message('No matches');
        callback(err || { "error" : "No matches"});
        return;
      }
      var uniprot = data.uniprot['Swiss-Prot'] || data.uniprot['TrEMBL'];
      if (uniprot instanceof Array) {
        uniprot = uniprot[0];
      }
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

    /* We want to stop the keypress event propagating out just in case
       a parent is doing something with the keyboard
     */

    autocomplete.element.addEventListener('keypress',function(ev) {
      ev.stopPropagation();
    },false);

    autocomplete.element.addEventListener('change',function() {
      if (! this.rawValue ) {
        return;
      }
      if ( ! this.value ) {
        return;
      }
      if (this.rawValue.uniprot) {
        callback.call(setup,null,this.rawValue.uniprot);
        return;
      }
      get_mygene_uniprotid(this.rawValue.id,callback);
    });
  };

  setup.flash_message = flash_message;

  setup.ready = readyfunc;

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
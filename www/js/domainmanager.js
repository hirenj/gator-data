
/** @fileOverview   Classes for reading data from the AtChloro database
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}


(function() {

  var editing_enabled = false;

  MASCP.DomainRetriever = MASCP.buildService(function(data) {
    this._raw_data = data;
    return this;
  });

  MASCP.DomainRetriever.prototype.requestData = function() {
    var url = this._endpointURL;
    var agi = this.agi.toLowerCase();
    var gatorURL = url.slice(-1) == '/' ? url+agi : url+'/'+agi;
    return {
        type: "GET",
        dataType: "json",
        url : gatorURL,
        data: { 'agi'       : agi,
                'service'   : 'domains'
        }
    };
  };

  var retrieve_accepted_domains = function(config,acc,callback) {
    if (config.type === "gatorURL") {
      var datareader = new MASCP.UserdataReader(null, config.url);
    // datareader.datasetname = "spreadsheet:0Ai48KKDu9leCdHM5ZXRjdUdFWnQ4M2xYcjM3S0Izdmc";
      datareader.retrieve(acc,function(err) {
        if (err) {
          callback.call(null,err);
          return;
        }
        var wanted_domains = null;
        if (this.result) {
          wanted_domains = this.result._raw_data.data.domains;
        }
        callback.call(null,null,wanted_domains);
      });
    }
    if (config.type === "googleFile") {
      var file = (new MASCP.GoogledataReader()).getSyncableFile(config.file,function(err,file) {
        if (err) {
          callback.call(null,err);
          return;
        }
        var user_wanted = file.getData();
        if (acc in user_wanted) {
          callback(null,null,user_wanted[acc]);
        } else {
          callback(null,null,[]);
        }
      });
    }
    if (config.type === "url") {
      if ( ! sessionStorage.wanted_domains ) {
        sessionStorage.wanted_domains = "{}";
      }
      var cached_files = JSON.parse(sessionStorage.wanted_domains);
      if (cached_files[config.url]) {
        callback.call(null, null, JSON.parse(cached_files[config.url])[acc]);
        return;
      };
      MASCP.Service.request(config.url,function(err,data) {
        if (err) {
          callback.call(null,err);
          return;
        }
        callback.call(null,null,data[acc]);
      });
    }
  };

  var check_accepted_domains_writable = function(config,callback) {

    // We can only write to a googleFile

    if (config.type === "googleFile") {
      var file = (new MASCP.GoogledataReader()).getSyncableFile(config.file,function(err,file) {
        if (err) {
          callback.call(null,err);
          return;
        }
        callback.call(null,null,file.permissions.write);
      });
      return;
    }

    callback.call(null,null,false);
  };

  var get_accepted_domains = function(acc,next) {
    var self = this;
    var next_call = function(accepted_domains) {
      return function() {
        // We should just pretend we got data back
        var all_domains = self.result._raw_data.data;
        filter_domains(all_domains,accepted_domains,acc,function(domains) {
          next(acc,domains);
        });
      };
    };

    var use_default_accepted = next_call([]);

    self.preferences.getPreferences(function(err,prefs) {
      if (prefs && prefs.accepted_domains) {
        retrieve_accepted_domains(prefs.accepted_domains,acc,function(err,wanted_domains) {
          if (err) {
            console.log("Some problem");
            return;
          }
          next_call(wanted_domains)();
        });
      }
    });
  };

  var filter_domains = function(all_domains,wanted_domains,acc,callback) {
    var results = {};
    if (! wanted_domains ) {
      callback.call(null,all_domains);
      return all_domains;
    }
    all_domains = all_domains || {};
    for (var dom in all_domains) {
      if (! all_domains.hasOwnProperty(dom)) {
        continue;
      }
      var dom_key = dom.replace(/\s/g,'_');
      if (wanted_domains.indexOf(dom_key) >= 0) {
        results[dom] = all_domains[dom];
      }
      if (dom_key.match(/GlcNAc/)) {
        results[dom] = all_domains[dom];
      }
    }
    if (all_domains["tmhmm-TMhelix"]) {
      results["tmhmm-TMhelix"] = all_domains["tmhmm-TMhelix"];
    }
    callback.call(null,results);
    return results;
  };

  var render_domains = function(renderer,domains,acc,track) {
      var target_layer = track || acc.toString();
      renderer.text_els = [];
      MASCP.registerLayer(target_layer, { 'fullname' : "All domains", 'color' : '#aaaaaa' },[renderer]);
      var domain_keys = [];
      for (var domain in domains) {
        domain_keys.push(domain);
      }
      domain_keys.sort(function(a,b) {
        if (a == 'SIGNALP') {
          return 1;
        }
        if (b == 'SIGNALP') {
          return -1;
        }
        if (a == 'tmhmm-TMhelix') {
          return 1;
        }
        if (b == 'tmhmm-TMhelix') {
          return -1;
        }
        return a.localeCompare(b);
      });
      domain_keys.forEach(function(dom) {
        var lay_name = "dom:"+dom;
        lay_name = lay_name.replace(/\s/g,'_');
        if (dom == "KDEL") {
          domains[dom].peptides.push([ renderer.sequence.length - 3, renderer.sequence.length  ]);
        }
        var track_name = domains[dom].name;
        if ( dom == "tmhmm-TMhelix") {
          track_name = "TM Transmembrane";
        }
        MASCP.registerLayer(lay_name, { 'fullname' : track_name || dom, 'color' : '#aaaaaa' },[renderer]);
        renderer.trackOrder.push(lay_name);
        if (editing_enabled) {
          renderer.showLayer(lay_name);
        }
        var done_anno = false;
        var seen = {};
        domains[dom].peptides.forEach(function(pos) {
          var start = parseInt(pos[0]);
          var end = parseInt(pos[1]);
          if (isNaN(start)) {
            return;
          }
          if (seen[start]) {
            return;
          }

          if ((dom == "tmhmm-TMhelix") && domains["SIGNALP"]) {
            var signalp_end = parseInt(domains["SIGNALP"].peptides[0][1]);
            if ( (signalp_end >= end) || (start <= signalp_end) ) {
              return;
            }
          }
          seen[start] = true;
          if (start == end) {
            // var shape_func   =  /N\-linked.*GlcNAc/.test(dom)    ? renderer.nlinked :
            //                     /GlcNAc/.test(dom)    ? renderer.glcnac :
            //                     /GalNAc/.test(dom)    ? renderer.small_galnac  :
            //                     /Fuc/.test(dom)       ? renderer.fuc :
            //                     /Man/.test(dom)       ? renderer.man :
            //                     /Glc\)/.test(dom)     ? renderer.glc :
            //                     /Gal[\.\)]/.test(dom) ? renderer.gal :
            //                     /Hex[\.\)]/.test(dom) ? renderer.hex :
            //                     /HexNAc/.test(dom)    ? renderer.hexnac :
            //                     /Xyl/.test(dom)       ? renderer.xyl :
            //                     function() {
            //                       return null;
            //                     };
            // var is_potential = /Potential/.test(dom);
            // var element_func = function() {
            //   var box = shape_func.call(renderer);
            //   if (is_potential) {
            //     var kids = box.childNodes;
            //     for (var i = 0; i < kids.length; i++) {
            //       kids[i].setAttribute('fill','#67a2fc');
            //     };
            //   }
            //   return box;
            // };
            // var icon_size = 8;
            // if (shape_func == renderer.nlinked || shape_func == renderer.small_galnac || shape_func == renderer.xyl || shape_func == renderer.fuc) {
            //   icon_size = 16;
            // }
            // renderer.getAA(start).addToLayer(target_layer, {"height" : icon_size, "content" : element_func(), "offset" : 28, "angle": 0, "bare_element" : true });
            // renderer.getAA(start).addToLayer(lay_name, {"height" : 8, "content" : element_func(), "offset" : 12, "bare_element" : true });
          } else {
            var all_box;
            var box;
            if (! domains[dom].name) {
              domains[dom].name = dom;
            }
            var dom_key = (domains[dom].name).replace(/\s/g,'_');
            if (window.DOMAIN_DEFINITIONS[dom_key]) {
                var dats = window.DOMAIN_DEFINITIONS[dom_key];
                var fill = (renderer.gradients.length > 0) ? "url('#grad_"+dats[1]+"')" : dats[1];
                all_box = renderer.getAA(start).addShapeOverlay(target_layer,end-start+1,{ "shape" : dats[0], "height" : 8, "fill" : fill, "rotate" : dats[2] || 0 });
                all_box.setAttribute('stroke','#999999');
                all_box.style.strokeWidth = '10px';
                box = renderer.getAA(start).addShapeOverlay(lay_name,end-start+1,{ "shape" : dats[0], "fill" : 'url("#grad_'+dats[1]+'")' });
            } else {
                all_box = renderer.getAA(start).addBoxOverlay(target_layer,end-start+1,1);
                box = renderer.getAA(start).addBoxOverlay(lay_name,end-start+1,1);
            }

            var a_text = renderer.getAA(parseInt(0.5*(start+end))).addTextOverlay(target_layer,0,{ 'txt' : domains[dom].name });
            a_text.setAttribute('fill','#111111');
            a_text.setAttribute('stroke','#999999');
            renderer.text_els.push([a_text,all_box]);
          }

          done_anno = true;
        });
      });
      renderer.showLayer(target_layer);
      renderer.trigger('resultsRendered');
      renderer.zoom -= 0.0001;

  };

  // var get_domains = function(acc,next) {
  //   // MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
  //   var datareader = new MASCP.UserdataReader();
  //   datareader.datasetname = edit_toggler.enabled ? "fulldomains" : "domains";

  //   datareader.retrieve(acc,function(err) {
  //     if (! this.result ) {
  //       next();
  //       return;
  //     }
  //     next(this.result._raw_data.data);
  //   });
  // };

  // MASCP.DomainRetriever.prototype.getDomains = function(acc,callback) {
  //   get_accepted_domains.call(this,acc,function(acc,domains) {
  //     callback.call(null,domains);
  //   });
  // };

  // MASCP.DomainRetriever.prototype.renderDomains = function(acc,renderer,callback) {
  //   var self = this;
  //   self.acc = acc;
  //   get_accepted_domains.call(this,acc,function(acc,domains) {
  //     var temp_result = {
  //       'gotResult' : function() {
  //         render_domains(renderer,domains,acc);
  //         renderer.trigger('resultsRendered');

  //         jQuery(renderer.navigation).bind('toggleEdit',function() {
  //           if (edit_toggler.enabled) {
  //             edit_toggler(renderer);
  //           };
  //         });

  //         // Not sure why we need this call here
  //         edit_toggler(renderer,true);

  //         renderer.trigger('domainsRendered');
  //       },
  //       'acc'       : acc
  //     };
  //     renderer.trigger('readerRegistered',[temp_result]);
  //     temp_result.gotResult();
  //     callback.call(null);
  //   });
  // };

  var write_sync_timeout = null;

  var edit_toggler = function(renderer,read_only) {
      var needs_edit = renderer.navigation.isEditing();

      if ( read_only ) {
        return;
      }
      renderer.trackOrder.forEach(function(track) {
        if (track.match(/^dom\:/)) {
          if (needs_edit) {
            renderer.showLayer(track);
          } else {
            renderer.hideLayer(track);
          }
        }
      });
      renderer.refresh();
  };

  var reset_protein = function(acc) {
    with_user_preferences(function(prefs) {
      if ( ! prefs || ! prefs.accepted_domains ) {
        return;
      }
      (new MASCP.GoogledataReader()).getSyncableFile(prefs.accepted_domains,function(err,file) {
        file.getData()[acc] = null;
        file.sync();
      });
    });
  };


  MASCP.DomainRetriever.prototype.setupSequenceRenderer = function(renderer,options) {
    var self = this;
    setup_editing.call(self,renderer);
    self.bind('resultReceived',function() {
      get_accepted_domains.call(self,self.agi,function(acc,domains) {
          var temp_result = {
            'gotResult' : function() {
              render_domains(renderer,domains,acc,options.track);

              jQuery(renderer.navigation).bind('toggleEdit',function() {
                if (edit_toggler.enabled) {
                  edit_toggler(renderer);
                };
              });

              // Not sure why we need this call here
              edit_toggler(renderer,true);

              renderer.trigger('domainsRendered');
            },
            'acc'       : acc
          };
          renderer.trigger('readerRegistered',[temp_result]);
          temp_result.gotResult();
      });
    });
  };

  var setup_editing = function(renderer) {
    var self = this;

    self.preferences.getPreferences(function(err,prefs) {
      // if ( ! prefs.accepted_domains ) {
      //   prefs.accepted_domains = "User specified domains";
      // }

      renderer.clearDataFor = function(acc) {
      };

      check_accepted_domains_writable(prefs.accepted_domains,function(err,writable) {
        if (writable) {

          renderer.clearDataFor = function(acc) {
            reset_protein(acc);
          };

          edit_toggler.enabled = true;
          jQuery(renderer).bind('orderChanged',function(e,order) {
            if ((order.indexOf((self.acc || "").toUpperCase()) !== 0 && order.length > 0) || ( order.length == 1 && order[0] == (self.acc.toUpperCase()) ) ) {
              renderer.clearDataFor(self.acc);
              return;
            }
            if (renderer.trackOrder.length > 0) {
              console.log("Removed layer");
              update_domains.call(self,renderer,self.acc);
            }
          });
        }
      });
    });
  };

  var update_domains = function(renderer,acc) {
    var self = this;
    var wanted = {};
    renderer.trackOrder.forEach(function(track) {
      if (track.match(/^dom\:/) && renderer.isLayerActive(track)) {
        wanted[track] = 1;
      }
    });
    var wanted_domains = JSON.stringify(wanted);
    self.preferences.getPreferences(function(err,prefs) {
      if ( ! prefs || ! prefs.accepted_domains ) {
        return;
      }
      (new MASCP.GoogledataReader()).getSyncableFile(prefs.accepted_domains,function(err,file) {
        file.getData()[acc] = wanted_domains;
        file.sync();
      });
    });
  };


})();





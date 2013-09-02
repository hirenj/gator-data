
(function() {

  var editing_enabled = false;

  MASCP.DomainRenderer = function(renderer,editing_ready) {
    extend_renderer(renderer);
    this.renderer = renderer;
    setup();
    setup_editing.call(this,renderer,editing_ready);
  };

  var extend_renderer = function(renderer) {
      renderer.galnac = function() {
        var galnac = renderer._canvas.rect(-1,-1,2,2);
        galnac.setAttribute('fill','#ffff00');
        galnac.setAttribute('stroke-width','15');
        galnac.setAttribute('stroke','#990');
        return galnac;
      };
      renderer.glcnac = function() {
        var galnac = renderer._canvas.rect(-1,-1,2,2);
        galnac.setAttribute('fill','#0000ff');
        galnac.setAttribute('stroke-width','15');
        galnac.setAttribute('stroke','#009');
        return galnac;
      };

      renderer.small_galnac = function() {
        var galnac = renderer._canvas.rect(-0.5,-0.5,1,1);
        galnac.setAttribute('fill','#ffff00');
        return galnac;
      };

      renderer.small_glcnac = function() {
        var glcnac = renderer._canvas.rect(-0.5,-0.5,1,1);
        glcnac.setAttribute('fill','#0000ff');
        glcnac.setAttribute('stroke','#009');
        return glcnac;
      };

      renderer.light_galnac = function() {
        var result = renderer.galnac();
        result.setAttribute('fill','#ffffB3');
        result.setAttribute('stroke','#a6a635');
        return result;
      }
      renderer.nlinked = function() {
        var n_glc = renderer._canvas.group();
        var glcnac = renderer._canvas.rect(-0.45,-1,0.9,0.9);
        glcnac.setAttribute('fill','#0000ff');
        n_glc.push(glcnac);
        glcnac = renderer._canvas.rect(-0.45,0.2,0.9,0.9);
        glcnac.setAttribute('fill','#0000ff');
        n_glc.push(glcnac);
        return n_glc;
      };
      renderer.fuc = function() {
        var fuc = renderer._canvas.path("M0,-25 25,25 -25,25 z");
        fuc.setAttribute('fill','#ff0000');
        fuc.setAttribute('stroke','#990000');
        fuc.setAttribute('stroke-width','5');
        return fuc;
      };
      renderer.man = function() {
        var man = renderer._canvas.circle(0,0,0.8);
        man.setAttribute('fill','#00ff00');
        man.setAttribute('stroke','#009900');
        man.setAttribute('stroke-width','5');
        return man;
      };
      renderer.glc = function() {
        var glc = renderer._canvas.circle(0,0,0.8);
        glc.setAttribute('fill','#0000ff');
        glc.setAttribute('stroke','#000099');
        glc.setAttribute('stroke-width','5');
        return glc;
      };
      renderer.gal = function() {
        var gal = renderer._canvas.circle(0,0,0.8);
        gal.setAttribute('fill','#ffff00');
        gal.setAttribute('stroke','#999900');
        gal.setAttribute('stroke-width','5');
        return gal;
      };
      renderer.hex = function() {
        var hex = renderer._canvas.circle(0,0,0.8);
        hex.setAttribute('fill','#ffffff');
        hex.setAttribute('stroke','#999999');
        hex.setAttribute('stroke-width','5');
        return hex;
      };
      renderer.hexnac = function() {
        var hexnac = renderer._canvas.rect(-0.5,-0.5,1,1);
        hexnac.setAttribute('fill','#ffffff');
        hexnac.setAttribute('stroke','#999999');
        hexnac.setAttribute('stroke-width','5');
        return hexnac;
      };
      renderer.xyl = function() {
        var xyl = renderer._canvas.path('M0,-30 L0,-30 -15,15 22.5,-15 -22.5,-15 15,15 z');
        xyl.setAttribute('fill','#ff9999');
        xyl.setAttribute('stroke','#997777');
        xyl.setAttribute('stroke-width','5');
        return xyl;
      };
  };

  var with_user_preferences = function(callback) {
    // Don't trigger any popups
    if ( ! ("event" in window) ) {
      window.event = { "which" : false };
    }
    (new MASCP.GoogledataReader()).getPreferences("Editing prefs",function(err,data) {
      if (err) {
        if (err.cause == "No user event" || err.cause == "Browser not supported") {
          callback.call();
          return;
        }
        return;
      }
      callback.call(null,data);
    });
  };

  var already_setup = false;

  var setup = function() {
    var old_filter_domains = filter_domains;
    var waiting_calls = [];
    filter_domains = function(all,wanted,acc,callback) {
      waiting_calls.push(function() {
        filter_domains(all,wanted,acc,callback);
      });
    };
    with_user_preferences(function(prefs) {
      if ( ! already_setup ) {
        if (prefs && prefs.supplemental_domains) {
          already_setup = true;
          filter_domains = function(all,wanted,acc,callback) {
            var file = (new MASCP.GoogledataReader()).getSyncableFile(prefs.supplemental_domains,function(err,file) {
              if (acc in file.getData()) {
                old_filter_domains(all,file.getData()[acc],acc,callback);
              } else {
                old_filter_domains(all,wanted,acc,callback);
              }
            });
          };
          if ( ! prefs.editing ) {
            editing_enabled = false;
          }
        } else {
          editing_enabled = false;
          filter_domains = old_filter_domains;
        }
      }
      waiting_calls.forEach(function(func) {
        func();
      });
      waiting_calls = [];
    });
  };

  var get_accepted_domains = function(acc,next) {
    // acc = acc.toUpperCase();
    MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
    var datareader = new MASCP.UserdataReader();
    datareader.datasetname = "spreadsheet:0Ai48KKDu9leCdHM5ZXRjdUdFWnQ4M2xYcjM3S0Izdmc";
    datareader.retrieve(acc,function(err) {
      var wanted_domains = null;
      if (! err && this.result ) {
        wanted_domains = this.result._raw_data.data.domains;
      }
      get_domains(acc,function(all_domains) {
        filter_domains(all_domains,wanted_domains,acc,function(domains) {
          next(acc,domains);
        });
      });
    });
  };

  var filter_domains = function(all_domains,wanted_domains,acc,callback) {
    var results = {};
    if (! wanted_domains ) {
      callback.call(null,all_domains);
      return all_domains;
    }
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

  var render_domains = function(renderer,domains,acc) {
      var target_layer = acc.toString();
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
        lay_name = "dom:"+dom;
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
            var shape_func   =  /N\-linked.*GlcNAc/.test(dom)    ? renderer.nlinked :
                                /GlcNAc/.test(dom)    ? renderer.glcnac :
                                /GalNAc/.test(dom)    ? renderer.small_galnac  :
                                /Fuc/.test(dom)       ? renderer.fuc :
                                /Man/.test(dom)       ? renderer.man :
                                /Glc\)/.test(dom)     ? renderer.glc :
                                /Gal[\.\)]/.test(dom) ? renderer.gal :
                                /Hex[\.\)]/.test(dom) ? renderer.hex :
                                /HexNAc/.test(dom)    ? renderer.hexnac :
                                /Xyl/.test(dom)       ? renderer.xyl :
                                function() {
                                  return null;
                                };
            var is_potential = /Potential/.test(dom);
            var element_func = function() {
              var box = shape_func.call(renderer);
              if (is_potential) {
                var kids = box.childNodes;
                for (var i = 0; i < kids.length; i++) {
                  kids[i].setAttribute('fill','#67a2fc');
                };
              }
              return box;
            };
            renderer.getAA(start).addToLayer(target_layer, {"height" : 16, "content" : element_func(), "offset" : 28, "angle": 0, "bare_element" : true });
            renderer.getAA(start).addToLayer(lay_name, {"height" : 8, "content" : element_func(), "offset" : 12, "bare_element" : true });
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
      renderer.zoom -= 0.0001;

  };

  var get_domains = function(acc,next) {
    MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
    var datareader = new MASCP.UserdataReader();
    datareader.datasetname = edit_toggler.enabled ? "fulldomains" : "domains";
          
    datareader.retrieve(acc,function(err) {
      if (! this.result ) {
        next();
        return;
      }
      next(this.result._raw_data.data);
    });
  };

  MASCP.DomainRenderer.prototype.renderDomains = function(acc,callback) {
    var self = this;
    self.acc = acc;
    get_accepted_domains(acc,function(acc,domains) {
      var temp_result = {
        'gotResult' : function() {
          render_domains(self.renderer,domains,acc);
          self.renderer.trigger('resultsRendered');
          self.renderer.trigger('domainsRendered');
        },
        'acc'       : acc
      };
      self.renderer.trigger('readerRegistered',[temp_result]);
      temp_result.gotResult();
      callback.call(null);
    });
  };

  var write_sync_timeout = null;

  var edit_toggler = function(renderer,read_only) {
      var needs_edit = renderer.navigation.isEditing();
      (new MASCP.GoogledataReader()).getPreferences("Editing prefs",function(err,prefs) {
        if (err || ! prefs ) {
          return;
        }
        if ( ! read_only ) {
          prefs.editing = needs_edit;
        } else {
          if (prefs.editing) {
            jQuery(renderer.navigation).trigger('toggleEdit');
          }
        }
      });
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
      if (write_sync_timeout) {
        clearTimeout(write_sync_timeout);
      }
      write_sync_timeout = setTimeout(function() {
        write_sync_timeout = null;
        (new MASCP.GoogledataReader()).writePreferences("Editing prefs",function(err) {
          if ( ! err ) {
            console.log("Synced back preferences");
          }
        });
      },5000);
  };

  var reset_protein = function(acc) {
    with_user_preferences(function(prefs) {
      if ( ! prefs || ! prefs.supplemental_domains ) {
        return;
      }
      (new MASCP.GoogledataReader()).getSyncableFile(prefs.supplemental_domains,function(err,file) {
        file.getData()[acc] = null;
        file.sync();
      });
    });
  };

  var setup_editing = function(renderer,callback) {
    var self = this;

    jQuery(renderer).bind('domainsRendered', function() {
      jQuery(renderer.navigation).bind('toggleEdit',function() {
        if (edit_toggler.enabled) {
          edit_toggler(renderer);
        };
      });
      edit_toggler(renderer,true);
    });

    var old_get_domains = get_domains;
    var waiting_domains_calls = [];
    get_domains = function(acc,next) {
      waiting_domains_calls.push(function() {
        get_domains(acc,next);
      });
    };

    with_user_preferences(function(prefs) {
      if ( ! prefs ) {

        get_domains = old_get_domains;

        waiting_domains_calls.forEach(function(func) {
          func();
        });
        waiting_domains_calls = [];

        callback.call();
        return;
      }
      if ( ! prefs.supplemental_domains ) {
        prefs.supplemental_domains = "User specified domains";
        (new MASCP.GoogledataReader()).writePreferences("Editing prefs",function(err,data) {
          setup();
        });
      }

      renderer.clearDataFor = function(acc) {
        reset_protein(acc);
      };
      (new MASCP.GoogledataReader()).getSyncableFile(prefs.supplemental_domains,function(err,file) {
        if (! err && file.permissions.write) {
          edit_toggler.enabled = true;

          get_domains = old_get_domains;
          waiting_domains_calls.forEach(function(func) {
            func();
          });
          waiting_domains_calls = [];


          console.log("Permissions to update");
          callback.call(null,editing_enabled,self.acc);
          jQuery(renderer).bind('orderChanged',function(e,order) {
            if ((order.indexOf((self.acc || "").toUpperCase()) !== 0 && order.length > 0) || ( order.length == 1 && order[0] == (self.acc.toUpperCase()) ) ) {
              renderer.clearDataFor(self.acc);
              return;
            }
            if (renderer.trackOrder.length > 0) {
              console.log("Removed layer");
              update_domains(renderer,self.acc);
            }
          });
        }
      });
    });
  };

  var update_domains = function(renderer,acc) {
    var wanted = {};
    renderer.trackOrder.forEach(function(track) {
      if (track.match(/^dom\:/) && renderer.isLayerActive(track)) {
        wanted[track] = 1;
      }
    });
    var wanted_domains = JSON.stringify(wanted);
    with_user_preferences(function(prefs) {
      if ( ! prefs || ! prefs.supplemental_domains ) {
        return;
      }
      (new MASCP.GoogledataReader()).getSyncableFile(prefs.supplemental_domains,function(err,file) {
        file.getData()[acc] = wanted_domains;
        file.sync();
      });
    });
  };


})();





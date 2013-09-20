    if (!(window.console && console.log)) { (function() { var noop = function() {}; var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn']; var length = methods.length; var console = window.console = {}; while (length--) { console[methods[length]] = noop; } }()); }

    var DomaintoolPreferences = function() {
      this.waiting = [];
      if (this.getActiveSession()) {
        this.addRealtime(this.getActiveSession());
      } else {
        this.useDefaultPreferences();
      }
    };

    DomaintoolPreferences.prototype.setActiveSession = function(file,title) {
      if ( ! file ) {
        localStorage.removeItem("active_session");
        this.useDefaultPreferences();
      } else {
        localStorage.setItem("active_session",file);
        localStorage.setItem("active_session_title",title);
      }
    }

    DomaintoolPreferences.prototype.getActiveSession = function() {
      return localStorage.getItem("active_session");
    }

    DomaintoolPreferences.prototype.getActiveSessionTitle = function() {
      return localStorage.getItem("active_session_title");
    }

    DomaintoolPreferences.prototype.addService = function(service,name) {
      var preferences = this;
      preferences.getPreferences(function(err,prefs) {
        if ( ! err ) {
          if ( ! prefs.user_datasets[service]) {
            prefs.user_datasets[service] = {};
          }
          prefs.user_datasets[service].render_options = {};
          prefs.user_datasets[service].name = name || service;
          preferences.sync(function(err,prefs) {
            if (err) {
              window.notify.alert("Could not write preferences");
            } else {
              window.notify.info("Successfully loaded "+(name || service || ""));
            }
          });
        } else {
          console.log("Reading prefs");
          console.log(err);
          window.notify.alert("Could not read preferences");
        }
      });
    };

    DomaintoolPreferences.prototype.watchFile = function(doc) {
      var preferences = this;
      var defaults = {};
      var run_parser = false;
      var parser = function(datablock){
        if (typeof run_parser !== 'undefined') {
          run_parser = true;
        }
        for (var key in datablock.data) {
          if (key == "" || key.match(/\s/)) {
            delete datablock.data[key];
          } else {
            var dat = datablock.data[key];
            delete datablock.data[key];
            datablock.data[key.toLowerCase()] = {
              "data" : dat,
              "retrieved" : datablock.retrieved,
              "etag" : datablock.etag,
              "title" : datablock.title
            };
          }
        }
        if (typeof defaults !== 'undefined') {
          defaults = datablock.defaults || defaults;
        }
        delete datablock.retrieved;
        delete datablock.etag;
        delete datablock.title;
        return datablock.data;
      };
      if (sessionStorage.getItem("update_timestamps")) {
        var json = JSON.parse(sessionStorage.getItem("update_timestamps"))
        delete json[doc];
        sessionStorage.setItem("update_timestamps",JSON.stringify(json));
      }
      MASCP.Service.ClearCache('MASCP.UserdataReader.'+doc,null,function(err) {
        console.log("Cleared data");
        preferences.addWatchedDocument(doc,parser,function(err,docname) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState({},"Loading of "+docname);
            document.title = "Loading of "+docname;
          }
          if (err) {
            if (err.status === "preferences") {
              if (err.original_error.cause === "No user event") {
                window.notify.alert("You have been logged out, please click the drive button to authorize again");
                return;
              }
              window.notify.alert("Error setting preferences - try opening document again");
              return;
            }
            window.notify.alert("Problem reading document, please try again");
            return;
          }
          var not = window.notify.info("Saving preferences - please wait");
          preferences.getPreferences(function(err,prefs) {
            if ( ! err ) {
              if (run_parser && prefs.user_datasets[doc]) {
                prefs.user_datasets[doc].render_options = defaults;
              }
              preferences.sync(function(err,prefs) {
                if (not) {
                  not.hide();
                }

                if (err) {
                  window.notify.alert("Could not write preferences");
                } else {
                  window.notify.info("Successfully loaded "+(docname || ""));
                }
              });
            } else {
              window.notify.alert("Could not write preferences");
            }
          });
        });
      });
    }

    DomaintoolPreferences.prototype.addRealtime = function(file) {
      var self = this;
      gapi.load("drive-realtime", function() {
        if (MASCP.AnnotationManager) {
          MASCP.AnnotationManager.InitRealtime();
        }
        var callback = function(err) {
          if (err) {
            if (err.cause == "Failed to return from auth") {
              window.notify.info("Could not contact servers, please wait").hideLater(1000);
              setTimeout(function() {
                self.addRealtime(file);
              },1000);
              return;
            }
            return;
          }
          self.usePreferenceFile(file);
          self.getPreferences(function(err,prefs,etag) {
            gapi.drive.realtime.load(file, function(doc) {
              console.log("Realtime ready");
              self.realtime = doc;
              bean.fire(self,'realtimeready');
            }, function(model) {
              console.log("Firing model init");
              bean.fire(self,'modelinit',[model,prefs,etag]);
              model.getRoot().set('doc-etag',model.createString('none'));
            });
          });
        }
        if ( ! self.prefs_object ) {
          (new MASCP.GoogledataReader()).getDocument(null,null,callback);
        } else {
          self.getPreferences(callback);
        }
      });
    };

    DomaintoolPreferences.prototype.usePreferenceFile = function(file) {
      var self = this;
      var google_obj = new MASCP.GoogledataReader();
      var prefs_data = {};

      var file_obj = {"id" : file, "content" : prefs_data };
      var old_get_preferences = google_obj.getPreferences;
      var old_write_preferences = google_obj.writePreferences;
      google_obj.getPreferences = function(dom,callback,force) {
        if (force) {
          delete file_obj.etag;
        }
        if ( file_obj.etag && file_obj.content ) {
          callback.call(null,null,file_obj.content,file_obj.etag,file_obj.modified)
          return;
        }
        old_get_preferences.call(google_obj,dom,function(err,prefs) {
          if (err && err.cause && err.cause.status == 304) {
            callback.call(null,null,file_obj.content,file_obj.etag,file_obj.modified);
            return;
          }
          if (err) {
            callback.call(null,err);
          }
          var key;
          for (key in (file_obj.content)) {
            delete file_obj.content[key];
          }
          for (key in prefs) {
            file_obj.content[key] = prefs[key];
          }
          callback.call(null,err,file_obj.content,file_obj.etag,file_obj.modified);
        });
      };

      send_etag = function() {};

      google_obj.writePreferences = function(dom,callback) {
        old_write_preferences.call(google_obj,file_obj,function(err,prefs) {
          old_get_preferences.call(google_obj,file_obj,function(err,pr) {
            send_etag(file_obj);
            callback.call(null,err,prefs,file_obj.etag,file_obj.modified);
          });
        });
      };

      bean.add(self,'realtimeready',function() {
        var str = self.realtime.getModel().getRoot().get("doc-etag");
        str.addEventListener(gapi.drive.realtime.EventType.OBJECT_CHANGED,function(ev) {
          if (! ev.isLocal) {
            if (str.toString() !== file_obj.etag) {
              file_obj.etag = null;
              console.log("Refreshing etag from server");
              self.getPreferences(function() { window.notify.info("Synchronised changes").hideLater(500); });
            }
          }
        });

        send_etag = function(obj) {
          if (obj.etag && self.realtime.getModel().getRoot().get("doc-etag").toString() !== obj.etag ) {
            self.realtime.getModel().getRoot().get("doc-etag").setText(obj.etag);
          }
        };

      });
      this.prefs_object = {
        addWatchedDocument : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(file_obj);
          google_obj.addWatchedDocument.apply(google_obj,args);
        },
        removeWatchedDocument : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(file_obj);
          file_obj.etag = "force";
          google_obj.removeWatchedDocument.apply(google_obj,args);
        },
        readWatchedDocuments : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(file_obj);
          google_obj.readWatchedDocuments.apply(google_obj,args);
        },
        listWatchedDocuments : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(file_obj);
          google_obj.listWatchedDocuments.apply(google_obj,args);
        },
        getPreferences : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(file_obj);
          google_obj.getPreferences.apply(google_obj,args);
        },
        writePreferences : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(file_obj);
          google_obj.writePreferences.apply(google_obj,args);
        }
      };
      if (self.waiting) {
        self.waiting.forEach(function(waiting) {
          self.prefs_object[waiting.method].apply(self.prefs_object,waiting.args);
        });
        self.waiting = [];
      }
      bean.fire(self,'prefschange');
      return;
    };

    DomaintoolPreferences.prototype.getStaticConf = function(doc,callback) {
        if ( ! doc.match(/\b(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&\'<>])\S)+)\b/)) {
          window.notify.alert("Invalid DOI");
          return;
        }
        MASCP.Service.request('/doi/'+doc,callback);
    };

    DomaintoolPreferences.prototype.useStaticPreferences = function(doc,handle_proteins) {
      var self = this;
      this.setActiveSession();
      conf = { "datasets" : [] };

      self.getStaticConf(doc,function(err,json) {
        if (err) {
          if (err.status >= 500) {
            window.notify.alert("Could not load page, please try again");
          } else if (err.status >= 400) {
            window.notify.alert("Invalid publication");
          }
        }
        conf = json;
        var accs = conf.accessions || [];
        conf.datasets.forEach(function(dataset) {
          if ( ! dataset.doc ) {
            return;
          }
          (function() {
            MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
            var datareader = new MASCP.UserdataReader();
            datareader.datasetname = dataset.doc;
            datareader.retrieve('config',function() {
              dataset.sites = this.result._raw_data.data.sites;
              dataset.title = this.result._raw_data.title;
            });
          })();
          if ( ! conf.accessions ) {
            var uprot_re1 = /([A-N]|[R-Z])[0-9][A-Z]([A-Z]|[0-9])([A-Z]|[0-9])[0-9]/;
            var uprot_re2 = /[OPQ][0-9]([A-Z]|[0-9])([A-Z]|[0-9])([A-Z]|[0-9])[0-9]/;
            (function() {
              MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
              var datareader = new MASCP.UserdataReader();
              datareader.datasetname = dataset.doc;
              datareader.retrieve('accs',function() {
                this.result._raw_data.data.forEach(function(acc) {
                  acc = acc.replace(/\s+/g,'');
                  if (acc.toUpperCase().match(uprot_re1) || acc.toUpperCase().match(uprot_re2)) {
                    accs.push({"id" : acc});
                  }
                });
                handle_proteins(accs);
              });
            })();
          }
        });
        if (accs) {
          handle_proteins(accs);
        }
      });

      this.prefs_object = {
        addWatchedDocument : function() {
        },
        removeWatchedDocument : function() {
        },
        readWatchedDocuments : function(callback) {
          MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
          conf.datasets.forEach(function(set) {
            var target_reader = new MASCP.UserdataReader();
            target_reader.datasetname = set.doc;
            callback.call(null,null,{"render_options" : { "sites" : set.sites, "track" : set.title || "Data", "offset" : 0 }},target_reader);
          });
        },
        listWatchedDocuments : function() {
        },
        getPreferences : function() {
        },
        writePreferences : function() {
        }
      };
      delete self.realtime;
      bean.fire(self,'prefschange');
    };

    DomaintoolPreferences.prototype.useDefaultPreferences = function() {
      var self = this;
      var google_obj = new MASCP.GoogledataReader();
      var domain = "Domaintool preferences";

      this.prefs_object = {
        addWatchedDocument : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(domain);
          google_obj.addWatchedDocument.apply(google_obj,args);
        },
        removeWatchedDocument : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(domain);
          google_obj.removeWatchedDocument.apply(google_obj,args);
        },
        readWatchedDocuments : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(domain);
          google_obj.readWatchedDocuments.apply(google_obj,args);
        },
        listWatchedDocuments : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(domain);
          google_obj.listWatchedDocuments.apply(google_obj,args);
        },
        getPreferences : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(domain);
          google_obj.getPreferences.apply(google_obj,args);
        },
        writePreferences : function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(domain);
          google_obj.writePreferences.apply(google_obj,args);
        }
      };
      delete self.realtime;
      bean.fire(self,'prefschange');
    };

    DomaintoolPreferences.prototype.addWatchedDocument = function() {
      if ( ! this.prefs_object ) {
        this.waiting.push({ "method" : "addWatchedDocument", "args" : Array.prototype.slice.call(arguments)});
        return;
      }

      this.prefs_object.addWatchedDocument.apply(this.prefs_object,Array.prototype.slice.call(arguments));
    };
    DomaintoolPreferences.prototype.removeWatchedDocument = function() {
      if ( ! this.prefs_object ) {
        this.waiting.push({ "method" : "removeWatchedDocument", "args" : Array.prototype.slice.call(arguments)});
        return;
      }

      this.prefs_object.removeWatchedDocument.apply(this.prefs_object,Array.prototype.slice.call(arguments));
    };
    DomaintoolPreferences.prototype.readWatchedDocuments = function() {
      if ( ! this.prefs_object ) {
        this.waiting.push({ "method" : "readWatchedDocuments", "args" : Array.prototype.slice.call(arguments)});
        return;
      }

      this.prefs_object.readWatchedDocuments.apply(this.prefs_object,Array.prototype.slice.call(arguments));
    };
    DomaintoolPreferences.prototype.listWatchedDocuments = function() {
      if ( ! this.prefs_object ) {
        this.waiting.push({ "method" : "listWatchedDocuments", "args" : Array.prototype.slice.call(arguments)});
        return;
      }

      this.prefs_object.listWatchedDocuments.apply(this.prefs_object,Array.prototype.slice.call(arguments));
    };
    DomaintoolPreferences.prototype.getPreferences = function() {
      if ( ! this.prefs_object ) {
        this.waiting.push({ "method" : "getPreferences", "args" : Array.prototype.slice.call(arguments)});
        return;
      }
      this.prefs_object.getPreferences.apply(this.prefs_object,Array.prototype.slice.call(arguments));
    };

    DomaintoolPreferences.prototype.sync = function() {
      if ( ! this.prefs_object ) {
        this.waiting.push({ "method" : "sync", "args" : Array.prototype.slice.call(arguments)});
        return;
      }
      this.prefs_object.writePreferences.apply(this.prefs_object,Array.prototype.slice.call(arguments));
    };

    var get_preferences = function() {
      if ( ! window.prefs ) {
        window.prefs = (new DomaintoolPreferences());
      }
      return window.prefs;
    }

    var render_peptides = function(layer) {
      return function(renderer) {
        this.bind('resultReceived',function(e) {
          var self = this;
          var peptides = self.result._raw_data.data.peptides || [], i = 0, match = null;
          for (i = peptides.length - 1; i >= 0; i--) {
            var pep = peptides[i];
            var start = parseInt(pep[0]);
            var end = parseInt(pep[1]);
            if ( ! renderer.getAA(start)) {
              continue;
            }
            var el = renderer.getAA(start).addBoxOverlay(layer,end-start+1,1,{ "offset" : -3, "height_scale": 0.1, "fill" : "#999", "merge" : false });
            el.parentNode.insertBefore(el,el.parentNode.firstChild.nextSibling);
          }
          renderer.showLayer(layer);
          renderer.refresh();
          jQuery(renderer).trigger('resultsRendered',[self]);
        });
      };
    };



    var render_sites = function(layer,do_grouping,offset) {
      if (typeof(offset) == 'undefined' || offset === null) {
        offset = 0;
      }
      return function(renderer) {
        this.bind('resultReceived',function(e) {
          var self = this;
          var sites = self.result._raw_data.data.sites || [], i = 0, match = null;
          // renderer._layer_containers[layer].track_height = parseInt(renderer.trackHeight*2/3);

          var group = [];
          for (i = 0; i < sites.length; i++) {
              var current = sites[i], next = null;
              if ( ! current ) {
                continue;
              }
              if (sites[i+1]) {
                next = sites[i+1];
              }
              if ( ! do_grouping || (! next || ((next - current) > 10) || renderer.sequence.substring(current,next-1).match(/[ST]/)) ) {
                if (group.length < 3) {
                  group.push(current);
                  group.forEach(function(site){
                    renderer.getAA(site).addToLayer(layer,{"content" : (offset < 1) ? renderer.galnac() : renderer.light_galnac(), "offset" : offset, "height" : 9,  "bare_element" : true });
                  });
                } else {
                  group.push(current);
                  group.forEach(function(site){
                    renderer.getAA(site).addToLayer(layer,{"content" : (offset < 1) ? renderer.galnac() : renderer.light_galnac(), "offset" : offset, "height" : 9,  "bare_element" : true })[1].zoom_level = 'text';
                  });
                  var rect = renderer.getAA(group[0]).addShapeOverlay(layer,current-group[0]+1,{ "shape" : "roundrect", "offset" : offset - 4.875, "height" : 9.75 });
                  var a_galnac = (offset < 1) ? renderer.galnac() : renderer.light_galnac();
                  rect.setAttribute('fill',a_galnac.getAttribute('fill'));
                  rect.setAttribute('stroke',a_galnac.getAttribute('stroke'));
                  rect.setAttribute('stroke-width',70);
                  a_galnac.parentNode.removeChild(a_galnac);
                  rect.removeAttribute('style');
                  rect.setAttribute('rx','120');
                  rect.setAttribute('ry','120');
                  rect.zoom_level = 'summary';
                }
                group = [];
              } else {
                group.push(current);
              }
          }


          // for (i = sites.length - 1; i >= 0; i--) {
          //     renderer.getAA(sites[i]).addToLayer(layer,{"content" : (offset > 0) ? renderer.light_galnac() : renderer.galnac(), "offset" : offset, "height" : parseInt(renderer.trackHeight*4/3),  "bare_element" : true });
          // }
          renderer.showLayer(layer);
          jQuery(renderer).trigger('resultsRendered',[self]);
        });        
      };
    };


    var wire_plainsearch = function() {
      var auto = new Autocomplete(document.getElementById('searchGene'),{
        srcType : "dom",
        useNativeInterface : false,
        onInput : function(name) {
          var prots = document.getElementById('protein_list').childNodes;
          var prot_list = [];
          if (this._cache_prots) {
            auto.addValues(this._cache_prots);
            return;
          }
          for (var i = 0; i < prots.length; i++) {
            var obj = {};
            obj.element = prots[i];
            obj.name = prots[i].textContent;
            obj.toString = function() { return this.name };
            prot_list.push(obj);
          }
          auto.addValues(prot_list);
          this._cache_prots = prot_list;
        }
      });
      auto.element.addEventListener('change',function() {
        if (! this.rawValue ) {
          return;
        }
        if ( ! this.value ) {
          return;
        }
        this.rawValue.element.click();
      });
    };

    var wire_genesearch = function(renderer) {
      MyGeneCompleter.ready(function(working) {
        if (working) {
          document.getElementById('searchGeneLabel').textContent = 'Search by NCBI gene name';
          MyGeneCompleter(document.getElementById('searchGene'),function(err,uniprot) {
            if ( ! uniprot ) {
              MyGeneCompleter.flash_message("No UniProt entry found");
              return;
            }
            if (document.getElementById('prot_'+uniprot.toLowerCase())) {
              document.getElementById('prot_'+uniprot.toLowerCase()).click();
              document.getElementById('prot_'+uniprot.toLowerCase()).scrollIntoView(true);
              return;
            } else {
              var selected = (document.getElementsByClassName('selected') || [])[0];
              if (selected) {
                var clazz = selected.getAttribute('class') || '';
                selected.setAttribute('class',clazz.replace(/selected\s/,''));
              }
            }
            MyGeneCompleter.flash_message("Not in SimpleCell",2000);
            show_protein(uniprot,renderer);
          });
        } else {
          if (window.ga) {
            setTimeout(function() {
              window.ga('send','event','mygene','nonfunctional');
            },0);
          }

          document.getElementById('searchGeneLabel').textContent = 'Search by protein name';
          wire_plainsearch();
        }
      })
    };

    var wire_history = function(renderer) {
      if (history) {
        window.onpopstate = function(event) {
          show_protein((event.state || {})['uniprot_id'],renderer);
        }
      }
    };

    var wire_clearsession = function(title,renderer) {
      document.getElementById('clearsession').textContent = title;
      document.getElementById('clearsession').style.display = 'block';
      document.getElementById('clearsession').onclick = function() {
        console.log("Clearing session");
        get_preferences().setActiveSession(null);
        this.style.display = 'none';
        show_protein(document.getElementById('uniprot_id').textContent,renderer,null,true);
      };
    };

    var wire_renderer = function(renderer) {
      wire_renderer_sequence_change(renderer);
      wire_renderer_zoom(renderer);
      if (MASCP.AnnotationManager) {
        var annotation_manager = new MASCP.AnnotationManager(renderer,get_preferences());
        wire_find(annotation_manager);
        wire_dragging_disable(renderer,annotation_manager);
        wire_tag_edit(annotation_manager);
        var selector_callback = function() {
          annotation_manager.addSelector(function(text) {
            if ( ! text ) {
              return;
            }
            document.getElementById('selecttoggle').firstChild.setAttribute('value',text);
          });
        };
        if (renderer.sequence) {
          selector_callback();
        }
        renderer.bind('sequenceChange',selector_callback);
        document.getElementById('selecttoggle').firstChild.addEventListener('onfocus',function(evt) {
          evt.preventDefault();
        });

        get_preferences().getPreferences(function(err,prefs) {
          if ( err || ! prefs ) {
            return;
          }
          bean.add(get_preferences(),'prefschange',function() {
            annotation_manager.initialiseAnnotations();
          });
        });
      }
    };

    var wire_find = function(manager) {
      document.getElementById('find').addEventListener('click',function() {
        manager.toggleSearchField();
      });
    }

    var wire_renderer_sequence_change = function(renderer) {
      var dragger = new GOMap.Diagram.Dragger();
      var seq_change_func = function() {
        var zoomFactor = 0.95 * renderer._container.parentNode.clientWidth / (2 * renderer.sequence.length);
        renderer.zoom = zoomFactor;
        dragger.applyToElement(renderer._canvas);
        dragger.addTouchZoomControls(renderer, renderer._canvas);
        GOMap.Diagram.addScrollZoomControls(renderer, renderer._canvas,0.1);
        GOMap.Diagram.addScrollBar(renderer, renderer._canvas,document.getElementById('scroll_box'));

        renderer.getVisibleLength = function() {
          return this.rightVisibleResidue() - this.leftVisibleResidue();
        };
        renderer.getTotalLength = function() {
          return this.sequence.length;
        };
        renderer.getLeftPosition = function() {
          return this.leftVisibleResidue();
        };
        renderer.setLeftPosition = function(pos) {
          return this.setLeftVisibleResidue(pos);
        };


        renderer.navigation.hide();
        ["purple","pink","blue","green","yellow","orange","red","gray","#4285F4"].forEach(function(col) {
          renderer.add3dGradient(col);
        });
      };

      jQuery(renderer).bind('sequenceChange', seq_change_func);
      bean.add(renderer,'draggingtoggle',function(enabled) {
        dragger.enabled = enabled;
      });
    };

    var wire_dragging_disable = function(renderer,manager) {
      var toggler = document.getElementById('selecttoggle');
      manager.selecting = false;
      bean.add(document.body,'keydown',function(evt) {
        if (evt.keyCode == 16) {
          manager.selecting = true;
          toggler.firstChild.removeAttribute('value');
          var curr_classname = toggler.className.replace('selecting','');
          toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
          bean.fire(renderer,'draggingtoggle',[ ! manager.selecting ]);
        }
      });
      bean.add(document.body,'keyup',function(evt) {
        if (evt.keyCode == 16 && manager.selecting) {
          manager.selecting = false;
          var curr_classname = toggler.className.replace('selecting','');
          toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
          bean.fire(renderer,'draggingtoggle',[ ! manager.selecting ]);
        }
      });

      bean.add(toggler,'click',function(evt) {
        if (evt.target != toggler) {
          return;
        }
        manager.selecting = ! manager.selecting;
        if (manager.selecting) {
          toggler.firstChild.removeAttribute('value');
        }
        var curr_classname = toggler.className.replace('selecting','');
        toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
        bean.fire(renderer,'draggingtoggle',[ ! manager.selecting ]);
      });
      var is_toggle_action = false;

      bean.add(toggler,'touchstart',function(evt) {
        if (evt.target != toggler) {
          return;
        }
        toggler.firstChild.blur();
        toggler.firstChild.removeAttribute('value');
        manager.selecting = ! manager.selecting;
        bean.fire(renderer,'draggingtoggle',[! manager.selecting]);
        is_toggle_action = true;
        var curr_classname = toggler.className.replace('selecting','');
        toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
        setTimeout(function() {
          is_toggle_action = false;
        },500);
        evt.preventDefault();
      });
      bean.add(toggler,'touchend',function(evt) {
        if (evt.target != toggler) {
          return;
        }
        if ( ! is_toggle_action ) {
          manager.selecting = ! manager.selecting;
          var curr_classname = toggler.className.replace('selecting','');
          toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
          bean.fire(renderer,'draggingtoggle',[! manager.selecting]);
        } else {
          if ( ! toggler.firstChild.getAttribute('value') ) {
            manager.selecting = false;
            var curr_classname = toggler.className.replace('selecting','');
            toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
          }
        }
        evt.preventDefault();
      });

    };

    var wire_renderer_zoom = function(renderer) {
      var start = null;
      var timeout = null;

      var message = 'Did you know you can zoom the sequence using the wheel on your mouse?';
      if ('ontouchstart' in window) {
        message = "Did you know you can pinch to zoom the sequence?";
      }

      jQuery('#zoomin').click(function() {
        var start_zoom = renderer.zoom;
        var curr_zoom = start_zoom;
        if (start === null) {
          start = (new Date()).getTime();
        }
        if (((new Date()).getTime() - start) > 1000*1.75) {
          document.getElementById('zoomlabel').setAttribute('data-hint',message);
        }

        var count = 0;
        while (start_zoom === renderer.zoom && count < 5) {
            curr_zoom += 0.125;
            if (renderer.grow_container) {
              renderer.zoomCenter = 'center';
            }
            renderer.zoom = curr_zoom;
            renderer.zoomCenter = null;
            count++;
        }
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        timeout = setTimeout(function() {
          start = null;
          document.getElementById('zoomlabel').removeAttribute('data-hint');
        },3000);
      });

      jQuery('#zoomout').click(function(e) {
        var start_zoom = renderer.zoom;
        var curr_zoom = start_zoom;
        if (start === null) {
          start = (new Date()).getTime();
        }
        if (((new Date()).getTime() - start) > 1000*1.75) {
          document.getElementById('zoomlabel').setAttribute('data-hint',message);
        }

        var count = 0;
        while (start_zoom === renderer.zoom && count < 5) {
            curr_zoom -= 0.125;
            if (renderer.grow_container) {
              renderer.zoomCenter = 'center';
            }
            renderer.zoom = curr_zoom;
            renderer.zoomCenter = null;
            count++;
        }
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        timeout = setTimeout(function() {
          start = null;
          document.getElementById('zoomlabel').removeAttribute('data-hint');
        },3000);
      });
    };

    var add_keyboard_navigation = function() {
      if (window.keyboard_enabled) {
        return;
      }
      window.keyboard_enabled = true;
      window.addEventListener('keypress',function(e) {
        var to_select;
        if (e.keyCode == 110) {
          to_select = window.document.getElementsByClassName('selected')[0].nextSibling;
        }
        if (e.keyCode == 112) {
          to_select = window.document.getElementsByClassName('selected')[0].previousSibling;
        }
        if (to_select) {
          to_select.click();
          to_select.scrollIntoView(true);
        }
        if (e.keyCode == 114) {
          document.getElementById('reset').click();
        }
      },false);
    };


    var setup_renderer = function(renderer) {
        renderer.zoom = 0.81;
        renderer.padding = 10;
        renderer.trackOrder = [];
        renderer.reset();
        renderer.trackGap = 16;
        renderer.trackHeight = 12;
        renderer.fixedFontScale = 0.3;
        renderer.refresh();
    };

    var scale_text_elements = function(renderer) {
        renderer.text_els = [];
        jQuery(renderer).bind('zoomChange',function() {
          if (renderer.printing) {
            return;
          }
          var text_els = renderer.text_els;
          text_els.forEach(function(els) {
            var a_text = els[0];
            var all_box = els[1];
            if ( ! a_text.orig_text ) {
              a_text.orig_text = a_text.textContent;
            }
            a_text.firstChild.textContent = a_text.orig_text;
            var fit = false;
            while ( ! fit ) {
              var text = a_text.textContent;
              if (text.length < 1) {
                fit = true;
                break;
              }
              if ( ! a_text.parentNode || ! all_box.parentNode ) {
                break;
              }
              if (a_text.getBBox().width < all_box.getBBox().width) {
                fit = true;
                continue;
              }
              var char_length = parseInt(text.length * 0.75 * (all_box.getBBox().width / a_text.getBBox().width));
              a_text.firstChild.textContent = text.substr(0,char_length);
            }
          });
        });      
    };

    var update_protein_list = function(prots,renderer,auth_func) {
        var list = document.getElementById("protein_list");
        while (list.childNodes.length > 0) {
          list.removeChild(list.firstChild);
        }
        if (typeof(prots) == "string") {
          var input = document.createElement('button');
          window.notify.alert("Cannot load, please log in to Google Drive again");
          input.textContent = "Click to log in again";
          input.addEventListener('click',function() {
            auth_func(function(err) {
            if (err) {
              return;
            }
            get_proteins(prots,function(list) {
              if (typeof(list) !== "string") {
                input.parentNode.removeChild(input);
                update_protein_list(list,renderer);
              } else {
                console.log("mo problems");
                console.log(list);
              }
            });

            });
          },false);
          list.appendChild(input);
          return;
        }
        var list = document.getElementById("protein_list");
        while (list.childNodes.length > 0) {
          list.removeChild(list.firstChild);
        }
        var curr_acc = history ? (history.state || {})['uniprot_id'] : localStorage.getItem('selected');
        curr_acc = curr_acc ? curr_acc.toLowerCase() : null;
        var selected = null;
        prots.forEach(function(prot) {
          var a_div = document.createElement('div');
          a_div.uprot = prot.id;
          a_div.textContent = ((prot.name || prot.id)+"");
          list.appendChild(a_div);
          a_div.setAttribute('id','prot_'+prot.id.toLowerCase());
          a_div.setAttribute('class','hint--left hint--inline ');
          a_div.addEventListener('click',function(ev) {
            if (selected) {
              selected.classList.remove('selected');
            }
            this.classList.add('selected');
            selected = this;
            if (! history) {
              localStorage.setItem('selected',this.uprot);
            }
            show_protein(this.uprot,renderer,function() {
              setTimeout(function() {
                a_div.removeAttribute('data-hint');
              },500);
            },true);
            a_div.setAttribute('data-hint',"Loading..");
          },false);
          if (curr_acc == prot.id.toLowerCase()) {
            a_div.classList.add('selected');
            selected = a_div;
            show_protein(prot.id,renderer,function() {},false);
          }

        });
        if (window.document.getElementsByClassName('selected').length > 0) { 
          window.document.getElementsByClassName('selected')[0].scrollIntoView(true);
        }
    };

    var show_help = function() {
      document.getElementById('information').scrollIntoView();
      return;
    }

    var do_printing = function(proteins) {
        var win = window.open();
        var a_doc = win.document;
        a_doc.open();
        a_doc.close();
        var link = a_doc.createElement('link');
        link.setAttribute('rel','stylesheet');
        link.setAttribute('href','/css/style.css');
        link.setAttribute('type','text/css');
        a_doc.head.appendChild(link);
        var counter = 0;
        var objs = [];
        var mf = null;
        var in_print = false;
        var print_func = function(matcher) {
          if (matcher) {
            in_print = ! matcher.matches;
          }

          for (var i = 0; i < objs.length; i++) {
            mf.call(objs[i],matcher);
          }
        };
        var count = 1;
        var print_single = function (prot,cback) {
          var whole_div = a_doc.createElement('div');
          var clazz = 'print_group';
          if (((count % 3) == 0) && count > 0 ) {
            clazz = 'print_group print_group_3';
          }
          if ((((count+1) % 3) == 0) && count > 0) {
            clazz = 'print_group print_group_1';
          }
          whole_div.setAttribute('class',clazz);
          count++;
          var seperator = a_doc.createElement('div');
          seperator.setAttribute('class','print_seperator');
          whole_div.appendChild(seperator);
          var description = a_doc.createElement('div');
          description.setAttribute('class','print_description');
          seperator.appendChild(description);
          var accession_text = a_doc.createElement('div');
          accession_text.setAttribute('class','print_accession');
          accession_text.textContent = prot.toUpperCase();
          seperator.appendChild(accession_text);
          var sequence_container = a_doc.createElement('div');
          whole_div.appendChild(sequence_container);
          sequence_container.setAttribute('class','print_sequence');
          a_doc.body.appendChild(whole_div);
          console.log("Made a new div for "+prot);
          var rend = create_renderer(sequence_container);
          objs.push(rend);
          if (mf !== null) {
            rend._media_func = true;
          }
          rend.padding = 30;
          rend.text_els = [];
          rend.acc = prot;
          (function(my_rend) {
            jQuery(my_rend).bind('sequenceChange', function() {
              if ( ! mf && window.matchMedia) {
                mf = my_rend._media_func;
                (my_rend.win() || window).matchMedia('print').addListener(print_func);
                my_rend._media_func = function() {};
              }
              rend.navigation.hide();
              rend.navigation.show = function(){};
              retrieve_data(prot,my_rend,function() {
                my_rend.trackOrder = [prot];
                setTimeout(function() {
                  my_rend.printing = true;
                  my_rend.text_els.forEach(function(el) {
                    el[0].setAttribute('stroke-width','0');
                    el[0].setAttribute('fill','#ffffff');
                  });
                },1000);
                console.log("Done for "+prot);
                cback(my_rend);
              });
            });
          })(rend);
          rend.trackGap = -8;
          rend.trackHeight = 12;
          rend.fixedFontScale = 0.3;
          var a_reader = new MASCP.UniprotReader();

          MASCP.Service.CacheService(a_reader);

          var accession = prot;
          a_reader.retrieve(accession,function(e) {
            description.textContent = this.result.getDescription().replace(/_HUMAN.*GN=/,'/').replace(/\s.+/,'');
            rend.setSequence(this.result.getSequence());
          });
        };
        (function(renderer) {
          var acc = proteins.shift();
          var self_func = arguments.callee;
          if (acc) {
            counter += 1;
            if (counter < 10) {
              setTimeout(function() {
                print_single(acc.id.toLowerCase(),self_func);
              },0);
            }
          }
        })();
    };

    var create_renderer = function(container) {

        var renderer = new MASCP.CondensedSequenceRenderer(container);
        renderer.font_order = 'Helvetica, Arial, sans-serif';
        setup_renderer(renderer);

        scale_text_elements(renderer);
        MASCP.GOOGLE_CLIENT_ID="936144404055.apps.googleusercontent.com";
        domain_retriever = new MASCP.DomainRenderer(renderer,function(editing,acc) {
          get_orthologs = _get_orthologs;
          get_orthologs(acc,renderer);
          show_protein(acc,renderer);
          if (editing && renderer.navigation) {
            renderer.navigation.show();
          }
        });
        return renderer;
    };

    var setup_visual_renderer = function(renderer) {
      wire_renderer(renderer);
    };

    var domain_retriever;


    var retrieve_data = function(acc,renderer,end_func) {
        acc = (acc || "").toUpperCase();
        var count = 0;
        var refresher = function() {
          count++;
          if (count == 3) {
            if (renderer.trackOrder.indexOf(acc) < 0) {
              renderer.trackOrder.push(acc);
            }
            renderer.showLayer(acc);
            renderer.refresh();

            if (end_func) {
              end_func.call();
            }
          }
        };
        domain_retriever.renderDomains(acc,function(){
          if (! /comparison\//.exec(window.location)) {
            get_sites(acc,renderer,refresher);
            get_peptides(acc,renderer,refresher);
            get_predictions(acc,renderer,refresher);
            get_usersets(acc,renderer);
            if (renderer.showAnnotation) {
              renderer.showAnnotation(acc);
            }
          } else {
            MASCP.registerLayer(track_name,{"fullname" : "Net-O-Glyc 4.0"});
            if (renderer.trackOrder.indexOf(track_name) < 0 ) {
              renderer.trackOrder.push(track_name);
            }
            renderer.showLayer(track_name);
            get_predictions(acc,renderer,refresher);
            get_predictions_31(acc,renderer,function() {
              count += 1;
              refresher();
            });
            renderer.navigation.show();
          }

        });
    };

    var set_description = function(description) {
      document.getElementById("description").textContent = description;
    };

    var show_protein = function(acc,renderer,success,force) {
      if ( ! acc ) {
        return;
      }
      if (document.getElementById('drive_install').classList.contains('drive_preferences') && ! MASCP["GOOGLE_AUTH_TOKEN"] ) {
        document.getElementById('drive_install').classList.remove('drive_preferences');
        wire_drive_button(renderer);
      }
      var ucacc = acc.toString().toUpperCase();
      if (! force && document.getElementById('uniprot_id').textContent == ucacc) {
        return;
      }
      if (window.ga) {
        setTimeout(function() {
          window.ga('send','pageview','/uniprot/'+ucacc);
        },0);
      }
      if (history && history.pushState && (force || ( (history.state || {})['uniprot_id'] !== ucacc && ((history.state || {})['uniprot_ids'] || "").indexOf(ucacc) < 0)) ) {
        history.pushState({"uniprot_id" : ucacc},ucacc,"/uniprot/"+ucacc);
        if ( ! document.getElementById('prot_'+(ucacc.toLowerCase())) ) {
          window.showFullProteinList();
        }
      }

      end_clustal();
      end_clustal = function() {};
      window.showing_clustal = false;

      setup_renderer(renderer);
      get_orthologs(ucacc,renderer);


      var a_reader = new MASCP.UniprotReader();

      MASCP.Service.CacheService(a_reader);
      jQuery(renderer).bind('sequenceChange',function() {
        jQuery(renderer).unbind('sequenceChange',arguments.callee);
        console.log("Retrieving data");
        retrieve_data(ucacc,renderer);
      });

      a_reader.retrieve(ucacc,function(err) {

        if ( err ) {

          if (err.status && err.status >= 500 ) {
            if (window.ga) {
              setTimeout(function() {
                window.ga('send','event','protein','timeout',acc);
              },0);
            }

            window.notify.warn("Could not reach UniProt server, please try again shortly").hideLater(5000);
            return;
          }
          if (err.status && err.status >= 400) {
            if (window.ga) {
              setTimeout(function() {
                window.ga('send','event','protein','missing',acc);
              },0);
            }
            if (err.status == 404) {
              window.notify.warn("Invalid UniProt identifier");
            } else {
              window.notify.alert("Problem contacting the UniProt servers");
            }
            return;
          }

          window.notify.warn("Could not retrieve sequence from UniProt");
          return;
        }

        // renderer.acc = acc;
        document.getElementById('uniprot_id').textContent = ucacc;
        renderer.setSequence(this.result.getSequence());
        set_description(this.result.getDescription().replace(/_HUMAN.*GN=/,'/').replace(/\s.+/,''));
        renderer.grow_container = true;
        if (success) {
          success();
        }
      });

    };

    var wire_tag_edit = function(annotation_manager) {
      var flipped;
      bean.add(annotation_manager,'editclick',function() {
        if (flipped) {
          if (flipped.close) {
            flipped.close();
          }
          flipped = null;
          return;
        }
        flipped = true;
        annotation_manager.getTags(function(err,tags) {
          if (err) {
            return;
          }
          if (flipped != true) {
            return;
          }
          annotation_manager.renderer.fillTemplate("tags_tmpl",{ "tags" : tags },function(error,html) {
            flipped = flippant.flip(document.getElementById('sequence_frame'), html);
            var matches = flipped.querySelectorAll('ul .remove');
            for (var i = 0 ; i < matches.length; i++) {
              matches[i].addEventListener('click',function() {
                var self = this;
                var wanted_tag = self.parentNode.getAttribute('data-tag');
                annotation_manager.removeTag(wanted_tag);
                self.parentNode.parentNode.removeChild(self.parentNode);
              },false);
            }
            matches = flipped.querySelectorAll('ul *[contentEditable]');
            for (var i = 0 ; i < matches.length; i++) {
              matches[i].addEventListener('input',function() {
                var self = this;
                var wanted_tag = self.parentNode.getAttribute('data-tag');
                if (self.timeout) {
                  clearTimeout(self.timeout);
                }
                self.timeout = setTimeout(function() {
                  var new_name = annotation_manager.renameTag(wanted_tag,self.textContent);
                  var range = document.createRange();
                  var sel = window.getSelection();
                  var last_offset = sel.focusOffset;
                  self.textContent = new_name;
                  sel.removeAllRanges();
                  range.setStart(self.childNodes[0], last_offset);
                  range.collapse(true);
                  sel.addRange(range);
                  self.timeout = null;
                },300);
              },false);
            }
            var new_tag = flipped.querySelector('button.new');
            new_tag.addEventListener('click',function() {
              annotation_manager.createTag("New tag");
              bean.fire(annotation_manager,'editclick');
              bean.fire(annotation_manager,'editclick');
            });
            var close = flipped.querySelector('button.close');
            close.addEventListener('click',function() {
              bean.fire(annotation_manager,'editclick');
            });
          });
        });
      });
    };

    var wire_drive_button = function(renderer) {
      drive_install(function(err,auth_func) {
        var self_func = arguments.callee;

        if (auth_func) {
          document.getElementById('drive_install').addEventListener('click',function() {
            var this_ev = arguments.callee;
            if (window.ga) {
              setTimeout(function() {
                window.ga('send','event','drive_install','click');
              },0);
            }
            auth_func(function(err) {
              if (err) {
                return;
              } else {
                document.getElementById('drive_install').removeEventListener('click',this_ev);
                if (document.getElementById('uniprot_id').textContent) {
                  self_func();
                  show_protein(document.getElementById('uniprot_id').textContent,renderer,function() { window.notify.info("Successfully connected to Google Drive ").hideLater(2000); },true);
                } else {
                  self_func();
                }
              }
            });
          },false);
        } else if (err) {
          if (err.cause == "Failed to return from auth") {
            document.getElementById('drive_install').style.display = 'none';
            window.notify.info("Could not establish connection to Google, trying again later").hideLater(1000);
            setTimeout(function() {
              document.getElementById('drive_install').style.display = 'block';
              wire_drive_button(renderer);
            },1000);
            return;
          }
          document.getElementById('drive_install').style.display = 'none';
          return;
        } else {
          document.getElementById('drive_install').removeEventListener('click',arguments.callee);
          var flipped;
          document.getElementById('drive_install').classList.add("drive_preferences");
          document.getElementById('drive_install').setAttribute('data-hint','Data set preferences');
          document.getElementById('drive_install').addEventListener('click',function() {
            if (flipped) {
              if (flipped.close) {
                flipped.close();
              }
              flipped = null;
              return;
            }
            flipped = true;
            get_preferences().listWatchedDocuments(function(err,sets) {
              if (err) {
                return;
              }
              if (flipped != true) {
                return;
              }
              var sets_array = [];
              for (var set in sets) {
                sets_array.push( { "name" : sets[set].title || sets[set].name || set, "id" : set } );
              }
              renderer.fillTemplate("userset_tmpl",{ "sets" : sets_array },function(error,html) {
                flipped = flippant.flip(document.getElementById('sequence_frame'), html);
                var matches = flipped.querySelectorAll('ul .remove');
                for (var i = 0 ; i < matches.length; i++) {
                  matches[i].addEventListener('click',function() {
                    var self = this;
                    var par_doc = self.parentNode.getAttribute('data-docid');
                    get_preferences().removeWatchedDocument(par_doc,function(err) {
                      if ( ! err ) {
                        self.parentNode.parentNode.removeChild(self.parentNode);
                      }
                    });
                  },false);
                }
              });
            });
          },false);
          // document.getElementById('drive_install').style.display = 'none';
        }

      });
    };

    var wire_uniprot_id_changer = function(renderer,handle_proteins) {
      var uniprot = document.getElementById('uniprot_id');
      uniprot.addEventListener('input',function() {
        var all_ids = [];
        var uprot_re1 = /([A-N]|[R-Z])[0-9][A-Z]([A-Z]|[0-9])([A-Z]|[0-9])[0-9]/;
        var uprot_re2 = /[OPQ][0-9]([A-Z]|[0-9])([A-Z]|[0-9])([A-Z]|[0-9])[0-9]/;

        (uniprot.textContent || "").split(/\n/).forEach(function(id) {
          id = id.replace(/\s+/g,'');
          if (id.toUpperCase().match(uprot_re1) || id.toUpperCase().match(uprot_re2)) {
            var prot = { "id" : id, "name" : id };
            prot.toString = function() { return this.id; };
            all_ids.push(prot);
          }
        });
        if (all_ids.length > 1) {
          handle_proteins(all_ids);
        }
        var text_content = (all_ids[0] || "").toString().replace(/\s+/g,'');
        if (text_content.toUpperCase().match(uprot_re1) || text_content.toUpperCase().match(uprot_re2)) {
          var selected;
          selected = document.getElementById('prot_'+text_content.toLowerCase());
          if (selected) {
            bean.fire(selected,'click');
            selected.scrollIntoView(true);
          } else {
            selected = (document.getElementsByClassName('selected') || [])[0];
            if (selected) {
              var clazz = selected.getAttribute('class') || '';
              selected.setAttribute('class',clazz.replace(/selected\s/,''));
            }
            console.log("Going into show_protein");
            show_protein(text_content,renderer,null,true);
          }
        }
      },false);
    };
    var wire_clipboarder = function() {
      document.getElementById('clipboarder').addEventListener('click',function() {
        var other_win = window.open('');
        var bits  = this.sequence.split('');
        var parent = other_win.document.createElement('pre');
        parent.style.width = '300px';
        if ( ! other_win.document.body ) {
          other_win.document.appendChild(other_win.document.createElement('body'));
        }
        other_win.document.body.appendChild(parent);
        var i = 0;
        bits.forEach(function(aa) {
          if ( i > 0 && (i % 10) == 0) {
            parent.appendChild(other_win.document.createTextNode(' '));
            if ( (i % 50) == 0) {
              parent.appendChild(other_win.document.createElement('br'));
            }
          }
          if (aa.match(/[ST]/)) {
            var bold = other_win.document.createElement('b');
            bold.appendChild(other_win.document.createTextNode(aa));
            parent.appendChild(bold);
          } else {
            parent.appendChild(other_win.document.createTextNode(aa.toUpperCase()));
          }
          i++;
        });
      },false);
    }

    var drive_install = function(callback) {
      var greader = new MASCP.GoogledataReader();
      MASCP.GOOGLE_CLIENT_ID="936144404055.apps.googleusercontent.com";
      var datareader = greader.getDocument(null,null,function(err) {
        if (err && err.cause && err.cause == "No user event") {
          callback.call(null,null,err.authorize);
        } else if (err && err.cause && err.cause == "No google auth library") {
          window.init = function() {
            drive_install(callback);
          };
          setTimeout(function() {
            if (gapi) {
              drive_install(callback);
            }
          },0);
          callback.call(null,err);
        } else if (err && err.cause && err.cause == "Browser not supported" ) {
          window.notify.info("Browser support for Google Drive not detected").hideLater(1000);
          callback.call(null,err);
        } else {
          callback.call(null,err);
        }
      });
    };

    var get_proteins = function(protein_doc,callback) {
        var self = window;
        if ( ! self.protein_cache ) {
          self.protein_cache = {};
        } else if (self.protein_cache[protein_doc]) {
          callback( [].concat(self.protein_cache[protein_doc]) );
          return;
        }
        var doc_id = "spreadsheet:"+protein_doc;
        var greader = new MASCP.GoogledataReader();
        MASCP.GOOGLE_CLIENT_ID="936144404055.apps.googleusercontent.com";
        var notification = window.notify.info("Loading protein list");
        var datareader = greader.createReader(doc_id,function(datas) {
          var dataset = {};
          var results = [];
          datas.data.forEach(function(row) {
            if (row[0].match(/uniprot/i)) {
              return;
            }
            var prot = {};
            prot.id = row[0].toLowerCase();
            prot.name = row[1];
            prot.toString = function() {
              return this.id;
            };
            results.push(prot);
          });
          self.protein_cache[protein_doc] = [].concat(results);
          callback(results);
        });
        datareader.bind('ready',function() {
          notification.hide();
        });
        datareader.bind('error',function(e,err) {
          notification.hide();
          var err_obj = err || e;
          if (err_obj.cause && (err_obj.cause == "No user event" || err_obj.cause == "Access is denied.")) {
            callback.call(null,protein_doc,err_obj.authorize);
            return;
          }
          window.notify.alert("Could not retrieve desired protein list, please try again");
          console.log("Error");
          console.log(err);
        });

    };

    var get_sites = function(acc,renderer,done) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "spreadsheet:0Ai48KKDu9leCdC1ESDlXVzlkVEZfTkVHS01POFJ1a0E";
      datareader.setupSequenceRenderer = render_sites(acc,true);
      datareader.registerSequenceRenderer(renderer);

      if (renderer.trackOrder.indexOf(renderer.acc ? "all_domains" : acc) < 0) {
        renderer.trackOrder.unshift(renderer.acc ? "all_domains" : acc);
      }
      datareader.retrieve(acc,function(err) {
        if (this.result) {
          window.notify.info("Retrieved GalNAc site data").hideLater(1000);
          if (this.result._raw_data.data.sites.length < 1 ) {
            window.notify.info("No sites for "+acc);
          }
        } else {
            window.notify.info("No GalNAc SimpleCell sites found for "+acc.toUpperCase()).hideLater(2000);
        }
        if (err) {
          if (err !== "No data") {
            window.notify.warn("Could not retrieve GalNAc site data");
          }
        }
        console.log("Got sites okay");
        if (done) {
          done();
        }
      });
    };

    var get_generic_data = function(acc,renderer,datareader,options,done) {
      datareader._endpointURL = '/data/latest/gator';
      var track = acc;
      if (! options.inline) {
        if ( ! MASCP.getGroup('extra_data')) {
          MASCP.registerGroup('extra_data', { 'fullname' : 'Extra data'});
          jQuery(MASCP.getGroup('extra_data')).bind('visibilityChange',function(ev,rend,visible) {
            if (rend.navigation.getController(this)) {
              window.extra_shown = visible;
            }
          });
        }
        MASCP.registerLayer('extra_data_controller',{ 'fullname' : 'Extra data'});
        renderer.createGroupController('extra_data_controller','extra_data');
        renderer.showLayer('extra_data_controller');
        if (renderer.trackOrder.indexOf('extra_data_controller') < 0) {
          renderer.trackOrder.push('extra_data_controller');
        }
        MASCP.registerLayer(datareader.toString(),{"fullname" : options.name || datareader.toString(), "group" : "extra_data"});
        track = datareader.toString();
        if (renderer.trackOrder.indexOf(datareader.toString()) < 0) {
          renderer.trackOrder.push(datareader.toString());
        }
      } else {
        if (renderer.trackOrder.indexOf(track) < 0) {
          renderer.trackOrder.unshift(track);
          renderer.showLayer(track);
        }
      }
      options.track = track;
      datareader.registerSequenceRenderer(renderer,options);

      renderer.bind('resultsRendered',function(e,reader) {
        if (reader == datareader) {
          renderer.refresh();
          renderer.unbind('resultsRendered',arguments.callee);
        }
      });
      datareader.retrieve(acc,function(err) {
        if (this.result) {
          window.notify.info("Retrieved data for "+(options.name || datareader.toString()) ).hideLater(1000);
          if (! this.result._raw_data.data || this.result._raw_data.data.length < 1 ) {
            window.notify.info("No data for "+(options.name || datareader.toString())+" accession " +acc).hideLater(1000);
          }
        } else {
            window.notify.info("No data found for "+(options.name || datareader.toString())+" "+acc.toUpperCase()).hideLater(2000);
        }
        if (err) {
          if (err !== "No data") {
            window.notify.warn("Could not retrieve data for "+(options.name || datareader.toString()));
          }
        }
        if (done) {
          done();
        }
      });
    };


    var get_usersets = function(acc,renderer) {

      // Don't trigger any popups
      if ( ! window.event ) {
        window.event = { "which" : null };
      }

      var allowed = { "PrideRunner" : 1, "HydropathyRunner" : 1, "UniprotSecondaryStructureReader" : 1 };

      get_preferences().getPreferences(function(err,prefs) {
        if ( ! err ) {
          for (var set in prefs.user_datasets) {
            if (allowed[set]) {
              var reader_class = MASCP[set];
              var reader = new reader_class();
              get_generic_data(acc,renderer,reader,JSON.parse(JSON.stringify(prefs.user_datasets[set])),function() {
                if (typeof (window.extra_shown) !== 'undefined' && window.extra_shown) {
                  renderer.showGroup('extra_data');
                }
                renderer.refresh();
              });
            }
          }
        }
      });


      get_preferences().readWatchedDocuments(function(err,pref,reader) {
        if (err) {
          // Errs if : No user event / getting preferences
          // actual reader error

          if (err.status === "preferences") {
            window.notify.alert("Problem getting user preferences");
            return;
          }
          if (err) {
            window.notify.alert("Problem reading user data set");
          }
          console.log("Getting prefs");
          console.log(err);
        }
        var method = pref["sites"] || pref.render_options["sites"];
        var track_name = (pref.render_options || {})["track"] ? pref.render_options["track"] : (renderer.acc ? "all_domains" : acc);
        reader.retrieve(acc,function() {
          if ( ! this.result ) {
            return;
          }
          if ( renderer.trackOrder.indexOf(track_name) < 0 ) {
            MASCP.registerLayer(track_name, { "fullname" : track_name }, [renderer]);
            renderer.trackOrder.push(track_name);
            renderer.showLayer(track_name);
          }
          var datas = this.result._raw_data.data;
          if (pref.render_options["renderer"]) {
            (new MASCP.GoogledataReader()).getDocument(pref.render_options["renderer"],null,function(err,doc) {
              var valid_md5 = false;
              if (window.md5(doc) === pref.render_options["renderer_md5"] ) {
                console.log("Matching MD5");
                valid_md5 = true;
              } else {
                valid_md5 = false;
                console.log("Bad MD5");
              }
              var render_func;

              if (pref.render_options['sandbox']) {
                var sandbox = new JSandbox();
                sandbox.exec(doc,function() {
                  this.eval({ "data" : "renderData(input.sequence,input.data,input.acc)",
                              "input" : { "sequence" : renderer.sequence, "data" : datas, "acc" : acc  },
                              "callback" : function(r) {
                                var obj = ({ "gotResult" : function() {
                                  renderer.renderObjects(track_name,r);
                                  renderer.trigger('resultsRendered',[this]);
                                  renderer.refresh();
                                }, "agi" : acc });
                                jQuery(renderer).trigger('readerRegistered',[obj]);
                                obj.gotResult();
                              }
                            });
                });
              } else if (valid_md5) {
                render_func = new Function("renderer","datas","track","acc",doc);
                var obj = ({ "gotResult" : function() {
                  render_func(renderer,datas,track_name,acc);
                  renderer.trigger('resultsRendered',[this]);
                  renderer.refresh();
                }, "agi" : acc });
                jQuery(renderer).trigger('readerRegistered',[obj]);
                obj.gotResult();
              }
            });
            return;
          }
          var obj = { "gotResult" : function() {
            var offset = (pref.render_options || {})["offset"];
            if ((typeof offset) === 'undefined') {
              offset = 30;
            }
            (datas.sites || []).forEach(function(site) {
              renderer.getAA(parseInt(site)).addToLayer(track_name,{"content" : renderer[method] ? renderer[method].call(renderer) : method , "offset" : offset , "height" : 8,  "bare_element" : true });
            });
            (datas.peptides || []).forEach(function(peptide) {
              var box = renderer.getAminoAcidsByPeptide(peptide)[0].addBoxOverlay(track_name,peptide.length,1,{ "offset" : offset, "height_scale" : 0.1, "fill" : "#999", "merge" : false  });
              box.parentNode.insertBefore(box,box.parentNode.firstChild.nextSibling);
            });
            var offsets = {};
            for (var symbol in datas) {
              if (symbol == "peptides" || symbol == "sites") {
                continue;
              }
              var icons = (pref.render_options || {})["icons"];
              if ( ! icons ) {
                icons = {};
              }
              datas[symbol].forEach(function(site) {
                var offset = -4.1;
                var size = 12;
                if (offsets[site]) {
                  offset = offsets[site];
                }
                offsets[site] = offset + 4;

                if (symbol == "HEART") {
                  icons[symbol] = "/icons.svg?"+(new Date()).getTime()+"#heart";
                  size = 24;
                }
                if (symbol == "KIDNEY") {
                  icons[symbol] = "/icons.svg?"+(new Date()).getTime()+"#kidneys";
                  size = 24;
                }
                var el = renderer.getAA(parseInt(site)).addToLayer(track_name,
                  { "content" : icons[symbol] || symbol,
                     "fill": "none",
                     "text_fill" : "#f00", "border" : "none", "offset" : offset, "height" : size, "bare_element" : true
                  });
                var url = icons[symbol];
                var symbol_name = symbol;
                if (el[1].container && el[1].container.contentElement) {
                  setTimeout(function() {
                    var href = el[1].container.contentElement.getAttribute('href');
                    if ( ! href ) {
                      return;
                    }
                    href = href.replace(/\?\d+/,'');
                    el[1].container.contentElement.setAttribute('href',href);
                    if (symbol_name == "HEART") {
                      el[1].container.contentElement.setAttribute('class','symbol_beat');
                    }
                  },1000);
                }
              });
            }
            renderer.trigger('resultsRendered',[this]);
            renderer.refresh();
          }, "agi" : acc };
          jQuery(renderer).trigger('readerRegistered',[obj]);
          obj.gotResult();
        });
      });
    };

    var get_predictions = function(acc,renderer,done) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "predictions";
      var top_offset = 18;
      if  (/comparison\//.exec(window.location)) {
        top_offset = 0;
      }
      datareader.setupSequenceRenderer = render_sites(acc,true,top_offset);
      datareader.registerSequenceRenderer(renderer);

      renderer.bind('resultsRendered',function(e,reader) {
        if (reader !== datareader) {
          return;
        }
        if (renderer.trackOrder.indexOf(renderer.acc ? "all_domains" : acc) < 0) {
          renderer.trackOrder.push(renderer.acc ? "all_domains" : acc);
          renderer.showLayer(renderer.acc ? "all_domains" : acc);
        }
        jQuery(renderer).unbind('resultsRendered',arguments.callee);
        if (reader == datareader && done) {
          done();
          done = null;
        }
      });

      datareader.retrieve(acc,function(err) {

        if (this.result) {
          window.notify.info("Retrieved NetOGlyc4.0 prediction data").hideLater(1000);
          if (this.result._raw_data.data.sites.length < 1 || this.result._raw_data.data.sites[0] === null ) {
            window.notify.info(acc.toUpperCase()+" is not predicted to carry O-GalNAc modifications").hideLater(5000);
          }
        } else {
            window.notify.info("No NetOGlyc4.0 prediction data available for "+acc.toUpperCase()).hideLater(5000);
        }
        if (err) {
          if (err !== "No data") {
            window.notify.warn("Could not retrieve NetOGlyc4.0 site data");
          }
        }

        var a_seq = renderer.sequence.toLowerCase();
        if (this.result && this.result._raw_data) {
          this.result._raw_data.data.sites.forEach(function(site) {
            a_seq = a_seq.substr(0,site-1) + a_seq.substr(site-1,1).toUpperCase() +  a_seq.substr(site);
          });
        } else {
          if (done) {
            done();
          }
        }
        document.getElementById('clipboarder').sequence = a_seq;
      });
    };

    var get_predictions_31 = function(acc,renderer,done) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "predictions31";

      MASCP.registerLayer("netoglyc31",{ "fullname" : "Net-O-Glyc 3.1"});
      datareader.setupSequenceRenderer = render_sites("netoglyc31",false,-1);
      datareader.registerSequenceRenderer(renderer);
      renderer.bind('resultsRendered',function(e,reader) {
        if (reader !== datareader) {
          return;
        }
        if (renderer.trackOrder.indexOf("netoglyc31") < 0) {
          renderer.trackOrder.push("netoglyc31");
          renderer.showLayer("netoglyc31");
        }
        jQuery(renderer).unbind('resultsRendered',arguments.callee);
        if (reader == datareader && done) {
          done();
          done = null;
        }
      });
      datareader.retrieve(acc,function() {
        if (this.result && renderer.trackOrder.indexOf("netoglyc31") < 0) {
          renderer.trackOrder.push("netoglyc31");
        } else {
          if (done) {
            done();
          }
        }
      });
    };

    var get_peptides = function(acc,renderer,done) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "spreadsheet:0Ai48KKDu9leCdHVYektENmlwcVVqOHZHZzZBZVVBYWc";

      datareader.setupSequenceRenderer = render_peptides(acc);
      datareader.registerSequenceRenderer(renderer);

      datareader.retrieve(acc,function() {
        if (done) {
          done();
        }
      });
    };

    var get_orthologs = function() {
    };

    var _get_orthologs = function(acc,renderer) {
      if ( ! gapi || ! gapi.auth.getToken() ) {
        return;
      }
      if ( ! acc ) {
        return;
      }
      var orthos_parent =  document.getElementById('orthos');
      while (orthos_parent.firstChild) {
        orthos_parent.removeChild(orthos_parent.firstChild);
      }
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "homologene";
      datareader.retrieve(acc,function(err) {
        if ( ! err ) {
          var orthos = this.result._raw_data.data.orthologs;
          var ids=[10029,10090,10116];
          var labels={ 10029 : "CHO", 10090 : "Mouse", 10116 : "Rat "};
          ids.forEach(function(id) {
            var accession = orthos[id];
            if (accession) {
              var button = document.createElement('button');
              button.setAttribute('class','ortho_button ortho_'+id);
              button.textContent = labels[id];
              button.addEventListener('click',function() {
                window.location += '+'+accession.toUpperCase();
                // show_protein(accession,renderer);
              },false);
              orthos_parent.appendChild(button);
            }
          });
        }
      });
    };

    var get_passed_in_state = function() {
      return JSON.parse((function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.search);
        if(results == null)
          return "{}";
        else
          return decodeURIComponent(results[1].replace(/\+/g, " "));
      })("state") || "{}");
    };

    var end_clustal = function() {};

    var do_clustal = function(seqs,renderer,readyfunc) {
        MASCP.ClustalRunner.SERVICE_URL = '/tools/clustalw/';
        var runner = new MASCP.ClustalRunner();
        runner.sequences = seqs;
        if (renderer) {
          renderer.grow_container = true;
          runner.registerSequenceRenderer(renderer);
          runner.bind('resultReceived',function() {
            var self = this;
            console.log("Got result from clustal");
            end_clustal = function() {
              self.result = null;
            };
          });
        }
        runner.retrieve("dummy",readyfunc);
    };

    var prepare_alignment = function(prots,renderer) {
      var sequences = [];
      var ready = false;
      (function() {
        var acc = prots.shift();
        var caller = arguments.callee;
        var a_reader = new MASCP.UniprotReader();
        MASCP.Service.CacheService(a_reader);
        a_reader.retrieve(acc.toString(),function(e) {
          var organism_name = this.result.getDescription().replace(/.*_/,'').replace(/\s.+/,'');
          if (organism_name == "HUMAN") {
            organism_name = "";
          }
          var bit = { 'sequence' : this.result.getSequence(), 'agi' : this.agi, 'name' : this.result.getDescription().replace(/.* GN=/,'').replace(/\s.+/,'')+" "+organism_name };
          bit.toString = function() { return this.sequence; };
          sequences.push(bit);
          if (prots.length <= 0) {
            renderer.acc = null;
            do_clustal(sequences,null,function() {
              document.getElementById('align').setAttribute('class','ready');
              ready = true;
            });
          } else {
            caller();
          }
        });
      })();
      return function() {
        if (ready && ! window.showing_clustal) {
          setup_renderer(renderer);
          renderer.sequence = "";
          do_clustal(sequences,renderer,function() {
            sequences.forEach(function(seq) {
              retrieve_data(seq.agi.toUpperCase(),renderer);
            });
            window.showing_clustal = true;
            set_description("ClustalW alignment");
            document.getElementById('uniprot_id').textContent = "";
            var orthos_parent =  document.getElementById('orthos');
            while (orthos_parent.firstChild) {
              orthos_parent.removeChild(orthos_parent.firstChild);
            }
          });
        }
      };
    };

    var has_ready = MASCP.ready;

    init = function() {
      if (MASCP.ready == true) {
        ready_func();
      } else {
        MASCP.ready = ready_func;
      }
    };

    var ready_func = function() {
      if ( typeof gapi === 'undefined' || ! gapi.auth ) {
        return;
      }
      window.svgns = 'http://www.w3.org/2000/svg';
      var renderer = create_renderer(document.getElementById('condensed_container'));
      setup_visual_renderer(renderer);

      document.getElementById('help').addEventListener('click',function() {
        show_help();
      },false);
      document.getElementById('top').addEventListener('click',function() {
        document.getElementById('page_canvas').scrollIntoView();
      },false);


      var handle_proteins = function(prots,auth_func) {
        if (prots.length < 25) {
          document.getElementById('drive_install').style.display = 'none';
          document.getElementById('align').style.display = 'block';
          document.getElementById('align').addEventListener('click',function() {
            var my_prots = [].concat(prots);
            this.removeEventListener('click',arguments.callee);
            callback_func = prepare_alignment(my_prots,renderer);
            document.getElementById('align').setAttribute('class','running');
            this.addEventListener('click',function() {
              callback_func();
            },false);
          },false);
        } else {
          if (document.getElementById('align').style.display == 'block') {
            document.getElementById('drive_install').style.display = 'block';
            document.getElementById('align').style.display = 'none';
          }
        }
        update_protein_list(prots,renderer,auth_func);
        document.getElementById('print').addEventListener('click',function() {
          do_printing(prots);
        },false);

        add_keyboard_navigation();
      };

      wire_drive_button(renderer);
      wire_uniprot_id_changer(renderer,handle_proteins);
      wire_clipboarder();
      wire_genesearch(renderer);
      wire_history(renderer);

      var state = get_passed_in_state();
      var protein_doc_id = "0Ai48KKDu9leCdFRCT1Bza2JZUVB6MU4xbHc1UVJaYnc";

      if (window.location.toString().match(/doi/)) {
        var match = /doi\/(.*)\//.exec(window.location);
        match.shift();
        var actual_handle_proteins = handle_proteins;
        get_preferences().useStaticPreferences(match[0],function(prots) { actual_handle_proteins(prots); document.getElementById('drive_install').style.display = 'block'; document.getElementById('align').style.display = 'none';});
        handle_proteins =  function() {};
      }

      if (state.addservice) {
        get_preferences().addService(state.addservice, state.name);
      }

      if (state.action && state.action == 'create') {
        (new MASCP.GoogledataReader()).createPreferences(state.folderId,function(err,prefs,doc_id,title) {
          get_preferences().addRealtime(doc_id);
          get_preferences().setActiveSession(doc_id,title);
          wire_clearsession(get_preferences().getActiveSessionTitle(),renderer);
        });
      }

      if (state.ids) {
        state.ids.forEach(function(doc_id) {
          (new MASCP.GoogledataReader()).getMimetype(doc_id,function(err,type,title) {
            if ( ! err ) {
              if (type === 'application/json; data-type=msdata') {
                get_preferences().watchFile(doc_id);
              }
              if (type === 'application/json; data-type=domaintool-session') {
                get_preferences().addRealtime(doc_id);
                get_preferences().setActiveSession(doc_id,title);
                wire_clearsession(get_preferences().getActiveSessionTitle(),renderer);
              }
            }
          });
        });
      }

      if (get_preferences().getActiveSession()) {
        wire_clearsession(get_preferences().getActiveSessionTitle(),renderer);
      }

      if (state.exportIds && state.exportIds.length > 0) {
        protein_doc_id = state.exportIds[0];
        document.getElementById('drive_install').style.display = 'none';
      }

      window.showFullProteinList = function() {
        get_proteins(protein_doc_id,handle_proteins);
      };

      if (window.location.toString().match(/uniprot/)) {
        var results = /uniprot\/(.*)/.exec(window.location);
        if (results && results[1]) {
          var prots = [];
          results[1].split(/\+/).forEach(function(prot_name) {
            var prot = { "id" : prot_name, "name" : prot_name };
            prot.toString = function() { return this.id; };
            prots.push(prot);
          });

          if (history && history.replaceState) {
            if (prots.length == 1) {
              history.replaceState({"uniprot_id" : prots[0].id},prots[0].id,"/uniprot/"+prots[0].id);
            } else {
              history.replaceState({"uniprot_ids" : results[1] },prots.join(','),window.location);
            }
          }
          // show_protein(prots[0],renderer);
          handle_proteins(prots,renderer);
          if (prots.length > 1) {
            return;
          }
        }
      }

      get_proteins(protein_doc_id,handle_proteins);

      if (state.exportIds) {
        setInterval(function() {
          get_proteins(protein_doc_id,handle_proteins);
        },10*60*1000);
      }

    };
    if (has_ready) {
      ready_func();
    }
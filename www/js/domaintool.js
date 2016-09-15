    if (!(window.console && console.log)) { (function() { var noop = function() {}; var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn']; var length = methods.length; var console = window.console = {}; while (length--) { console[methods[length]] = noop; } }()); }

    var DomaintoolPreferences = function() {
      this.waiting = [];
    };

    DomaintoolPreferences.prototype.guessPreferenceSource = function(default_method) {
      var self = this;
      if ( ! default_method ) {
        default_method = function(done) {
          done();
        };
      }
      MASCP.GoogledataReader.isLoggedOut(function(err,loggedOut) {
        var skip_waiting = null;
        if (! loggedOut) {
          if (self.getActiveSession()) {
            // We don't want to do an auto upgrade when using
            // session files
            default_method(function() {
              skip_waiting = self.waiting;
              self.waiting = [];
              self.addRealtime(self.getActiveSession());
              self.ifReady(function() {
                skip_waiting.forEach(function(wait) {
                  self.waiting.push(wait);
                });
              });
            });
          } else {
            // Run the default method that sets the session so that
            // we know where the prefs come from
            default_method(function() {

              skip_waiting = self.waiting;
              self.waiting = [];

              // Get the contents of the preferences of this original
              // data
              self.getPreferences(function(err,orig_prefs) {
                if (err) {
                  console.log("Didn't get prefs");
                  default_method(function(){});
                  return;
                }

                self.prefs_object = null;

                // Switch to using the default preferences from the default
                // prefs file

                self.useDefaultPreferences(function(err,prots) {
                  if (err) {
                    console.log("Didn't get prefs");
                    default_method(function(){});
                    return;
                  }

                  self.ifReady(function() {
                    skip_waiting.forEach(function(wait) {
                      self.waiting.push(wait);
                    });
                  });

                  var temp_prefs_obj = self.prefs_object;
                  // Keep the prefs object handy so we know that we are
                  // upgrading on the right preferences file

                  self.getPreferences(function(err,new_prefs) {
                    if ( err || ! new_prefs ) {
                      self.prefs_object = null;
                      temp_prefs_obj = null;
                      console.log("Didn't get prefs");
                      default_method(function(){});
                      return;
                    }

                    if (self.prefs_object !== null && self.prefs_object !== temp_prefs_obj) {
                      return;
                    }

                    self.prefs_object = temp_prefs_obj;
                    if (self.waiting) {
                      self.waiting.forEach(function(waiting) {
                        self.prefs_object[waiting.method].apply(self.prefs_object,waiting.args);
                      });
                      self.waiting = [];
                    }

                    if (orig_prefs.version && new_prefs.version !== orig_prefs.version) {
                      if (DomaintoolPreferences.upgradePreferences) {
                        DomaintoolPreferences.upgradePreferences(new_prefs,orig_prefs);
                        self.sync(function() {
                          //Hopefully this worked.
                        });
                      }
                    }
                  });
                  self.prefs_object = null;
                });
              });
            });
          }
        } else {
          default_method(function() {});
        }
      });
    };

    DomaintoolPreferences.prototype.clearActiveSession = function(file,title) {
      localStorage.removeItem("active_session");
    };

    DomaintoolPreferences.prototype.setActiveSession = function(file,title) {
      if ( ! file ) {
        localStorage.removeItem("active_session");
      } else {
        localStorage.setItem("active_session",file);
        localStorage.setItem("active_session_title",title);
      }
    };

    DomaintoolPreferences.prototype.getActiveSession = function() {
      return localStorage.getItem("active_session");
    };

    DomaintoolPreferences.prototype.getActiveSessionTitle = function() {
      return localStorage.getItem("active_session_title");
    };

    DomaintoolPreferences.prototype.watchFile = function(doc,callback) {
      var preferences = this;
      if (sessionStorage.getItem("update_timestamps")) {
        var json = JSON.parse(sessionStorage.getItem("update_timestamps"));
        delete json[doc];
        sessionStorage.setItem("update_timestamps",JSON.stringify(json));
      }
      this.ifReady(function() {
        MASCP.Service.ClearCache('MASCP.UserdataReader.'+doc,null,function(err) {
          console.log("Cleared data");
          preferences.addWatchedDocument(doc,null,function(err,docname) {
            if (window.history && window.history.replaceState) {
              window.history.replaceState({},"Loading of "+docname);
              document.title = "Loading of "+docname;
            }
            if (err) {
              if (err.status === "preferences") {
                if (err.original_error.cause === "No user event") {
                  err.message = "You have been logged out, please click the drive button to authorize again";
                  callback.call(null,err);
                  return;
                }
                err.message = "Error setting preferences - try opening document again";
                callback.call(null,err);
                return;
              }
              err.message = "Problem reading document, please try again";
              callback.call(null,err);
              return;
            }
            callback.call(null,null,docname);
          });
        });
      });
    };

    DomaintoolPreferences.prototype.copyToRealtime = function(folder,callback) {
      var self = this;
      self.getPreferences(function(err,orig_prefs) {
        if (err) {
          callback.call(null,err);
          return;
        }
        (new MASCP.GoogledataReader()).createPreferences(folder,function(err,content,doc_id,title) {
          delete self.prefs_object;
          self.setActiveSession(doc_id,title);
          self.addRealtime(doc_id);
          self.getPreferences(function(err,new_prefs) {
            if (err) {
              callback.call(null,err);
              return;
            }
            if (DomaintoolPreferences.upgradePreferences) {
              DomaintoolPreferences.upgradePreferences(new_prefs,orig_prefs);
            }
            self.sync(function(err) {
              if (! err) {
                console.log("Forcing a refresh of preferences");
                self.getPreferences(function(err) {
                  callback.call(null,err);
                },true);
              }
            });
          });
        });
      });
    };

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
            if (err) {
              window.notify.alert("Could not get preferences, please reload page");
              return;
            }
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
        };
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
          callback.call(null,null,file_obj.content,file_obj.etag,file_obj.modified);
          return;
        }
        old_get_preferences.call(google_obj,dom,function(err,prefs) {
          if (err && err.cause && err.cause.status == 304) {
            callback.call(null,null,file_obj.content,file_obj.etag,file_obj.modified);
            return;
          }
          if (err) {
            callback.call(null,err);
            return;
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

      var send_etag = function() {};

      google_obj.writePreferences = function(dom,callback) {
        old_write_preferences.call(google_obj,file_obj,function(err,prefs) {
          old_get_preferences.call(google_obj,file_obj,function(err,pr) {
            send_etag(file_obj);
            if (err && err.cause && err.cause.status == 304) {
              err = null;
            }
            callback.call(null,err,file_obj.content,file_obj.etag,file_obj.modified);
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
        "source" : file,
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
        },
        ifReady : function(callback) {
          callback.call();
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

    DomaintoolPreferences.prototype.getStaticConf = function(url,callback) {
        MASCP.Service.request(url,callback);
    };

    var parser_function = function(datablock){
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
      delete datablock.retrieved;
      delete datablock.etag;
      delete datablock.title;
      return datablock.data;
    };


    DomaintoolPreferences.prototype.useStaticPreferences = function(doc,handle_proteins) {
      var self = this;
      conf = { "user_datasets" : {} };
      self.getStaticConf(doc,function(err,json) {
        if (err) {
          if (err.status >= 500) {
            err.message = "Could not load page, please reload page";
          } else if (err.status >= 400) {
            err.message = "Could not find configuration";
          }
          handle_proteins(err);
          return;
        }
        conf = json;
        console.log(self.metadata);
        var sets_by_cells = {};
        var sets_by_tissue = {};
        Object.keys(self.metadata || {}).forEach(function(set) {
          if (self.metadata[set].sample && self.metadata[set].mimetype === 'application/json+msdata') {
            sets_by_cells[self.metadata[set].sample.cell_type || 'other'] = (sets_by_cells[self.metadata[set].sample.cell_type || 'other'] || []).concat(set)
            sets_by_tissue[self.metadata[set].sample.tissue || 'other'] = (sets_by_tissue[self.metadata[set].sample.tissue || 'other'] || []).concat(set)
          }
        });
        if ( ! MASCP.getGroup('cell_lines')) {
          MASCP.registerGroup('cell_lines', { 'fullname' : 'Cell Lines'});
        }
        Object.keys(sets_by_cells).forEach(function(cell) {
          MASCP.registerLayer(cell.replace(/\s+/g,'_'), {'fullname' : cell, 'group' : 'cell_lines'});
          conf.user_datasets[sets_by_cells[cell].concat(['']).join(',')] = {
            "render_options":{
                "track" : cell.replace(/\s+/g,'_'),
                "renderer":"msdata:packed",
                "icons" : {
                  "namespace" : "sugar",
                  "url" : "/sugars.svg"
                }
              },
              "title":cell,
              "type":"dataset"
          };
        });
        console.log(conf);
        // DOI specific
        if (conf.specific) {
          conf.specific.splice(0,-1)
          var sets = {};
          conf.specific.forEach(function(set) {
            sets[set] = { type: "dataset", render_options: { renderer: 'msdata:default', track: "Data", offset: 10 }, parser_function: "function (datablock){\n            for (var key in datablock.data) {\n              if (key == \"\" || key.match(/\\s/)) {\n                delete datablock.data[key];\n              } else {\n                var dat = datablock.data[key];\n                delete datablock.data[key];\n                datablock.data[key.toLowerCase()] = {\n                  \"data\" : dat,\n                  \"retrieved\" : datablock.retrieved,\n                  \"etag\" : datablock.etag,\n                  \"title\" : datablock.title\n                };\n              }\n            }\n            delete datablock.retrieved;\n            delete datablock.etag;\n            delete datablock.title;\n            return datablock.data;\n        }" };
          });
          sets['glycodomain'] = {
                  'type' : 'dataset',
                  'inline' : 'true',
                  'parser_function' : parser_function.toString(),
                  'render_options' : {
                    'offset' : 0,
                    'renderer' : 'domains:packed',
                    'icons' : { 'namespace' : 'sugar', 'url' : '/sugars.svg' }
                  }
          };
          conf = {
            "version" : "1.2",
            "title" : "Someset",
            "user_datasets" : sets
          };
        }

        var accs = conf.accessions || [];
        self.prefs_object = {
          "source" : doc,
          addWatchedDocument : function() {
          },
          removeWatchedDocument : function() {
          },
          readWatchedDocuments : function(callback) {
            MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
            MASCP.IterateServicesFromConfig(conf.user_datasets,callback);
          },
          listWatchedDocuments : function() {
          },
          getPreferences : function(callback) {
            callback.call(null,null,conf);
          },
          writePreferences : function() {
          },
          ifReady : function(callback) {
            callback.call();
          }
        };
        delete self.realtime;
        if (accs) {
          handle_proteins(null,accs);
        }

        if (self.waiting && self.prefs_object) {
          self.waiting.forEach(function(waiting) {
            self.prefs_object[waiting.method].apply(self.prefs_object,waiting.args);
          });
          self.waiting = [];
        }

        bean.fire(self,'prefschange');
      });

    };

    DomaintoolPreferences.prototype.useDefaultPreferences = function(callback) {
      var self = this;
      var google_obj = new MASCP.GoogledataReader();
      var domain = "Domaintool preferences";
      var parser_function = function(datablock){
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
        delete datablock.retrieved;
        delete datablock.etag;
        delete datablock.title;
        return datablock.data;
      };
      bean.add(MASCP.GatorDataReader,'auth',function(url_base) {
        var conf = {
          'url' : url_base+'/metadata',
          'auth' : MASCP.GATOR_AUTH_TOKEN,
          'async' : true,
          'type' : 'GET'
        };
        MASCP.Service.request(conf,function(metadata) {
          self.metadata = metadata;
        });
      });

      this.prefs_object = {
        "source" : domain,
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

          var readdocs = function(domain,callback) {
            this.getPreferences(domain,function(err,prefs) {
                if (err) {
                  if (err.cause === "No user event") {
                    console.log("Consuming no user event");
                    return;
                  }
                  if (err.cause == "Browser not supported") {
                    console.log("Consuming no browser support");
                    return;
                  }
                  callback.call(null,{ "status" : "preferences", "original_error" : err });
                  return;
                }
                var temp_prefs = JSON.parse(JSON.stringify(prefs.user_datasets));
                Object.keys(temp_prefs).forEach(function(key) {
                  if (! key.indexOf('http') >= 0) {
                    if (temp_prefs[key].type == 'dataset') {
                      if ( ! MASCP.getGroup('datasets')) {
                        MASCP.registerGroup('datasets', { 'fullname' : 'Combined'});
                      }
                      if ( ! MASCP.getLayer('combined') ) {
                        MASCP.registerLayer('combined', {'fullname' : 'Combined'});
                      }
                      MASCP.registerLayer(temp_prefs[key].title, {'fullname' : temp_prefs[key].title, 'group' : 'datasets'});
                      return;
                    }
                    delete temp_prefs[key];
                  }
                });
                temp_prefs['combined'] = {
                  'type' : 'dataset',
                  'title' : 'Combined',
                  'parser_function' : parser_function.toString(),
                  'render_options' : {
                    'track' : 'combined',
                    'renderer' : 'msdata:packed',
                    'icons' : { 'namespace' : 'sugar', 'url' : '/sugars.svg' }
                  }
                };
                temp_prefs['glycodomain'] = {
                  'type' : 'dataset',
                  'inline' : 'true',
                  'parser_function' : parser_function.toString(),
                  'render_options' : {
                    'offset' : 0,
                    'renderer' : 'domains:packed',
                    'icons' : { 'namespace' : 'sugar', 'url' : '/sugars.svg' }
                  }
                };
                console.log(temp_prefs);
                MASCP.IterateServicesFromConfig(temp_prefs,callback);
            });
          };

          readdocs.apply(google_obj,args);
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
        },
        ifReady : function(callback) {
          callback.call();
        }
      };
      delete self.realtime;
      callback.call(null,null,[]);
      bean.fire(self,'prefschange');
    };

    DomaintoolPreferences.prototype.ifReady = function(callback) {
      if ( ! this.prefs_object ) {
        this.waiting.push( { "method" : "ifReady", "args" : Array.prototype.slice.call(arguments) });
        return;
      }
      setTimeout(function() {
        callback.call(this);
      },0);
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

    DomaintoolPreferences.upgradePreferences = function(new_prefs,old) {
      if ( ! new_prefs.user_datasets ) {
        new_prefs.user_datasets = {};
      }
      for (var set in (old.user_datasets || {})) {
        new_prefs.user_datasets[set] = old.user_datasets[set];
      }
      var ref_domains = old.accepted_domains;
      if (Array.isArray(ref_domains)) {
        ref_domains = ref_domains[ref_domains.length - 1];
      }
      if (new_prefs.accepted_domains) {
        if (Array.isArray(new_prefs.accepted_domains)) {
          new_prefs.accepted_domains[new_prefs.accepted_domains.length - 1] = ref_domains;
        }
      } else {
        new_prefs.accepted_domains = [ { "type" : "googleFile", "file"  : "User specified domains"}, ref_domains ];
      }
      new_prefs.version = old.version;
    };

    var get_preferences = function(handle_proteins) {
      if ( ! window.prefs ) {
        window.prefs = (new DomaintoolPreferences());
        // Guess prefs source with a default
        window.prefs.guessPreferenceSource(function(done){
          if ( ! handle_proteins) {
            handle_proteins = function() {};
          }
          bean.add(MASCP.GatorDataReader,'auth',function(url_base) {
            var conf = {
              'url' : url_base+'/metadata',
              'auth' : MASCP.GATOR_AUTH_TOKEN,
              'async' : true,
              'type' : 'GET'
            };
            MASCP.Service.request(conf,function(err,metadata) {
              window.prefs.metadata = metadata;
              window.prefs.useStaticPreferences('/default.preferences',function(err,prots) { done(); handle_proteins(err,prots); });
            });
          });
        });
      }
      return window.prefs;
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
            obj.toString = function() {
              return this.name;
            };
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
      });
    };

    var wire_history = function(renderer,handle_proteins) {
      if (history) {
        window.onpopstate = function(event) {
          var state = (event.state || {});
          console.log(state);
          if (state['uniprot_id']) {
            show_protein(state['uniprot_id'],renderer);
          }
          if (state['uniprot_ids']) {
            console.log(state);
            handle_proteins(null,state['uniprot_ids'].split('+').map(function(prot) { return { id: prot, name: prot }}));
          }
        };
      }
    };

    var wire_clearsession = function(title,renderer) {
      document.getElementById('clearsession').textContent = title;
      document.getElementById('clearsession').style.display = 'block';
      document.getElementById('clearsession').onclick = function() {
        console.log("Clearing session");
        get_preferences().clearActiveSession();
        get_preferences().guessPreferenceSource(function(done) {
          get_preferences().useStaticPreferences('/default.preferences',function() {
            done();
            show_protein(document.getElementById('uniprot_id').textContent,renderer,null,true);
          });
        });
        this.style.display = 'none';
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
        bean.add(renderer,'sequenceChange',selector_callback);
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
    };

    var wire_renderer_sequence_change = function(renderer) {
      var dragger = new GOMap.Diagram.Dragger();
      var seq_change_func = function() {
        MASCP.Service.request("/icons.svg",function(err,doc) {
          if (doc) {
            renderer.importIcons("ui",doc.documentElement);
            console.log("Imported UI icons");
          }
        },"xml");

        var zoomFactor = 0.95 * renderer._container.parentNode.clientWidth / (2 * renderer.sequence.length);
        renderer.zoom = zoomFactor;
        dragger.applyToElement(renderer._canvas);
        dragger.addTouchZoomControls(renderer, renderer._canvas);
        GOMap.Diagram.addScrollZoomControls.call({'enabled': true},renderer, renderer._canvas,0.1);
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

      bean.add(renderer,'sequenceChange', seq_change_func);
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
        var curr_classname;
        if ( ! is_toggle_action ) {
          // Android chrome does not handle concurrent touch events
          // http://jsfiddle.net/Darbicus/z3Xdx/10/
          manager.selecting = ! manager.selecting;
          curr_classname = toggler.className.replace('selecting','');
          toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
          bean.fire(renderer,'draggingtoggle',[! manager.selecting]);
        } else {
          if ( ! toggler.firstChild.getAttribute('value') ) {
            curr_classname = toggler.className.replace('selecting','');
            toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
            bean.fire(renderer,'draggingtoggle',[! manager.selecting]);
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

      document.getElementById('zoomin').addEventListener('click',function() {
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
      },false);

      document.getElementById('zoomout').addEventListener('click',function() {
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
      },false);
    };

    var add_keyboard_navigation = function() {
      if (window.keyboard_enabled) {
        return;
      }
      window.keyboard_enabled = true;
      window.addEventListener('keypress',function(e) {
        if (e.srcElement.isContentEditable) {
          return;
        }
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
      },false);
    };


    var setup_renderer = function(renderer) {
        renderer.zoom = 0.81;
        renderer.padding = 10;
        renderer.trackOrder = [];
        renderer.reset();
        renderer.trackGap = 5;
        renderer.trackHeight = 4;
        renderer.fixedFontScale = 1;
        renderer.refresh();
    };



    var wire_websockets = function(server,opened) {
      if ( ! "WebSocket" in window ) {
        return;
      }
      var socket;
      socket = new WebSocket("ws://"+server);

      socket.onopen = function() {
        console.log("Opened socket");
        if (opened) {
          opened(socket);
        }
      };
    };

    var scale_text_elements = function(renderer) {
        renderer.text_els = [];
        bean.add(renderer,'zoomChange',function() {
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
              var char_length = parseInt( text.length * 0.75 * (all_box.getBBox().width / a_text.getBBox().width) );
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
        list = document.getElementById("protein_list");
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
    };

    var use_doi_conf = function(doc,callback) {
      if ( ! doc.match(/\b(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&\'<>])\S)+)\b/)) {
        if (doc.match(/^[a-z\-]+$/)) {
          window.notify.info("Pre-publication data").hideLater(2000);
        } else {
          window.notify.alert("Invalid DOI");
          return;
        }
      }
      bean.add(MASCP.GatorDataReader,'auth',function(url_base) {
        var conf = {
          'url' : url_base+'/doi/'+encodeURIComponent(doc),
          'auth' : MASCP.GATOR_AUTH_TOKEN,
          'async' : true,
          'type' : 'GET'
        };
        get_preferences().clearActiveSession();
        get_preferences().useStaticPreferences(conf,callback);
      });
    };

    var create_renderer = function(container) {

        var renderer = new MASCP.CondensedSequenceRenderer(container);
        renderer.font_order = 'Helvetica, Arial, sans-serif';
        setup_renderer(renderer);

        scale_text_elements(renderer);
        MASCP.GOOGLE_CLIENT_ID="936144404055.apps.googleusercontent.com";
        // domain_retriever = new MASCP.DomainRetriever(get_preferences(),renderer,function(editing,acc) {
        //   get_orthologs = _get_orthologs;
        //   get_orthologs(acc,renderer);
        //   show_protein(acc,renderer);
        //   if (editing && renderer.navigation) {
        //     renderer.navigation.show();
        //   }
        // });
        return renderer;
    };

    var setup_visual_renderer = function(renderer) {
      wire_renderer(renderer);

      wire_gatordisplay(renderer);
      wire_websockets('localhost:8880',function(socket) {
        socket.onmessage = function(ev) {
          if (! ev.data) {
            return;
          }
          var data = JSON.parse(ev.data);
          if (data.message == "showProtein") {
            if (Array.isArray(data.data)) {
              update_protein_list(data.data.map(function(up) {
                var dat = { "id" : up, "name" : up };
                dat.toString = function() {
                  return this.id;
                };
                return dat;
              }),renderer);
            } else {
              show_protein(data.data,renderer);
            }
            return;
          }
          if (data.message == "compactRenderer") {
            renderer.trackGap = -8;
            var lay;
            for (lay in MASCP.layers) {
              if (lay.match("annotation")) {
                renderer.hideLayer(lay);
              }
              renderer.refresh();
            }
          }
          if (data.message == "upgradeConnection") {
            get_preferences().getPreferences(function() {
              if ( ! gapi || ! gapi.auth.getToken() ) {
                console.log("No gapi");
                return;
              }
              if ( ! data.data || ! sessionStorage.getItem("RConnectionKey") ) {
                var caller = arguments.callee;
                window.notify.ask_permission("Allow connection to R",function(granted) {
                  if (granted) {
                    var key = Math.random().toString(36).slice(2);
                    sessionStorage.setItem("RConnectionKey", key);
                    data.data = key;
                    caller();
                  }
                }).hideLater(30000);
              } else if (data.data === sessionStorage.getItem("RConnectionKey") ) {
                window.notify.info("Connected to R on local machine").hideLater(5000);
                socket.send(JSON.stringify({
                  "message" : "token",
                  "data" : {  "authtoken": gapi.auth.getToken().access_token ,
                              "connectionkey" : sessionStorage.getItem("RConnectionKey")
                            }
                            }));
              }
            });
          }
          if (data.message == "retrieveSession") {
            get_preferences().getPreferences(function(err,prefs) {
              if ( ! gapi || ! gapi.auth.getToken() ) {
                console.log("No gapi");
                return;
              }
              if (err) {
                return;
              }
              if (data.data === sessionStorage.getItem("RConnectionKey") ) {
                socket.send(JSON.stringify({
                  "message" : "preferences",
                  "data" : {  "preferences": prefs ,
                              "connectionkey" : sessionStorage.getItem("RConnectionKey")
                            }
                            }));
              }
            });
          }
        };
      });
    };

    var domain_retriever;

    var wire_gatordisplay = function(renderer) {

      var socket = null;

      var fire_update = function() {
        if (socket) {
          renderer.pngURL(function(dat) { socket.send(JSON.stringify({"type" : "image" , "image" : dat })); },800);
        }
      };

      var update_timeout;

      var update_function = function() {
        clearTimeout(update_timeout);
        update_timeout = setTimeout(fire_update,300);
      };

      wire_websockets('glycodomain.ccg:8080',function(newsock) {
        socket = newsock;
        renderer.bind('zoomChange',update_function);
        renderer.bind('sequenceChange',function() {
          bean.add(renderer._canvas,'panend',update_function);
        });
      });
    };

    var retrieve_data = function(acc,renderer,end_func) {
        acc = (acc || "").toUpperCase();
        get_usersets(acc,renderer);

        if (renderer.showAnnotation) {
          renderer.showAnnotation(acc);
        }

        renderer.showLayer(acc);
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
        document.title = "GlycoDomain Viewer "+ucacc;
        if ( ! document.getElementById('prot_'+(ucacc.toLowerCase())) ) {
          // We should show the full list of proteins here?
        }
      }

      end_clustal();
      end_clustal = function() {};
      window.showing_clustal = false;

      setup_renderer(renderer);
      get_orthologs(ucacc,renderer);


      var a_reader = new MASCP.UniprotReader();
      if (MASCP.getLayer(ucacc)) {
        delete MASCP.getLayer(ucacc).group;
      }

      MASCP.Service.CacheService(a_reader);
      bean.add(renderer,'sequenceChange',function() {
        bean.remove(renderer,'sequenceChange',arguments.callee);
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
        renderer.grow_container = true;
        renderer.setSequence(this.result.getSequence());
        set_description(this.result.getDescription().replace(/_HUMAN.*GN=/,'/').replace(/\s.+/,''));
        if (success) {
          success();
        }
      });

    };

    var hide_controls = function() {
      document.getElementById('uniprot_container').classList.add('hidden_controls');
      document.getElementById('search_container').classList.add('hidden_controls');
      document.getElementById('description').classList.add('hidden_controls');
      document.getElementById('drive_install').classList.add('hidden_controls');
      document.getElementById('find').classList.add('hidden_controls');
      document.getElementById('align').classList.add('hidden_controls');

      document.getElementById('sequence_frame').scrollIntoView();
    };

    var show_controls = function() {
      document.getElementById('uniprot_container').classList.remove('hidden_controls');
      document.getElementById('search_container').classList.remove('hidden_controls');
      document.getElementById('description').classList.remove('hidden_controls');
      document.getElementById('drive_install').classList.remove('hidden_controls');
      document.getElementById('find').classList.remove('hidden_controls');
      document.getElementById('align').classList.remove('hidden_controls');
    };

    var wire_smartphone_controls = function() {
      document.getElementById('sequence_frame').addEventListener('touchstart',function() {
        document.activeElement.blur();
      });
      var just_hidden = false;
      var is_hidden = false;
      document.getElementById('viewer').addEventListener('scroll',function(){
        if (this.scrollTop < 1 && ! just_hidden) {
          show_controls();
          just_hidden = false;
          is_hidden = false;
        } else {
          if (this.scrollTop > 0.3*document.getElementById('sequence_frame').offsetTop) {
            if ( ! is_hidden ) {
              just_hidden = true;
              hide_controls();
            }
            is_hidden = true;
            setTimeout(function() {
              just_hidden = false;
            },200);
          }
        }
      },false);
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
          if (flipped !== true) {
            return;
          }
          annotation_manager.renderer.fillTemplate("tags_tmpl",{ "tags" : tags },function(error,html) {
            flipped = flippant.flip(document.getElementById('sequence_frame'), html);
            var matches = flipped.querySelectorAll('ul .remove');
            var i;
            for (i = 0 ; i < matches.length; i++) {
              matches[i].addEventListener('click',function() {
                var self = this;
                var wanted_tag = self.parentNode.getAttribute('data-tag');
                annotation_manager.removeTag(wanted_tag);
                self.parentNode.parentNode.removeChild(self.parentNode);
              },false);
            }
            matches = flipped.querySelectorAll('ul *[contentEditable]');
            for (i = 0 ; i < matches.length; i++) {
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
          MASCP.GatorDataReader.authenticate();
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
            gapi.auth.checkSessionState({'client_id' : MASCP.GOOGLE_CLIENT_ID, 'session_state' : null},function(loggedOut) {
              if (loggedOut === false) {
                setTimeout(function() {
                  document.getElementById('drive_install').style.display = 'block';
                  wire_drive_button(renderer);
                },1000);
              }
            });
            return;
          }
          document.getElementById('drive_install').style.display = 'none';
          return;
        } else {
          MASCP.GatorDataReader.ID_TOKEN = gapi.auth.getToken().id_token;
          MASCP.GatorDataReader.authenticate();
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
            get_preferences().getPreferences(function(err,prefs) {
              if (err) {
                return;
              }
              var sets = prefs.user_datasets;

              if (flipped !== true) {
                return;
              }
              var sets_array = [];
              for (var set in sets) {
                sets_array.push( { "name" : sets[set].title || sets[set].name || set, "id" : set } );
              }
              var remover_func = function() {
                var self = this;
                var par_doc = self.parentNode.getAttribute('data-docid');
                get_preferences().removeWatchedDocument(par_doc,function(err) {
                  if ( ! err ) {
                    self.parentNode.parentNode.removeChild(self.parentNode);
                  }
                });
              };
              var remove_customdoc = function() {
                get_preferences().getPreferences(function(err,prefs) {
                  if (err) {
                    window.notify.alert("Could not perform operation, please reload page");
                    return;
                  }
                  prefs.accepted_domains[0] = { "file" : "User specified domains", "type" : "googleFile" };
                  get_preferences().sync(function() {
                    flipped.close();
                    flipped = false;
                  });
                });
              };
              var copy_to_customdoc =  function() {
                get_preferences().getPreferences(function(err,prefs) {
                  if (err) {
                    flipped.close();
                    flipped = false;
                    window.notify.alert("Could not perform operation, please reload page");
                    return;
                  }
                  MASCP.DomainRetriever.getRawData(prefs.accepted_domains[0],function(err,dat) {
                    if (err) {
                      flipped.close();
                      flipped = false;
                      window.notify.alert("Could not perform operation, please reload page");
                      return;
                    }
                    (new MASCP.GoogledataReader()).createFile("root",dat,"Copied domains","application/json; data-type=domaintool-domains",function(err,content,id){
                      if (err) {
                        flipped.close();
                        flipped = false;
                        window.notify.alert("Could not perform operation, please reload page");
                        return;
                      }

                      prefs.accepted_domains[0] = {"file" : { "file_id" : id }, "type" : "googleFile", "owner" : "Self", "title" : "Copied domains"};
                      get_preferences().sync(function() {
                        flipped.close();
                        flipped = false;
                      });
                    });
                  });
                });
              };
              var template_config = { "sets" : sets_array, "custom_accepted" : null };
              if (prefs.accepted_domains[0].file !== "User specified domains") {
                 template_config["custom_accepted"] = { "owner" : prefs.accepted_domains[0].owner, "title" : prefs.accepted_domains[0].title };
              }
              renderer.fillTemplate("userset_tmpl",template_config,function(error,html) {
                flipped = flippant.flip(document.getElementById('sequence_frame'), html);
                var matches = flipped.querySelectorAll('ul.drive_preferences .remove');
                for (var i = 0 ; i < matches.length; i++) {
                  matches[i].addEventListener('click',remover_func,false);
                }
                matches = flipped.querySelectorAll('.remove_accepted');
                for (i = 0 ; i < matches.length; i++) {
                  matches[i].addEventListener('click',remove_customdoc,false);
                }
                matches = flipped.querySelectorAll('.copy_accepted');
                for (i = 0 ; i < matches.length; i++) {
                  matches[i].addEventListener('click',copy_to_customdoc,false);
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
        var text_data = uniprot.textContent || "";
        if (uniprot.childElementCount > 0) {
          text_data = Array.prototype.slice.apply(uniprot.childNodes).map(function(n) { return n.textContent; }).join("\n");
        }
        text_data.split(/\n/).forEach(function(id) {
          id = id.replace(/\s+/g,'');
          if (id.toUpperCase().match(uprot_re1) || id.toUpperCase().match(uprot_re2)) {
            var prot = { "id" : id, "name" : id };
            prot.toString = function() { return this.id; };
            all_ids.push(prot);
          }
        });
        if (all_ids.length > 1) {
          handle_proteins(null,all_ids);
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
          if ( i > 0 && (i % 10) === 0) {
            parent.appendChild(other_win.document.createTextNode(' '));
            if ( (i % 50) === 0) {
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
    };

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
          callback( null, [].concat(self.protein_cache[protein_doc]) );
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
          callback(null,results);
        });
        datareader.bind('ready',function() {
          notification.hide();
        });
        datareader.bind('error',function(e,err) {
          notification.hide();
          var err_obj = err || e;
          if (err_obj.cause && (err_obj.cause == "No user event" || err_obj.cause == "Access is denied.")) {
            callback.call(null,null,protein_doc,err_obj.authorize);
            return;
          }
          if (err_obj.cause == "Google session timed out") {
            window.notify.alert("You are logged out of your Google Account, please log in again");
            setTimeout(function() {
              document.getElementById('drive_install').click();
            },1000);
            return;
          }
          window.notify.alert("Could not retrieve desired protein list, please try again");
          console.log("Error");
          console.log(err_obj);
        });

    };

    var get_generic_data = function(acc,renderer,datareader,options,done) {
      // Not sure we need to set the endpointURL
      if ( ! options.url ) {
        datareader._endpointURL = '/data/latest/gator';
      }
      var track = acc;

      if ((options || {})["icons"]) {
        MASCP.Service.request(options["icons"].url,function(err,doc) {
          if (doc) {
            renderer.importIcons(options["icons"].namespace,doc.documentElement);
          }
        },"xml");
      }

      if (! options.inline) {
        if ( ! MASCP.getGroup('extra_data')) {
          MASCP.registerGroup('extra_data', { 'fullname' : 'Extra data'});
          bean.add(MASCP.getGroup('extra_data'),'visibilityChange',function(rend,visible) {
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
        MASCP.registerLayer(datareader.toString(),{"fullname" : options.title || datareader.toString(), "group" : "extra_data"});
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
      datareader.registerSequenceRenderer(renderer,{"track" : options.track || track, "offset" : parseInt((options.render_options || {}).offset || 0), "icons" : options.icons });

      renderer.bind('resultsRendered',function(reader) {
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

    MASCP.msdata_default_url = '/msdata.renderer.js';
    MASCP.msdata_packed_url = '/msdata.packed.renderer.js';
    MASCP.domains_packed_url = '/glycodomain.packed.renderer.js';


    var get_renderer = function(renderer_url,callback) {

      if (renderer_url.match(/^msdata:default/)) {
        renderer_url = MASCP.msdata_default_url;
      }

      if (renderer_url.match(/^msdata:packed/)) {
        renderer_url = MASCP.msdata_packed_url;
      }

      if (renderer_url.match(/^domains:packed/)) {
        renderer_url = MASCP.domains_packed_url;
      }


      if (renderer_url.match(/^(https?:\/)?\//)) {
          MASCP.Service.request(renderer_url,callback,true);
      }

      // Respond to google: urls and default to using a google doc for the renderer url
      if (renderer_url.match(/^google/) || renderer_url.match(/^\w+$/)) {
          (new MASCP.GoogledataReader()).getDocument(renderer_url,null,callback);
      }

    };

    var get_cached_renderer = function(renderer_url,callback) {
      if ( ! sessionStorage.renderer_caches ) {
        sessionStorage.renderer_caches = JSON.stringify({});
      }
      var renderer_caches = JSON.parse(sessionStorage.renderer_caches);
      if (renderer_caches[renderer_url]) {
        console.log("Going to cache for renderer at "+renderer_url);
        callback.call(null,null,renderer_caches[renderer_url]);
        return;
      }
      get_renderer(renderer_url,function(err,data) {

        if ( err ) {
          callback.call(null,err);
          return;
        }
        var renderer_caches = JSON.parse(sessionStorage.renderer_caches);
        renderer_caches[renderer_url] = data;
        sessionStorage.renderer_caches = JSON.stringify(renderer_caches);
        callback.call(null,null,data);
      });
    };


    var get_usersets = function(acc,renderer) {

      // Don't trigger any popups
      if ( ! window.event ) {
        window.event = { "which" : null };
      }

      var allowed = { "MASCP.DomainRetriever" : 1, "MASCP.PrideRunner" : 1, "MASCP.HydropathyRunner" : 1, "MASCP.UniprotSecondaryStructureReader" : 1 };
      console.log("About to get watched docs");
      get_preferences().readWatchedDocuments(function(err,pref,reader) {
        if (err) {
          // Errs if : No user event / getting preferences
          // actual reader error

          if (err.status === "preferences") {
            window.notify.alert("Problem getting user preferences");
            return;
          }
          if (err.error && err.error.cause == "No user event") {
            window.notify.info("Need login to get data for "+pref.title);
            return;
          }

          if (err) {
            window.notify.alert("Problem reading user data set");
          }
          console.log("Getting prefs");
          console.log(err);
        }

        if (pref.type == "liveClass") {
          if (! allowed[reader.toString()]) {
            return;
          }
          reader.preferences = get_preferences();
          get_generic_data(acc,renderer,reader,pref,function() {
            if (typeof (window.extra_shown) !== 'undefined' && window.extra_shown) {
              renderer.showGroup('extra_data');
            }
            renderer.refresh();
          });
          return;
        }

        var method = pref["sites"] || pref.render_options["sites"];
        var track_name = (pref.render_options || {})["track"] ? pref.render_options["track"] : (renderer.acc ? "all_domains" : acc);
        if (pref && pref.icons || (pref.render_options || {}).icons ) {
          var icon_block = pref.icons || (pref.render_options || {}).icons;
          MASCP.Service.request(icon_block.url,function(err,doc) {
            if (doc) {
              renderer.importIcons(icon_block.namespace,doc.documentElement);
              console.log("Imported icons");
            }
          },"xml");
        }

        reader.retrieve(acc,function(force) {
          var layer_hidden = false;
          if ( ! this.result ) {
            return;
          }
          if ( ! MASCP.getLayer(track_name) || MASCP.getLayer(track_name).disabled ) {
            MASCP.registerLayer(track_name, {"fullname" : track_name }, [renderer]);
          }
          MASCP.registerLayer(track_name, { "fullname" : track_name }, [renderer]);

          if ( renderer.trackOrder.indexOf(track_name) < 0 ) {
            if (! MASCP.getLayer(track_name).group) {
              renderer.trackOrder = renderer.trackOrder.concat(track_name);
              renderer.showLayer(track_name);
            } else if (['datasets','cell_lines'].indexOf(MASCP.getLayer(track_name).group.name) >= 0) {
              if (renderer.trackOrder.indexOf(MASCP.getLayer(track_name).group.name) < 0 ){
                renderer.trackOrder = renderer.trackOrder.concat([ 'combined', MASCP.getLayer(track_name).group.name ]);
              }
              renderer.hideLayer(track_name);
              layer_hidden = true;
            }
          } else {
            if (MASCP.getLayer(track_name).group && ['datasets','cell_lines'].indexOf(MASCP.getLayer(track_name).group.name) >= 0 && ! force ) {
              renderer.hideLayer(track_name);
              layer_hidden = true;
            } else {
              renderer.showLayer(track_name);
            }
          }
          console.log(track_name," is active? ",renderer.isLayerActive(track_name));
          if ( ! renderer.isLayerActive(track_name) ) {
            console.log( track_name, [ MASCP.getGroup('datasets'), MASCP.getLayer(track_name) ]);
          }
          if (MASCP.getLayer(track_name) && MASCP.getLayer(track_name).group) {
            renderer.createGroupController('combined',MASCP.getLayer(track_name).group.name);
          }
          var datas = this.result._raw_data.data;
          var render_tries = 0;

          if (force) {
            MASCP.registerLayer(track_name, { "fullname" : track_name }, [renderer]);
            layer_hidden = false;
          }

          if (layer_hidden) {
            var self_func = arguments.callee;
            var self_result = this.result;
            var vis_change_func = function(renderer,visible) {
              if ( ! renderer ) {
                bean.remove(MASCP.getLayer(track_name),'visibilityChange',arguments.callee);
                this.unbind('sequenceChange',arguments.callee);
                return;
              }
              if (visible) {
                vis_change_func.call(renderer);
                setTimeout(function() {
                  self_func.call({'result': self_result},true);
                },0);
              }
            };
            bean.add(MASCP.getLayer(track_name),'visibilityChange',vis_change_func);
            renderer.bind('sequenceChange',vis_change_func);
          }
          if (! layer_hidden && pref.render_options["renderer"] && JSandbox) {
            console.log("Rendering ",track_name);
            get_cached_renderer(pref.render_options["renderer"],function(err,doc) {
              render_tries += 1;
              if (err) {
                if (err.cause.status == 403) {
                  var self_func = arguments.callee;
                  if (render_tries < 4) {
                    setTimeout(function(){
                      get_cached_renderer(pref.render_options["renderer"],self_func);
                    },200);
                    return;
                  }
                }
                window.notify.alert("Could not render "+pref.title);
                return;
              }
              var sandbox = new JSandbox();
              var seq = renderer.sequence;
              (function() {
                var obj = ({ "gotResult" : function() {
                  seq = renderer.sequence;
                }, "agi" : acc });
                renderer.trigger('readerRegistered',[obj]);
                obj.gotResult();
              })();

              sandbox.eval(doc,function() {
                this.eval({ "data" : "renderData(input.sequence,input.data,input.acc,input.track)",
                            "input" : { "sequence" : seq, "data" : datas, "acc" : acc, "track" : track_name },
                            "onerror" : function(message) { console.log(pref.title); console.log("Errored out"); console.log(message); },
                            "callback" : function(r) {
                              sandbox.terminate();
                              var obj = ({ "gotResult" : function() {
                                r.forEach(function(obj) {
                                  var offset = parseInt((pref.render_options || {}).offset || 0);
                                  if (obj.options) {
                                    if (obj.options.offset) {
                                      obj.options.offset += offset;
                                      return;
                                    }
                                    obj.options.offset = offset;
                                  } else {
                                    obj.options = { "offset" : offset };
                                  }
                                });
                                renderer.renderObjects(track_name,r);
                                renderer.trigger('resultsRendered',[this]);
                                renderer.refresh();
                              }, "agi" : acc });
                              renderer.trigger('readerRegistered',[obj]);
                              obj.gotResult();
                            }
                          });
              });
            });
            return;
          }
        });
      });
    };


    var get_orthologs = function(acc,renderer) {
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
      var datareader = new MASCP.UserdataReader(null,'http://glycodomain-data.glycocode.com/data/latest/homologene/');
      datareader.requestData = function() {
          var agi = this.agi.toLowerCase();
          var gatorURL = this._endpointURL.slice(-1) == '/' ? this._endpointURL+agi : this._endpointURL+'/'+agi;
          return {
              type: "GET",
              dataType: "json",
              url : gatorURL,
              data: { 'agi'       : agi,
                      'service'   : this.datasetname
              }
          };
      };

      datareader.datasetname = "homologene";
      datareader.retrieve(acc,function(err) {
        if ( ! err ) {
          var orthos = this.result._raw_data.data.orthologs;
          var ids=[10029,10090,10116,9606];
          var labels={ 10029 : "CHO", 10090 : "Mouse", 10116 : "Rat ", 9606: "Human"};
          ids.forEach(function(id) {
            var accession = orthos[id];
            if (accession && accession !== acc) {
              var button = document.createElement('button');
              button.setAttribute('class','ortho_button ortho_'+id);
              button.textContent = labels[id];
              button.addEventListener('click',function(evt) {
                if (evt.metaKey) {
                  window.open(window.location + '+' + accession.toUpperCase() ,'_blank');
                  return;
                }
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
        if(results === null)
          return "{}";
        else
          return decodeURIComponent(results[1].replace(/\+/g, " "));
      })("state") || "{}");
    };

    var end_clustal = function() {};

    var do_clustal = function(seqs,renderer,readyfunc) {
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

    var collect_sequences = function(prots,sequences,callback) {
      var acc = prots.shift();
      var caller = collect_sequences;
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
          callback(sequences);
        } else {
          caller(prots,sequences,callback);
        }
      });
    };

    var prepare_alignment = function(prots,renderer) {
      var ready = false;
      collect_sequences(prots,[],function(sequences) {
        if (! window.showing_clustal) {
          setup_renderer(renderer);
          renderer.sequence = "";
          do_clustal(sequences,renderer,function() {
            document.getElementById('align').setAttribute('class','ready');
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
      });
    };

    var has_ready = MASCP.ready;

    init = function() {
      if (MASCP.ready === true) {
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


      var handle_proteins = function(err,prots,auth_func) {
        if (handle_proteins.disabled) {
          return;
        }
        if (err) {
          console.log(arguments);
          window.notify.alert(err.message || "Error loading proteins");
          return;
        }
        if (prots.length < 25) {
          document.getElementById('drive_install').style.display = 'none';
          document.getElementById('align').style.display = 'block';
          document.getElementById('align').addEventListener('click',function() {
            var my_prots = [].concat(prots);
            document.getElementById('align').setAttribute('class','running');
            prepare_alignment(my_prots,renderer);
          },false);
        } else {
          if (document.getElementById('align').style.display == 'block') {
            document.getElementById('drive_install').style.display = 'block';
            document.getElementById('align').style.display = 'none';
          }
        }
        update_protein_list(prots,renderer,auth_func);

        add_keyboard_navigation();
      };


      if (window.location.toString().match(/doi/)) {
        var match = /doi\/(.*)\//.exec(window.location);
        match.shift();
        var actual_handle_proteins = handle_proteins;
        get_preferences = function() {
          if ( ! window.prefs ) {
            window.prefs = (new DomaintoolPreferences());
          }
          return window.prefs;
        };
        use_doi_conf(match[0],function(err,prots) { actual_handle_proteins(null,prots); document.getElementById('drive_install').style.display = 'block'; document.getElementById('align').style.display = 'none';});
        handle_proteins =  function() {};
      } else {
        get_preferences(handle_proteins);
      }

      setup_visual_renderer(renderer);
      var wheel_fn = function(e) {
        if(e.preventDefault) {
          e.preventDefault();
        }
        e.stopPropagation();
        return false;
      };
      document.getElementById('sequence_frame').addEventListener('DOMMouseScroll',wheel_fn,false);
      document.getElementById('sequence_frame').addEventListener('wheel',wheel_fn,false);
      document.getElementById('sequence_frame').onmousewheel = wheel_fn;

      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';

      document.getElementById('help').addEventListener('click',function() {
        show_help();
      },false);
      document.getElementById('top').addEventListener('click',function() {
        document.getElementById('page_canvas').scrollIntoView();
      },false);

      wire_drive_button(renderer);
      wire_uniprot_id_changer(renderer,handle_proteins);
      wire_clipboarder();
      wire_genesearch(renderer);
      wire_history(renderer,handle_proteins);
      if (window.matchMedia && window.matchMedia('screen and (max-device-width: 760px)').matches) {
        wire_smartphone_controls();
      }

      var state = get_passed_in_state();
      var protein_doc_id = "0Ai48KKDu9leCdFRCT1Bza2JZUVB6MU4xbHc1UVJaYnc";

      if (state.action && state.action == 'create') {

        get_preferences(handle_proteins);
        // Use a particular static conf, or something
        // as the template configuration for loading up
        // of session data
        get_preferences().clearActiveSession();
        get_preferences().useStaticPreferences('/template.preferences',function() {});
        var not = window.notify.info("Creating new user session");
        get_preferences().copyToRealtime(state.folderId,function(err) {
          not.hide();
          if (err) {
            window.notify.alert("Could not create new user session");
            console.log(err);
            return;
          }
          window.notify.info("Created new session").hideLater(1000);
          wire_clearsession(get_preferences().getActiveSessionTitle(),renderer);
        });
        return;
      }

      if (get_preferences().getActiveSession()) {
        wire_clearsession(get_preferences().getActiveSessionTitle(),renderer);
      }

      if (state.ids) {
        var watching = [];
        var last_notification = null;
        state.ids.forEach(function(doc_id) {
          (new MASCP.GoogledataReader()).getMimetype(doc_id,function(err,type,title,extension) {
            if ( ! err ) {
              if (title.match(/\.msdata\.json$/) || type === 'application/json; data-type=msdata') {
                watching.unshift(JSON.stringify({'doc' : doc_id, 'title' : title }));
                var run_watch = function() {
                  var remove_string = watching[0];
                  var remove_block = JSON.parse(remove_string);
                  var to_remove = remove_block.doc;
                  if (last_notification !== null) {
                    last_notification.hide();
                  }
                  last_notification = window.notify.info("Attempting to load "+remove_block.title);
                  get_preferences().watchFile(to_remove,function(err,loaded) {
                    if (err) {
                      if (last_notification !== null) {
                        last_notification.hide();
                      }
                      last_notification = window.notify.alert(err.message);
                      setTimeout( run_watch, 500);
                      return;
                    }
                    var watch_idx = watching.indexOf(remove_string);
                    if (watch_idx > -1) {
                      watching.splice(watch_idx,1);
                    }
                    if (last_notification !== null) {
                      last_notification.hide();
                    }
                    last_notification = window.notify.info("Successfully loaded "+(remove_block.title || ""));
                    if (watching.length > 0) {
                      setTimeout( run_watch, 100);
                    } else {
                      if (last_notification !== null) {
                        last_notification.hide();
                      }
                      window.notify.info("Successfully loaded all data");
                    }
                  });
                };
                if (watching.length  == 1) {
                  run_watch();
                }
              }
              if (extension == 'domaintoolsession' || type === 'application/json+domaintool-session') {
                get_preferences().addRealtime(doc_id);
                get_preferences().setActiveSession(doc_id,title);
                wire_clearsession(get_preferences().getActiveSessionTitle(),renderer);
              }
              if (type == 'application/json; data-type=domaintool-domains') {
                get_preferences().ifReady(function() {
                  get_preferences().getPreferences(function(err,prefs) {
                  if (err) {
                    window.notify.alert("Error loading preferences, please reload page");
                    return;
                  }
                  prefs.accepted_domains[0] = {"type" : "googleFile" , "file" : { "file_id" : doc_id }, "title" : title };
                  MASCP.DomainRetriever.getRawData(prefs.accepted_domains[0],function(err,dat,permissions,owner) {
                    prefs.accepted_domains[0].owner = owner;
                    get_preferences().sync(function(err) {
                      if (err) {
                        window.notify.alert("Error loading domain file");
                        return;
                      }
                      window.notify.info("Successfully switched to using "+title+" as domains").hideLater(500);
                    });
                  });
                });
                });
              }
            }
          });
        });
        return;
      }



      if (state.exportIds && state.exportIds.length > 0) {
        protein_doc_id = state.exportIds[0];
        document.getElementById('drive_install').style.display = 'none';
        get_proteins(protein_doc_id,handle_proteins);
        return;
      }

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
              document.title = "GlycoDomain Viewer "+results[1];
              history.replaceState({"uniprot_ids" : results[1] },prots.join(','),window.location);
            }
          }
          // show_protein(prots[0],renderer);
          handle_proteins(null,prots,renderer);
          if (prots.length > 1) {
            handle_proteins.disabled = true;
            return;
          }
        }
      }

    };
    if (has_ready) {
      ready_func();
    }
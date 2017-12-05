    if (!(window.console && console.log)) { (function() { var noop = function() {}; var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn']; var length = methods.length; var console = window.console = {}; while (length--) { console[methods[length]] = noop; } }()); }

    MASCP.AnnotationManager = function(renderer) {
      var self = this;
      this.renderer = renderer;
      return this;
    };


    MASCP.AnnotationManager.prototype.toggleSearchField = function() {
      if (this.showingSearch == true) {
        this.hideSearchField();
        this.showingSearch = false;
      } else {
        this.showingSearch = true;
        this.showSearchField();
      }
    }

    MASCP.AnnotationManager.prototype.showSearchField = function() {
      var self = this;
      if ( ! this.search_field ) {
        this.search_field = document.createElement('div');
        var search_el = document.createElement('input');
        search_el.setAttribute('type','text');
        search_el.onblur = function() {
          if (! search_el.value || search_el.value.length < 1 || search_el.value.match(/^\||\|$/) ) {
            self.renderer.select();
            return;
          }
          var search_re;
          try {
            search_re = new RegExp(search_el.value, "gi");
          } catch (e) {
            return;
          }
          var match;
          var positions = [];
          while (match=search_re.exec(self.renderer.sequence)) {
            positions.push(match.index+1);
            positions.push(match[0].length+match.index);
          }
          self.renderer.select.apply(self.renderer,positions);
        };
        search_el.addEventListener('focus',search_el.onblur,false);
        search_el.addEventListener('keyup',search_el.onblur,false);
        this.search_field.appendChild(search_el);
        self.renderer._container.appendChild(this.search_field);
        this.search_field.className = 'search_field hidden';
        search_el.setAttribute('value','');
      };
      setTimeout(function() {
        self.search_field.className = 'search_field';
      },0);
      return self.search_field;
    };

    MASCP.AnnotationManager.prototype.hideSearchField = function() {
      if ( ! this.search_field ) {
        return;
      }
      this.renderer.select();
      this.search_field.className = 'search_field hidden';
    };

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
      default_method(function() {});
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

    var get_tissue_identifier = function(sample) {
      var key = '';
      if (sample.description) {
        key = sample.description;
      }
      if (key && sample.cell_type) {
        key = key + ' : ' + sample.cell_type;
      } else if (sample.cell_type) {
        key = sample.cell_type;
      }
      if ( ! key ) {
        key = 'Unspecified';
      }
      return key;
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
        var sets_by_cells = {};
        var sets_by_tissue = {};
        var taxids = {};

        if (conf.specific) {
          conf.specific.splice(0,-1);
          conf.user_datasets = {
            'combined' : {
              "render_options":{
                "track" : "combined",
                "renderer":"msdata:packed",
                "icons" : {
                  "namespace" : "sugar",
                  "url" : "/sugars.svg"
                }
              },
              "title":"Combined",
              "type":"dataset",
              'autopopulate' : false
            },
            "glycodomain" : {
              "render_options" : {
                "offset" : 0,
                "renderer" : "domains:packed",
                "icons" : { "namespace" : "sugar" , "url" : "/sugars.svg" }
              },
              "inline" : "true",
              "type" :"dataset",
              "title" : "Domains"
            }
          };
          conf.specific.forEach(function(set) {
            conf.user_datasets[set] = true;
          });
          conf.version = 1.2;
          conf.title = 'Autogen DOI';
        }
        var autopopulate_ids = [];
        Object.keys(self.metadata || {}).forEach(function(set) {

          if (self.metadata[set].sample && self.metadata[set].mimetype === 'application/json+msdata') {

            if (! conf.user_datasets || ! conf.user_datasets['combined'] || (! conf.user_datasets['combined'].autopopulate && ! conf.user_datasets[set] )) {
              return;
            }

            delete conf.user_datasets[set];

            autopopulate_ids.push(set);

            var tissue_identifier = get_tissue_identifier(self.metadata[set].sample);
            console.log(tissue_identifier,set,self.metadata[set].sample);
            if (self.metadata[set].sample.species) {
              taxids[self.metadata[set].sample.species] = true;
            }
            sets_by_cells[tissue_identifier] = (sets_by_cells[tissue_identifier] || []).concat(set);
          }
        });

        if (conf.user_datasets && conf.user_datasets['combined'] && autopopulate_ids.length > 0) {
          conf.user_datasets[autopopulate_ids.join(',')] = conf.user_datasets['combined'];
          delete conf.user_datasets['combined'];
        }

        Object.keys(conf.user_datasets).forEach( set => {
          if ( conf.user_datasets[set]['data-feature'] && (! self.metadata[set] || self.metadata[set].type !== 'data-feature' ) ) {
            delete conf.user_datasets[set];
          }
        });

        taxids = Object.keys(taxids);

        if ( ! MASCP.getGroup('cell_lines')) {
          MASCP.registerGroup('cell_lines', { 'fullname' : 'Cell Lines'});
        }
        Object.keys(sets_by_cells).sort().reverse().forEach(function(cell) {
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
              "generated" : true,
              "type":"dataset"
          };
        });
        if (conf.user_datasets['homology'] && ! MASCP.getGroup('homology')) {
          MASCP.registerGroup('homology', { 'fullname' : 'Homologous data'});
          taxids.forEach(function(taxid) {
            if (taxid) {
              MASCP.registerLayer('tax'+taxid, {'fullname' : ''+taxid, 'group' : 'homology'});
              MASCP.getLayer('tax'+taxid).disabled = true;
              MASCP.getLayer('tax'+taxid).href = load_homology.bind(null,taxid);
            }
          });
        }

        console.log("CONF DATA IS ",conf);

        if (window.location.pathname.indexOf('+') >= 0) {
          delete conf.user_datasets['homology'];
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
          var authhandler = function(url_base) {
            bean.remove(MASCP.GatorDataReader,'auth',authhandler);
            console.log("Auth event triggered");
            var conf = {
              'url' : url_base+'/metadata',
              'auth' : MASCP.GATOR_AUTH_TOKEN,
              'api_key' : MASCP.GATOR_CLIENT_ID,
              'async' : true,
              'type' : 'GET'
            };
            MASCP.Service.request(conf,function(err,metadata) {
              if (err && err.status == 401) {
                bean.add(MASCP.GatorDataReader,'auth',authhandler);
                bean.fire(MASCP.GatorDataReader,'unauthorized');
                return;
              }
              window.prefs.metadata = metadata;
              console.log("Authed static preferences");
              window.prefs.useStaticPreferences('/default.preferences',function(err,prots) { done(); handle_proteins(err,prots); });
            });
          };
          bean.add(MASCP.GatorDataReader,'auth',authhandler);
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
          document.getElementById('searchGeneSpecies').onchange = function() {
            console.log(this.value);
            MyGeneCompleter.species = this.value;
          }
          MyGeneCompleter(document.getElementById('searchGene'),function(err,uniprot) {
            if ( ! uniprot ) {
              MyGeneCompleter.flash_message("No UniProt entry found");
              return;
            }
            if (document.getElementById('prot_'+uniprot.toLowerCase())) {
              document.getElementById('prot_'+uniprot.toLowerCase()).click();
              var selected = document.getElementById('prot_'+uniprot.toLowerCase());
              selected.parentNode.scrollTop = selected.offsetTop;
              return;
            } else {
              var selected = (document.getElementsByClassName('selected') || [])[0];
              if (selected) {
                var clazz = selected.getAttribute('class') || '';
                selected.setAttribute('class',clazz.replace(/selected\s/,''));
              }
            }
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

    var wire_firstrun = function(renderer) {
      document.getElementById('focus_uniprot').addEventListener('click',function() {
        show_protein('Q14112',renderer);
        document.getElementById('uniprot_id').focus();
      },false);
      document.getElementById('focus_genesearch').addEventListener('click',function() {
        document.getElementById('searchGene').focus();
        document.getElementById('searchGene').value = 'APOE';
        // Create a new 'change' event
        var event = new Event('input');
        // Dispatch it.
        document.getElementById('searchGene').dispatchEvent(event);
      },false);
      document.getElementById('focus_help').addEventListener('click',function() {
        if (! document.getElementById('information').offsetParent) {
          window.open('#information','_blank');
        } else {
          show_help();
        }
      },false);
      document.body.addEventListener('click',function() {
        document.body.classList.remove('firstrun');
      });
      console.log("Hash is ",window.location.hash);
      if (window.location.hash == '#information') {
        document.body.classList.remove('firstrun');
        document.body.classList.add('information');
      }
    };

    var wire_clearsession = function(title,renderer) {
      document.getElementById('clearsession').textContent = title;
      document.getElementById('clearsession').style.display = 'block';
      document.getElementById('clearsession').onclick = function() {
        console.log("Clearing session");
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
        wire_dragging_disable(renderer);
        bean.add(MASCP.getLayer('primarySequence'),'selection',function(start,end) {
          if (! start && ! end ) {
            document.getElementById('selecttoggle').firstChild.removeAttribute('value');
            return;
          }
          document.getElementById('selecttoggle').firstChild.setAttribute('value',renderer.sequence.substr(start-1,end-start+1));
        });
        document.getElementById('selecttoggle').firstChild.addEventListener('onfocus',function(evt) {
          evt.preventDefault();
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

    var wire_dragging_disable = function(renderer) {
      var toggler = document.getElementById('selecttoggle');
      renderer.selecting = false;
      bean.add(document.body,'keydown',function(evt) {
        if (evt.keyCode == 16) {
          renderer.selecting = true;
          toggler.firstChild.removeAttribute('value');
          var curr_classname = toggler.className.replace('selecting','');
          toggler.className = curr_classname+" "+(renderer.selecting ? "selecting" : "");
          bean.fire(renderer,'draggingtoggle',[ ! renderer.selecting ]);
        }
      });
      bean.add(document.body,'keyup',function(evt) {
        if (evt.keyCode == 16 && renderer.selecting) {
          renderer.selecting = false;
          var curr_classname = toggler.className.replace('selecting','');
          toggler.className = curr_classname+" "+(renderer.selecting ? "selecting" : "");
          bean.fire(renderer,'draggingtoggle',[ ! renderer.selecting ]);
        }
      });

      bean.add(toggler,'click',function(evt) {
        if (evt.target != toggler) {
          return;
        }
        renderer.selecting = ! renderer.selecting;
        if (renderer.selecting) {
          toggler.firstChild.removeAttribute('value');
        }
        var curr_classname = toggler.className.replace('selecting','');
        toggler.className = curr_classname+" "+(renderer.selecting ? "selecting" : "");
        bean.fire(renderer,'draggingtoggle',[ ! renderer.selecting ]);
      });
      var is_toggle_action = false;

      bean.add(toggler,'touchstart',function(evt) {
        if (evt.target != toggler) {
          return;
        }
        toggler.firstChild.blur();
        toggler.firstChild.removeAttribute('value');
        renderer.selecting = ! renderer.selecting;
        bean.fire(renderer,'draggingtoggle',[! renderer.selecting]);
        is_toggle_action = true;
        var curr_classname = toggler.className.replace('selecting','');
        toggler.className = curr_classname+" "+(renderer.selecting ? "selecting" : "");
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
          renderer.selecting = ! renderer.selecting;
          curr_classname = toggler.className.replace('selecting','');
          toggler.className = curr_classname+" "+(renderer.selecting ? "selecting" : "");
          bean.fire(renderer,'draggingtoggle',[! renderer.selecting]);
        } else {
          if ( ! toggler.firstChild.getAttribute('value') ) {
            curr_classname = toggler.className.replace('selecting','');
            toggler.className = curr_classname+" "+(renderer.selecting ? "selecting" : "");
            bean.fire(renderer,'draggingtoggle',[! renderer.selecting]);
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
            var last_zoom = renderer.zoom;
            renderer.zoom = curr_zoom;
            if (renderer.zoom === last_zoom) {
              document.getElementById('zoomlabel').setAttribute('data-hint','Reached maximum zoom');
              if (timeout) {
                clearTimeout(timeout);
                timeout = null;
              }
              timeout = setTimeout(function() {
                start = null;
                document.getElementById('zoomlabel').removeAttribute('data-hint');
              },3000);
            }
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
            var last_zoom = renderer.zoom;
            renderer.zoom = curr_zoom;
            if (renderer.zoom === last_zoom) {
              document.getElementById('zoomlabel').setAttribute('data-hint','Reached minimum zoom');
              if (timeout) {
                clearTimeout(timeout);
                timeout = null;
              }
              timeout = setTimeout(function() {
                start = null;
                document.getElementById('zoomlabel').removeAttribute('data-hint');
              },3000);
            }
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
          to_select.parentNode.scrollTop = to_select.offsetTop;
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

    var wire_swissvar_links = function(renderer) {
      renderer._container.addEventListener('click',function(ev) {
        if ( ! ev.event_data) {
          return;
        }
        for (let rsid of ev.event_data) {
          if (rsid.match(/^rs\d+$/)) {
            window.open(`https://www.ncbi.nlm.nih.gov/SNP/snp_ref.cgi?type=rs&rs=${rsid}`,'_blank');
          }
        }
      });
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
        console.log("Updating protein list ",prots.length);
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
          var selected = window.document.getElementsByClassName('selected')[0];
          selected.parentNode.scrollTop = selected.offsetTop;
        }
    };

    var show_help = function() {
      document.getElementById('information').scrollIntoView();
      return;
    };

    var read_doi_conf = function(doi,callback) {
      console.log("Checking for static doi conf file");
      get_preferences().getStaticConf('/doi/'+encodeURIComponent(encodeURIComponent(doi || 'none')),function(err,conf) {
        if (err) {
          console.log("DOI conf requires authorisation - authenticating");
          MASCP.GatorDataReader.authenticate().then(function(url_base) {
            var conf = {
              'url' : url_base+'/doi/'+encodeURIComponent(doi || 'none'),
              'auth' : MASCP.GATOR_AUTH_TOKEN,
              'api_key' : MASCP.GATOR_CLIENT_ID,
              'async' : true,
              'type' : 'GET'
            };
            if ( doi ) {
              get_preferences().useStaticPreferences(conf,callback);
            } else {
              get_preferences().getStaticConf( conf, callback );
            }
          });
        } else {
          console.log("No authentication required to retrieve the file - proceeeding with standard fetch");
          if (doi) {
            get_preferences().useStaticPreferences('/doi/'+encodeURIComponent(encodeURIComponent(doi || 'none')),callback);
          } else {
            get_preferences().getStaticConf( conf, callback );
          }
        }
      });
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
      console.log("Binding auth event in doi conf");
      if ( ! get_preferences().metadata ) {
        MASCP.GatorDataReader.authenticate().then(function(url_base) {
          var conf = {
            'url' : url_base+'/metadata',
            'auth' : MASCP.GATOR_AUTH_TOKEN,
            'api_key' : MASCP.GATOR_CLIENT_ID,
            'async' : true,
            'type' : 'GET'
          };
          MASCP.Service.request(conf,function(err,metadata) {
            console.log("Populated metadata");
            get_preferences().metadata = metadata;
            console.log("Re-running doi_conf");
            use_doi_conf(doc,callback);
          });
        });
        return;
      }
      read_doi_conf(doc,callback);

    };

    var create_renderer = function(container) {

        var renderer = new MASCP.CondensedSequenceRenderer(container);
        renderer.font_order = 'Helvetica, Arial, sans-serif';
        setup_renderer(renderer);

        scale_text_elements(renderer);
        // domain_retriever = new MASCP.DomainRetriever(get_preferences(),renderer,function(editing,acc) {
        //   show_protein(acc,renderer);
        //   if (editing && renderer.navigation) {
        //     renderer.navigation.show();
        //   }
        // });
        return renderer;
    };

    var setup_visual_renderer = function(renderer) {
      wire_renderer(renderer);
      wire_swissvar_links(renderer);
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
      console.log("Show_protein",acc);
      if ( ! acc ) {
        return;
      }
      // if (document.getElementById('drive_install').classList.contains('drive_preferences')) {
      //   document.getElementById('drive_install').classList.remove('drive_preferences');
      //   wire_drive_button(renderer);
      // }
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
      get_preferences().getPreferences(function(err,prefs) {
        if ( ! err && prefs.user_datasets.glycodomain) {
          prefs.user_datasets.glycodomain.render_options.offset = 0;
        }
      });


      setup_renderer(renderer);


      var a_reader = new MASCP.UniprotReader();
      if (MASCP.getLayer(ucacc)) {
        delete MASCP.getLayer(ucacc).group;
      }

      // MASCP.Service.CacheService(a_reader);
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
        set_description(this.result.getDescription().replace(/OS=.*/,''));
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

    var load_homology = function(taxid,data) {
      if ( data ) {
        load_homology.data = data;
      }
      if (taxid && load_homology.data) {
        var wanted_ids = load_homology.data.filter(function(align) { return align.taxonomy == taxid; }).map(function(align) { return align.uniprot });
        var new_window = window.open([window.location].concat(wanted_ids).join('+'));
        new_window.opener = null;
      }
    };

    var wire_drive_button = function(renderer) {

      var options = {
        allowedConnections: ['AzureADv2','google-oauth2'],
        allowSignUp: false,
        auth: {
          responseType: 'token id_token',
          redirectUrl: window.location.origin,
          params: {
            audience: MASCP.AUTH0_AUDIENCE,
            scope: MASCP.AUTH0_SCOPES,
            login_hint : localStorage.userName ? localStorage.userName : 'abc123@ku.dk'
          }
        },
        theme: {
          logo: '/img/gdv_logo.svg',
          authButtons: {
            "AzureADv2": {
              displayName: "KU login",
              primaryColor: "#b7b7b7",
              foregroundColor: "#000000",
              icon: '/img/ku_seal.svg'
            }
          }
        },
        languageDictionary: {
          title: "GlycoDomainViewer"
        }
      };

      // Initiating our Auth0Lock
      var lock = new Auth0Lock(
        MASCP.AUTH0_CLIENT_ID,
        MASCP.AUTH0_DOMAIN,
        options
      );
      var show_lock = function(message) {
        lock.show(message ? { flashMessage: message } : {});
        document.getElementById('drive_install').classList.remove("drive_preferences");
      };

      var show_default_lock = show_lock.bind(null,null);

      document.getElementById('drive_install').addEventListener('click', show_default_lock ,false);


      // Listening for the authenticated event
      lock.on("authenticated", function(authResult) {
        lock.getUserInfo(authResult.accessToken, function(error, profile) {
          if (error) {
            // Handle error
            return;
          }

          console.log("Storing idToken");
          localStorage.setItem('userName',profile['http://glycocode/userName']);
          localStorage.setItem('idToken', authResult.accessToken);
          localStorage.setItem('profile', JSON.stringify(profile));
          authorised(authResult.accessToken);
        });
      });
      bean.add(MASCP.GatorDataReader,'unauthorized', function() {
        if (localStorage.getItem('idToken') && localStorage.getItem('idToken') !== 'null') {
            console.log("Logging out before silent reauth after unauthorized event");
            localStorage.setItem('idToken',null);
            // Initiating our Auth0Lock
            var webauth = new auth0.WebAuth({
              clientID: MASCP.AUTH0_CLIENT_ID,
              domain: MASCP.AUTH0_DOMAIN,
              redirectUri: window.location.origin +"/silent-callback.html",
              audience: MASCP.AUTH0_AUDIENCE,
              scope: MASCP.AUTH0_SCOPES,
              responseType: 'token id_token'
            });
            webauth.renewAuth({scope: MASCP.AUTH0_SCOPES, usePostMessage: true},function(err,authResult) {
              if ((err && err.error === 'login_required') || (authResult.error && authResult.error === 'login_required')) {
                show_lock({ type: 'error', text: 'You have been logged out, please log in again'});
                lock.on('hide',(ev) => {
                  localStorage.setItem('idToken',null);
                  localStorage.removeItem('profile');
                  console.log("Lock hidden, doing anonymous login");
                  MASCP.GatorDataReader.anonymous = true;
                  MASCP.GatorDataReader.authenticate();
                });
                return;
              }
              lock.getUserInfo(authResult.accessToken, function(error, profile) {
                if (error) {
                  // Handle error
                  return;
                }

                console.log("Storing idToken");
                localStorage.setItem('userName',profile['http://glycocode/userName']);
                localStorage.setItem('idToken', authResult.idToken);
                localStorage.setItem('profile', JSON.stringify(profile));
                authorised(authResult.accessToken);
              });
            });
        } else {
          show_lock({ type: 'error', text: 'You need to be logged in to access this data'});
        }
      });
      var authorised = function(token) {
        console.log("Trying to get a new auth token");
        var self_func = authorised;
        MASCP.GatorDataReader.ID_TOKEN = token || gapi.auth.getToken().id_token;
        MASCP.GatorDataReader.authenticate().catch(function(err) {
          if (err.message == 'Unauthorized') {
            console.log("Logging out before silent reauth");
            localStorage.setItem('idToken',null);
            localStorage.removeItem('profile');
            // Initiating our Auth0Lock
            var webauth = new auth0.WebAuth({
              clientID: MASCP.AUTH0_CLIENT_ID,
              domain: MASCP.AUTH0_DOMAIN,
              redirectUri: window.location.origin+"/silent-callback.html",
              audience: MASCP.AUTH0_AUDIENCE,
              scope: MASCP.AUTH0_SCOPES,
              responseType: 'token id_token'
            });
            webauth.renewAuth({scope: MASCP.AUTH0_SCOPES, usePostMessage: true},function(err,authResult) {
              if (err && err.error === 'login_required') {
                show_lock({ type: 'error', text: 'You have been logged out, please log in again'});
                lock.on('hide',(ev) => {
                  console.log("Lock hidden, doing anonymous login");
                  MASCP.GatorDataReader.anonymous = true;
                  MASCP.GatorDataReader.authenticate();
                });
                return;
              }
              lock.getUserInfo(authResult.accessToken, function(error, profile) {
                if (error) {
                  // Handle error
                  return;
                }
                console.log("Storing idToken");
                localStorage.setItem('userName',profile['http://glycocode/userName']);
                localStorage.setItem('idToken', authResult.accessToken);
                localStorage.setItem('profile', JSON.stringify(profile));
                authorised(authResult.accessToken);
              });
            });
          }
        });
        document.getElementById('drive_install').removeEventListener('click',show_default_lock);
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


              var template_config = { "sets" : sets_array, "custom_accepted" : null };

              renderer.fillTemplate("userset_tmpl",template_config,function(error,html) {
                flipped = flippant.flip(document.getElementById('sequence_frame'), html);
                var matches = flipped.querySelectorAll('ul.drive_preferences .remove');
                for (var i = 0 ; i < matches.length; i++) {
                  matches[i].addEventListener('click',remover_func,false);
                }
              });
            });
        },false);
      };
      if (localStorage.getItem('idToken') && localStorage.getItem('idToken') !== 'null') {
        MASCP.GatorDataReader.anonymous = false;
        authorised(localStorage.getItem('idToken'));
      } else {
        if (window.location.hash && window.location.hash.indexOf('id_token') >= 0) {
          return;
        }
        console.log("Doing an anonymous login");
        MASCP.GatorDataReader.anonymous = true;
        MASCP.GatorDataReader.authenticate();
      }
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
          document.getElementById('protein_list').classList.add('custom')
          handle_proteins(null,all_ids.filter( id => id.toString().toUpperCase().match(uprot_re1) || id.toString().toUpperCase().match(uprot_re2) ));
        }
        var text_content = (all_ids[0] || "").toString().replace(/\s+/g,'');
        if (text_content.toUpperCase().match(uprot_re1) || text_content.toUpperCase().match(uprot_re2)) {
          var selected;
          selected = document.getElementById('prot_'+text_content.toLowerCase());
          if (selected) {
            bean.fire(selected,'click');
            selected.parentNode.scrollTop = selected.offsetTop;
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

    var drive_install = function(callback) {
      callback();
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

    MASCP.msdata_default_url = '/msdata.renderer.js';
    MASCP.msdata_packed_url = '/msdata.packed.renderer.js';
    MASCP.msdata_packed_homology_url = '/msdata.packed_homology.renderer.js';
    MASCP.msdata_packed_predictions_url = '/msdata.packed_predictions.renderer.js';
    MASCP.msdata_packed_variation_url = '/packed_variation.renderer.js';
    MASCP.msdata_cleavage_url = '/cleavage.renderer.js';
    MASCP.domains_packed_url = '/glycodomain.packed.renderer.js';


    var get_renderer = function(renderer_url,callback) {

      if (renderer_url.match(/^msdata:default/)) {
        renderer_url = MASCP.msdata_default_url;
      }

      if (renderer_url.match(/^msdata:packed$/)) {
        renderer_url = MASCP.msdata_packed_url;
      }
      if (renderer_url.match(/^msdata:packed_homology$/)) {
        renderer_url = MASCP.msdata_packed_homology_url;
      }
      if (renderer_url.match(/^variation:packed$/)) {
        renderer_url = MASCP.msdata_packed_variation_url;
      }
      if (renderer_url.match(/^msdata:packed_predictions$/)) {
        renderer_url = MASCP.msdata_packed_predictions_url;
      }
      if (renderer_url.match(/^cleavage:full$/)) {
        renderer_url = MASCP.msdata_cleavage_url;
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

    var maintain_track_order = function(current_order,desired) {
      desired = desired.filter( function(track) {
        return (current_order.indexOf(track) >= 0) || MASCP.getGroup(track);
      });
      var grouped = desired.map( track => {
        return MASCP.getGroup(track)? MASCP.getGroup(track)._layers.map( lay => lay.name )  : [track];
      });
      grouped = [].concat.apply( [], grouped );
      desired.concat(grouped).forEach( function(track) {
        current_order.splice(current_order.indexOf(track),1);
      });
      current_order = desired.concat(current_order);
      return current_order;
    };

    var get_usersets = function(acc,renderer) {

      // Don't trigger any popups
      if ( ! window.event ) {
        window.event = { "which" : null };
      }

      var allowed = { "MASCP.DomainRetriever" : 1, "MASCP.PrideRunner" : 1, "MASCP.HydropathyRunner" : 1, "MASCP.UniprotSecondaryStructureReader" : 1 };
      console.log("About to get watched docs");
      renderer.desired_track_order = renderer.desired_track_order || [];
      renderer.desired_track_order.splice(0,0,acc);
      var desired_track_order = renderer.desired_track_order;
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

        var method = pref["sites"] || pref.render_options["sites"];

        var track_name = (pref.render_options || {})["track"] ? pref.render_options["track"] : (renderer.acc ? "all_domains" : acc);
        if (  desired_track_order.indexOf(track_name) < 0 &&
            ! pref.generated &&
            (! MASCP.getLayer(track_name) || ! MASCP.getLayer(track_name).group || MASCP.getLayer(track_name).group.name !== 'isoforms')
        ) {
          desired_track_order.push(track_name);
        }
        if (pref && pref.icons || (pref.render_options || {}).icons ) {
          var icon_block = pref.icons || (pref.render_options || {}).icons;
          MASCP.Service.request(icon_block.url,function(err,doc) {
            if (doc) {
              renderer.importIcons(icon_block.namespace,doc.documentElement);
              console.log("Imported icons");
            }
          },"xml");
        }
        if (reader.datasetname == 'homology') {
          reader.registerSequenceRenderer(renderer);
          reader.bind('resultReceived',function() {
            load_homology(null,this.result ? this.result._raw_data.alignments : []);
          });
        }

        reader.retrieve(acc,function(force) {
          var layer_hidden = false;
          if ( ! this.result ) {
            return;
          }

          var datas = this.result._raw_data.data;

          if ( ! MASCP.getLayer(track_name) || MASCP.getLayer(track_name).disabled ) {
            MASCP.registerLayer(track_name, {"fullname" : track_name }, [renderer]);
          }
          MASCP.registerLayer(track_name, { "fullname" : track_name }, [renderer]);
          if ( renderer.trackOrder.indexOf(track_name) < 0 ) {
            if (! MASCP.getLayer(track_name).group) {
              renderer.trackOrder = renderer.trackOrder.concat(track_name);
              renderer.showLayer(track_name);
            } else if (['datasets','cell_lines'].indexOf(MASCP.getLayer(track_name).group.name) >= 0) {

              // The combined track is a defined track from our preferences
              // but we don't have the group track in there
              // We need to add in the group to make sure that the ordering is ok
              if (desired_track_order.indexOf(MASCP.getLayer(track_name).group.name) < 0) {
                desired_track_order.splice(desired_track_order.indexOf('combined')+1,0, MASCP.getLayer(track_name).group.name);
              }

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
          renderer.trackOrder = maintain_track_order(renderer.trackOrder,desired_track_order);

          // if ( ! renderer.isLayerActive(track_name) ) {
          //   console.log( track_name, [ MASCP.getGroup('datasets'), MASCP.getLayer(track_name) ]);
          // }
          if (MASCP.getLayer(track_name) && MASCP.getLayer(track_name).group && ['datasets','cell_lines'].indexOf(MASCP.getLayer(track_name).group.name) >= 0 ) {
            renderer.createGroupController('combined',MASCP.getLayer(track_name).group.name);
          }
          if (MASCP.getLayer(track_name) && MASCP.getGroup(track_name)) {
            console.log("Creating group controller for ",track_name);
            renderer.createGroupController(track_name,track_name);
          }
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
                  console.log("Setting visible for ",track_name,acc);
                  self_func.call({'result': self_result, 'acc' : acc },true);
                },0);
              }
            };
            bean.add(MASCP.getLayer(track_name),'visibilityChange',vis_change_func);
            renderer.bind('sequenceChange',vis_change_func);
          }
          if (! layer_hidden && pref.render_options["renderer"] && JSandbox) {
            console.log("Rendering ",track_name, acc);
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
              // var sandbox = new JSandbox();
              if (! window.sandboxes ) {
                window.sandboxes = {};
              }
              var sandbox = window.sandboxes[pref.render_options["renderer"]] || (new JSandbox());
              window.sandboxes[pref.render_options["renderer"]] = sandbox;
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
                            "callback" : function(objects) {
                              // sandbox.terminate();
                              if ( Array.isArray(objects) ) {
                                var temp_objects = {}
                                temp_objects[acc] = objects;
                                objects = temp_objects;
                              }
                              Object.keys(objects).forEach(function(acc) {
                                var r = objects[acc];
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
                                  // Split by track here
                                  renderer.renderObjects(track_name,r.filter( function(item) {
                                    return ! item.track;
                                  }));
                                  var items_by_track = {};
                                  r.filter( function(item) {
                                    return item.track;
                                  }).forEach(function(item) {
                                    items_by_track[item.track] = items_by_track[item.track] || [];
                                    items_by_track[item.track].push(item);
                                  });
                                  Object.keys(items_by_track).forEach(function(track) {
                                    if (MASCP.getLayer(track)) {
                                      MASCP.registerLayer(track,{},[renderer]);
                                      // We force a refresh of the track order
                                      // to pick up any layers that have been re-enabled
                                      renderer.trackOrder = renderer.trackOrder;
                                      renderer.renderObjects(track,items_by_track[track]);
                                    }
                                  });
                                  renderer.trigger('resultsRendered',[this]);
                                  renderer.refresh();
                                }, "agi" : acc });
                                renderer.trigger('readerRegistered',[obj]);
                                obj.gotResult();
                              });
                            }
                          });
              });
            });
            return;
          }
        });
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
            renderer.desired_track_order = renderer.desired_track_order || [];
            renderer.desired_track_order.push('isoforms');
            end_clustal = function() {
              self.result = null;
              renderer.desired_track_order.splice(renderer.desired_track_order.indexOf('isoforms'),1);
            };
          });
        }
        runner.retrieve("dummy",readyfunc);
    };

    var collect_sequences = function(prots,sequences,callback) {
      var acc = prots.shift();
      var caller = collect_sequences;
      var a_reader = new MASCP.UniprotReader();
      // MASCP.Service.CacheService(a_reader);
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
            get_preferences().getPreferences(function(err,prefs) {
              if (! err && prefs.user_datasets.glycodomain) {
                prefs.user_datasets.glycodomain.render_options.offset = 10;
              }
              window.showing_clustal = true;
              sequences.forEach(function(seq) {
                retrieve_data(seq.agi.toUpperCase(),renderer);
              });
            });

            set_description("Clustal Omega alignment");
            document.getElementById('uniprot_id').textContent = "";
          });
        }
      });
    };

    var fix_citation_links = function(element) {
      let walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null,
          false
      );

      let node;
      let match;
      let textNodes = [];
      while(node = walker.nextNode()) {
        textNodes.push(node);
      }
      for (let node of textNodes) {
        if (match = node.nodeValue.match(/dx.doi.org\/[A-Za-z0-9\-\/\.]+/)){
          let range = new Range();
          range.setStart(node,match.index-8);
          range.setEnd(node,match.index+match[0].length-1);
          let anchor = document.createElement('a');
          anchor.href = 'https://'+match[0].replace(/\.$/,'');
          range.surroundContents(anchor);
        }
      }
    };

    var show_available_citations = function() {
      read_doi_conf(null, function(err,conf) {
        let all_dois = Object.keys(conf).map( set => {
          return conf[set].dois;
        });
        let dois = [].concat.apply([], all_dois).filter( (v, i, a) => a.indexOf(v) === i && v );
        let Cite = require('citation-js');
        Cite.async(dois).then( dat => {
          return dat.get({format: 'real' , type: 'html', style: 'citation-harvard1' })
        }).then( element => {
          document.getElementById('citations').innerHTML = '';
          fix_citation_links(element);
          document.getElementById('citations').appendChild(element);
        });
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
    if ( ! has_ready ) {
      window.addEventListener("DOMContentLoaded", init);
    }

    var ready_func = function() {
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
        if ( ! prots ) {
          prots = [];
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
      let handled_login = fetch(window.location.hostname == 'localhost' ? 'https://test.glycocode.com/api/login/config' : '/api/login/config').then(function(response) {
        return response.json();
      }).then(function(config) {
        MASCP.AUTH0_AUDIENCE = config.API_AUDIENCE;
        MASCP.AUTH0_DOMAIN = config.AUTH0_DOMAIN + ".auth0.com";
        wire_drive_button(renderer);
      });

      if (window.location.toString().match(/doi/)) {
        console.log("Checking DOI data");
        handled_login.then( () => {
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
        });
      } else {
        console.log("Getting prefs");
        get_preferences(handle_proteins);
      }

      handled_login.then( () => {
        show_available_citations();
      });


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

      wire_uniprot_id_changer(renderer,handle_proteins);
      wire_genesearch(renderer);
      wire_history(renderer,handle_proteins);
      if (window.matchMedia && window.matchMedia('screen and (max-device-width: 760px)').matches) {
        wire_smartphone_controls();
      }

      wire_firstrun(renderer);

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
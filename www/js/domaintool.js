    if (!(window.console && console.log)) { (function() { var noop = function() {}; var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn']; var length = methods.length; var console = window.console = {}; while (length--) { console[methods[length]] = noop; } }()); }

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
            var box = renderer.getAA(start).addBoxOverlay(layer,end-start+1);
            box.aa = start;
            box.aa_width = end-start+1;
            box.removeAttribute('style');
            box.setAttribute('fill','#999999');
            box.setAttribute('opacity','1');
            box.setAttribute('stroke-width','0');
            box.setAttribute('transform','translate('+box.getAttribute('x')+','+box.getAttribute('y')+')');
            box.setAttribute('x','0');
            box.setAttribute('y','-100');
            box.setHeight = function(hght) {
              this.setAttribute('y',-2*renderer._RS/renderer.zoom);
              this.setAttribute('height',hght*0.1);
            };
            box.move = function(new_x,new_width) {
              var transform_attr = this.getAttribute('transform');
              var matches = /translate\(.*[,\s](.*)\)/.exec(transform_attr);
              if (matches[1]) {
                this.setAttribute('transform','translate('+(new_x*renderer._RS)+','+matches[1]+')');
              }
              this.setAttribute('width',new_width*renderer._RS);
            };
            box.parentNode.insertBefore(box,box.parentNode.firstChild.nextSibling);
          }
          renderer.showLayer(layer);
          renderer.refresh();
          jQuery(renderer).trigger('resultsRendered',[self]);
        });
      };
    };



    var render_sites = function(layer,do_grouping,offset) {
      if (typeof(offset) == 'undefined' || offset === null) {
        offset = -3;
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
                    renderer.getAA(site).addToLayer(layer,{"content" : (offset > 0) ? renderer.light_galnac() : renderer.galnac(), "offset" : offset, "height" : 24,  "bare_element" : true });
                  });
                } else {
                  group.push(current);
                  group.forEach(function(site){
                    renderer.getAA(site).addToLayer(layer,{"content" : (offset > 0) ? renderer.light_galnac() : renderer.galnac(), "offset" : offset, "height" : 24,  "bare_element" : true })[1].zoom_level = 'text';
                  });
                  var rect = renderer.getAA(group[0]).addShapeOverlay(layer,current-group[0]+1,{ "shape" : "roundrect", "offset" : offset });
                  var a_galnac = (offset > 0) ? renderer.light_galnac() : renderer.galnac();
                  rect.setAttribute('fill',a_galnac.getAttribute('fill'));
                  rect.setAttribute('stroke',a_galnac.getAttribute('stroke'));
                  a_galnac.parentNode.removeChild(a_galnac);
                  rect.setAttribute('stroke-width','50');
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
              return;
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

    var wire_renderer = function(renderer) {
      wire_renderer_sequence_change(renderer);
      wire_renderer_zoom(renderer);
      if (MASCP.AnnotationManager) {
        var annotation_manager = new MASCP.AnnotationManager(renderer);
        wire_find(annotation_manager);
        wire_dragging_disable(renderer,annotation_manager);
        annotation_manager.addSelector(function(text) {
          document.getElementById('selecttoggle').firstChild.textContent = text;
          selectElementContents(document.getElementById('selecttoggle').firstChild);
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

    var selectElementContents = function(el) {
        if (window.getSelection && document.createRange) {
            var sel = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (document.selection && document.body.createTextRange) {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.select();
        }
    }

    var wire_dragging_disable = function(renderer,manager) {
      var toggler = document.getElementById('selecttoggle');
      manager.selecting = false;
      bean.add(toggler,'click',function(e) {
        if (e.target != toggler) {
          return;
        }
        manager.selecting = ! manager.selecting;
        var curr_classname = toggler.className.replace('selecting','');
        toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
        bean.fire(renderer,'draggingtoggle',[ ! manager.selecting ]);
      });
      var is_toggle_action = false;

      bean.add(toggler,'touchstart',function(evt) {
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
        if ( ! is_toggle_action ) {
          manager.selecting = ! manager.selecting;
          var curr_classname = toggler.className.replace('selecting','');
          toggler.className = curr_classname+" "+(manager.selecting ? "selecting" : "");
          bean.fire(renderer,'draggingtoggle',[! manager.selecting]);
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
      return;
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
          input.textContent = "Load proteins";
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
        var selected = null;
        prots.forEach(function(prot) {
          var a_div = document.createElement('div');
          a_div.uprot = prot.id;
          a_div.textContent = ((prot.name || prot.id)+"");
          list.appendChild(a_div);
          a_div.setAttribute('id','prot_'+prot.id.toLowerCase());
          a_div.setAttribute('class','hint--left hint--inline ');
          a_div.addEventListener('click',function() {
            var clazz;
            if (selected) {
              clazz = selected.getAttribute('class') || '';
              selected.setAttribute('class',clazz.replace(/selected\s/,''));
            }
            clazz = this.getAttribute('class') || '';
            this.setAttribute('class',clazz+'selected ');
            selected = this;
            if (! history) {
              localStorage.setItem('selected',this.uprot);
            }
            show_protein(this.uprot,renderer,function() {
              setTimeout(function() {
                a_div.removeAttribute('data-hint');
              },500);
            });
            a_div.setAttribute('data-hint',"Loading..");
          },false);
          if (curr_acc == prot) {
            bean.fire(a_div,'click');
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

        renderer = new MASCP.CondensedSequenceRenderer(container);
        renderer.font_order = 'Helvetica, Arial, sans-serif';
        setup_renderer(renderer);

        scale_text_elements(renderer);
        MASCP.GOOGLE_CLIENT_ID="936144404055.apps.googleusercontent.com";
        domain_retriever = new MASCP.DomainRenderer(renderer,function(editing,acc) {
          if (editing) {
            show_protein(acc,renderer);
            if (renderer.navigation) {
              renderer.navigation.show();
            }
          }
            // show_protein()
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

    var show_protein = function(acc,renderer,success) {
      if ( ! acc ) {
        return;
      }
      var ucacc = acc.toString().toUpperCase();

      if (window.ga) {
        setTimeout(function() {
          window.ga('send','pageview','/uniprot/'+ucacc);
        },0);
      }
      if (history && history.pushState && (history.state || {})['uniprot_id'] !== ucacc ) {
        history.pushState({"uniprot_id" : ucacc},ucacc,"/uniprot/"+ucacc);
      }

      end_clustal();
      end_clustal = function() {};
      window.showing_clustal = false;

      setup_renderer(renderer);


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

            window.notify.alert("Problem contacting the UniProt servers");
            return;
          }

          window.notify.warn("Could not retrieve sequence from UniProt");
          return;
        }

        // renderer.acc = acc;
        renderer.setSequence(this.result.getSequence());
        set_description(this.result.getDescription().replace(/_HUMAN.*GN=/,'/').replace(/\s.+/,''));
        document.getElementById('uniprot_id').textContent = ucacc;
        renderer.grow_container = true;
        if (success) {
          success();
        }
      });

    };

    var wire_drive_button = function() {
      drive_install(function(err,auth_func) {
        if (auth_func) {
          document.getElementById('drive_install').addEventListener('click',function() {
            if (window.ga) {
              setTimeout(function() {
                window.ga('send','event','drive_install','click');
              },0);
            }

            auth_func(function(err) {
              if (err) {
                return;
              } else {
                document.getElementById('drive_install').style.display = 'none';
              }
            });
          },false);
        } else if (err) {
          return;
        } else {
          document.getElementById('drive_install').style.display = 'none';
        }

      });
    };

    var wire_uniprot_id_changer = function(renderer) {
      var uniprot = document.getElementById('uniprot_id');
      uniprot.addEventListener('input',function() {
        var uprot_re1 = /([A-N]|[R-Z])[0-9][A-Z]([A-Z]|[0-9])([A-Z]|[0-9])[0-9]/;
        var uprot_re2 = /[OPQ][0-9]([A-Z]|[0-9])([A-Z]|[0-9])([A-Z]|[0-9])[0-9]/;
        if (uniprot.textContent.toUpperCase().match(uprot_re1) || uniprot.textContent.toUpperCase().match(uprot_re2)) {
          var selected;
          selected = document.getElementById('prot_'+uniprot.textContent.toLowerCase());
          if (selected) {
            bean.fire(selected,'click');
            selected.scrollIntoView(true);
          } else {
            selected = (document.getElementsByClassName('selected') || [])[0];
            if (selected) {
              var clazz = selected.getAttribute('class') || '';
              selected.setAttribute('class',clazz.replace(/selected\s/,''));
            }
            show_protein(uniprot.textContent,renderer);
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
        } else {
          callback.call(null);
        }
      });
    };

    var get_proteins = function(protein_doc,callback) {
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
          callback(results);
        });
        datareader.bind('ready',function() {
          notification.hide();
        });
        datareader.bind('error',function(e,err) {
          notification.hide();
          if (err.cause && err.cause == "No user event") {
            callback.call(null,protein_doc,err.authorize);
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
      datareader.setupSequenceRenderer = render_sites(acc);
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

    var get_usersets = function(acc,renderer) {

      // Don't trigger any popups
      if ( ! window.event ) {
        window.event = { "which" : null };
      }

      (new MASCP.GoogledataReader()).readWatchedDocuments("Domaintool preferences",function(err,pref,reader) {
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

          var obj = { "gotResult" : function() {
            (datas.sites || []).forEach(function(site) {
              renderer.getAA(parseInt(site)).addToLayer(track_name,{"content" : renderer[method] ? renderer[method].call(renderer) : method , "offset" : 3, "height" : 24,  "bare_element" : true });
            });
            (datas.peptides || []).forEach(function(peptide) {
              var box = renderer.getAminoAcidsByPeptide(peptide)[0].addBoxOverlay(track_name,peptide.length,1);
              box.removeAttribute('style');
              box.setAttribute('fill','#999999');
              box.setAttribute('opacity','1');
              box.setAttribute('stroke-width','0');
              box.setAttribute('transform','translate('+box.getAttribute('x')+','+box.getAttribute('y')+')');
              box.setAttribute('x','0');
              box.setAttribute('y','-100');
              box.setHeight = function(hght) {
                this.setAttribute('y',-2*renderer._RS/renderer.zoom);
                this.setAttribute('height',hght*0.1);
              };
              box.move = function(new_x,new_width) {
                var transform_attr = this.getAttribute('transform');
                var matches = /translate\(.*[,\s](.*)\)/.exec(transform_attr);
                if (matches[1]) {
                  this.setAttribute('transform','translate('+(new_x*renderer._RS)+','+matches[1]+')');
                }
                this.setAttribute('width',new_width*renderer._RS);
              };
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
                var size = 24;
                if (offsets[site]) {
                  offset = offsets[site];
                }
                offsets[site] = offset + 2;

                if (symbol == "HEART") {
                  icons[symbol] = "/icons.svg?"+(new Date()).getTime()+"#heart";
                  size = 48;
                }
                if (symbol == "KIDNEY") {
                  icons[symbol] = "/icons.svg?"+(new Date()).getTime()+"#kidneys";
                  size = 48;
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
      var top_offset = 3;
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

    var get_domains = function(acc,next) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "domains";
            
      datareader.retrieve(acc,function(err) {
        if (! this.result ) {
          next();
          return;
        }
        next(this.result._raw_data.data);
      });
    };

    var get_accepted_domains = function(acc,next) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "spreadsheet:0Ai48KKDu9leCdHM5ZXRjdUdFWnQ4M2xYcjM3S0Izdmc";
      datareader.retrieve(acc,function(err) {
        var wanted_domains = null;
        if (! err && this.result ) {
          wanted_domains = this.result._raw_data.data.domains;
        }
        get_domains(acc,function(all_domains) {
          next(acc,filter_domains(all_domains,wanted_domains));
        });
      });
    };

    var filter_domains = function(all_domains,wanted_domains) {
      var results = {};
      if (! wanted_domains ) {
        return all_domains;
      }
      if (! all_domains ) {
        return results;
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
      return results;
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

    var prepare_alignment = function(prots) {
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


      wire_drive_button();
      wire_uniprot_id_changer(renderer);
      wire_clipboarder();
      wire_genesearch(renderer);
      wire_history(renderer);

      var state = get_passed_in_state();
      var protein_doc_id = "0Ai48KKDu9leCdFRCT1Bza2JZUVB6MU4xbHc1UVJaYnc";

      if (state.ids) {
        get_usersets = function() {};
        var defaults = {};
        //                "sites" : "man",
        //        "peptides" : "true",
        var run_parser = false;
        var parser = function(datablock){
          run_parser = true;
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
          delete json[state.ids[0]];
          sessionStorage.setItem("update_timestamps",JSON.stringify(json));
        }
        (new MASCP.GoogledataReader()).addWatchedDocument("Domaintool preferences",state.ids[0],parser,function(err,docname) {
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
          (new MASCP.GoogledataReader()).getPreferences("Domaintool preferences",function(err,prefs) {
            if ( ! err ) {
              if (run_parser) {
                prefs.user_datasets[state.ids[0]].render_options = defaults;
              }
              (new MASCP.GoogledataReader()).writePreferences("Domaintool preferences",function(err,prefs) {
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
      }

      if (state.exportIds && state.exportIds.length > 0) {
        protein_doc_id = state.exportIds[0];
        document.getElementById('drive_install').style.display = 'none';
      }
      if (window.location.toString().match(/uniprot/)) {
        var results = /uniprot\/(.*)/.exec(window.location);
        if (results && results[1]) {
          var prot = { "id" : results[1], "name" : results[1] };
          prot.toString = function() { return this.id; };
          if (history && history.replaceState) {
            history.replaceState({"uniprot_id" : results[1]},results[1],"/uniprot/"+results[1]);
          }
          show_protein(prot,renderer);
          // update_protein_list([prot],renderer);
        }
        // document.getElementById('print').addEventListener('click',function() {
        //   do_printing([prot]);
        // },false);
        // return;
      }


      var handle_proteins = function(prots,auth_func) {
        if (prots.length < 25) {
          document.getElementById('align').style.display = 'block';
          document.getElementById('align').addEventListener('click',function() {
            var my_prots = [].concat(prots);
            this.removeEventListener('click',arguments.callee);
            callback_func = prepare_alignment(my_prots);
            document.getElementById('align').setAttribute('class','running');
            this.addEventListener('click',function() {
              callback_func();
            },false);
          },false);
        }
        update_protein_list(prots,renderer,auth_func);
        document.getElementById('print').addEventListener('click',function() {
          do_printing(prots);
        },false);

        add_keyboard_navigation();
      };

      if (/cazy\//.exec(window.location)) {
        document.getElementById('drive_install').style.display = 'none';
        (function() {
            var family = window.location.href.split('/').reverse().shift();
            xmlhttp =  new XMLHttpRequest();
            if (xmlhttp) {
                xmlhttp.onreadystatechange = function() {
                  if (xmlhttp.readyState == 4) {
                      if (xmlhttp.status == 200) {
                          var prots = [];
                          (JSON.parse(xmlhttp.responseText)).forEach(function(prot) {
                            prot.toString = function() { return this.id };
                            prots.push(prot);
                            MASCP.registerLayer(prot.id.toLowerCase(),{'fullname': prot.name, 'color' : '#aaa'});
                          });
                          handle_proteins(prots);
                      }
                  }
                };
            }
            xmlhttp.open("GET", '/data/latest/cazy/'+family, true);
            xmlhttp.setRequestHeader("Content-type",
                "application/x-www-form-urlencoded");
            xmlhttp.send('');
        })();
      } else {
        get_proteins(protein_doc_id,handle_proteins);
        if (state.exportIds) {
          setInterval(function() {
            get_proteins(protein_doc_id,handle_proteins);
          },10*60*1000);
        }
      }

    };
    if (has_ready) {
      ready_func();
    }
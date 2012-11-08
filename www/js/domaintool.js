
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
          var galnac = renderer._canvas.rect(-0.5,-2.3,1,1);
          galnac.setAttribute('fill','#ffff00');
          return galnac;
        };
        renderer.light_galnac = function() {
          var result = renderer.galnac();
          result.setAttribute('fill','#ffffB3');
          result.setAttribute('stroke','#a6a635');
          return result;
        }
        renderer.nlinked = function() {
          var n_glc = renderer._canvas.group();
          var glcnac = renderer._canvas.rect(-0.5,-2.3,1,1);
          glcnac.setAttribute('fill','#0000ff');
          n_glc.push(glcnac);
          glcnac = renderer._canvas.rect(-0.5,-1,1,1);
          glcnac.setAttribute('fill','#0000ff');
          n_glc.push(glcnac);
          return n_glc;
        };
        renderer.fuc = function() {
          var fuc = renderer._canvas.path("M0,-125 25,-75 -25,-75 z");
          fuc.setAttribute('fill','#ff0000');
          fuc.setAttribute('stroke','#990000');
          fuc.setAttribute('stroke-width','5');
          return fuc;
        };
        renderer.man = function() {
          var man = renderer._canvas.circle(0,-2,0.5);
          man.setAttribute('fill','#00ff00');
          man.setAttribute('stroke','#009900');
          man.setAttribute('stroke-width','5');
          return man;
        };
        renderer.glc = function() {
          var glc = renderer._canvas.circle(0,-2,0.5);
          glc.setAttribute('fill','#0000ff');
          glc.setAttribute('stroke','#000099');
          glc.setAttribute('stroke-width','5');
          return glc;
        };
        renderer.gal = function() {
          var gal = renderer._canvas.circle(0,-2,0.5);
          gal.setAttribute('fill','#ffff00');
          gal.setAttribute('stroke','#999900');
          gal.setAttribute('stroke-width','5');
          return gal;
        };
        renderer.hex = function() {
          var hex = renderer._canvas.circle(0,-2,0.5);
          hex.setAttribute('fill','#ffffff');
          hex.setAttribute('stroke','#999999');
          hex.setAttribute('stroke-width','5');
          return hex;
        };
        renderer.hexnac = function() {
          var hexnac = renderer._canvas.rect(-0.5,-2.3,1,1);
          hexnac.setAttribute('fill','#ffffff');
          hexnac.setAttribute('stroke','#999999');
          hexnac.setAttribute('stroke-width','5');
          return hexnac;
        };
        renderer.xyl = function() {
          var xyl = renderer._canvas.path('M0,-120 L0,-120 -15,-75 22.5,-105 -22.5,-105 15,-75 z');
          xyl.setAttribute('fill','#ff9999');
          xyl.setAttribute('stroke','#997777');
          xyl.setAttribute('stroke-width','5');
          return xyl;
        };
    };

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

    var render_domains = function(renderer,domains) {
        renderer.text_els = [];
        MASCP.registerLayer("all_domains", { 'fullname' : "All domains", 'color' : '#aaaaaa' },[renderer]);
        var domain_keys = [];
        for (var domain in domains) {
          domain_keys.push(domain);
        }
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
              renderer.getAA(start).addToLayer("all_domains", {"height" : 24, "content" : element_func(), "offset" : 3, "angle": 0, "bare_element" : true });
              renderer.getAA(start).addToLayer(lay_name, {"height" : 16, "content" : element_func(), "offset" : -1, "bare_element" : true });
            } else {
              var all_box;
              var box;
              if (window.DOMAIN_DEFINITIONS[domains[dom].name]) {
                  var dats = window.DOMAIN_DEFINITIONS[domains[dom].name];
                  var fill = (renderer.gradients.length > 0) ? "url('#grad_"+dats[1]+"')" : dats[1];
                  all_box = renderer.getAA(start).addShapeOverlay("all_domains",end-start+1,{ "shape" : dats[0], "height" : 8, "fill" : fill, "rotate" : dats[2] || 0 });
                  all_box.setAttribute('stroke','#999999');
                  all_box.style.strokeWidth = '10px';
                  box = renderer.getAA(start).addShapeOverlay(lay_name,end-start+1,{ "shape" : dats[0], "fill" : 'url("#grad_'+dats[1]+'")' });
              } else {
                  all_box = renderer.getAA(start).addBoxOverlay("all_domains",end-start+1,1);
                  box = renderer.getAA(start).addBoxOverlay(lay_name,end-start+1,1);                
              }

              var a_text = renderer.getAA(parseInt(0.5*(start+end))).addTextOverlay("all_domains",0,{ 'txt' : track_name });
              a_text.setAttribute('fill','#111111');
              a_text.setAttribute('stroke','#999999');
              renderer.text_els.push([a_text,all_box]);
            }

            if (domains[dom].description) {
              box.addEventListener('click',function() {
                  if (this.cout) {
                    return;
                  }
                  var left_pos = start;
                  var right_pos = end;
                  var left_vis = renderer.leftVisibleResidue();
                  var right_vis = renderer.rightVisibleResidue();
                  if (left_vis > start) {
                    left_pos = left_vis;
                  }
                  if (right_vis < end) {
                    right_pos = right_vis;
                  }
                  this.cout = renderer.getAA(parseInt(0.5*(left_pos+right_pos))).callout(thing,'description_tmpl',{ 'width' : 10, 'height' : 3, 'desc' : desc || domains[dom].name, 'start' : start, 'end' : end });
                  renderer.refresh();
                  this.cout.addEventListener('click',function() {
                    if (this.parentNode) {
                      this.parentNode.removeChild(this);
                    }
                    this.cout = null;
                  });
              });
            }
            done_anno = true;
          });
        });
        renderer.trackOrder.push('all_domains');
        renderer.showLayer('all_domains');
        renderer.zoom -= 0.0001;

    };


    var wire_renderer = function(renderer) {
      wire_renderer_sequence_change(renderer);
      wire_renderer_zoom(renderer);      
    };

    var wire_renderer_sequence_change = function(renderer) {
      var dragger = new GOMap.Diagram.Dragger();
      var seq_change_func = function() {
        var zoomFactor = 0.95 * renderer._container.parentNode.clientWidth / (2 * renderer.sequence.length);
        renderer.zoom = zoomFactor;
        dragger.applyToElement(renderer._canvas);
        GOMap.Diagram.addTouchZoomControls(renderer, renderer._canvas);
        GOMap.Diagram.addScrollZoomControls(renderer, renderer._canvas,0.1);
        renderer.navigation.hide();
        ["purple","pink","blue","green","yellow","orange","red","gray","#4285F4"].forEach(function(col) {
          renderer.add3dGradient(col);
        });
      };

      jQuery(renderer).bind('sequenceChange', seq_change_func);

    };


    var wire_renderer_zoom = function(renderer) {
      jQuery('#zoomin').click(function() {
        var start_zoom = renderer.zoom;
        var curr_zoom = start_zoom;
        var count = 0;
        while (start_zoom === renderer.zoom && count < 5) {
            curr_zoom += 0.5;
            if (renderer.grow_container) {
              renderer.zoomCenter = 'center';
            }
            renderer.zoom = curr_zoom;
            renderer.zoomCenter = null;
            count++;
        }
      });

      jQuery('#zoomout').click(function(e) {
        var start_zoom = renderer.zoom;
        var curr_zoom = start_zoom;
        var count = 0;
        while (start_zoom === renderer.zoom && count < 5) {
            curr_zoom -= 0.5;
            if (renderer.grow_container) {
              renderer.zoomCenter = 'center';
            }
            renderer.zoom = curr_zoom;
            renderer.zoomCenter = null;
            count++;
        }
      });
    };

    var add_keyboard_navigation = function() {
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
      });
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
          });
          list.appendChild(input);
          return;
        }
        var list = document.getElementById("protein_list");
        while (list.childNodes.length > 0) {
          list.removeChild(list.firstChild);
        }
        var curr_acc = localStorage.getItem('selected');

        var selected = null;
        prots.forEach(function(prot) {
          var a_div = document.createElement('div');
          a_div.uprot = prot;
          a_div.textContent = (prot+"").toUpperCase();
          list.appendChild(a_div);
          a_div.setAttribute('id','prot_'+prot.toLowerCase());

          a_div.addEventListener('click',function() {
            var clazz;
            if (selected) {
              clazz = selected.getAttribute('class') || '';
              selected.setAttribute('class',clazz.replace(/selected\s/,''));
            }
            clazz = this.getAttribute('class') || '';
            this.setAttribute('class',clazz+'selected ');
            selected = this;
            localStorage.setItem('selected',this.uprot);
            show_protein(this.uprot,renderer);
          });
          if (curr_acc == prot) {
            bean.fire(a_div,'click');
          }

        });
        if (window.document.getElementsByClassName('selected').length > 0) { 
          window.document.getElementsByClassName('selected')[0].scrollIntoView(true);
        }
    };

    var do_printing = function(proteins) {
        var win = window.open();
        var a_doc = win.document;
        a_doc.open();
        a_doc.close();
        var link = document.createElement('link');
        link.setAttribute('rel','stylesheet');
        link.setAttribute('href','css/style.css');
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
        var blah = function (prot,cback) {
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
              if ( ! mf ) {
                mf = my_rend._media_func;
                (my_rend.win() || window).matchMedia('print').addListener(print_func);
                my_rend._media_func = function() {};
              }
              rend.navigation.hide();
              rend.navigation.show = function(){};
              retrieve_data(prot,my_rend,function() {
                my_rend.trackOrder = ["all_domains"];
                setTimeout(function() {
                  my_rend.printing = true;
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
          if (acc && counter < 10) {
            counter += 1;
            setTimeout(function() {
              blah(acc.toLowerCase(),self_func);
            },0);
          }
        })();
    };

    var create_renderer = function(container) {

        renderer = new MASCP.CondensedSequenceRenderer(container);
        renderer.font_order = 'Helvetica, Arial, sans-serif';

        setup_renderer(renderer);

        extend_renderer(renderer);

        scale_text_elements(renderer);

        return renderer;
    };

    var setup_visual_renderer = function(renderer) {
      wire_renderer(renderer);
    };

    var retrieve_data = function(acc,renderer,end_func) {
        var count = 0;
        var refresher = function() {
          count++;
          if (count == 3) {
            renderer.refresh();
            if (end_func) {
              end_func.call();
            }
          }
        };
        get_accepted_domains(acc,function(acc,domains) {
          render_domains(renderer,domains);
          get_sites(acc,renderer,refresher);
          get_predictions(acc,renderer,refresher);
          get_peptides(acc,renderer,refresher);
        });
    };

    var set_description = function(description) {
      document.getElementById("description").textContent = description;
    };

    var show_protein = function(acc,renderer) {
      setup_renderer(renderer);
      var a_reader = new MASCP.UniprotReader();

      MASCP.Service.CacheService(a_reader);
      a_reader.retrieve(acc,function(e) {
        renderer.acc = acc;
        renderer.setSequence(this.result.getSequence());
        set_description(this.result.getDescription().replace(/_HUMAN.*GN=/,'/').replace(/\s.+/,''));
        renderer.grow_container = true;
      });

    };

    var get_proteins = function(protein_doc,callback) {
        var doc_id = "spreadsheet:"+protein_doc;
        var greader = new MASCP.GoogledataReader();
        MASCP.GOOGLE_CLIENT_ID="936144404055.apps.googleusercontent.com";
        var datareader = greader.createReader(doc_id,function(datas) {
          var dataset = {};
          datas.data.shift();
          var results = [];
          datas.data.forEach(function(row) {
            results.push(row[0].toLowerCase());
          });
          callback(results);
        });
        datareader.bind('error',function(e,err) {
          if (err.cause && err.cause == "No user event") {
            callback.call(null,protein_doc,err.authorize);
            return;
          }
          console.log("Error");
          console.log(err);
        });

    };

    var get_sites = function(acc,renderer,done) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "spreadsheet:0Ai48KKDu9leCdC1ESDlXVzlkVEZfTkVHS01POFJ1a0E";

      datareader.setupSequenceRenderer = render_sites("all_domains");
      datareader.registerSequenceRenderer(renderer);

      if (renderer.trackOrder.indexOf("all_domains") < 0) {
        renderer.trackOrder.push("all_domains");
      }
      datareader.retrieve(acc,function(err) {
        console.log("Got sites okay");
        if (done) {
          done();
        }
      });
    };

    var get_predictions = function(acc,renderer,done) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "predictions";

      datareader.setupSequenceRenderer = render_sites("all_domains",true,3);
      datareader.registerSequenceRenderer(renderer);

      datareader.retrieve(acc,function() {
        if (done) {
          done();
        }
      });
    };

    var get_peptides = function(acc,renderer,done) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "spreadsheet:0Ai48KKDu9leCdHVYektENmlwcVVqOHZHZzZBZVVBYWc";

      datareader.setupSequenceRenderer = render_peptides("all_domains");
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
        if (err || ! this.result) {
          next();
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


    MASCP.ready = function() {
      window.svgns = 'http://www.w3.org/2000/svg';
      var renderer = create_renderer(document.getElementById('condensed_container'));
      setup_visual_renderer(renderer);
      jQuery(renderer).bind('sequenceChange',function() {
        retrieve_data(renderer.acc,renderer);
      });
      var state = get_passed_in_state();
      var protein_doc_id = "0Ai48KKDu9leCdDh2WHlBRmZGc2hCbW5IclFMNUdKMFE";
      if (state.ids && state.ids.length > 0) {
        protein_doc_id = state.ids[0];
      }
      get_proteins(protein_doc_id,function(prots,auth_func) {
        update_protein_list(prots,renderer,auth_func);
        document.getElementById('print').addEventListener('click',function() {
          do_printing(prots);
        });

        add_keyboard_navigation();
      });
      
    }
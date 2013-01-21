    if (!(window.console && console.log)) { (function() { var noop = function() {}; var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn']; var length = methods.length; var console = window.console = {}; while (length--) { console[methods[length]] = noop; } }()); }

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

    var render_domains = function(renderer,domains,acc) {
        var target_layer = renderer.acc ? "all_domains" : acc;
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
              renderer.getAA(start).addToLayer(target_layer, {"height" : 24, "content" : element_func(), "offset" : 3, "angle": 0, "bare_element" : true });
              renderer.getAA(start).addToLayer(lay_name, {"height" : 16, "content" : element_func(), "offset" : -1, "bare_element" : true });
            } else {
              var all_box;
              var box;
              if (window.DOMAIN_DEFINITIONS[domains[dom].name]) {
                  var dats = window.DOMAIN_DEFINITIONS[domains[dom].name];
                  var fill = (renderer.gradients.length > 0) ? "url('#grad_"+dats[1]+"')" : dats[1];
                  all_box = renderer.getAA(start).addShapeOverlay(target_layer,end-start+1,{ "shape" : dats[0], "height" : 8, "fill" : fill, "rotate" : dats[2] || 0 });
                  all_box.setAttribute('stroke','#999999');
                  all_box.style.strokeWidth = '10px';
                  box = renderer.getAA(start).addShapeOverlay(lay_name,end-start+1,{ "shape" : dats[0], "fill" : 'url("#grad_'+dats[1]+'")' });
              } else {
                  all_box = renderer.getAA(start).addBoxOverlay(target_layer,end-start+1,1);
                  box = renderer.getAA(start).addBoxOverlay(lay_name,end-start+1,1);                
              }

              var a_text = renderer.getAA(parseInt(0.5*(start+end))).addTextOverlay(target_layer,0,{ 'txt' : track_name });
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
                  },false);
              },false);
            }
            done_anno = true;
          });
        });
        if (renderer.acc) {
          renderer.trackOrder.push('all_domains');
          renderer.showLayer('all_domains');
        }
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

    };


    var wire_renderer_zoom = function(renderer) {
      jQuery('#zoomin').click(function() {
        var start_zoom = renderer.zoom;
        var curr_zoom = start_zoom;
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
      });

      jQuery('#zoomout').click(function(e) {
        var start_zoom = renderer.zoom;
        var curr_zoom = start_zoom;
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
        var curr_acc = localStorage.getItem('selected');
        var selected = null;
        prots.forEach(function(prot) {
          var a_div = document.createElement('div');
          a_div.uprot = prot.id;
          a_div.textContent = ((prot.name || prot.id)+"");
          list.appendChild(a_div);
          a_div.setAttribute('id','prot_'+prot.id.toLowerCase());

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
      if (window.help_container) {
        window.help_container.style.visibility = 'visible';
        return;
      }
      var container = document.createElement('div');
      document.body.appendChild(container);
      container.setAttribute('class','help_box_container');
      window.help_container = container;
      container = document.createElement('div');
      window.help_container.appendChild(container);
      var rend = create_renderer(container);
      rend.enablePrintResizing = function() {};
      container.setAttribute('class','help_box');
      rend.bind('sequenceChange',function() {
        rend.navigation.hide();
        container.style.position = 'absolute';
        ["purple","pink","blue","green","yellow","orange","red","gray","#4285F4"].forEach(function(col) {
          rend.add3dGradient(col);
        });
        MASCP.registerLayer("all_domains", { 'fullname' : "All domains", 'color' : '#aaaaaa' },[rend]);
        rend.getAA(50).addToLayer('all_domains',{"content" : renderer.galnac(), "offset" : -3, "height" : 24, "bare_element" : true });
        rend.getAA(50).addToLayer('all_domains',{"content" : renderer.light_galnac(), "offset" : 2, "height" : 24, "bare_element" : true });

        var rect = renderer.getAA(55).addShapeOverlay("all_domains",10,{ "shape" : "roundrect", "offset" : 2.75 });
        var a_galnac = renderer.light_galnac();
        rect.setAttribute('fill',a_galnac.getAttribute('fill'));
        rect.setAttribute('stroke',a_galnac.getAttribute('stroke'));
        a_galnac.parentNode.removeChild(a_galnac);
        rect.setAttribute('stroke-width','50');
        rect.removeAttribute('style');
        rect.setAttribute('rx','120');
        rect.setAttribute('ry','120');

        rend.withoutRefresh(function() {
          rend.trackOrder = ['all_domains'];
        });
        rend.showLayer('all_domains');
        rend.withoutRefresh(function() {
          rend.zoom = 3.3;
        });
        rend.trackGap = -8;
        rend.trackHeight = 12;
        rend.padding = 10;
        window.help_rend = rend;
        render_domains(rend,{
                             "SIGNALP" : { "name" : "SIGNALP", "peptides" : [[1,15]]},
                             "N-linked (GlcNAc...)" : { "name" : "N-linked GlcNAc", "peptides" : [[17,17]]},
                             "N-linked (GlcNAc...) Potential" : { "name" : "N-linked GlcNAc", "peptides" : [[20,20]]},
                             "O-linked (GalNAc...)" : { "name" : "GalNAc", "peptides" : [[23,23]]},
                             "O-linked (Man...)" : { "name" : "Man", "peptides" : [[26,26]]},
                             "O-linked (HexNAc...)" : { "name" : "Man", "peptides" : [[29,29]]},
                             "O-linked (Xyl...)" : { "name" : "Man", "peptides" : [[32,32]]},

                             "NTR"     :  { "name" : "NTR", "peptides" : [[37,45]]}
                      });

        rend.refresh();
      });
      window.help_container.addEventListener('click',function() {
        window.help_container.style.visibility = 'hidden';
      },false);
      rend.setSequence('MNMNMNMNMNSMNTMSNTMNMNMNMNMNSMNTMSNTMNMNMNMNMNSMNTMSNTMNTTTTTT');
    }

    var do_printing = function(proteins) {
        var win = window.open();
        var a_doc = win.document;
        a_doc.open();
        a_doc.close();
        var link = a_doc.createElement('link');
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
          if (acc) {
            counter += 1;
            setTimeout(function() {
              print_single(acc.id.toLowerCase(),self_func);
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
          if (renderer.acc) {
            render_domains(renderer,domains);
          } else {
            var obj = { "gotResult" : function() { render_domains(renderer,domains,acc); }, "agi" : acc };
            jQuery(renderer).trigger('readerRegistered',[obj]);
            obj.gotResult();
          }
          get_sites(acc,renderer,refresher);
          get_predictions(acc,renderer,refresher);
          get_peptides(acc,renderer,refresher);
        });
    };

    var set_description = function(description) {
      document.getElementById("description").textContent = description;
    };

    var show_protein = function(acc,renderer) {
      end_clustal();
      end_clustal = function() {};
      window.showing_clustal = false;

      setup_renderer(renderer);


      var a_reader = new MASCP.UniprotReader();

      MASCP.Service.CacheService(a_reader);
      jQuery(renderer).bind('sequenceChange',function() {
        jQuery(renderer).unbind('sequenceChange',arguments.callee);
        console.log("Retrieving data");
        retrieve_data(acc,renderer);
      });

      a_reader.retrieve(acc,function(e) {
        // renderer.acc = acc;
        renderer.setSequence(this.result.getSequence());
        set_description(this.result.getDescription().replace(/_HUMAN.*GN=/,'/').replace(/\s.+/,''));
        document.getElementById('uniprot_id').textContent = acc.toUpperCase();
        renderer.grow_container = true;
      });

    };

    var wire_drive_button = function() {
      drive_install(function(err,auth_func) {
        if (auth_func) {
          document.getElementById('drive_install').addEventListener('click',function() {
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

      datareader.setupSequenceRenderer = render_sites(renderer.acc ? "all_domains" : acc);
      datareader.registerSequenceRenderer(renderer);

      if (renderer.trackOrder.indexOf(renderer.acc ? "all_domains" : acc) < 0) {
        renderer.trackOrder.unshift(renderer.acc ? "all_domains" : acc);
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

      datareader.setupSequenceRenderer = render_sites(renderer.acc ? "all_domains" : acc,true,3);
      datareader.registerSequenceRenderer(renderer);

      datareader.retrieve(acc,function() {
        var a_seq = renderer.sequence.toLowerCase();
        if (this.result && this.result._raw_data) {
          this.result._raw_data.data.sites.forEach(function(site) {
            a_seq = a_seq.substr(0,site-1) + a_seq.substr(site-1,1).toUpperCase() +  a_seq.substr(site);
          });
        }
        document.getElementById('clipboarder').sequence = a_seq;

        if (done) {
          done();
        }
      });
    };

    var get_peptides = function(acc,renderer,done) {
      MASCP.UserdataReader.SERVICE_URL = '/data/latest/gator';
      var datareader = new MASCP.UserdataReader();
      datareader.datasetname = "spreadsheet:0Ai48KKDu9leCdHVYektENmlwcVVqOHZHZzZBZVVBYWc";

      datareader.setupSequenceRenderer = render_peptides(renderer.acc ? "all_domains" : acc );
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
          var bit = { 'sequence' : this.result.getSequence(), 'agi' : this.agi };
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
              retrieve_data(seq.agi,renderer);
            });
            window.showing_clustal = true;
          });
        }
      };
    };

    var has_ready = MASCP.ready;

    MASCP.ready = function() {
      window.svgns = 'http://www.w3.org/2000/svg';
      var renderer = create_renderer(document.getElementById('condensed_container'));
      setup_visual_renderer(renderer);

      document.getElementById('help').addEventListener('click',function() {
        show_help();
      },false);

      wire_drive_button();
      wire_uniprot_id_changer(renderer);
      wire_clipboarder();


      var state = get_passed_in_state();
      var protein_doc_id = "0Ai48KKDu9leCdFRCT1Bza2JZUVB6MU4xbHc1UVJaYnc";
      if (state.exportIds && state.exportIds.length > 0) {
        protein_doc_id = state.exportIds[0];
        document.getElementById('drive_install').style.display = 'none';
      }
      if (window.location.toString().match(/uniprot/)) {
        var results = /uniprot\/(.*)/.exec(window.location);
        if (results && results[1]) {
          var prot = { "id" : results[1], "name" : results[1] };
          prot.toString = function() { return this.id; };
          localStorage.setItem('selected',results[1]);
          update_protein_list([prot],renderer);
        }
        return;
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
      }

    };
    if (has_ready) {
      MASCP.ready();
    }
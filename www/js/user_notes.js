(function(win) {

  MASCP.AnnotationManager = function(renderer,preferences) {
    var self = this;
    this.renderer = renderer;
    this.annotations = {};
    this.preferences = preferences;

    this.sync = function() {
      sync_annotations.call(self);
    };
    this.initialiseAnnotations(preferences);
    return this;
  };

  MASCP.AnnotationManager.InitRealtime = function() {
    if (MASCP.AnnotationManager.Annotation) {
      return;
    }
    MASCP.AnnotationManager.Annotation = function() {};
    gapi.drive.realtime.custom.registerType(MASCP.AnnotationManager.Annotation, 'Annotation');
    MASCP.AnnotationManager.Annotation.prototype.type = gapi.drive.realtime.custom.collaborativeField('type');
    MASCP.AnnotationManager.Annotation.prototype.acc = gapi.drive.realtime.custom.collaborativeField('acc');
    MASCP.AnnotationManager.Annotation.prototype.index = gapi.drive.realtime.custom.collaborativeField('index');
    MASCP.AnnotationManager.Annotation.prototype.length = gapi.drive.realtime.custom.collaborativeField('length');
    MASCP.AnnotationManager.Annotation.prototype.color = gapi.drive.realtime.custom.collaborativeField('color');
    MASCP.AnnotationManager.Annotation.prototype.icon = gapi.drive.realtime.custom.collaborativeField('icon');
    MASCP.AnnotationManager.Annotation.prototype.tag = gapi.drive.realtime.custom.collaborativeField('tag');
    MASCP.AnnotationManager.Annotation.prototype.asObject = function () {
      var result =  {};
      if (this.type)
        result.type = this.type.toString();
      if (this.acc)
        result.acc = this.acc.toString();
      if (this.index)
        result.index = this.index.toString();
      if (this.length)
        result.length = this.length.toString();
      if (this.color)
        result.color = this.color.toString();
      if (this.icon)
        result.icon = this.icon.toString();
      if (this.tag)
        result.tag = this.tag.toString();
      return result;
    }

    gapi.drive.realtime.custom.setInitializer(MASCP.AnnotationManager.Annotation,function(type,acc,index,length,color,icon,tag) {
      var model = gapi.drive.realtime.custom.getModel(this);
      if (type) {
        this.type = type;
      }
      if (acc) {
        this.acc = acc;
      }
      if (index) {
        this.index = index;
      }
      if (length) {
        this.length = length;
      }
      if (color) {
        this.color = color;
      }
      if (icon) {
        this.icon = icon;
      }
      if (tag) {
        this.tag = tag;
      }
    });
  }

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
        if (! search_el.value || search_el.value.length < 1) {
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

  var mousePosition = function(evt) {
      var posx = 0;
      var posy = 0;
      if (!evt) {
          evt = window.event;
      }

      if (evt.pageX || evt.pageY)     {
          posx = evt.pageX - (document.body.scrollLeft + document.documentElement.scrollLeft);
          posy = evt.pageY - (document.body.scrollTop + document.documentElement.scrollTop);
      } else if (evt.clientX || evt.clientY)  {
          posx = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
          posy = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
      if (self.targetElement) {
          posx = evt.screenX;
          posy = evt.screenY;
      }
      return [ posx, posy ];
  };

  var svgPosition = function(ev,svgel) {
      var positions = mousePosition(ev.changedTouches ? ev.changedTouches[0] : ev);
      var p = {};
      if (svgel.nodeName == 'svg') {
          p = svgel.createSVGPoint();
          var rootCTM = svgel.getScreenCTM();
          p.x = positions[0];
          p.y = positions[1];

          self.matrix = rootCTM.inverse();
          p = p.matrixTransform(self.matrix);
      } else {
          p.x = positions[0];
          p.y = positions[1];
      }
      return p;
  };

  MASCP.AnnotationManager.prototype.bindClick = function(element,handler) {
    if ("ontouchstart" in window) {
      element.addEventListener('touchstart',function(ev) {
        var startX = ev.touches[0].clientX;
        var startY = ev.touches[0].clientY;
        var reset = function() {
          document.body.removeEventListener('touchmove',move);
          element.removeEventListener('touchend',end);
        };
        var end = function(ev) {
          reset();
          ev.stopPropagation();
          ev.preventDefault();
          if (handler) {
            handler.call(null,ev);
          }
        };
        var move = function(ev) {
          if (Math.abs(ev.touches[0].clientX - startX) > 10 || Math.abs(ev.touches[0].clientY - startY) > 10) {
            reset();
          }
        };
        document.body.addEventListener('touchmove', move , false);
        element.addEventListener('touchend',end,false);
      },false);
    } else {
      element.addEventListener('click',handler,false);
    }
  };

  MASCP.AnnotationManager.prototype.addSelector = function(callback) {
    var self = this;
    if ( ! self.renderer._canvas) {
      self.renderer.bind('sequenceChange',function() {
        self.addSelector(callback);
      });
      return;
    }

    var canvas = self.renderer._canvas;
    var start;
    var end;
    var end_func;
    var selected;

    if (typeof canvas.supports_use == 'undefined') {
      (function() {
        var use = canvas.use('/icons.svg#trash',-1000,-1000,100,100);
        setTimeout(function() {
          if (use.instanceRoot) {
            canvas.supports_use = true;
          } else {
            canvas.supports_use = false;
          }
          use.parentNode.removeChild(use);
        },1000);
      })();
    }


    var moving_func = function(evt) {
      evt.preventDefault();

      var p = svgPosition(evt,canvas);
      end = p.x;

      var local_start;
      var local_end;
      if (start > end) {
        local_end = parseInt(start / 50);
        local_start = parseInt(end / 50);
      } else {
        local_end = parseInt(end/50);
        local_start = parseInt(start/50);
      }
      self.renderer.select(local_start+1,local_end);
      selected = (self.renderer.sequence.substr(local_start,local_end - local_start ));
      self.annotations['hover_targets'] = [];
      if (! self.readonly ) {
        if (Math.abs(local_start - local_end) <= 1) {
            self.annotations['hover_targets'].push({"type" : "symbol", "class" : "potential", "index" : local_start+1, "acc" : self.acc });
        } else {
            self.annotations['hover_targets'].push({"type" : "box", "class" : "potential", "index" : local_start+1 , "acc" : self.acc, "length" : Math.abs(local_start - local_end) });
        }
      }
      if (self.redrawTimeout) {
        clearTimeout(self.redrawTimeout);
      }

      self.redrawTimeout = setTimeout(function() {
        delete self.redrawTimeout;
        self.redrawAnnotations();
      },100);
    };


    self.bindClick(canvas,function(evt) {
      if (! self.selecting && self.annotations && self.annotations['hover_targets']) {
        self.annotations['hover_targets'] = [];
        self.renderer.select();
        self.redrawAnnotations();
      }
    });

    canvas.addEventListener('mousedown',function(evt) {
      if (! self.selecting ) {
        return;
      }
      var positions = mousePosition(evt);
      var p = {};
      if (canvas.nodeName == 'svg') {
          p = canvas.createSVGPoint();
          var rootCTM = this.getScreenCTM();
          p.x = positions[0];
          p.y = positions[1];

          self.matrix = rootCTM.inverse();
          p = p.matrixTransform(self.matrix);
      } else {
          p.x = positions[0];
          p.y = positions[1];
      }
      start = p.x;
      end = p.x;
      canvas.addEventListener('mousemove',moving_func,false);

      evt.preventDefault();
    },false);

    canvas.addEventListener('mouseup',function(evt) {
      if (self.selecting && callback) {
        callback(selected);
      }
      canvas.removeEventListener('mousemove',moving_func);
      evt.preventDefault();
    });

    canvas.addEventListener('touchend',function() {
      if (self.selecting && callback) {
        setTimeout(function() {
          callback(selected);
        },500);
      }
      canvas.removeEventListener('touchmove',moving_func);
    });

    canvas.addEventListener('touchstart',function(evt) {
        if (! self.selecting ) {
          return;
        }
        if (evt.changedTouches.length == 1) {
            evt.preventDefault();
            var positions = mousePosition(evt.changedTouches[0]);
            var p = {};
            if (canvas.nodeName == 'svg') {
                p = canvas.createSVGPoint();
                var rootCTM = this.getScreenCTM();
                p.x = positions[0];
                p.y = positions[1];

                self.matrix = rootCTM.inverse();
                p = p.matrixTransform(self.matrix);
            } else {
                p.x = positions[0];
                p.y = positions[1];
            }
            start = p.x;
            end = p.x;
            canvas.addEventListener('touchmove',moving_func,false);
        }
    },false);
  };

  MASCP.AnnotationManager.prototype.initialiseAnnotations = function(prefs) {
    var self = this;
    var prefs = self.preferences;

    self.renderer.showAnnotation = function() {};

    var init = function(model,prefs,etag) {
      model.getRoot().set('annotations',model.createList());
      model.getRoot().set('tags',model.createMap());
      if (prefs.annotations) {
        prefs.annotations.forEach(function(anno) {
          self.promoteAnnotation('self',anno,model);
        });
      }
    };
    bean.remove(prefs,'modelinit');
    bean.add(prefs,'modelinit',init);

    var callback = function() {
      self.renderer.showAnnotation  = function (acc) {
        self.acc = acc;
        self.redrawAnnotations(acc);
      };

      var in_text;
      self.renderer.bind('zoomChange',function() {
        if (self.renderer.zoom > 3.5) {
          if ( ! in_text ) {
            in_text = true;
            self.redrawAnnotations();
          }
        } else {
          if ( in_text ) {
            in_text = false;
            self.redrawAnnotations();
          }
        }
      });

      var model = prefs.realtime.getModel();
      self.readonly = model.isReadOnly;
      var all_annos = model.getRoot().get('annotations');

      self.annotations['self'] = all_annos.asArray();

      all_annos.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED,function(ev) {
          self.annotations['self'].splice.apply(self.annotations['self'],[ev.index,0].concat(ev.values));
          self.redrawAnnotations();
          self.sync();
      });
      all_annos.addEventListener(gapi.drive.realtime.EventType.VALUES_REMOVED,function(ev) {
          self.annotations['self'].splice.apply(self.annotations['self'],[ev.index, ev.values.length]);
          self.redrawAnnotations();
          self.sync();
      });
      all_annos.addEventListener(gapi.drive.realtime.EventType.VALUES_SET,function(ev) {
          self.annotations['self'].splice.apply(self.annotations['self'],[ev.index, ev.oldValues.length, ev.newValues]);
          self.redrawAnnotations();
          self.sync();
      });

      self.tags = {};
      model.getRoot().get('tags').items().forEach(function(item) {
        self.tags[item[0]] = item[1];
        self.tags[item[0]].id = item[0];
      });

      model.getRoot().get('tags').addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED,function(ev) {
          self.tags = {};
          model.getRoot().get('tags').items().forEach(function(item) {
            self.tags[item[0]] = item[1];
            self.tags[item[0]].id = item[0];
          });
          if (! ev.isLocal ) {
            self.redrawAnnotations();
          }
      });
    };
    if ( ! prefs.realtime ) {
      bean.remove(prefs,'realtimeready');
      bean.add(prefs,'realtimeready', callback);
    } else {
      callback();
    }
  };

  MASCP.AnnotationManager.prototype.renameTag = function(id,name) {
    var self = this;
    var model = self.preferences.realtime.getModel();
    if ( ! model.getRoot().get('tags').has(id)) {
      return "Invalid";
    }
    if (name == "") {
      name = "None";
    }
    var counter = 1;
    self.getTags(function(err,tags) {
      tags.forEach(function(tag) {
        if (tag.name == name) {
          counter++;
        }
      })
    });
    if (counter > 1) {
      name = name + "(" + counter + ")";
    }
    var curr_tag = model.getRoot().get('tags').get(id);
    var new_tag = {};
    new_tag.color = curr_tag.color;
    new_tag.id = curr_tag.id;
    new_tag.name = name;
    model.getRoot().get('tags').set(new_tag.id,new_tag);
    self.redrawAnnotations();
    return name;
  };

  MASCP.AnnotationManager.prototype.createTag = function(name) {
    var self = this;
    var model = self.preferences.realtime.getModel();
    var id = "tag"+(new Date()).getTime();
    var counter = 1;
    self.getTags(function(err,tags) {
      tags.forEach(function(tag) {
        if (tag.name == name) {
          counter++;
        }
        if (counter > 1 && tag.name == (name + " (" + counter + ")")) {
          counter++;
        }
      })
    });
    if (counter > 1) {
      name = name + " (" + counter + ")";
    }
    model.getRoot().get('tags').set(id,{"id" : id, "name" : (name || "New tag") });
    return id;
  };

  MASCP.AnnotationManager.prototype.getTags = function(callback) {
    var self = this;
    var arr = [];
    for (var tag in self.tags) {
        arr.push(self.tags[tag]);
    }
    callback.call(null,null,arr);
  };

  MASCP.AnnotationManager.prototype.removeTag = function(tag) {
    var self = this;
    var model = self.preferences.realtime.getModel();
    if (typeof tag == 'object') {
      tag = tag.id;
    }
    model.getRoot().get('tags').delete(tag);
  };

  MASCP.AnnotationManager.prototype.promoteAnnotation = function(group,annotation,model) {
    var self = this;
    if (! (model || self.preferences.realtime) ) {
      self.annotations[group].push(annotation);
      return;
    }
    model = model || self.preferences.realtime.getModel();
    var item = model.create(MASCP.AnnotationManager.Annotation, annotation.type, annotation.acc, annotation.index, annotation.length );
    model.getRoot().get('annotations').push(item);
  };

  MASCP.AnnotationManager.prototype.demoteAnnotation = function(group,annotation) {
    var self = this;
    if (! self.preferences.realtime) {
      self.annotations[group].splice(self.annotations[group].indexOf(annotation),1);
      return;
    }
    var model =  self.preferences.realtime.getModel();
    model.getRoot().get('annotations').removeValue(annotation);
  };

  MASCP.AnnotationManager.prototype.watchAnnotation = function(annotation) {
    var self = this;
    if (! self.preferences.realtime) {
      return;
    }
    if (annotation.addEventListener) {
      annotation.addEventListener(gapi.drive.realtime.EventType.OBJECT_CHANGED,self);
    }
  };

  MASCP.AnnotationManager.prototype.unWatchAnnotation = function(annotation) {
    var self = this;
    if (! self.preferences.realtime) {
      return;
    }
    if (annotation.removeEventListener) {
      annotation.removeEventListener(gapi.drive.realtime.EventType.OBJECT_CHANGED,self);
    }
  };

  MASCP.AnnotationManager.prototype.handleEvent = function(ev) {
    var self = this;
    var model = self.preferences.realtime.getModel();
    if ( ev.target.tag && ! model.getRoot().get('tags').has(ev.target.tag)) {
      model.getRoot().get('tags').set(ev.target.tag,{ "id" : ev.target.tag, "color" : ev.target.color || "", "name" : "Recovered tag "+ev.target.tag });
    } else {
      if (ev.target.tag && ev.target.color) {
        var curr_tag = model.getRoot().get('tags').get(ev.target.tag);
        var new_tag = {};
        new_tag.color = curr_tag.color;
        new_tag.id = curr_tag.id;
        new_tag.name = curr_tag.name;
        new_tag.color = ev.target.color;
        model.getRoot().get('tags').set(new_tag.id,new_tag);
      }
    }
    self.redrawAnnotations();
    self.sync();
  }

  var color_content = function(self,annotation,color) {
    return {'symbol' : "url('"+color+"')", "hover_function" : function() { annotation.color = "url('"+color+"')"; } };
  };

  var icon_content = function(self,annotation,symbol) {
    return { 'symbol' : symbol, "hover_function" : function() { annotation.icon = symbol; }  };
  };

  var tag_content = function(self,annotation,tag) {
    return { 'text' : tag.name, "hover_function" : function() { annotation.color = null; annotation.tag = tag.id; }  };
  };

  var trash_content = function(self,annotation) {
    return { 'symbol' :  '/icons.svg#trash', 'text_alt' : 'Delete', "select_function" : function() { self.demoteAnnotation('self',annotation); } };
  };

  MASCP.AnnotationManager.prototype.generatePieContent = function(type,annotation,vals) {
    var self = this;
    var contents = [];
    vals.forEach(function(val) {
      contents.push(type.call(null,self,annotation,val));
    });
    if (type == tag_content || type == color_content) {
        contents.push({'symbol' : "/icons.svg#prefs", 'text_alt' : 'Prefs', "select_function" : function() { bean.fire(self,'editclick')} });
    }
    contents.push(trash_content(self,annotation));
    return contents;
  };

  MASCP.AnnotationManager.prototype.pieMaker = function(annotation) {
    var self = this;
    return function(set_col,ev) {
      if ( ! ev ) {
        ev = set_col;
        set_col = null;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (annotation.pie) {
        return;
      }
      var canvas = self.renderer._canvas;
      var pie_contents;
      if ( ! set_col ) {
        if (annotation.type == 'symbol') {
          pie_contents = self.generatePieContent(icon_content,annotation,["#sugar_galnac","#sugar_man","#sugar_xyl","#sugar_fuc","#sugar_glcnac","#sugar_glcnac(b1-4)glcnac"]);
        } else {
          var tags = [];
          for (var tag in self.tags) {
            tags.push(self.tags[tag]);
          }
          pie_contents = self.generatePieContent(tag_content,annotation,tags);
        }
      } else {
        pie_contents = self.generatePieContent(color_content,annotation,["#grad_green","#grad_blue","#grad_yellow","#grad_red","#grad_pink"]);
      }
      var click_point = svgPosition(ev,canvas);
      var pie = PieMenu.create(canvas,click_point.x/canvas.RS,click_point.y/canvas.RS,pie_contents,{ "size" : 7, "ellipse" : true });
      annotation.pie = pie;
      var end_pie = function(ev) {
        canvas.removeEventListener('mouseout',end_pie);
        canvas.removeEventListener('mouseup',end_pie);
        if (annotation.pie) {
          annotation.pie.destroy();
          delete annotation.pie;
        }
      };
      annotation.pie.end = end_pie;
      canvas.addEventListener('mouseup',end_pie,false);

    };
  };


  MASCP.AnnotationManager.prototype.renderAnnotation = function(annotation,top_offset) {
    var self = this;
    var rendered = [];
    var click_el = null;
    var tag_el = null;
    top_offset = (top_offset || 0)*8;

    var obj = { "gotResult" : function() {
      if (annotation.type == "symbol") {
        var added = self.renderer.getAA(annotation.index).addToLayer("annotations"+annotation.acc,{"content" : annotation.icon ? annotation.icon : "X" , "bare_element" : (annotation.icon && (! ("ontouchstart" in window))) ? true : false, "border" : "#f00", "offset" : 6 + top_offset, "height" : 12 });
        rendered.push(added[0]);
        rendered.push(added[2]);
        rendered.push(added[1]);
        click_el = added[1];
      } else {

        var added = [];
        click_el = self.renderer.getAA(annotation.index).addShapeOverlay("annotations"+annotation.acc,annotation.length,{"shape" : "rectangle","height" : 4, "offset" : 0 + top_offset });
        added.push(click_el);

        if (annotation.tag && self.renderer.zoom > 3.5) {
          tag_el = self.renderer._canvas.text_circle(0.5,0.5,1,(self.tags[annotation.tag] || {"name" : annotation.tag }).name,{"stretch" : "right", "fill" : "#000", "weight" : "normal"});
          tag_el.setAttribute('opacity','0.8');
          added = added.concat(self.renderer.getAA(annotation.index+Math.floor(0.5*annotation.length)).addToLayer("annotations"+annotation.acc,
            { "content" : tag_el,
              "bare_element" : true,
              "no_tracer" : true,
              "offset" : 7.5 + top_offset,
              "height" : 15}
              ));
          rendered.push(added[2]);
          added[2].container.removeAttribute('viewBox');
          added[2].container.setAttribute('width','100%');
          added[2].container.setAttribute('height','100%');
          added[2].zoom_level = 'text';
          label_el = added[2];
          rendered.push(added[0]);
        } else {
          rendered.push(added[0]);
        }
        added = [];

        if (annotation.tag && self.tags[annotation.tag]) {
          click_el.setAttribute('fill',self.tags[annotation.tag].color);
        }

        if (annotation.color) {
          click_el.setAttribute('fill',annotation.color);
        }

      }
    }, "agi" : annotation.acc };
    jQuery(self.renderer).trigger('readerRegistered',[obj]);
    obj.gotResult();
    return { "rendered" : rendered, "click_element" : click_el, "tag_element" : tag_el };
  };

  MASCP.AnnotationManager.prototype.intervalSortAnnotations = function(type) {
    var self = this;
    var annos = self.annotations[type];
    var intervals = [];
    annos.forEach(function(annotation) {
      var start;
      var end;
      start = annotation.index;
      end = annotation.index + annotation.length;
      intervals.push({ "index" : start, "start" : true,  "annotation" : annotation });
      intervals.push({ "index" : end, "start" : false , "annotation" : annotation });
    });
    intervals.sort(function(a,b) {
      var sameAcc = (a.annotation.acc || "").localeCompare(b.annotation.acc);
      if (sameAcc !== 0) {
        return sameAcc;
      }

      if (a.index < b.index ) {
        return -1;
      }
      if (a.index > b.index ) {
        return 1;
      }
      if (a.index == b.index) {
        return a.start ? -1 : 1;
      }
    });
    return intervals;
  };

  var rendered = [];
  var wanted_accs = [];

  MASCP.AnnotationManager.prototype.redrawAnnotations = function(acc) {
    var self = this;
    var layer_name = "annotations";
    if (acc) {
      layer_name = "annotations"+acc;
      MASCP.registerLayer(layer_name, { 'fullname' : acc+" annotations", 'color' : '#aaaaaa' },[self.renderer]);
      self.renderer._layer_containers[layer_name].fixed_track_height = 30;
      wanted_accs.push(acc);
    }
    rendered.forEach(function(el) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    rendered = [];
    wanted_accs.forEach(function(acc) {
      if (self.renderer._layer_containers["annotations"+acc]) {
        self.renderer._layer_containers["annotations"+acc].fixed_track_height = 24;
      }
    });

    for (var annotation_type in self.annotations) {
      var current = [];
      self.intervalSortAnnotations(annotation_type).forEach(function(interval) {
        var annotation = interval.annotation;

        if (wanted_accs.indexOf(annotation.acc) < 0 ) {
          self.unWatchAnnotation(annotation);
          return;
        }
        if ( MASCP.getLayer("annotations"+annotation.acc) && MASCP.getLayer("annotations"+annotation.acc).disabled ) {
          return;
        }
        if (annotation.deleted) {
          return;
        }

        if (! interval.start) {
          current.splice(current.indexOf(annotation),1,null);
          while (current.length > 0 && current[current.length - 1] == null) {
            current.splice(current.length - 1,1);
          }
          return;
        }

        var click_el = null;
        var label_el = null;
        var drawn = self.renderAnnotation(annotation,(annotation.class == "potential") ? -1 : (current.length));
        if (((current.length+3)*8) > self.renderer._layer_containers["annotations"+annotation.acc].fixed_track_height) {
          self.renderer._layer_containers["annotations"+annotation.acc].fixed_track_height = ((current.length+3)*8);
        }

        current.push(annotation);
        click_el = drawn['click_element'];
        label_el = drawn['tag_element'];
        rendered = rendered.concat(drawn['rendered']);

        if (annotation.class == "potential") {
          click_el.style.opacity = '0.5';
          if (! self.readonly) {
            self.bindClick(click_el,function() {
              delete annotation.class;
              self.promoteAnnotation('self',annotation);
              // self.redrawAnnotations(annotation.acc);
              self.renderer.select();
            });
          }
        } else {

          self.watchAnnotation(annotation);

          if ( ! self.readonly ) {
            if (label_el) {
              label_el.addEventListener('click',function(ev) { ev.preventDefault(); ev.stopPropagation(); });
              label_el.addEventListener('mousedown',function(ev) {  self.pieMaker(annotation).call(label_el,true,ev); },false);
              label_el.addEventListener('touchstart',function(ev) {  self.pieMaker(annotation).call(label_el,true,ev); },false);
              label_el.addEventListener('touchend',function(ev) {  if (annotation && annotation.pie) { annotation.pie.end(); delete annotation.pie; } ev.preventDefault(); },false);

            }
            click_el.addEventListener('click',function(ev) { ev.preventDefault(); ev.stopPropagation(); });
            click_el.addEventListener('mousedown',self.pieMaker(annotation),false);
            click_el.addEventListener('touchstart',self.pieMaker(annotation),false);
            click_el.addEventListener('touchend',function(ev) { if (annotation && annotation.pie) { annotation.pie.end(); delete annotation.pie; } ev.preventDefault(); },false);
          }
        }
      });
    }
    if (self.renderer.trackOrder.indexOf(layer_name) < 0) {
      self.renderer.trackOrder.push(layer_name);
    }
    self.renderer.showLayer(layer_name);
    self.renderer.refresh();
  };

  var cloneObject = function(obj,shallow) {
    var clone = {};
    for(var i in obj) {
      if (i == "pie") {
        continue;
      }
      if(typeof(obj[i])=="object" && obj[i] != null)
          clone[i] = shallow ? obj[i].toString : cloneObject(obj[i]);
      else
          clone[i] = obj[i];
    }
    return clone;
  }

  var sync_annotations = function() {
    var self = this;

    if ( self.readonly ) {
      return;
    }

    var model = self.preferences.realtime.getModel();
    self.preferences.getPreferences(function(err,prefs,etag,modified) {
      if ( ! err ) {
        var objects = [];
        model.getRoot().get('annotations').asArray().forEach(function(collab) {
          objects.push(collab.asObject());
        });
        prefs.annotations = objects;
        if (self.timeout) {
          clearTimeout(self.timeout);
          self.timeout = null;
        }
        self.timeout = setTimeout(function() {
          self.timeout = null;
          self.preferences.sync(function(err,prefs,etag) {
            console.log("Wrote prefs");
          });
        },5000);
      }
    },true);
    return;
  };

})(window)
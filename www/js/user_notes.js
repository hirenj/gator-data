(function(win) {

  MASCP.AnnotationManager = function(renderer,preferences) {
    var self = this;
    this.renderer = renderer;
    this.annotations = {};
    this.preferences = preferences;
    renderer.showAnnotation  = function (acc) {
      self.acc = acc;
      self.redrawAnnotations();
      // show_annotations(this,acc);
    };
    this.sync = function() {
      if (self.timeout) {
        clearTimeout(self.timeout);
        self.timeout = null;
      }
      self.timeout = setTimeout(function() {
        sync_annotations.call(self);
        self.timeout = null;
      },1000);
    };
    this.sync();
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
      renderer._container.appendChild(this.search_field);
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

  MASCP.AnnotationManager.prototype.addSelector = function(callback) {
    var self = this;
    if ( ! renderer._canvas) {
      renderer.bind('sequenceChange',function() {
        self.addSelector(callback);
      });
      return;
    }

    var canvas = self.renderer._canvas;
    var mousePosition = function(evt) {
        var posx = 0;
        var posy = 0;
        if (!evt) {
            evt = window.event;
        }
        if (evt.pageX || evt.pageY)     {
            posx = evt.pageX;
            posy = evt.pageY;
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
    var start;
    var end;
    var end_func;
    var selected;

    var moving_func = function(e) {
      var positions = mousePosition(e.changedTouches ? e.changedTouches[0] : e);
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
      renderer.select(local_start+1,local_end);
      selected = (renderer.sequence.substr(local_start,local_end - local_start ));
      self.annotations['hover_targets'] = [];
      if (Math.abs(local_start - local_end) <= 1) {
          self.annotations['hover_targets'].push({"type" : "symbol", "class" : "potential", "index" : local_start+1, "acc" : self.acc });
      } else {
          self.annotations['hover_targets'].push({"type" : "box", "class" : "potential", "index" : local_start+1 , "acc" : self.acc, "length" : Math.abs(local_start - local_end) });
      }
      self.redrawAnnotations();
      e.preventDefault();
    }
    canvas.addEventListener('click',function(e) {
      if (! self.selecting && self.annotations && self.annotations['hover_targets'] && self.annotations['hover_targets'].length > 0) {
        self.annotations['hover_targets'] = [];
        renderer.select();
        self.redrawAnnotations();
      }
    },true);

    canvas.addEventListener('mousedown',function(e) {
      if (! self.selecting ) {
        return;
      }
      var positions = mousePosition(e);
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

      e.preventDefault();
    },false);

    canvas.addEventListener('mouseup',function(e) {
      if (self.selecting && callback) {
        callback(selected);
      }
      canvas.removeEventListener('mousemove',moving_func);
      e.preventDefault();
    });

    canvas.addEventListener('touchend',function() {
      if (self.selecting && callback) {
        setTimeout(function() {
          callback(selected);
        },500);
      }
      canvas.removeEventListener('touchmove',moving_func);
    });

    canvas.addEventListener('touchstart',function(e) {
        if (! self.selecting ) {
          return;
        }
        if (e.changedTouches.length == 1) {
            var positions = mousePosition(e.changedTouches[0]);
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

            e.preventDefault();
        }
    },false);
  }

  var rendered = [];

  MASCP.AnnotationManager.prototype.redrawAnnotations = function() {
    var self = this;
    MASCP.registerLayer("annotations", { 'fullname' : "Annotations", 'color' : '#aaaaaa' },[self.renderer]);
    rendered.forEach(function(el) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    rendered = [];

/*
          var obj = { "gotResult" : function() {
          }, "agi" : acc };
          jQuery(renderer).trigger('readerRegistered',[obj]);
          obj.gotResult();
*/

    for (var annotation_type in self.annotations) {
      self.annotations[annotation_type].forEach(function(annotation) {
        if (annotation.acc != self.acc) {
          return;
        }
        if (annotation.deleted) {
          return;
        }

        var obj = { "gotResult" : function() {
          if (annotation.type == "symbol") {
            var added = self.renderer.getAA(annotation.index).addToLayer("annotations",{"content" : annotation.icon ? self.renderer[annotation.icon]() : "X" , "bare_element" : (annotation.icon && (! ("ontouchstart" in window))) ? true : false, "border" : "#f00", "offset" : 0, "height" : 24 });
            rendered.push(added[0]);
            rendered.push(added[2]);
            rendered.push(added[1]);
          } else {
            rendered.push(self.renderer.getAA(annotation.index).addShapeOverlay("annotations",annotation.length,{"shape" : "rectangle"}));
            if (annotation.color) {
              rendered[rendered.length - 1].setAttribute('fill',annotation.color);
            }
          }
        }, "agi" : self.acc };
        jQuery(self.renderer).trigger('readerRegistered',[obj]);
        obj.gotResult();


        if (annotation.class == "potential") {
          rendered[rendered.length - 1].style.opacity = '0.5';
          rendered[rendered.length - 1].addEventListener('click',function() {
            delete annotation.class;
            self.annotations['self'].push(annotation);
            self.redrawAnnotations();
            self.renderer.select();
          });
        } else {
          var trigger_pie = function(ev) {
            if (annotation.pie) {
              return;
            }
            var canvas = this.parentNode;
            var bbox = this.getBBox();
            if (this.getAttribute('transform')) {
              bbox = canvas.transformedBoundingBox(this);
              var transform = this.getAttribute('transform');
              var curr_translate = /translate\((-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)\)/.exec(transform);
              bbox.x = curr_translate[1];
              bbox.y = curr_translate[2];
              bbox.width = 0;
            }
            var pie_contents;
            if (annotation.type != "symbol") {
              pie_contents = [{'symbol' : "url('#grad_green')", "hover_function" : function() { annotation.color = "url('#grad_green')"; self.redrawAnnotations(); } },
              {'symbol' : "url('#grad_blue')", "hover_function" : function() { annotation.color = "url('#grad_blue')"; self.redrawAnnotations(); } },
              {'symbol' : "url('#grad_yellow')", "hover_function" : function() { annotation.color = "url('#grad_yellow')"; self.redrawAnnotations(); } },
              {'symbol' : "url('#grad_red')", "hover_function" : function() { annotation.color = "url('#grad_red')"; self.redrawAnnotations(); } },
              {'symbol' : "url('#grad_pink')", "hover_function" : function() { annotation.color = "url('#grad_pink')"; self.redrawAnnotations(); }},
              { 'symbol' : 'X', "select_function" : function() { annotation.deleted = true; self.redrawAnnotations(); } }
              ];
            } else {
              pie_contents = [
              { 'symbol' : self.renderer.small_galnac(), "hover_function" : function() { annotation.icon = "small_galnac"; self.redrawAnnotations(); }  },
              { 'symbol' : self.renderer.man(), "hover_function" : function() { annotation.icon = "man"; self.redrawAnnotations(); }  },
              { 'symbol' : self.renderer.xyl(), "hover_function" : function() { annotation.icon = "xyl"; self.redrawAnnotations(); }  },
              { 'symbol' : self.renderer.fuc(), "hover_function" : function() { annotation.icon = "fuc"; self.redrawAnnotations(); }  },
              { 'symbol' : self.renderer.small_glcnac(), "hover_function" : function() { annotation.icon = "small_glcnac"; self.redrawAnnotations(); }  },
              { 'symbol' : self.renderer.nlinked(), "hover_function" : function() { annotation.icon = "nlinked"; self.redrawAnnotations(); }  },
              { 'symbol' : 'X', "select_function" : function() { annotation.deleted = true; self.redrawAnnotations(); } }
              ]
            }
            var pie = PieMenu.create(canvas,(parseInt(bbox.x) + parseInt(0.5*bbox.width))/canvas.RS,(parseInt(bbox.y) + parseInt(0.5*bbox.height))/canvas.RS, pie_contents);
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
            ev.preventDefault();
            ev.stopPropagation();
          };
          rendered[rendered.length - 1].addEventListener('mousedown',trigger_pie,false);
          rendered[rendered.length - 1].addEventListener('touchstart',trigger_pie,false);
          rendered[rendered.length - 1].addEventListener('touchend',function() { if (annotation && annotation.pie) { annotation.pie.end(); delete annotation.pie; } },false);
        }
      });
    }
    if (renderer.trackOrder.indexOf("annotations") < 0) {
      renderer.trackOrder.push("annotations");
    }
    renderer.showLayer("annotations");
    renderer.refresh();
    self.sync();
  };

  var cloneObject = function(obj) {
      var clone = {};
      for(var i in obj) {
          if (i == "pie") {
            continue;
          }
          if(typeof(obj[i])=="object" && obj[i] != null)
              clone[i] = cloneObject(obj[i]);
          else
              clone[i] = obj[i];
      }
      return clone;
  }

  var sync_annotations = function() {
      var self = this;
      // Don't trigger any popups
      if ( ! window.event ) {
        window.event = { "which" : null };
      }
      (new MASCP.GoogledataReader()).getPreferences(self.preferences,function(err,prefs) {
        if (err) {
          // Errs if : No user event / getting preferences
          // actual reader error

          if (err.status === "preferences") {
            window.notify.alert("Problem getting user preferences");
            return;
          }
          if (err.cause == "No user event") {
            self.redrawAnnotations = function(){};
            return;
          }
          if (err) {
            window.notify.alert("Problem reading user data set");
          }
          console.log(err);
        }
        if ( ! self.annotations['self'] ) {
          self.annotations['self'] = prefs.annotations || [];
          self.redrawAnnotations();
        } else {
          var result = [];
          self.annotations['self'].forEach(function(ann) {
            var obj = cloneObject(ann);
            if ( ! obj.deleted ) {
              result.push(obj);
            }
            delete obj.pie;
          });
          // self.annotations['self'] = result;
          prefs.annotations = result;
          (new MASCP.GoogledataReader()).writePreferences(self.preferences,function(err) {
            if (err) {
              window.notify.alert("Could not save annotations");
            }
          });
        }
      });
  };

})(window)
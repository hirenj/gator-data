(function(win) {

  MASCP.AnnotationManager = function(renderer) {
    this.renderer = renderer;
    renderer.showAnnotation  = function (acc) {
      show_annotations(this,acc);
    };
    renderer.cheat_annotation = cheat_preferences;
    renderer.nukeSettings = nuke_settings;
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
      search_el.addEventListener('blur',function() {
        if (! search_el.value || search_el.value.length < 1) {
          self.renderer.select();
          return;
        }
        var search_re = new RegExp(search_el.value, "g");
        var match;
        var positions = [];
        while (match=search_re.exec(self.renderer.sequence)) {
          positions.push(match.index+1);
          positions.push(match[0].length+match.index);
        }
        self.renderer.select.apply(self.renderer,positions);
      },false);
      this.search_field.appendChild(search_el);
      renderer._container.appendChild(this.search_field);
      this.search_field.className = 'search_field hidden';
      search_el.setAttribute('value','Foo');
    }
    var self = this;
    setTimeout(function() {
      self.search_field.className = 'search_field';
    },0);
  };

  MASCP.AnnotationManager.prototype.hideSearchField = function() {
    if ( ! this.search_field ) {
      return;
    }
    this.renderer.select();
    this.search_field.className = 'search_field hidden';
  };

  var show_annotations = function(renderer,acc) {

      // Don't trigger any popups
      if ( ! window.event ) {
        window.event = { "which" : null };
      }
      
      var current_session = JSON.parse(sessionStorage.getItem("update_timestamps") || "{}");
      if (sessionStorage.getItem("cheat_document")) {
        delete current_session[sessionStorage.getItem("cheat_document")];
      }
      sessionStorage.setItem("update_timestamps",JSON.stringify(current_session));

      (new MASCP.GoogledataReader()).readWatchedDocuments("Annotations preferences",function(err,pref,reader) {
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
        sessionStorage.setItem("cheat_document",reader.datasetname);
        reader.retrieve(acc,function() {
          if ( ! this.result ) {
            return;
          }
          var datas = this.result._raw_data.data;
          var lay_name = "annotations."+acc;
          MASCP.registerLayer(lay_name, { 'fullname' : "Annotations", 'color' : '#aaaaaa' },[renderer]);

          var obj = { "gotResult" : function() {
            datas.sites.forEach(function(site) {
              var block = renderer.getAA(parseInt(site[0])).addToLayer(lay_name,{"content" : site[2] , "border" : site[1], "offset" : 3, "height" : 24 });
            });
            datas.peptides.forEach(function(peptide) {
              var block = renderer.getAminoAcidsByPeptide(peptide[0]).addToLayer(lay_name);
              block.style.fill = peptide[1];
            });
            renderer.trigger('resultsRendered',[this]);
            renderer.refresh();
            if (renderer.trackOrder.indexOf(lay_name) < 0) {
              renderer.trackOrder.push(lay_name);
            }
            renderer.showLayer(lay_name);
            renderer.refresh();
          }, "agi" : acc };
          jQuery(renderer).trigger('readerRegistered',[obj]);
          obj.gotResult();
        });
      });
  };

  var nuke_settings = function() {
    (new MASCP.GoogledataReader()).getPreferences("Annotations preferences",function(err,prefs) {
      delete prefs.user_datasets;
      (new MASCP.GoogledataReader()).writePreferences("Annotations preferences",function(err,prefs) {
      });        
    });   
  };

  var cheat_preferences = function(doc_id,callback) {
      var parser = function(datablock){
        var results = {};
        (datablock.data || []).forEach(function(row) {
          if ( ! row[0] ) {
            return;
          }          
          var key = row[0];

          if ( ! results[key.toLowerCase()]) {
            results[key.toLowerCase()] = {
              "retrieved" : datablock.retrieved,
              "etag" : datablock.etag,
              "title" : datablock.title,
              "data" : {
                "sites" : [],
                "peptides" : []
              }
            };
          }
          var block = results[key.toLowerCase()];
          if (row[1] && row[1].match(/^\d+$/)) {
            block.data.sites.push([row[1],row[2],row[3]]);
          } else {
            block.data.peptides.push([row[1],row[2]]);
          }
        });
        return results;
      };
      sessionStorage.setItem("cheat_document",doc_id);
      (new MASCP.GoogledataReader()).addWatchedDocument("Annotations preferences",doc_id,parser,callback);
  };
})(window)
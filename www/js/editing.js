        greader.getPermissions(doc_id,function(err,permissions) {
          if (! err && permissions.write) {
            jQuery(renderer).bind('orderChanged',function(e,order) {
              if ( ! renderer.editing ) {
                return;
              }
              if (renderer.trackOrder.length > 0) {
                console.log("Removed layer");
                update_domains();
              }
            });
            document.getElementById('reset').style.display = 'inline';
          }
        });

      var update_domains = function() {
        // var wanted = {};
        // widget_rend.trackOrder.forEach(function(track) {
        //   if (track.match(/^dom\:/) && widget_rend.isLayerActive(track)) {
        //     wanted[track] = 1;
        //   }
        // });
        // var acc = document.getElementById('acc').value.toLowerCase();
        // var wanted_domains = JSON.stringify(wanted);
        // var doc_id = "spreadsheet:0Ai48KKDu9leCdHBGTGE0c1BkY3o5MmxPRkZSWGJ6ekE";
        // (new MASCP.GoogledataReader()).updateOrInsertRow(doc_id,"uniprotid="+acc,{"uniprotid":acc,"domainsjson":wanted_domains,"timestamp":"Now"},function(err) {
        //   window.dataset[acc] = JSON.parse(wanted_domains);          
        //   var link = document.getElementById('prot_'+acc);
        //   if (link) {
        //     var clazz = link.getAttribute('class').replace(/done\s/,'');
        //     link.setAttribute('class',clazz+"done ");
        //   }
        // });
      };

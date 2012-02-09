jQuery(document).ready(function() {
    var supportsXHR = false;
    if (XMLHttpRequest)
    {
        var request = new XMLHttpRequest();
        if ("withCredentials" in request)
        {
            supportsXHR = true;
        }
    }
    
    MASCP.Service.BeginCaching();
    
    (function() {
        var onemonthago = new Date();
        onemonthago.setMonth((new Date()).getMonth() - 1);
        MASCP.Service.SweepCache(onemonthago);
    })();


    if (! document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")) {
        MASCP.renderer = new MASCP.SequenceRenderer(document.getElementById('sequence_container'));
        if (document.cookie.indexOf('iesplash') < 0) {
            showIESplash();
        }
    } else {
        MASCP.renderer = new MASCP.CondensedSequenceRenderer(document.getElementById('condensed_container'));
        MASCP.renderer.grow_container = true;
        
        var dragger = new GOMap.Diagram.Dragger();
        MASCP.renderer.zoom = 0.81;
        MASCP.renderer.padding = 10;

        jQuery(MASCP.renderer).bind('sequenceChange', function() {
            var zoomFactor = 0.95 * window.innerWidth / (2 * MASCP.renderer.sequence.length);
            MASCP.renderer.zoom = zoomFactor;
            dragger.applyToElement(MASCP.renderer._canvas);
            GOMap.Diagram.addTouchZoomControls(MASCP.renderer, MASCP.renderer._canvas);
            GOMap.Diagram.addScrollZoomControls(MASCP.renderer, MASCP.renderer._canvas);
            jQuery('#search').trigger('search');
        });
    }

    jQuery('#zoomin').click(function() {
        var start_zoom = MASCP.renderer.zoom;
        var curr_zoom = start_zoom;
        var count = 0;
        while (start_zoom === MASCP.renderer.zoom && count < 5) {
            curr_zoom += 0.5;
            MASCP.renderer.zoomCenter = 'center';
            MASCP.renderer.zoom = curr_zoom;
            MASCP.renderer.zoomCenter = null;
            count++;
        }
    });

    jQuery('#zoomout').click(function(e) {
        var start_zoom = MASCP.renderer.zoom;
        var curr_zoom = start_zoom;
        var count = 0;
        while (start_zoom === MASCP.renderer.zoom && count < 5) {
            curr_zoom -= 0.5;
            MASCP.renderer.zoomCenter = 'center';
            MASCP.renderer.zoom = curr_zoom;
            MASCP.renderer.zoomCenter = null;
            count++;
        }
    });
    
    var search_func = function() {
        var pattern = this.value;
        var re = new RegExp(pattern,"gi");
        re.global = true;
        var n_sites = (pattern == "") ? [] : (MASCP.renderer.sequence.match(re) || []);
        var n_pos = [];
        var last_hit = 0;
        n_sites.forEach(function(site) {
            var pos = MASCP.renderer.sequence.indexOf(site,last_hit);
            n_pos = n_pos.concat([pos,pos+site.length]);
            last_hit = pos+1;
        });
        MASCP.renderer.moveHighlight.apply(MASCP.renderer,n_pos);
    };
    
    jQuery('#search').unbind('change').bind('change',search_func);
    
});

jQuery(document).ready(function() {
    
    var rendering_readers = null;
    var all_readers = [];

    var tweak_track_order = function(array) {
        var readers_to_show = [];
        if (array.splice && array.indexOf) {
            // if (array.indexOf('hydropathy') === -1) {
            //     array.push('hydropathy');
            // }

            for (var rdr_id in READER_CONF) {
                if (READER_CONF.hasOwnProperty(rdr_id)) {
                    var rdr = READER_CONF[rdr_id], i;
                    var layers = rdr.layers;
                    if (! rdr.placeholder) {
                        if (layers.length > 0) {
                            if (array.indexOf(layers[0]) == -1) {
                                for (i = 0 ; i < layers.length; i++) {
                                    readers_to_show.push(layers[i]);
                                    array.push(layers[i]);
                                }
                            }                            
                        }
                        continue;
                    }
                    for (i = 0; i < layers.length; i++) {
                        var lay = layers[i];
                        var placeholder = lay.replace(/_.*$/,'') + '_placeholder';
                        var controller = lay.replace(/_.*$/,'') + '_controller';
                    
                        if (array.indexOf(placeholder) === -1) {
                            array.push(placeholder);
                        }
                        if (MASCP.getGroup(lay) && MASCP.getGroup(lay).size() > 0) {
                            array.splice(array.indexOf(placeholder),1,controller,lay);
                            MASCP.getGroup(lay).eachLayer(function(group_lay) {
                                if (MASCP.getGroup(group_lay.name)) {
                                    layers.splice(i+1,0,group_lay.name);
                                }
                            });
                            readers_to_show.push(controller);
                        } else {
                            array.splice(array.indexOf(placeholder),1,lay);                        
                            readers_to_show.push(lay);
                        }
                    }
                }
            }
        }
        if (rendering_readers) {
            readers_to_show.forEach(function(lay) {
                MASCP.renderer.showLayer(lay,true);
            });
            MASCP.renderer.refresh();
        }
        return array;
    };
                
    var rrend = function(e,reader) {
                
        MASCP.renderer.trackOrder = tweak_track_order([]);
        MASCP.renderer.refresh();
    };

    var seqchange = function() {
        if (MASCP.renderer.sequence == '') {
            return;
        }


        var agi = jQuery('#agi')[0].value;

        MASCP.renderer.reset();

        if (MASCP.renderer.createHydropathyLayer) {
            MASCP.renderer.createHydropathyLayer(6);
            MASCP.renderer.showLayer('hydropathy');
            jQuery('#hydropathy').show();
        }

        all_readers = [];
        rendering_readers = [];
        var rdr,rdr_id,lay,i;
        for (rdr_id in READER_CONF) {
            if (READER_CONF.hasOwnProperty(rdr_id)) {
                rdr = READER_CONF[rdr_id];
                var clazz = rdr.definition;
                var reader = new clazz(agi, rdr.url);
                reader.bind('resultReceived', rdr.result);
                if (rdr.layers.length > 0) {
                    reader.registerSequenceRenderer(MASCP.renderer);
                    rendering_readers.push(reader);
                }
                all_readers.push(reader);
            }
        }

        for (rdr_id in READER_CONF) {
            if (READER_CONF.hasOwnProperty(rdr_id)) {
                rdr = READER_CONF[rdr_id];
                if (rdr.placeholder) {
                    for (i = 0; i < rdr.layers.length; i++ ) {
                        lay = rdr.layers[i];
                        var placeholder = lay+'';
                        placeholder = placeholder.replace(/_(.*)$/,'') + '_placeholder';
                        jQuery('#'+placeholder).hide();
                    }
                } else {
                    for (i = 0; i < rdr.layers.length; i++ ) {
                        lay = rdr.layers[i];
                        jQuery('#'+lay).hide();                
                    }            
                }
            }
        }
        var complete_function = function() {
            if (rendering_readers && rendering_readers.length > 0) {
                var an_index = rendering_readers.indexOf(this);
                if (an_index >= 0) {
                    rendering_readers.splice(an_index,1);
                }
                if (rendering_readers.length > 0) {                
                    return;
                }
            }

            if (! rendering_readers) {
                return;

            }
            
            MASCP.cloneService(MASCP.TairReader,'CdsReader');

            (new MASCP.CdsReader(null,'http://localhost:3000/data/latest/cds')).retrieve(agi,function() {
                MASCP.registerLayer('cds',{'fullname':'CDS','color':'#ff00ff'});
                MASCP.renderer.renderTextTrack('cds',this.result.getSequence().slice(0,-3));
                MASCP.renderer.trackOrder.push('cds');
                MASCP.renderer.showLayer('cds');
                MASCP.renderer.refresh();
            });

            setTimeout(function() {
                jQuery('#agi').focus();            
            },1000);


            if (document._screen) {
                document._screen.hide();
                MASCP.renderer.refresh();
            }    

            rendering_readers = null;

                    
        };
        
        var result_function = function() {
            var self_func = arguments.callee;
            var an_agi = this.agi;
            var a_locus = an_agi.replace(/\.\d+/,'');
            var rdr = READER_CONF[this.__class__];
            var indexing_id = (rdr.success_url || '').indexOf('locus=true') > 0 ? a_locus : an_agi;
            var success_url = (rdr.success_url || '#').replace(/\#.*$/,'#');
            var datestring = (this.result.retrieved instanceof Date) ? this.result.retrieved.toDateString() : 'Just now';
            jQuery('#links ul').append('<li><a href="'+success_url+indexing_id+'">'+rdr.nicename+'</a><span class="timestamp data_reload">'+datestring+'</span></li>');
            var li = jQuery('#links ul li:last');
            jQuery('.data_reload', li).bind('click',function(e) {
                var clazz = rdr.definition;
                MASCP.Service.ClearCache(clazz,an_agi);
                var reader = new clazz(an_agi, rdr.url);
                MASCP.Service.registeredLayers(reader).forEach(function(lay) {
                    MASCP.renderer.removeTrack(lay);
                    delete MASCP.layers[lay.name];
                });
                MASCP.Service.registeredGroups(reader).forEach(function(group) {
                    delete MASCP.groups[group.name];
                });
                li.remove();
                
                reader.bind('resultReceived', rdr.result);
                reader.bind('error', error_function);
                
                if (rdr.layers.length > 0) {
                    reader.registerSequenceRenderer(MASCP.renderer);
                }
                jQuery(MASCP.renderer).one('resultsRendered',function(e,read) {
                    if (reader === read) {
                        (rdr.layers || []).forEach(function(lay) {
                            MASCP.renderer.showLayer(lay);
                            MASCP.renderer.showGroup(lay);
                        });
                        MASCP.renderer.refresh();                            
                    }
                });
                reader.bind('resultReceived', self_func);
                reader.retrieve();
            });
            
        };
        
        var error_function = function(e,status) {
            var rdr = READER_CONF[this.__class__];
            var an_agi = this.agi;
            if (status && status == "No data") {
                jQuery('#links ul').append('<li class="nodata"><span class="timestamp data_reload">No data</span><a href="'+rdr.error_url+'">'+rdr.nicename+'</a></li>');                
            } else {
                jQuery('#links ul').append('<li class="error"><span class="timestamp data_reload">Error</span><a href="'+rdr.error_url+'">'+rdr.nicename+'</a></li>');                
            }
            var li = jQuery('#links ul li:last');
            jQuery('.data_reload', li).bind('click',function(e) {
                var clazz = rdr.definition;
                MASCP.Service.ClearCache(clazz,an_agi);
                var reader = new clazz(an_agi, rdr.url);
                li.remove();
                
                reader.bind('resultReceived', rdr.result);
                if (rdr.layers.length > 0) {
                    reader.registerSequenceRenderer(MASCP.renderer);
                }
                jQuery(MASCP.renderer).one('resultsRendered',function(e,read) {
                    if (reader === read) {
                        (rdr.layers || []).forEach(function(lay) {
                            MASCP.renderer.showLayer(lay);
                            MASCP.renderer.showGroup(lay);
                        });
                        MASCP.renderer.refresh();                            
                    }
                });
                reader.bind('resultReceived', result_function);
                reader.bind('error',error_function);
                reader.retrieve();
            });

            jQuery(MASCP.renderer).trigger('resultsRendered',[this]);
        };

        jQuery('#links').text('');
        jQuery('#links').append('<ul></ul>');
        jQuery(all_readers).each(function(i) {

            this.bind('error',error_function);

            this.bind('resultReceived',result_function);
            this.bind('requestComplete', complete_function);
            this.retrieve();
        });
    
    };
    
    jQuery(MASCP.renderer).bind('resultsRendered',rrend);
    jQuery(MASCP.renderer).bind('sequenceChange',seqchange);
    
});
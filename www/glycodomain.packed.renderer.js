
var SHAPE_LOOKUP = {
  'Cleavage' : 'pentagon-flip',
  'Binding' : 'ellipse',
  'Adhesion' : 'ellipse',
  'IG-like' : 'ellipse',
  'Transferase' : 'pentagon',
  'Factor' : 'hexagon',
  'Kinase' : 'pentagon'
};

var COLOUR_LOOKUP = {
  'Inhibitor' : 'red',
  'Protein' : 'orange',
  'Lipid' : '#fee',
};

var overlap = function(a,b) {
  var overlap = Math.min(a.end,b.end) - Math.max(a.start,b.start)
  return overlap > 0 ? overlap : 0 ;
};

function renderData(seq,doms) {

console.log("In Domain rendering");

var return_data = [];

var groups_by_shape = {};

var render_cluster = function(offset,cluster) {
  var dom = { "aa": cluster.start, "type" : "shape" , "width" : (cluster.end - cluster.start), "options" : { "offset" : offset, "height" : 3, "fill" : cluster.doms[0].colour, "shape" : cluster.doms[0].shape , "stroke" : "#000", "stroke_width" : "0.2"  }};
  return_data.push(dom);

};

var classify = function(domain) {
    if (((domain.end - domain.start) / seq.length) >= 0.8) {
    	return;
    }
    var classes = domain.class || [];
    var is_repeat = classes.indexOf('Repeat') >= 0;
    var shape;
    var colour;
    classes.forEach(function(classname) {
      var class_parts = classname.split('/').map(function(clazz) { return clazz.trim(); });
      shape = shape ? shape : SHAPE_LOOKUP[class_parts[0]];
      colour = colour ? colour : COLOUR_LOOKUP[class_parts[1]];
    });
    if ( ! shape ) {
      shape = 'rectangle';
    }
    if ( ! colour ) {
      colour = '#eef';
    }
    // console.log(domain);
    // console.log(shape + " " + colour);
    groups_by_shape[shape + " " + colour + (is_repeat ? ' REPEAT' : '') ] = groups_by_shape[shape + " " + colour + (is_repeat ? ' REPEAT' : '')] || [];
    domain.shape = shape;
    domain.colour = colour;
    groups_by_shape[shape + " " + colour + (is_repeat ? ' REPEAT' : '')].push(domain);
};

var cluster = function(doms) {
  var clusters = [];
  while (doms.length > 0) {
    var dom = doms.shift();
    var overlapping = clusters.filter(function(clus) { if (overlap(dom,clus) > 0.5*(dom.end - dom.start)) {
      return true;
    }});
    if (overlapping.length > 0) {
      // We should add to the one with the largest overlap
      overlapping[0].doms.push(dom);
      if (dom.start < overlapping[0].start) {
        overlapping[0].start = dom.start;
      }
      if (dom.end > overlapping[0].end) {
        overlapping[0].end = dom.end;
      }
    } else {
      clusters.push({ "doms" : [dom], "start": dom.start, "end": dom.end });
    }
  }
  doms.length = 0;
  clusters.forEach(function(clus) {
    doms.push(clus);
  });
};

var remove_repeat_overlap = function(all_objects) {
  var all_shapes = Object.keys(all_objects);
  var repeated = all_shapes.filter(function(shape) { return shape.indexOf('REPEAT') > 0; });
  repeated.forEach(function(shape) {
    var test_shape = shape.replace(/\s*REPEAT\s*/,'');
    var other_shapes = all_objects[test_shape];
    if (! other_shapes) {
      return;
    }
    var repeat_units = all_objects[test_shape];
    var repeat_units = all_objects[shape].sort(function(doma,domb) { return doma.start - domb.start; });
    var unit_block = { start: -1, end: -1 };
    var unit_blocks = [unit_block];
    for (var i = 0; i < repeat_units.length; i++ ) {
      if ( ((repeat_units[i].start - unit_block.end) > 10) || unit_block.end >= repeat_units[i].start  ){
        unit_block.end = Math.max(unit_block.end, repeat_units[i].end);
        if (unit_block.start < 0 ) {
          unit_block.start = repeat_units[i].start;
        }
      } else if (unit_block.end < repeat_units[i].end) {
        unit_block = {start: repeat_units[i].start, end: repeat_units[i].end};
        unit_blocks.push(unit_block);
      }
    }
    all_objects[test_shape] = other_shapes.filter(function(dom) {
      var block_filter = unit_blocks.filter(function(block) {
        var overlapping = overlap(block,dom);
        if (overlapping > 0.75*(dom.end - dom.start)) {
          return true;
        }
        return false;
      });
      return ! (block_filter.length > 0);
    });
  });
}

doms.forEach(classify);


Object.keys(groups_by_shape).forEach(function(shape) {
  cluster(groups_by_shape[shape]);
});

remove_repeat_overlap(groups_by_shape);

console.log(groups_by_shape);

var offset = -4;
Object.keys(groups_by_shape).forEach(function(shape) {
  if (groups_by_shape[shape].length < 1) {
    return;
  }
  groups_by_shape[shape].forEach(render_cluster.bind(null,offset));
  offset += 4;
});



return return_data;


}

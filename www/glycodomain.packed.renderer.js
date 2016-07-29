
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

doms.forEach(classify);

console.log(groups_by_shape);
var offset = -4;
Object.keys(groups_by_shape).forEach(function(shape) {
  var clusters = [];
  var doms = groups_by_shape[shape];
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
  clusters.forEach(render_cluster.bind(null,offset));
  offset += 4;
});

return return_data;


}

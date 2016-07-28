
var SHAPE_LOOKUP = {
  'Cleavage' : 'pentagon-flip',
  'Inhibitor' : 'pentagon-flip',
  'Binding' : 'ellipse',
  'Adhesion' : 'ellipse',
  'Transferase' : 'pentagon',
  'Kinase' : 'pentagon'
};

var COLOUR_LOOKUP = {
  'Cleavage' : 'red',
  'Protein' : 'orange'
};

var overlap = function(a,b) {
  var overlap = Math.min(a.end,b.end) - Math.max(a.start,b.start)
  return overlap > 0 ? overlap : 0 ;
};

function renderData(seq,doms) {

console.log("In Domain rendering");

var return_data = [];

var groups_by_shape = {};

var render_domain = function(domain) {
    if (((domain.end - domain.start) / seq.length) >= 0.8) {
    	return;
    }
    var classes = domain.class || [];
    var shape = 'rectangle';
    var colour = '#999';
    classes.forEach(function(classname) {
      var class_parts = classname.split('/').map(function(clazz) { return clazz.trim(); });
      shape = SHAPE_LOOKUP[class_parts[0]] || 'rectangle';
      colour = COLOUR_LOOKUP[class_parts[1]] || '#999';
    });
    // console.log(domain);
    // console.log(shape + " " + colour);
    groups_by_shape[shape + " " + colour ] = groups_by_shape[shape + " " + colour] || [];
    domain.shape = shape;
    domain.colour = colour;
    groups_by_shape[shape + " " + colour ].push(domain);
    // Domains by shape + colour
    // var dom = { "aa": domain.start, "type" : "shape" , "width" : (domain.end - domain.start), "options" : { "offset" : 2.5, "height" : 5, "fill" : colour, "shape" : shape, "stroke" : "#000", "stroke_width" : "0.5"  }};
    // return_data.push(dom);
};

doms.forEach(render_domain);

console.log(groups_by_shape);
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
  console.log(clusters);
});

return return_data;


}

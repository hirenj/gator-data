PieMenu = function() {

};

PieMenu.zoomIn = function(el,canvas,x,y) {
	el.style.webkitTransformOriginX = canvas.RS*x;
	el.style.webkitTransformOriginY = canvas.RS*y;
	el.style.webkitTransform = 'rotate(365deg) scale(0)';
	el.style.webkitTransition = '-webkit-transform 0.7s';
	setTimeout(function() {
		el.style.webkitTransform = '';
	},10);
};

PieMenu.create = function(canvas,x,y,contents) {
	var i = 0;
	var center = { 'x' : x, 'y' : y };
	var radius = ("ontouchstart" in window) ? (30 / canvas.zoom) : (20 / canvas.zoom);
	var icon_size = 10 / canvas.zoom;
	var phase = contents ? 2 * Math.PI / contents.length : 0;
	var menu = new PieMenu();
	var els = [];
	menu.container = canvas.group();
	if (window.MutationObserver || window.webkitMutationObserver || window.MozMutationObserver) {
		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type == "childList" && menu.container.nextSibling !== null) {
					menu.container.parentNode.appendChild(menu.container);
				}
			});
		});
		observer.observe(canvas,{ childList : true });
		menu.observer = observer;
	}
	var last_target = null;
	var touch_dispatcher = function(ev) {
		var target = document.elementFromPoint(ev.pageX,ev.pageY);
		if (! target ) {
			return;
		}
		if (last_target !== null && target !== last_target) {
			if (last_target.moveout_func) {
				last_target.moveout_func();
			}
		}
		if (target.move_func) {
			target.move_func(ev);
			last_target = target;
			if (menu.end && ("ontouchstart" in window) ) {
				menu.end();
			}
		}
	};
	canvas.addEventListener('touchmove',touch_dispatcher,false);

	canvas.addEventListener('touchend',function(ev) {
		if (last_target && last_target.end_func) {
			last_target.end_func();
			ev.stopPropagation();
		}
		canvas.removeEventListener('touchmove',touch_dispatcher);
		canvas.removeEventListener('touchend',arguments.callee);
	},false);

	(contents || []).forEach(function(item) {
		var x_pos = center.x + radius * Math.cos(i*phase);
		var y_pos = center.y + radius * Math.sin(i*phase);
		i++;		
		var circ = canvas.circle(x_pos,y_pos,icon_size);
		circ.setAttribute('fill','#eed');
		circ.setAttribute('stroke','#eee');
		circ.setAttribute('stroke-width', 1.5 * canvas.RS / canvas.zoom );
		PieMenu.zoomIn(circ,canvas,x,y);
		els.push(circ);
		var symbol = item.symbol;
        if (typeof symbol == 'string') {
            if (symbol.match(/^(:?https?:)?\//)) {
            	var g = canvas.group();
                var next_g = canvas.group();
                g.push(next_g);
                var use = canvas.use(symbol,0,0,100,100);
				next_g.setAttribute('transform','translate('+(((x_pos-icon_size)*canvas.RS))+','+((y_pos-icon_size)*canvas.RS)+') scale('+(icon_size)+')');
				next_g.push(use);
	            g.setAttribute('pointer-events','none');
				PieMenu.zoomIn(g,canvas,x,y);
                els.push(g);
            } else if (symbol.match(/^#/) || symbol.match(/^url/)) {
            	circ.setAttribute('fill',symbol);
        	} else {
                symbol = canvas.text_circle(x_pos,y_pos,icon_size,symbol);
                var g = canvas.group();
                g.push(symbol);
                els.push(g);
	            g.setAttribute('pointer-events','none');
        		PieMenu.zoomIn(g,canvas,x,y);
            }
        } else {
            var g = canvas.group();
            var next_g = canvas.group();
			next_g.setAttribute('transform','translate('+(((x_pos)*canvas.RS))+','+((y_pos+2*icon_size)*canvas.RS)+') scale('+(icon_size)+')');
			next_g.push(symbol);
            g.push(next_g);
            els.push(g);
            g.setAttribute('pointer-events','none');
    		PieMenu.zoomIn(g,canvas,x,y);
        }
        circ.move_func = function(ev) {
        	this.setAttribute('stroke','#0f0');
        	if (item.hover_function) {
        		item.hover_function();
        	}
        	ev.stopPropagation();
        };
        circ.end_func = function(ev) {
        	if (item.select_function) {
        		item.select_function();
        	}
        };
        circ.moveout_func = function(ev) {
        	this.setAttribute('stroke','#eee');
        };
        circ.addEventListener('mouseover',circ.move_func,true);
        circ.addEventListener('mouseup',circ.end_func);
        circ.addEventListener('mouseout',circ.moveout_func);
	});
	menu.elements = els;
	menu.elements.forEach(function(el) {
		menu.container.push(el);
	});
	return menu;
};


PieMenu.prototype.destroy = function() {
	var self = this;
	if (this.elements) {
		if (this.observer) {
			this.observer.disconnect();
		}
		this.elements.forEach(function(el) {
			if (el.setAttribute) {
				el.setAttribute('pointer-events','none');
			}
			if (el.style) {
				el.style.webkitTransform = 'rotate(365deg) scale(0)';
			}
			setTimeout(function() {
				if (el && el.parentNode) {
					el.parentNode.removeChild(el);
				}
			},750);
		});
		this.elements = [];
	}
	setTimeout(function() {
		if (self.container && self.container.parentNode) {
			self.container.parentNode.removeChild(self.container);
		}
	},1000);
};
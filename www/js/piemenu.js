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
	var radius = 20 / canvas.zoom;
	var icon_size = 10 / canvas.zoom;
	var phase = contents ? 2 * Math.PI / contents.length : 0;
	var menu = new PieMenu();
	var els = [];
	menu.container = canvas.group();
	if (window.MutationObserver) {
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
        circ.addEventListener('mouseover',function(ev) {
        	this.setAttribute('stroke','#0f0');
        	if (item.hover_function) {
        		item.hover_function();
        	}
        	ev.stopPropagation();
        },true);
        circ.addEventListener('mouseup',function(ev) {
        	if (item.select_function) {
        		item.select_function();
        	}
        });
        circ.addEventListener('mouseout',function(ev) {
        	this.setAttribute('stroke','#eee');
        });
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
			el.setAttribute('pointer-events','none');
			el.style.webkitTransform = 'rotate(365deg) scale(0)';
			setTimeout(function() {
				el.parentNode.removeChild(el);
			},750);
		});
	}
	setTimeout(function() {
		self.container.parentNode.removeChild(self.container);
	},1000);
};
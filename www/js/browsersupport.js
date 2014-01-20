(function(parent) {

	if (parent.IE && parent.IE < 9) {
		var message = "Your browser is not fully supported, data and functionality may be missing from the tool";
		if (window.notify) {
			window.notify.alert(message);
		} else {
			window.alert(message);
		}
		return;
	}
	window.addEventListener('load',function() {
		if ( typeof JSandbox == 'undefined' ) {
			var message = "Your browser is not fully supported, data and functionality may be missing from the tool";
			if (window.notify) {
				window.notify.alert(message);
			} else {
				window.alert(message);
			}
		}
	});

})(window);
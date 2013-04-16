(function() {
	var message = "Your browser is not fully supported, functionality may be missing from the tool";
	if (window.notify) {
		window.notify.alert(message);
	} else {
		window.alert(message);
	}
})();
(function(win) {
	var Notify = function(message) {
		return Notify.alert(message);
	};
	var notifications = [];
	var LEVEL_ALERT = 1;
	var LEVEL_WARNING = 2;
	var LEVEL_INFO = 3;
	var window_ready = false;
	var notification_container = null;

	Notify.notify = function(message,level) {
		var info_block = {"message" : message, "level" : level };
		info_block.hideLater = hide_later;
		notifications.push(info_block);
		setTimeout(function() {
			try_notify();
		},0);
		return info_block;
	};

	Notify.alert = function(message) {
		return this.notify(message,LEVEL_ALERT);
	};

	Notify.warn = function(message) {
		return this.notify(message,LEVEL_WARNING);
	};

	Notify.info = function(message) {
		return this.notify(message,LEVEL_INFO);
	};


	var try_notify = function() {
		if (notifications.length < 1) {
			return false;
		}
		if ( ! window_ready ) {
			return false;
		}
		var notification = notifications.shift();
		if ( ! notification_container ) {
			notification_container = build_container(document);
		}
		var element = build_notification(notification.message, notification.level);
		notification_container.appendChild(element);
		if (notification.hide_time) {
			setTimeout(function(){
				hide_notification(element);
			},notification.hide_time);
		}
		notification.element = element;
		if (notifications.length > 0) {
			setTimeout(function() {
				try_notify();
			},0);
		}
	};

	var build_container = function() {
		document.body.insertBefore(document.createElement('div'),document.body.firstChild);
		document.body.childNodes[0].setAttribute('class','notification_container')
		return document.body.childNodes[0];
	}

	var build_notification = function(message,level) {
		if ( ! level ) {
			level = 3;
		}
		var notification = document.createElement('div');
		notification.textContent = message;
		notification.setAttribute('class','notification level_'+level);

		var close_button = document.createElement('div');
		close_button.textContent = String.fromCharCode ? String.fromCharCode(0x2716) : "X";
		close_button.setAttribute('class','close_button');
		notification.appendChild(close_button);

		// Use this method to make it more compatible with older browsers
		close_button.onclick = function() {
			hide_notification(notification);
		};
		notification.style.position = 'relative';
		return notification;
	};

	var hide_later = function(time) {
		var self = this;
		this.hide_time = time;

		if ( this.shown ) {
			setTimeout(function() {
				hide_notification(self.element);
			},time);
		}
	}

	var hide_notification = function(notification) {
		if (notification.parentNode) {
			notification.parentNode.removeChild(notification);
		}
	}

	var window_checker = setInterval(function() {
	    if (document.readyState === "interactive" || document.readyState === "complete") {
	        clearInterval(window_checker);
	        window_ready = true;
	        try_notify();
	    }
	}, 10);

	win.notify = Notify;
})(this);
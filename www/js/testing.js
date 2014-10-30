// Enable the testing mode. Hide this behind the konami code.
// https://github.com/caiogondim/js-konami-code-event
document.addEventListener('konamiCode',function() {
	if (window.addGatorURL) {
		window.notify.info("CHEAT MODE ALREADY ENABLED").hideLater(2000);
		return;
	}
	window.notify.info("CHEAT MODE ENABLED").hideLater(2000);
	var pfunc = function (datablock){
		for (var key in datablock.data) {
			if (key == "" || key.match(/\s/)) {
				delete datablock.data[key];
			} else {
				var dat = datablock.data[key];
				delete datablock.data[key];
				datablock.data[key.toLowerCase()] = {
					"data" : dat,
					"retrieved" : datablock.retrieved,
					"etag" : datablock.etag,
					"title" : datablock.title
				};
			}
		}
		delete datablock.retrieved;
		delete datablock.etag;
		delete datablock.title;
		return datablock.data;
	};

	window.addGatorURL = function(url,name,trackname) {
		if ( ! name ) {
			name = 'Testing';
		}
		if ( ! trackname ) {
			trackname = name;
		}
		get_preferences().getPreferences(function(err,prefs) {
			var block = {};
			block.parser_function = pfunc.toString();
			block.render_options = { 'track' : trackname , 'renderer' : '/'+name+'.renderer' };
			block.title = 'Testing '+trackname;
			block.type = 'gatorURL';
			prefs.user_datasets[url] = block;
			get_preferences().sync(function() { console.log("Done"); } );
		});
	};
	window.addPrefBlock = function(filename) {
		get_preferences().getPreferences(function(err,prefs){
			var block = {};
			block.parser_function = pfunc.toString();
			block.render_options = { 'track' : 'Yeast', 'renderer' : '/'+filename+'.renderer' };
			block.title = 'Test';
			block.type = 'dataset'; prefs.user_datasets['/'+filename+'.json'] = block;
			get_preferences().sync(function() { console.log("Done"); } );
		});
	};
},false);
/* global Event, document */

(function () {
  'use strict';

  // http://stackoverflow.com/a/9849276
  function _contains(a, b) {
    return !!~a.indexOf(b)
  }

  var konamiCode = {
    init: function () {
      this.KEY_LEFT      = 37
      this.KEY_UP        = 38
      this.KEY_RIGHT     = 39
      this.KEY_DOWN      = 40
      this.KEY_A         = 65
      this.KEY_B         = 66
      this.CODE_SEQUENCE = '38384040373937396665'  // ⬆ ⬆ ⬇ ⬇ ⬅ ➡ ⬅ ➡ b a
      this.maxDelay      = 1500

      this.bindListener()

      return this
    }
  , bindListener: function () {
      var buffer          = ''
      var lastDate        = null
      var konamiCodeEvent = new Event('konamiCode')
      var validKeys       = [
        this.KEY_LEFT
      , this.KEY_UP
      , this.KEY_RIGHT
      , this.KEY_DOWN
      , this.KEY_A
      , this.KEY_B
      ]

      document.addEventListener('keyup', function (ev) {
        if (_contains(validKeys, ev.keyCode) &&
            ( ! lastDate || ((new Date() - lastDate) <= this.maxDelay) ) ) {

          lastDate = new Date()
          buffer = buffer + ev.keyCode

          if (_contains(buffer, this.CODE_SEQUENCE)) {
            document.dispatchEvent(konamiCodeEvent)
            buffer = ''
          }
        } else {
          lastDate = new Date()
          buffer = ''
        }
      }.bind(this))
    }
  }

  return konamiCode.init()

}());
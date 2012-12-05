/*
*   Modified from: http://code.google.com/p/html5uploader/
*	Upload files to the server using HTML 5 Drag and drop the folders on your local computer
*
*	Tested on:
*	Mozilla Firefox 3.6.12
*	Google Chrome 7.0.517.41
*	Safari 5.0.2
*	Safari na iPad
*	WebKit r70732
*
*	The current version does not work on:
*	Opera 10.63 
*	Opera 11 alpha
*	IE 6+
*/

function readfile(place, complete) {
    var reader;
    /**/
    // Upload image files
    var upload = function(file) {

        // Firefox 3.6, Chrome 6, WebKit
        if (typeof FileReader != 'undefined') { 

            var reader;
            // Once the process of reading file
            var loadEnd = function() {
                complete(reader.result); 
            };

            // Loading errors
            var loadError = function(event) {
            };

            // Reading Progress
            var loadProgress = function(event) {
            };

            reader = new FileReader();
            // Firefox 3.6, WebKit
            if(reader.addEventListener) { 
                reader.addEventListener('loadend', loadEnd, false);
                if (status !== null) 
                {
                    reader.addEventListener('error', loadError, false);
                    reader.addEventListener('progress', loadProgress, false);
                }
            
            // Chrome 7
            } else { 
                reader.onloadend = loadEnd;
                if (status !== null) 
                {
                    reader.onerror = loadError;
                    reader.onprogress = loadProgress;
                }
            }
        
            // The function that starts reading the file as a binary string
            reader.readAsText(file);
        }
    };

    // Function drop file
    var drop = function(event) {
        if (event.preventDefault) {
            event.preventDefault();
        }
        
        var i;
        
        if (event.dataTransfer && event.dataTransfer.files.length === 0) {
            return true;
        }
        var dt = event.dataTransfer;
        var files = dt.files || [];
        for (i = 0; i<files.length; i++) {
            var file = files[i];            
            upload(file);
        }
        return false;
    };
    
    // The inclusion of the event listeners (DragOver and drop)
    if (place && document.getElementById(place)) {
        var uploadPlace =  document.getElementById(place);
        if ( ! uploadPlace.addEventListener ) {        
            uploadPlace.addEventListener = function(ev,fn) {
                this.attachEvent("on"+ev,fn);
            };
        }
        uploadPlace.addEventListener("dragover", function(event) {
            if (event.stopPropagation) {
                event.stopPropagation(); 
            }
            if (event.preventDefault) {
                event.preventDefault();
            }
            return false;
        }, true);
        uploadPlace.addEventListener("dragenter", function(event) {
            if (event.stopPropagation) {
                event.stopPropagation(); 
            }
            if (event.preventDefault) {
                event.preventDefault();
            }
            return false;
        }, true);

        uploadPlace.addEventListener("drop", drop, false); 
    }
}

    
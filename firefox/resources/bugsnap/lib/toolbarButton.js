var {Cc, Ci} = require("chrome");
var data = require("self").data;
var tabs = require("tabs");
var { Hotkey } = require("hotkeys");

var mediator;
var screenCapture = {};

function init() {
	mediator = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
    Hotkey({
        combo: "alt-shift-q",
        onPress: function() {
            makeScreenShot();
        }
    });
	return addToolbarButton();
};

function addToolbarButton(){
	var document = mediator.getMostRecentWindow("navigator:browser").document;
	var addonBar = document.getElementById("nav-bar");
	var toolbarbutton = document.createElement("toolbarbutton"); 	
	toolbarbutton.id = 'bugsnap-screenshot-toolbarbutton';
	toolbarbutton.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
	toolbarbutton.setAttribute('image', data.url('common/img/16.png'));
	toolbarbutton.setAttribute('orient', 'horizontal');
	toolbarbutton.setAttribute('label', 'BugSnap');
	toolbarbutton.setAttribute('tooltiptext', 'BugSnap');
	toolbarbutton.addEventListener('mousedown', function(e) { makeScreenShot(); }, false);
	addonBar.appendChild(toolbarbutton);
};

function makeScreenShot() {
	var browser = mediator.getMostRecentWindow("navigator:browser").gBrowser;
    var window = browser.contentWindow;
    var document = window.document;
    var html = document.documentElement;
    var w, h, x, y;
    x = 0;
    y = html.scrollTop;
    w = html.clientWidth;
    h = html.clientHeight;

    var canvas = document.createElement('canvas');
    canvas.width = w; 
    canvas.height = h;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    
    var ctx = canvas.getContext("2d");
    ctx.drawWindow(window, x, y, w, h, 'rgb(255, 255, 255)');

    var base64Img = canvas.toDataURL();
    screenCapture = { capture: base64Img };

    tabs.open({url: data.url('common/editor.html')});
};

function getScreenCapture() {
	return screenCapture;
};

exports.init = init;
exports.getScreenCapture = getScreenCapture;
/**
 The MIT License

 Copyright (c) 2010 Daniel Park (http://metaweb.com, http://postmessage.freebaseapps.com)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 **/
var NO_JQUERY = {};
(function(window, $, undefined) {

     if (!("console" in window)) {
         var c = window.console = {};
         c.log = c.warn = c.error = c.debug = function(){};
     }

     if ($ === NO_JQUERY) {
         // jQuery is optional
         $ = {
             fn: {},
             extend: function() {
                 var a = arguments[0];
                 for (var i=1,len=arguments.length; i<len; i++) {
                     var b = arguments[i];
                     for (var prop in b) {
                         a[prop] = b[prop];
                     }
                 }
                 return a;
             }
         };
     }

     $.fn.pm = function() {
         console.log("usage: \nto send:    $.pm(options)\nto receive: $.pm.bind(type, fn, [origin])");
         return this;
     };

     // send postmessage
     $.pm = window.pm = function(options) {
         pm.send(options);
     };

     // bind postmessage handler
     $.pm.bind = window.pm.bind = function(type, fn, origin, hash, async_reply) {
         pm.bind(type, fn, origin, hash, async_reply === true);
     };

     // unbind postmessage handler
     $.pm.unbind = window.pm.unbind = function(type, fn) {
         pm.unbind(type, fn);
     };

     // default postmessage origin on bind
     $.pm.origin = window.pm.origin = null;

     // default postmessage polling if using location hash to pass postmessages
     $.pm.poll = window.pm.poll = 200;

     var pm = {

         send: function(options) {
             var o = $.extend({}, pm.defaults, options),
             target = o.target;
             if (!o.target) {
                 console.warn("postmessage target window required");
                 return;
             }
             if (!o.type) {
                 console.warn("postmessage type required");
                 return;
             }
             var msg = {data:o.data, type:o.type};
             if (o.success) {
                 msg.callback = pm._callback(o.success);
             }
             if (o.error) {
                 msg.errback = pm._callback(o.error);
             }
             if (("postMessage" in target) && !o.hash) {
                 pm._bind();
                 target.postMessage(JSON.stringify(msg), o.origin || '*');
             }
             else {
                 pm.hash._bind();
                 pm.hash.send(o, msg);
             }
         },

         bind: function(type, fn, origin, hash, async_reply) {
           pm._replyBind ( type, fn, origin, hash, async_reply );
         },

         _replyBind: function(type, fn, origin, hash, isCallback) {
           if (("postMessage" in window) && !hash) {
               pm._bind();
           }
           else {
               pm.hash._bind();
           }
           var l = pm.data("listeners.postmessage");
           if (!l) {
               l = {};
               pm.data("listeners.postmessage", l);
           }
           var fns = l[type];
           if (!fns) {
               fns = [];
               l[type] = fns;
           }
           fns.push({fn:fn, callback: isCallback, origin:origin || $.pm.origin});
         },

         unbind: function(type, fn) {
             var l = pm.data("listeners.postmessage");
             if (l) {
                 if (type) {
                     if (fn) {
                         // remove specific listener
                         var fns = l[type];
                         if (fns) {
                             var m = [];
                             for (var i=0,len=fns.length; i<len; i++) {
                                 var o = fns[i];
                                 if (o.fn !== fn) {
                                     m.push(o);
                                 }
                             }
                             l[type] = m;
                         }
                     }
                     else {
                         // remove all listeners by type
                         delete l[type];
                     }
                 }
                 else {
                     // unbind all listeners of all type
                     for (var i in l) {
                       delete l[i];
                     }
                 }
             }
         },

         data: function(k, v) {
             if (v === undefined) {
                 return pm._data[k];
             }
             pm._data[k] = v;
             return v;
         },

         _data: {},

         _CHARS: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),

         _random: function() {
             var r = [];
             for (var i=0; i<32; i++) {
                 r[i] = pm._CHARS[0 | Math.random() * 32];
             };
             return r.join("");
         },

         _callback: function(fn) {
             var cbs = pm.data("callbacks.postmessage");
             if (!cbs) {
                 cbs = {};
                 pm.data("callbacks.postmessage", cbs);
             }
             var r = pm._random();
             cbs[r] = fn;
             return r;
         },

         _bind: function() {
             // are we already listening to message events on this w?
             if (!pm.data("listening.postmessage")) {
                 if (window.addEventListener) {
                     window.addEventListener("message", pm._dispatch, false);
                 }
                 else if (window.attachEvent) {
                     window.attachEvent("onmessage", pm._dispatch);
                 }
                 pm.data("listening.postmessage", 1);
             }
         },

         _dispatch: function(e) {
             //console.log("$.pm.dispatch", e, this);
             try {
                 var msg = JSON.parse(e.data);
             }
             catch (ex) {
                 //console.warn("postmessage data invalid json: ", ex); //message wasn't meant for pm
                 return;
             }
             if (!msg.type) {
                 //console.warn("postmessage message type required"); //message wasn't meant for pm
                 return;
             }
             var cbs = pm.data("callbacks.postmessage") || {},
             cb = cbs[msg.type];
             if (cb) {
                 cb(msg.data);
             }
             else {
                 var l = pm.data("listeners.postmessage") || {};
                 var fns = l[msg.type] || [];
                 for (var i=0,len=fns.length; i<len; i++) {
                     var o = fns[i];
                     if (o.origin && o.origin !== '*' && e.origin !== o.origin) {
                         console.warn("postmessage message origin mismatch", e.origin, o.origin);
                         if (msg.errback) {
                             // notify post message errback
                             var error = {
                                 message: "postmessage origin mismatch",
                                 origin: [e.origin, o.origin]
                             };
                             pm.send({target:e.source, data:error, type:msg.errback});
                         }
                         continue;
                     }

                     function sendReply ( data ) {
                       if (msg.callback) {
                           pm.send({target:e.source, data:data, type:msg.callback});
                       }
                     }

                     try {
                         if ( o.callback ) {
                           o.fn(msg.data, sendReply, e);
                         } else {
                           sendReply ( o.fn(msg.data, e) );
                         }
                     }
                     catch (ex) {
                         if (msg.errback) {
                             // notify post message errback
                             pm.send({target:e.source, data:ex, type:msg.errback});
                         } else {
                             throw ex;
                         }
                     }
                 };
             }
         }
     };

     // location hash polling
     pm.hash = {

         send: function(options, msg) {
             //console.log("hash.send", target_window, options, msg);
             var target_window = options.target,
             target_url = options.url;
             if (!target_url) {
                 console.warn("postmessage target window url is required");
                 return;
             }
             target_url = pm.hash._url(target_url);
             var source_window,
             source_url = pm.hash._url(window.location.href);
             if (window == target_window.parent) {
                 source_window = "parent";
             }
             else {
                 try {
                     for (var i=0,len=parent.frames.length; i<len; i++) {
                         var f = parent.frames[i];
                         if (f == window) {
                             source_window = i;
                             break;
                         }
                     };
                 }
                 catch(ex) {
                     // Opera: security error trying to access parent.frames x-origin
                     // juse use window.name
                     source_window = window.name;
                 }
             }
             if (source_window == null) {
                 console.warn("postmessage windows must be direct parent/child windows and the child must be available through the parent window.frames list");
                 return;
             }
             var hashmessage = {
                 "x-requested-with": "postmessage",
                 source: {
                     name: source_window,
                     url: source_url
                 },
                 postmessage: msg
             };
             var hash_id = "#x-postmessage-id=" + pm._random();
             target_window.location = target_url + hash_id + encodeURIComponent(JSON.stringify(hashmessage));
         },

         _regex: /^\#x\-postmessage\-id\=(\w{32})/,

         _regex_len: "#x-postmessage-id=".length + 32,

         _bind: function() {
             // are we already listening to message events on this w?
             if (!pm.data("polling.postmessage")) {
                 setInterval(function() {
                                 var hash = "" + window.location.hash,
                                 m = pm.hash._regex.exec(hash);
                                 if (m) {
                                     var id = m[1];
                                     if (pm.hash._last !== id) {
                                         pm.hash._last = id;
                                         pm.hash._dispatch(hash.substring(pm.hash._regex_len));
                                     }
                                 }
                             }, $.pm.poll || 200);
                 pm.data("polling.postmessage", 1);
             }
         },

         _dispatch: function(hash) {
             if (!hash) {
                 return;
             }
             try {
                 hash = JSON.parse(decodeURIComponent(hash));
                 if (!(hash['x-requested-with'] === 'postmessage' &&
                       hash.source && hash.source.name != null && hash.source.url && hash.postmessage)) {
                     // ignore since hash could've come from somewhere else
                     return;
                 }
             }
             catch (ex) {
                 // ignore since hash could've come from somewhere else
                 return;
             }
             var msg = hash.postmessage,
             cbs = pm.data("callbacks.postmessage") || {},
             cb = cbs[msg.type];
             if (cb) {
                 cb(msg.data);
             }
             else {
                 var source_window;
                 if (hash.source.name === "parent") {
                     source_window = window.parent;
                 }
                 else {
                     source_window = window.frames[hash.source.name];
                 }
                 var l = pm.data("listeners.postmessage") || {};
                 var fns = l[msg.type] || [];
                 for (var i=0,len=fns.length; i<len; i++) {
                     var o = fns[i];
                     if (o.origin) {
                         var origin = /https?\:\/\/[^\/]*/.exec(hash.source.url)[0];
                         if (o.origin !== '*' && origin !== o.origin) {
                             console.warn("postmessage message origin mismatch", origin, o.origin);
                             if (msg.errback) {
                                 // notify post message errback
                                 var error = {
                                     message: "postmessage origin mismatch",
                                     origin: [origin, o.origin]
                                 };
                                 pm.send({target:source_window, data:error, type:msg.errback, hash:true, url:hash.source.url});
                             }
                             continue;
                         }
                     }

                     function sendReply ( data ) {
                       if (msg.callback) {
                         pm.send({target:source_window, data:data, type:msg.callback, hash:true, url:hash.source.url});
                       }
                     }

                     try {
                         if ( o.callback ) {
                           o.fn(msg.data, sendReply);
                         } else {
                           sendReply ( o.fn(msg.data) );
                         }
                     }
                     catch (ex) {
                         if (msg.errback) {
                             // notify post message errback
                             pm.send({target:source_window, data:ex, type:msg.errback, hash:true, url:hash.source.url});
                         } else {
                             throw ex;
                         }
                     }
                 };
             }
         },

         _url: function(url) {
             // url minus hash part
             return (""+url).replace(/#.*$/, "");
         }

     };

     $.extend(pm, {
                  defaults: {
                      target: null,  /* target window (required) */
                      url: null,     /* target window url (required if no window.postMessage or hash == true) */
                      type: null,    /* message type (required) */
                      data: null,    /* message data (required) */
                      success: null, /* success callback (optional) */
                      error: null,   /* error callback (optional) */
                      origin: "*",   /* postmessage origin (optional) */
                      hash: false    /* use location hash for message passing (optional) */
                  }
              });

 })(this, typeof jQuery === "undefined" ? NO_JQUERY : jQuery);
;
var Jed=function(){"use strict";var a,u,c,l;a={"(":9,"!":8,"*":7,"/":7,"%":7,"+":6,"-":6,"<":5,"<=":5,">":5,">=":5,"==":4,"!=":4,"&&":3,"||":2,"?":1,"?:":1},u=["(","?"],c={")":["("],":":["?","?:"]},l=/<=|>=|==|!=|&&|\|\||\?:|\(|!|\*|\/|%|\+|-|<|>|\?|\)|:/;var p={"!":function(t){return!t},"*":function(t,n){return t*n},"/":function(t,n){return t/n},"%":function(t,n){return t%n},"+":function(t,n){return t+n},"-":function(t,n){return t-n},"<":function(t,n){return t<n},"<=":function(t,n){return t<=n},">":function(t,n){return n<t},">=":function(t,n){return n<=t},"==":function(t,n){return t===n},"!=":function(t,n){return t!==n},"&&":function(t,n){return t&&n},"||":function(t,n){return t||n},"?:":function(t,n,e){if(t)throw n;return e}};function o(t){var n=function(t){for(var n,e,r,i,o=[],s=[];n=t.match(l);){for(e=n[0],(r=t.substr(0,n.index).trim())&&o.push(r);i=s.pop();){if(c[e]){if(c[e][0]===i){e=c[e][1]||e;break}}else if(0<=u.indexOf(i)||a[i]<a[e]){s.push(i);break}o.push(i)}c[e]||s.push(e),t=t.substr(n.index+e.length)}return(t=t.trim())&&o.push(t),o.concat(s.reverse())}(t);return function(t){return function(t,n){var e,r,i,o,s,a,u=[];for(e=0;e<t.length;e++){if(s=t[e],o=p[s]){for(r=o.length,i=Array(r);r--;)i[r]=u.pop();try{a=o.apply(null,i)}catch(t){return t}}else a=n.hasOwnProperty(s)?n[s]:+s;u.push(a)}return u[0]}(n,t)}}var r={contextDelimiter:"",onMissingKey:null};function i(t,n){var e;for(e in this.data=t,this.pluralForms={},this.options={},r)this.options[e]=void 0!==n&&e in n?n[e]:r[e]}i.prototype.getPluralForm=function(t,n){var e,r,i=this.pluralForms[t];return i||("function"!=typeof(r=(e=this.data[t][""])["Plural-Forms"]||e["plural-forms"]||e.plural_forms)&&(r=function(t){var n=o(t);return function(t){return+n({n:t})}}(function(t){var n,e,r;for(n=t.split(";"),e=0;e<n.length;e++)if(0===(r=n[e].trim()).indexOf("plural="))return r.substr(7)}(e["Plural-Forms"]||e["plural-forms"]||e.plural_forms))),i=this.pluralForms[t]=r),i(n)},i.prototype.dcnpgettext=function(t,n,e,r,i){var o,s,a;return o=void 0===i?0:this.getPluralForm(t,i),s=e,n&&(s=n+this.options.contextDelimiter+e),(a=this.data[t][s])&&a[o]?a[o]:(this.options.onMissingKey&&this.options.onMissingKey(e,t),0===o?e:r)};var n=/%(((\d+)\$)|(\(([$_a-zA-Z][$_a-zA-Z0-9]*)\)))?[ +0#-]*\d*(\.(\d+|\*))?(ll|[lhqL])?([cduxXefgsp%])/g;function s(t,o){var s;if(!Array.isArray(o))for(o=new Array(arguments.length-1),s=1;s<arguments.length;s++)o[s-1]=arguments[s];return s=1,t.replace(n,function(){var t,n,e,r,i;return t=arguments[3],n=arguments[5],e=arguments[7],"%"===(r=arguments[9])?"%":("*"===e&&(e=o[s-1],s++),void 0!==n?o[0]&&"object"==typeof o[0]&&o[0].hasOwnProperty(n)&&(i=o[0][n]):(void 0===t&&(t=s),s++,i=o[t-1]),"f"===r?i=parseFloat(i)||0:"d"===r&&(i=parseInt(i)||0),void 0!==e&&("f"===r?i=i.toFixed(e):"s"===r&&(i=i.substr(0,e))),null!=i?i:"")})}var f={locale_data:{messages:{"":{domain:"messages",lang:"en",plural_forms:"nplurals=2; plural=(n != 1);"}}},domain:"messages"};function e(t,n){this._key=t,this._instance=n}function h(t){var n,e,r;for(n in t=t||{},this.options={},f)this.options[n]=t[n]||f[n];for(n in this.options.locale_data)(e=this.options.locale_data[n][""]).plural_forms||e["Plural-Forms"]||e["plural-forms"]||(e.plural_forms=f.locale_data.messages.plural_forms);if(t.domain&&!this.options.locale_data[this.options.domain])throw new Error("Text domain set to non-existent domain: `"+t.domain+"`");this.textdomain(this.options.domain),this.sprintf=s,r=this.tannin=new i(this.options.locale_data,{contextDelimiter:h.context_delimiter,onMissingKey:t.missing_key_callback}),Object.defineProperty(this.options,"locale_data",{get:function(){return r.data},set:function(t){r.data=t}}),h.instances.push(this)}return e.prototype.onDomain=function(t){return this._domain=t,this},e.prototype.withContext=function(t){return this._context=t,this},e.prototype.ifPlural=function(t,n){return this._val=t,this._pkey=n,this},e.prototype.fetch=function(t){var n;return Array.isArray(t)||(t=Array.prototype.slice.call(arguments,0)),n=this._instance.dcnpgettext(this._domain,this._context,this._key,this._pkey,this._val),t.length?h.sprintf(n,t):n},h.instances=[],Object.defineProperty(h,"context_delimiter",{get:function(){return h.instances.length?h.instances[0].tannin.options.contextDelimiter:String.fromCharCode(4)},set:function(n){h.instances.forEach(function(t){t.tannin.options.contextDelimiter=n})}}),h.sprintf=s,(h.PF={}).compile=function(t){var n=new i({default:{"":{plural_forms:t}}});return function(t){return n.getPluralForm("default",t)}},h.prototype.textdomain=function(t){if(!t)return this._textdomain;this._textdomain=t},h.prototype.dcnpgettext=function(t,n,e,r,i){return r=r||e,t=t||this._textdomain,this.tannin.dcnpgettext(t,n,e,r,i)},h.prototype.translate=function(t){return new e(t,this)},h.prototype.gettext=function(t){return this.dcnpgettext.call(this,void 0,void 0,t)},h.prototype.dgettext=function(t,n){return this.dcnpgettext.call(this,t,void 0,n)},h.prototype.dcgettext=function(t,n){return this.dcnpgettext.call(this,t,void 0,n)},h.prototype.ngettext=function(t,n,e){return this.dcnpgettext.call(this,void 0,void 0,t,n,e)},h.prototype.dngettext=function(t,n,e,r){return this.dcnpgettext.call(this,t,void 0,n,e,r)},h.prototype.dcngettext=function(t,n,e,r){return this.dcnpgettext.call(this,t,void 0,n,e,r)},h.prototype.pgettext=function(t,n){return this.dcnpgettext.call(this,void 0,t,n)},h.prototype.dpgettext=function(t,n,e){return this.dcnpgettext.call(this,t,n,e)},h.prototype.dcpgettext=function(t,n,e){return this.dcnpgettext.call(this,t,n,e)},h.prototype.npgettext=function(t,n,e,r){return this.dcnpgettext.call(this,void 0,t,n,e,r)},h.prototype.dnpgettext=function(t,n,e,r,i){return this.dcnpgettext.call(this,t,n,e,r,i)},h}();;
/*
 * WordPress REST Proxy Request
 * Name:   WPCOM_Proxy_Request
 * Author: Dan Walmsley <dan.walmsley@automattic.com>, Beau Collins <beaucollins@gmail.com>
 *
 * A function that makes proxy requests (using window.postMessage) to the
 * WordPress.com REST api (https://public-api.wordpress.com/rest/v1/help)
 *
 * Usage:
 * 	window.WPCOM_Proxy_Request( path );
 * 	window.WPCOM_Proxy_Request( path, request );
 * 	window.WPCOM_Proxy_Request( request );
 *
 * Arguments:
 * 	path     : the REST URL path to request (will be appended to the rest base URL)
 * 	request  : request parameters: method (string), path (string), query (object), body (object)
 *
 * Returns
 * 	A promise()-like object whose callbacks accept the following arguments:
 * 		response : the JSON response for your request
 * 		statusCode : the HTTP statusCode for your request
 *
 * Example:
 * 	// For simple GET requests
 * 	window.WPCOM_Proxy_Request( '/me' ).done( function( response, statusCode ){
 * 		/// ...
 * 	} );
 *
 * 	// More Advanced GET request
 * 	window.WPCOM_Proxy_Request( {
 * 		path: '/sites/en.blog.wordpress.com/posts',
 * 		query: { number: 100 }
 * 	} );
 *
 * 	// POST request
 * 	window.WPCOM_Proxy_Request( {
 * 		method: 'POST',
 * 		path: '/sites/en.blog.wordpress.com/posts/9776/replies/new',
 * 		body: { content: 'This is a comment' }
 * 	} );
 */
(function(){
	// don't run this more than once per context
	if ( window.WPCOM_Proxy_Request) {
		return;
	}

	// polyfill for jQuery Deferred
	var Deferred = function() {
		this._done = [];
		this._fail = [];
	};

	Deferred.prototype = {
		execute: function(list, args){
			var i = list.length;

			// convert arguments to an array
			// so they can be sent to the
			// callbacks via the apply method
			args = Array.prototype.slice.call(args);

			while(i--) list[i].apply(null, args);
		},
		resolve: function(){
			this.execute(this._done, arguments);
		},
		reject: function(){
			this.execute(this._fail, arguments);
		},
		done: function(callback){
			this._done.push(callback);
			return this;
		},
		fail: function(callback){
			this._fail.push(callback);
			return this;
		},
		promise: function() {
			var x = {};
			x.done = this.done.bind( this );
			x.fail = this.fail.bind( this );
			return x;
		}
	};

	// polyfill for jQuery.extend
	var extend = function( out ) {
		out = out || {};

		for (var i = 1; i < arguments.length; i++) {
			if (!arguments[i])
				continue;

			for (var key in arguments[i]) {
				if (arguments[i].hasOwnProperty(key))
					out[key] = arguments[i][key];
			}
		}

		return out;
	}

	var proxy,
	origin         = window.location.protocol + '//' + window.location.hostname,
	proxyOrigin    = 'https://public-api.wordpress.com',

	ready          = false,
	supported      = true, // assume window.postMessage is supported
	usingPM        = false, // If we don't have window.postMessage, postmessage.js may be available
	structuredData = true, // supports passing of structured data

	bufferedOps    = [],   // store requests while we wait for the proxy iframe to initialize

	// Store `Deferred` objects for each pending request.
	deferreds      = {},

	// Store `this` context objects for each pending request, if given.
	callbackContexts = {},

	/**
	 * Firefox apparently doesn't like sending `File` instances cross-domain.
	 * It results in a "DataCloneError: The object could not be cloned." error.
	 * Apparently this is for "security purposes" but it's actually silly if that's
	 * the argument because we can just read the File manually into an ArrayBuffer
	 * and we can work around this "security restriction".
	 *
	 * See: https://bugzilla.mozilla.org/show_bug.cgi?id=722126#c8
	 */
	 hasFileSerializationBug = false,

	 // Can we pass structured data via postMessage or just strings?
	check = function( event ){
		structuredData = 'object' === typeof event.data;
		window.removeEventListener( 'message', check );
		buildProxy();
	},

	// Initialize the proxy iframe
	buildProxy = function() {
		// Start listening to messages
		if ( !usingPM ) {
			window.addEventListener( 'message', receive );
		} else {
			pm.bind( 'proxy', function( e ) { receive( e ); } );
		}

		proxy = document.createElement( 'iframe' );
		proxy.src = 'https://public-api.wordpress.com/wp-admin/rest-proxy/#' + origin;
		proxy.style.display = 'none';

		// Process any buffered API calls after the iframe proxy is ready
		proxy.addEventListener( 'load', function() {
			var request;
			ready = true;
			while ( request = bufferedOps.shift() ) {
				postRequest( request );
			}
		});

		var appendProxy = function() {
			document.body.appendChild( proxy );
		};

		// Bring it
		if (document.readyState === 'complete' || document.readyState !== 'loading') {
			appendProxy();
		} else {
			document.addEventListener('DOMContentLoaded', appendProxy);
		}
	},

	// Message event listener
	receive = function( e ){
		var data,
			deferred_id,
			deferred,
			context;

		if ( !usingPM ) {
			if ( e.origin !== proxyOrigin ) {
				return;
			}

			data = structuredData ? e.data : JSON.parse( e.data );
		} else {
			data = e;
		}

		if ( !data || !data.length ) {
			return;
		}

		deferred_id = data[ data.length - 1 ];

		if ( 'undefined' === typeof deferreds[deferred_id] ) {
			return;
		}

		deferred = deferreds[deferred_id];
		delete deferreds[deferred_id];

		context = callbackContexts[ deferred_id ];
		if ( context ) {
			// `resolveWith` takes args as an array.
			deferred.resolveWith.call( deferred, context, data.slice( 0, -1 ) );
			delete callbackContexts[ deferred_id ];
		} else {
			// `resolve` takes args as a list of parameters.
			deferred.resolve.apply( deferred, data.slice( 0, -1 ) );
		}
	},

	// Calls API
	perform = function() {
		var request = buildRequest.apply( null, arguments );

		postRequest( request );

		return deferreds[request.callback].promise();
	},

	// Buffers API request
	buffer = function() {
		var request = buildRequest.apply( null, arguments );

		bufferedOps.push( request );

		return deferreds[request.callback].promise();
	},

	// Submits the API request to the proxy iframe
	postRequest = function( request ) {
		var files = findFilesInRequest( request ),
	 		data = structuredData ? request : JSON.stringify( request );

		if ( hasFileSerializationBug && files.has_files ) {
			postAsArrayBuffer( request, files );
		} else {
			try {
				sendPostMessage( data );
			} catch( e ) {
				// were we trying to serialize a `File`?
				if ( files.has_files ) {

					// cache this check for the next API request
					hasFileSerializationBug = true;
					postAsArrayBuffer( request, files );
				} else {
					// not interested, rethrow
					throw e;
				}
			}
		}
	},

	sendPostMessage = function( data ) {
		if ( !usingPM ) {
			proxy.contentWindow.postMessage( data, proxyOrigin );
		} else if ( window.pm ) {
			pm( {
				data  : data,
				type  : 'proxy',
				target: proxy.contentWindow,
				url   : 'https://public-api.wordpress.com/wp-admin/rest-proxy/#' + origin,
				origin: proxyOrigin
			} );
		}
	},

	postAsArrayBuffer = function( request, files ) {
		if ( ! files.has_files )
			return;

		for(i=0; i<files.file_keys.length; ++i) {
			var reader = new FileReader(),
				key = request.formData[i][0],
				file = request.formData[i][1];

			reader.onload = function(e) {
				request.formData[i] = [ key, {
					fileContents: e.target.result,
					fileName : file.name,
					mimeType: file.type
				} ];

				var are_there_still_files = findFilesInRequest( request );
				if ( ! are_there_still_files.has_files ) {
					proxy.contentWindow.postMessage( request, proxyOrigin );
				}
			};

			reader.readAsArrayBuffer( file );
		}
	},

	findFilesInRequest = function( request ) {
		var files = {
			has_files : false,
			file_keys : []
		};

		if ( ! structuredData || ! request.formData || request.formData.length <= 0 )
			return files;

		for(i=0; i<request.formData.length; i++) {
			var arr = request.formData[i];
			var maybe_a_file = arr[1];
			if ( 'object' == typeof maybe_a_file && '[object File]' == Object.prototype.toString.call( maybe_a_file ) ) {
				files.has_files = true;
				files.file_keys.push( i );
			}
		}

		return files;
	},

	// Builds the postMessage request object
	buildRequest = function() {
		var args     = [].slice.call( arguments );
		    request  = args.pop(),
		    path     = args.pop(),
		    deferred = new Deferred(),
			deferred_id = Math.random();

		// @todo - remove this back-compat code
		if ( 'function' === typeof( request ) ) {
			deferred.done( request );
			request = path;
			path    = args.pop();
		}

		if ( 'string' === typeof( request ) ) {
			request = { path: request };
		}

		if ( path ) {
			request.path = path;
		}

		deferreds[deferred_id] = deferred;

		if ( request.context ) {
			callbackContexts[ deferred_id ] = request.context;
			// Trying to pass functions through `postMessage` is a bad time.
			request = extend( {}, request );
			delete request.context;
		}

		request.callback = deferred_id;
		request.supports_args = true; // supports receiving variable amount of arguments
		return request;
	};

	// Step 1: do we have postMessage? ( in IE8, typeof window.postMessage == 'object' )
	if ( [ 'function', 'object' ].indexOf( typeof window.postMessage ) >= 0 ) {
		// Step 2: Check if we can pass structured data or just strings
		window.addEventListener( 'message', check );
		window.postMessage( {}, origin );
	} else if ( window.pm ) {
		usingPM = true;
		// Step 2: We can always just used structured data.
		buildProxy();
	} else {
		supported = false;
	}

	window.WPCOM_Proxy_Request = function(){
		if ( !supported ) {
			throw( 'Browser does not support window.postMessage' );
		}

		if ( ready ) {
			// Make API request
			return perform.apply( null, arguments );
		} else {
			// Buffer API request
			return buffer.apply( null, arguments );
		}
	};

	window.WPCOM_Proxy_Rebuild = function() {
		if ( !ready )
			return;

		ready = false;
		proxy.parentNode.removeChild( proxy );

		buildProxy();
	};
})();
;
/*
 *  - wpLikes wraps all the proxied REST calls
 */
var wpLikes;

/*!
	https://gist.github.com/marlun78/2701678
	Underscore.js templates as a standalone implementation.
	JavaScript micro-templating, similar to John Resig's implementation.
	Underscore templates documentation: http://documentcloud.github.com/underscore/#template
	Modifyed by marlun78
*/
( function () {
	'use strict';

	// By default, Underscore uses ERB-style template delimiters, change the
	// following template settings to use alternative delimiters.
	var settings = {
		evaluate: /<%([\s\S]+?)%>/g,
		interpolate: /<%=([\s\S]+?)%>/g,
		escape: /<%-([\s\S]+?)%>/g,
	};

	// When customizing `templateSettings`, if you don't want to define an
	// interpolation, evaluation or escaping regex, we need one that is
	// guaranteed not to match.
	var noMatch = /.^/;

	// Certain characters need to be escaped so that they can be put into a
	// string literal.
	var escapes = {
		'\\': '\\',
		"'": "'",
		r: '\r',
		n: '\n',
		t: '\t',
		u2028: '\u2028',
		u2029: '\u2029',
	};

	for ( var p in escapes ) {
		escapes[ escapes[ p ] ] = p;
	}

	var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

	var tmpl = function ( text, data, objectName ) {
		settings.variable = objectName;

		// Compile the template source, taking care to escape characters that
		// cannot be included in a string literal and then unescape them in code
		// blocks.
		var source =
			"__p+='" +
			text
				.replace( escaper, function ( match ) {
					return '\\' + escapes[ match ];
				} )
				.replace( settings.escape || noMatch, function ( match, code ) {
					return "'+\nwindow.escapeHTML(" + unescape( code ) + ")+\n'";
				} )
				.replace( settings.interpolate || noMatch, function ( match, code ) {
					return "'+\n(" + unescape( code ) + ")+\n'";
				} )
				.replace( settings.evaluate || noMatch, function ( match, code ) {
					return "';\n" + unescape( code ) + "\n;__p+='";
				} ) +
			"';\n";

		// If a variable is not specified, place data values in local scope.
		if ( ! settings.variable ) {
			source = 'with(obj||{}){\n' + source + '}\n';
		}

		source =
			"var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
			source +
			'return __p;\n';

		var render = new Function( settings.variable || 'obj', source );

		if ( data ) {
			return render( data );
		}

		var template = function ( templateData ) {
			return render.call( this, templateData );
		};

		// Provide the compiled function source as a convenience for build time
		// precompilation.
		template.source = 'function(' + ( settings.variable || 'obj' ) + '){\n' + source + '}';

		return template;
	};

	window.tmpl = tmpl;
} )();

/**
 * Escape function brought in from Underscore.js
 */
( function () {
	var escapeMap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;',
		'`': '&#x60;',
	};

	var createEscaper = function ( map ) {
		var escaper = function ( match ) {
			return map[ match ];
		};

		var source = '(?:' + Object.keys( map ).join( '|' ) + ')';
		var testRegexp = RegExp( source );
		var replaceRegexp = RegExp( source, 'g' );
		return function ( string ) {
			string = string == null ? '' : '' + string;
			return testRegexp.test( string ) ? string.replace( replaceRegexp, escaper ) : string;
		};
	};

	window.escapeHTML = createEscaper( escapeMap );
} )();

( function () {
	var extWin;
	var i18n;

	wpLikes = {
		version: '',
		lang: 'en',
		langVersion: '',

		jsonAPIbase: 'https://public-api.wordpress.com/rest/v1',
		hasUpgradedProxy: false,
		isLoggedIn: false,
		masterReady: false,
		requests: {},
		me: false,
		askedMe: false,
		cache: [],
		adminBarEnabled: false,
		reblogsEnabled: false,

		batches: [],

		widgetDims: {},

		login_blog_id: false,
		login_post_id: false,
		login_comment_id: false,
		login_obj_id: false,
		login_domain: false,

		textStyles: {},
		linkStyles: {},
		adminBarStyles: {},

		likers: [],
		total: [],

		wpLikes: function () {
			var info = wpLikes.splitParams( location.hash.replace( /^#/, '' ) );
			if ( 'ver' in info ) {
				wpLikes.version = info.ver;
			}
		},

		resizeFrame: function ( name ) {
			var likeBox = window.parent.frames[ name ].document.querySelector( '.wpl-likebox' );
			var slim = this.hasClass( 'wpl-slim-likebox', likeBox );

			// Make sure slim likeboxes are actually inline-block - always
			if ( slim ) {
				var cssDisplay = likeBox.style.display;
				if ( cssDisplay !== 'inline-block' ) {
					likeBox.style.display = 'inline-block';
				}
			}

			var likeboxHeight = this.outerHeight( likeBox );
			var likeboxWidth = this.outerWidth( likeBox );

			wpLikes.postMessage(
				{
					action: 'resize',
					name: name,
					height: likeboxHeight,
					width: likeboxWidth,
				},
				parent,
				'resizeMessage'
			);
		},

		likePost: function ( blog_id, post_id, source, success, fail ) {
			return this.ajax( {
				type: 'POST',
				path: '/sites/' + blog_id + '/posts/' + post_id + '/likes/new',
				query: 'source=' + source,
				success: success,
				error: fail,
				blogId: blog_id,
				postId: post_id,
			} );
		},

		unlikePost: function ( blog_id, post_id, success, fail ) {
			return this.ajax( {
				type: 'POST',
				path: '/sites/' + blog_id + '/posts/' + post_id + '/likes/mine/delete',
				success: success,
				error: fail,
				blogId: blog_id,
				postId: post_id,
			} );
		},

		likeComment: function ( blog_id, comment_id, success, fail ) {
			if ( wpLikes.commentLikesKillSwitch ) {
				return;
			}
			return this.ajax( {
				type: 'POST',
				path: '/sites/' + blog_id + '/comments/' + comment_id + '/likes/new',
				success: success,
				error: fail,
				blogId: blog_id,
				commentId: comment_id,
			} );
		},

		unlikeComment: function ( blog_id, comment_id, success, fail ) {
			if ( wpLikes.commentLikesKillSwitch ) {
				return;
			}
			return this.ajax( {
				type: 'POST',
				path: '/sites/' + blog_id + '/comments/' + comment_id + '/likes/mine/delete',
				success: success,
				error: fail,
				blogId: blog_id,
				commentId: comment_id,
			} );
		},

		afterlikeFollow: function ( blog_id, success, fail ) {
			return this.ajax( {
				type: 'POST',
				path: '/sites/' + blog_id + '/follows/new',
				success: success,
				error: fail,
				blogId: blog_id,
			} );
		},

		getFollowingStatus: function ( blog_id, success, fail ) {
			return this.ajax( {
				type: 'GET',
				path: '/sites/' + blog_id + '/follows/mine',
				success: success,
				error: fail,
				blogId: blog_id,
			} );
		},

		getPost: function ( blog_id, post_id, success, fail ) {
			return this.ajax( {
				type: 'GET',
				path: '/sites/' + blog_id + '/posts/' + post_id,
				success: success,
				error: fail,
				blogId: blog_id,
				postId: post_id,
			} );
		},

		getPostLikeStatus: function ( blog_id, post_id, success, fail ) {
			return this.ajax( {
				type: 'GET',
				path: '/sites/' + blog_id + '/posts/' + post_id + '/likes/mine',
				success: success,
				error: fail,
				blogId: blog_id,
				postId: post_id,
			} );
		},

		getPostLikes: function ( blog_id, post_id, success, fail, fromCache ) {
			if ( typeof fromCache === 'undefined' ) {
				var info = wpLikes.splitParams( location.hash.replace( /^#/, '' ) );
				if ( 'ver' in info ) {
					wpLikes.version = info.ver;
				}
			}
			return this.ajax( {
				type: 'GET',
				path: '/sites/' + blog_id + '/posts/' + post_id + '/likes',
				success: success,
				error: fail,
				fromCache: fromCache,
				blogId: blog_id,
				postId: post_id,
			} );
		},

		getCommentLikeStatus: function ( blog_id, comment_id, success, fail ) {
			if ( wpLikes.commentLikesKillSwitch ) {
				return;
			}
			return this.ajax( {
				type: 'GET',
				path: '/sites/' + blog_id + '/comments/' + comment_id + '/likes/mine',
				success: success,
				error: fail,
				blogId: blog_id,
				commentId: comment_id,
			} );
		},

		getCommentLikes: function ( blog_id, comment_id, success, fail, fromCache ) {
			if ( wpLikes.commentLikesKillSwitch ) {
				return;
			}
			if ( typeof fromCache === 'undefined' ) {
				fromCache = true;
			}
			return this.ajax( {
				type: 'GET',
				path: '/sites/' + blog_id + '/comments/' + comment_id + '/likes',
				success: success,
				error: fail,
				fromCache: fromCache,
				blogId: blog_id,
				commentId: comment_id,
			} );
		},

		getMyInfo: function ( success, fail ) {
			if ( wpLikes.me ) {
				success( wpLikes.me, '/me' );
				return;
			}

			return this.ajax( {
				type: 'GET',
				path: '/me',
				success: success,
				error: fail,
			} );
		},

		splitParams: function ( queryString ) {
			var params = {};

			queryString.split( '&' ).forEach( function ( value ) {
				var pair = value.split( '=' );
				params[ pair[ 0 ] ] = decodeURIComponent( pair[ 1 ] );
			} );

			return params;
		},

		ajax: function ( options, batch ) {
			var request = {
				path: options.path,
				method: options.type,
				url: wpLikes.jsonAPIbase + options.path,
			};

			if ( batch && ! batch.batchFinished && options.path !== '/batch' ) {
				batch.batchWaiting.push( options );
				return;
			}

			if ( options.blogId && options.postId && options.path !== '/batch' ) {
				// Look for an initial batch for this post.
				wpLikes.batches.forEach( function ( initialBatch ) {
					if (
						initialBatch.blogId === options.blogId &&
						initialBatch.postId === options.postId &&
						! initialBatch.batchFinished
					) {
						initialBatch.batchWaiting.push( options );
						return;
					}
				} );
			}

			if ( options.blogId && options.commentId && options.path !== '/batch' ) {
				// Look for an initial batch for this comment.
				wpLikes.batches.forEach( function ( initialBatch ) {
					if (
						initialBatch.blogId === options.blogId &&
						initialBatch.commentId === options.commentId &&
						! initialBatch.batchFinished
					) {
						initialBatch.batchWaiting.push( options );
						return;
					}
				} );
			}

			if ( typeof options.fromCache === 'undefined' ) {
				options.fromCache = true;
			}

			if ( options.path in wpLikes.cache && options.fromCache ) {
				typeof options.success === 'function' &&
					options.success( wpLikes.cache[ options.path ], options.path );
				return;
			}

			if ( options.type.toLowerCase() === 'post' ) {
				request.body = options.data;
				request.query = options.query;
			} else {
				request.query = options.data;
			}

			var makeProxyCall = function () {
				return window.WPCOM_Proxy_Request( request, function ( response, statusCode ) {
					if ( statusCode === 200 ) {
						typeof options.success === 'function' && options.success( response, request.path );
					} else {
						typeof options.error === 'function' && options.error( statusCode, request.path );
					}
				} );
			};

			if ( wpLikes.hasUpgradedProxy ) {
				return makeProxyCall();
			}

			return window
				.WPCOM_Proxy_Request( { metaAPI: { accessAllUsersBlogs: true } } )
				.done( function () {
					wpLikes.hasUpgradedProxy = true;
					makeProxyCall();
				} );
		},

		/* postMessage */
		/* The messageType argument specifies the message type */
		/* Likes messages use likesMessage */
		/* An example of a message that doesn't use likesMessage is the resize request */
		postMessage: function ( message, target, messageType ) {
			if ( typeof message === 'string' ) {
				try {
					message = JSON.parse( message );
				} catch ( e ) {
					return;
				}
			}

			if ( typeof messageType === 'undefined' ) {
				messageType = 'likesMessage';
			}

			if ( target && typeof target.postMessage === 'function' ) {
				try {
					target.postMessage(
						JSON.stringify( {
							type: messageType,
							data: message,
						} ),
						'*'
					);
				} catch ( e ) {
					return;
				}
			}
		},

		openLoginWindow: function () {
			// Remove any lingering login window from any previous aborted login
			if ( extWin ) {
				if ( ! extWin.closed ) {
					extWin.close();
				}
				extWin = false;
			}

			// Remove any lingering cookie polling iframe from any previous aborted login
			var loginIframe = document.querySelector( '#wp-login-polling-iframe' );

			if ( loginIframe ) {
				loginIframe.parentNode.removeChild( loginIframe );
			}

			// Open new window for user to login in
			// We want to open it here (from the master iframe) so that our popup won't be blocked
			// (this keeps us in the context of the user's click)
			var authDomain = 'r-login.wordpress.com';

			if ( typeof wpLikes.login_domain === 'string' ) {
				authDomain = wpLikes.login_domain;
			}

			var url = 'https://' + authDomain + '/public.api/connect/?action=request&service=wordpress';

			if ( typeof wpLikes.login_domain === 'string' ) {
				url += '&domain=' + encodeURIComponent( wpLikes.login_domain );
			}

			if ( typeof wpLikes.login_blog_id !== 'undefined' ) {
				url += '&blog_id=' + encodeURIComponent( wpLikes.login_blog_id );
			}

			extWin = window.open(
				url,
				'likeconn',
				'status=0,toolbar=0,location=1,menubar=0,directories=0,resizable=1,scrollbars=1,height=660,width=500'
			);

			// Append cookie polling login iframe to original window to wait for user to finish logging in (or cancel)
			loginIframe = document.createElement( 'iframe' );
			loginIframe.id = 'wp-login-polling-iframe';
			loginIframe.src = 'https://r-login.wordpress.com/public.api/connect/?iframe=true';
			loginIframe.style.display = 'none';
			document.body.appendChild( loginIframe );
		},

		hasClass: function ( className, el ) {
			if ( el.classList ) {
				return el.classList.contains( className );
			}

			return new RegExp( '(^| )' + className + '( |$)', 'gi' ).test( el.className );
		},

		addClass: function ( className, el ) {
			if ( el.classList ) {
				el.classList.add( className );
			} else {
				el.className += ' ' + className;
			}
		},

		removeClass: function ( className, el ) {
			if ( el.classList ) {
				el.classList.remove( className );
			} else {
				el.className = el.className.replace(
					new RegExp( '(^|\\b)' + className.split( ' ' ).join( '|' ) + '(\\b|$)', 'gi' ),
					' '
				);
			}
		},

		outerWidth: function ( el ) {
			var width = el.offsetWidth;
			var style = getComputedStyle( el );
			if ( style ) {
				width += parseInt( style.marginLeft ) + parseInt( style.marginRight );
			}
			return width;
		},

		outerHeight: function ( el ) {
			var height = el.offsetHeight;
			var style = getComputedStyle( el );
			if ( style ) {
				height += parseInt( style.marginTop ) + parseInt( style.marginBottom );
			}
			return height;
		},

		triggerClick: function ( data, el ) {
			var event = new MouseEvent( 'click', {
				view: window,
				bubbles: true,
				cancelable: true,
			} );

			el.dispatchEvent( event );
		},

		readMessage: function ( msg ) {
			var event = msg.data;

			if ( typeof event.event === 'undefined' ) {
				return;
			} else if ( event.event === 'login' && event.success ) {
				// Remove any lingering login window
				if ( extWin ) {
					if ( ! extWin.closed ) {
						extWin.close();
					}
					extWin = false;
				}

				// Remove the cookie polling iframe that was added by openLoginWindow
				var pollingIframe = document.querySelector( '#wp-login-polling-iframe' );
				if ( pollingIframe ) {
					pollingIframe.parentNode.removeChild( pollingIframe );
				}

				// If the cookie or RLT token is available, then we must have auth'd successfully
				wpLikes.isLoggedIn = true;
				wpLikes.hasUpgradedProxy = false;
				window.WPCOM_Proxy_Rebuild();

				if ( wpLikes.login_post_id ) {
					wpLikes.getPostLikes(
						wpLikes.login_blog_id,
						wpLikes.login_post_id,
						function ( results ) {
							var slim = this.hasClass(
								'wpl-slim-likebox',
								window.parent.frames[
									'like-post-frame-' + wpLikes.login_obj_id
								].document.querySelector( '.wpl-likebox' )
							);
							wpLikes.updatePostFeedback(
								results,
								wpLikes.login_blog_id,
								wpLikes.login_post_id,
								slim,
								wpLikes.login_obj_id
							);

							if ( ! results.i_like ) {
								wpLikes.doLike(
									wpLikes.login_blog_id,
									wpLikes.login_post_id,
									wpLikes.login_obj_id
								);
							}

							var likeButton = window.parent.frames[
								'like-post-frame-' + wpLikes.login_obj_id
							].document.querySelector( '.wpl-button a.like, .wpl-button a.liked' );

							likeButton.onclick = function ( e ) {
								e.preventDefault();
								wpLikes.doLike(
									wpLikes.login_blog_id,
									wpLikes.login_post_id,
									wpLikes.login_obj_id
								);
							};
						}.bind( this ),
						function () {},
						false
					);
				}

				if ( wpLikes.login_comment_id && ! wpLikes.commentLikesKillSwitch ) {
					wpLikes.getCommentLikes(
						wpLikes.login_blog_id,
						wpLikes.login_comment_id,
						function ( results ) {
							var links = window.parent.frames[
								'like-comment-frame-' + wpLikes.login_obj_id
							].document.querySelectorAll( 'a.comment-like-link' );

							if ( links.length === 0 ) {
								return;
							}

							links.forEach(
								function ( link ) {
									this.addClass( 'loading', link );

									if ( ! results.i_like ) {
										wpLikes.likeComment(
											wpLikes.login_blog_id,
											wpLikes.login_comment_id,
											function () {
												link.parent().removeClass( 'comment-not-liked' );
												link.parent().addClass( 'comment-liked' );

												var feedback = getCommentLikeFeedback( true, results.found + 1 );
												link.textContent = feedback;
											}.bind( this )
										);
									} else {
										link.parent().removeClass( 'comment-not-liked' );
										link.parent().addClass( 'comment-liked' );

										var feedback = getCommentLikeFeedback( true, results.found );
										link.textContent = feedback;
									}

									link.removeClass( 'loading' );
								}.bind( this )
							);
						}.bind( this ),
						function () {},
						false
					);
				}
			} else if ( event.event === 'injectStyles' ) {
				wpLikes.textStyles = event.textStyles;
				wpLikes.linkStyles = event.linkStyles;

				if ( wpLikes.adminBarEnabled ) {
					wpLikes.adminBarStyles = event.adminBarStyles;
				}
			} else if ( event.event === 'initialBatch' ) {
				wpLikes.initialBatch( event.requests );
			} else if ( event.event === 'adminBarEnabled' ) {
				wpLikes.adminBarEnabled = true;
			} else if ( event.event === 'reblogsEnabled' ) {
				wpLikes.reblogsEnabled = true;
			} else if ( event.event === 'loadLikeWidget' ) {
				if ( window.parent.frames[ event.name ] !== undefined ) {
					var info = wpLikes.splitParams(
						window.parent.frames[ event.name ].location.hash.replace( /^#/, '' )
					);
					var path;
					var request;

					if ( info.obj_id && info.obj_id.match( /[^\w-]/ ) ) {
						return;
					}

					// This gets used for reverse remote login, we need to pass
					// the target login domain all the way down to the login
					// form.
					try {
						if ( typeof event.domain === 'string' ) {
							wpLikes.login_domain = event.domain;
						}
					} catch ( error ) {}

					if ( info.blog_id && info.post_id && info.origin ) {
						path = '/sites/' + info.blog_id + '/posts/' + info.post_id + '/likes';
						if ( typeof info.slim === 'undefined' ) {
							info.slim = false;
						}

						request = {
							type: 'post',
							blog_id: info.blog_id,
							post_id: info.post_id,
							obj_id: info.obj_id,
							width: event.width,
							slim: info.slim,
						};
						wpLikes.requests[ path ] = request;
						wpLikes.getPostLikes( info.blog_id, info.post_id, wpLikes.displayWidget );
					} else if (
						info.blog_id &&
						info.comment_id &&
						info.origin &&
						! wpLikes.commentLikesKillSwitch
					) {
						path = '/sites/' + info.blog_id + '/comments/' + info.comment_id + '/likes';
						request = {
							type: 'comment',
							blog_id: info.blog_id,
							comment_id: info.comment_id,
							obj_id: info.obj_id,
							width: event.width,
						};
						wpLikes.requests[ path ] = request;

						wpLikes.getCommentLikes( info.blog_id, info.comment_id, wpLikes.displayWidget );
					}
				}
			} else if ( event.event === 'didReblog' && 'obj_id' in event ) {
				// Update the display of the button
				var wplbuttonlink = window.parent.frames[
					'like-post-frame-' + event.obj_id
				].document.querySelector( '.wpl-button a.reblog' );
				this.removeClass( 'reblog', wplbuttonlink );
				this.addClass( 'reblogged', wplbuttonlink );

				wplbuttonlink.innerHTML = '<span>' + i18n.translate( 'Reblogged' ).fetch() + '</span> ';
				wplbuttonlink.style.display = null;
			}
		},

		handlePromptClicks: function ( blog_id, post_id, obj_id ) {
			var $doc = window.parent.frames[ 'like-post-frame-' + obj_id ].document;

			var commentLink = $doc.querySelector( '.wpl-comment > a' );
			if ( commentLink ) {
				commentLink.onclick = function () {
					// Bump stat and redirect
					new Image().src =
						document.location.protocol +
						'//pixel.wp.com/b.gif?v=wpcom-no-pv&x_follow-click-prompt=comment-prompt&baba=' +
						Math.random();
				};
			}

			var followLink = $doc.querySelector( '.wpl-follow a' );
			if ( followLink ) {
				this.setCss( followLink, wpLikes.linkStyles );
				followLink.onclick = function ( e ) {
					e.preventDefault();
					wpLikes.afterlikeFollow( blog_id );
					$doc.querySelector( '.wpl-follow' ).innerHTML = i18n.translate( 'Following.' ).fetch();
					return false;
				};
			}
		},

		siblings: function ( selector, el ) {
			return Array.prototype.filter.call( el.parentNode.children, function ( child ) {
				var matches = el.parentNode.querySelectorAll( selector );
				var i = matches.length;
				while ( --i >= 0 && matches.item( i ) !== child ) {
					// Do nothing.
				}
				return child !== el && i > -1;
			} );
		},

		doLike: function ( blog_id, post_id, obj_id ) {
			function postLikePrompts() {
				wpLikes.getFollowingStatus(
					blog_id,
					function ( result ) {
						var $doc = window.parent.frames[ 'like-post-frame-' + obj_id ].document;
						if ( $doc.offsetWidth < 350 ) {
							// If the contentWidth isn't wide enough, the prompts won't display properly.
							return;
						}
						if ( ! result.is_following ) {
							var followEl = $doc.querySelector( '.wpl-follow' );
							if ( followEl ) {
								followEl.style.display = null;
							}
							this.setCss( followEl.querySelector( 'a' ), wpLikes.linkStyles );
							wpLikes.handlePromptClicks( blog_id, post_id, obj_id );
						} else {
							wpLikes.getPost(
								blog_id,
								post_id,
								function ( post ) {
									if ( post.comments_open ) {
										var commentLink = $doc.querySelector( '.wpl-comment a' );
										if ( commentLink ) {
											this.setCss( commentLink, wpLikes.linkStyles );
											commentLink.href = post.URL + '#respond';
										}

										var comment = $doc.querySelector( '.wpl-comment' );
										if ( comment ) {
											comment.style.display = null;
										}
										wpLikes.handlePromptClicks( blog_id, post_id, obj_id );
									}
								}.bind( this )
							);
						}
					}.bind( this )
				);
			}

			if ( ! wpLikes.isLoggedIn ) {
				wpLikes.login_blog_id = blog_id;
				wpLikes.login_post_id = post_id;
				wpLikes.login_obj_id = obj_id;

				new Image().src =
					document.location.protocol +
					'//pixel.wp.com/b.gif?v=wpcom-no-pv&x_likes=loggedout_like_click&baba=' +
					Math.random();

				// User isn't logged in, so we should get them to do that.
				wpLikes.openLoginWindow();
				return;
			}

			/**
			 * After Like Prompts
			 * After liking a post, we show a "follow this blog"? prompt to get readers to subscribe to the blog.
			 * or a "comment on this post?" prompt if they are already following
			 */
			var followPromptText =
				' <span class="wpl-follow" style="display:none;"><a href="#">' +
				i18n.translate( 'Follow this Blog?' ).fetch() +
				'</a></span>';
			var commentPromptText =
				' <span class="wpl-comment" style="display:none;"><a href="#" target="_parent">' +
				i18n.translate( 'Comment on this post?' ).fetch() +
				'</a></span>';

			var wplbuttonlink = window.parent.frames[
				'like-post-frame-' + obj_id
			].document.querySelector( '.wpl-button a.like, .wpl-button a.liked' );
			var wplbutton = wplbuttonlink.parentNode;
			var wplcount = this.siblings( '.wpl-count', wplbutton )[ 0 ];
			var wplavatars = this.siblings( '.wpl-avatars', wplbutton );
			var wplcounttext = wplcount.querySelector( '.wpl-count-text' );

			var likeText = '';
			var countEl;
			var count;

			if ( this.hasClass( 'like', wplbuttonlink ) ) {
				var slim = this.hasClass( 'wpl-slim-likebox', wplbutton.parentNode );

				// Figure out what the feedback text should say
				if (
					wplcounttext &&
					i18n.translate( 'Be the first to like this.' ).fetch() === wplcounttext.innerHTML
				) {
					likeText =
						'<span class="wpl-count-text">' +
						i18n.translate( 'You like this.' ).fetch() +
						'</span>' +
						followPromptText +
						commentPromptText;
				} else if (
					wplcounttext &&
					i18n.translate( 'One blogger likes this.' ).fetch() === wplcounttext.innerHTML
				) {
					likeText =
						'<span class="wpl-count-text">' +
						i18n.translate( 'You and one other blogger like this.' ).fetch() +
						'</span>' +
						followPromptText +
						commentPromptText;
				} else {
					countEl = wplcount.querySelector( '.wpl-count-number' );
					if ( countEl ) {
						count = countEl.textContent;
						likeText =
							'<span class="wpl-count-text">' +
							i18n.sprintf(
								i18n
									.translate(
										'You and <a href="%1$s" id="%2$s">%3$s other bloggers</a> like this.'
									)
									.fetch(),
								'#',
								'other-gravatars',
								'<span class="wpl-count-number">' + count + '</span>'
							) +
							'</span>' +
							followPromptText +
							commentPromptText;
					}
				}

				// Update the display of the button
				this.removeClass( 'like', wplbuttonlink );
				this.addClass( 'liked', wplbuttonlink );
				this.removeClass( 'like', wplbutton );
				this.addClass( 'liked', wplbutton );

				if ( ! slim ) {
					wplcount.innerHTML = likeText;
					wplcount.style.display = null;
					this.setCss(
						window.parent.frames[ 'like-post-frame-' + obj_id ].document.body.querySelector(
							'.wpl-count a'
						),
						wpLikes.linkStyles
					);
				}

				postLikePrompts.bind( this ).call();

				if ( ! slim ) {
					wpLikes.getMyInfo(
						function ( me ) {
							me.css_class = 'wp-liker-me';

							wpLikes.likers[ blog_id + '-' + post_id ].unshift( me );

							if ( ! wplbutton.parentNode.querySelectorAll( '.wp-liker-me' ).length ) {
								if ( ! wplavatars.length ) {
									wplbutton.insertAdjacentHTML(
										'afterend',
										'<ul class="wpl-avatars">' +
											'<li class="wp-liker-me">' +
											'<a title="' +
											window.escapeHTML( me.display_name ) +
											'" href="' +
											window.escapeHTML( me.profile_URL ) +
											'" class="wpl-liker" rel="nofollow" target="_parent">' +
											'<img src="' +
											window.escapeHTML( me.avatar_URL ) +
											'" alt="' +
											window.escapeHTML( i18n.translate( 'My Grav.' ).fetch() ) +
											'" width="30" height="30" />' +
											'</a>' +
											'</li>' +
											'</ul>'
									);
								} else {
									wplavatars[ 0 ].insertAdjacentHTML(
										'afterbegin',
										'<li class="wp-liker-me">' +
											'<a title="' +
											window.escapeHTML( me.display_name ) +
											'" href="' +
											window.escapeHTML( me.profile_URL ) +
											'" class="wpl-liker" rel="nofollow" target="_parent">' +
											'<img src="' +
											window.escapeHTML( me.avatar_URL ) +
											'" alt="' +
											window.escapeHTML( i18n.translate( 'My Grav.' ).fetch() ) +
											'" width="30" height="30" style="padding-right: 3px;" />' +
											'</a>' +
											'</li>'
									);
								}
							}
						}.bind( this )
					);
				}

				wplbuttonlink.innerHTML = '<span>' + i18n.translate( 'Liked' ).fetch() + '</span> ';

				// Ask parent to resize the frame
				wpLikes.resizeFrame( 'like-post-frame-' + obj_id );

				if ( wpLikes.adminBarEnabled ) {
					var widgetDocument = window.parent.frames[ 'admin-bar-likes-widget' ].document;
					widgetDocument.querySelector( 'a.like' ).textContent = i18n.translate( 'Liked' ).fetch();
				}

				// ANNNNND like it
				if ( typeof arguments[ 3 ] !== 'undefined' && arguments[ 3 ] === 'adminbar' ) {
					wpLikes.likePost( blog_id, post_id, 'adminbar' );
				} else {
					wpLikes.likePost( blog_id, post_id, 'post_flair' );
				}
			} else if ( this.hasClass( 'liked', wplbuttonlink ) ) {
				this.removeClass( 'liked', wplbuttonlink );
				this.addClass( 'like', wplbuttonlink );

				this.removeClass( 'liked', wplbutton );
				this.addClass( 'like', wplbutton );

				if (
					wplcounttext &&
					i18n.translate( 'You like this.' ).fetch() === wplcounttext.innerHTML
				) {
					likeText =
						'<span class="wpl-count-text">' +
						i18n.translate( 'Be the first to like this.' ).fetch() +
						'</span>';
				} else if (
					wplcounttext &&
					i18n.translate( 'You and one other blogger like this.' ).fetch() ===
						wplcounttext.innerHTML
				) {
					likeText =
						'<span class="wpl-count-text">' +
						i18n.translate( 'One blogger likes this.' ).fetch() +
						'</span>';
				} else {
					countEl = wplcount.querySelector( '.wpl-count-number' );
					if ( countEl ) {
						count = countEl.textContent;
						likeText =
							'<span class="wpl-count-text">' +
							i18n.sprintf(
								i18n.translate( '<a href="%1$s" id="%2$s">%3$s bloggers</a> like this.' ).fetch(),
								'#',
								'other-gravatars',
								'<span class="wpl-count-number">' + count + '</span>'
							) +
							'</span>';
					}
				}

				wplcount.innerHTML = likeText;
				wplcount.style.display = null;
				this.setCss(
					window.parent.frames[ 'like-post-frame-' + obj_id ].document.body.querySelector(
						'.wpl-count a'
					),
					wpLikes.linkStyles
				);

				wpLikes.likers[ blog_id + '-' + post_id ].shift();

				var wpLikerMe = wplbutton.parentNode.querySelector( 'li.wp-liker-me' );
				if ( wpLikerMe ) {
					wpLikerMe.parentNode.removeChild( wpLikerMe );
				}

				wplbuttonlink.innerHTML = '<span>' + i18n.translate( 'Like' ).fetch() + '</span>';

				// Ask parent to resize the frames
				wpLikes.resizeFrame( 'like-post-frame-' + obj_id );

				if ( wpLikes.adminBarEnabled ) {
					window.parent.frames[ 'admin-bar-likes-widget' ].document.querySelector(
						'a.like'
					).textContent = i18n.translate( 'Like' ).fetch();
				}

				// ANNNNND unlike it
				wpLikes.unlikePost( blog_id, post_id );
			}
		},

		// replacement for jQuery(el).css({some: style})
		setCss: function ( el, styles ) {
			if ( ! el ) {
				return;
			}

			Object.keys( styles ).forEach( function ( key ) {
				el.style[ key ] = styles[ key ];
			} );
		},

		updatePostFeedback: function ( likes, blog_id, post_id, slim, obj_id ) {
			if ( ! obj_id ) {
				obj_id = blog_id + '-' + post_id;
			}

			var isLiked = likes.i_like;
			var canLike = likes.can_like;
			var label = '';
			var css_state = '';
			var feedback = '';

			var canReblog = false;
			var canUserReblog = false;
			var reblog_css_state = 'reblog';
			var reblog_feedback_no_html = i18n.translate( 'Reblog this post on your main site.' ).fetch();
			var reblog_label = i18n.translate( 'Reblog' ).fetch();
			var reblog_path = '/sites/' + blog_id + '/posts/' + post_id + '/reblogs/mine';

			if ( ! this.reblogsEnabled ) {
				canReblog = false;
			} else if ( reblog_path in this.cache ) {
				if ( this.cache[ reblog_path ].can_reblog ) {
					canReblog = true;
				}
				if ( this.cache[ reblog_path ].can_user_reblog ) {
					canUserReblog = true;
				}
				if ( this.cache[ reblog_path ].is_reblogged ) {
					reblog_css_state = 'reblogged';
					reblog_label = i18n.translate( 'Reblogged' ).fetch();
				}
			}

			// Figure out the button label and css class for this button
			if ( isLiked ) {
				label = i18n.translate( 'Liked' ).fetch();
				css_state = 'liked';
			} else {
				label = i18n.translate( 'Like' ).fetch();
				css_state = 'like';
			}

			var hasLikes = true;
			var likers;

			// Figure out the inital feedback text
			if ( likes.found === 0 ) {
				hasLikes = false;
				feedback = i18n.translate( 'Be the first to like this.' ).fetch();
			} else if ( likes.found === 1 ) {
				if ( isLiked ) {
					feedback = i18n.translate( 'You like this.' ).fetch();
				} else {
					feedback = i18n.translate( 'One blogger likes this.' ).fetch();
				}
			} else if ( isLiked ) {
				var user_count = likes.found - 1;
				if ( user_count !== 1 ) {
					feedback = i18n.sprintf(
						i18n
							.translate( 'You and <a href="%1$s" id="%2$s">%3$s other bloggers</a> like this.' )
							.fetch(),
						'#',
						'other-gravatars',
						'<span class="wpl-count-number">' + user_count + '</span>'
					);
				} else {
					feedback = i18n.translate( 'You and one other blogger like this.' ).fetch();
				}
			} else {
				feedback = i18n.sprintf(
					i18n.translate( '<a href="%1$s" id="%2$s">%3$s bloggers</a> like this.' ).fetch(),
					'#',
					'other-gravatars',
					'<span class="wpl-count-number">' + likes.found + '</span>'
				);
			}

			feedback = '<span class="wpl-count-text">' + feedback + '</span>';

			function createPostLikeTemplate() {
				var template;
				var cacheBuster;
				var widgetDocument;

				if ( wpLikes.version !== '' ) {
					cacheBuster = '?ver=' + wpLikes.version;
				}

				if ( wpLikes.adminBarEnabled ) {
					template = window.tmpl( document.querySelector( '#admin-bar-likes' ).innerHTML );
					widgetDocument = window.parent.frames[ 'admin-bar-likes-widget' ].document;

					widgetDocument.querySelector( '#target' ).innerHTML = template( {
						label: label,
						isRtl: wpLikes.adminBarStyles.isRtl,
					} );

					var style = document.createElement( 'link' );
					style.setAttribute( 'type', 'text/css' );
					style.setAttribute( 'rel', 'stylesheet' );
					style.setAttribute(
						'href',
						'//s0.wp.com/wp-includes/css/admin-bar.min.css' + cacheBuster
					);
					widgetDocument.querySelector( 'head' ).appendChild( style );

					if ( wpLikes.adminBarStyles.isRtl ) {
						style.setAttribute(
							'href',
							'//s0.wp.com/wp-content/mu-plugins/admin-bar/rtl/wpcom-admin-bar-rtl.css' +
								cacheBuster
						);
					} else {
						style.setAttribute(
							'href',
							'//s0.wp.com/wp-content/mu-plugins/admin-bar/wpcom-admin-bar.css' + cacheBuster
						);
					}
					widgetDocument.querySelector( 'head' ).appendChild( style );
				}

				if ( slim ) {
					template = window.tmpl( document.querySelector( '#slim-likes' ).innerHTML );
				} else {
					template = window.tmpl( document.querySelector( '#post-likes' ).innerHTML );
				}
				widgetDocument = window.parent.frames[ 'like-post-frame-' + obj_id ].document;
				widgetDocument.querySelector( '#target' ).innerHTML = template( {
					likers: likers && likers.slice( 0, 20 ),
					css_state: css_state,
					label: label,
					feedback: feedback,
					feedback_no_html: feedback.replace( /(<.*?>)/gi, '' ),
					hasLikes: hasLikes,
					reblog_css_state: reblog_css_state,
					reblog_feedback_no_html: reblog_feedback_no_html,
					canReblog: canReblog,
					canUserReblog: canUserReblog,
					canLike: canLike,
					reblog_label: reblog_label,
				} );

				this.setCss( widgetDocument.body, wpLikes.textStyles );
				this.setCss( widgetDocument.body.querySelector( '.wpl-count a' ), wpLikes.linkStyles );

				if ( wpLikes.textStyles.direction === 'rtl' ) {
					this.addClass( 'rtl', widgetDocument.body );
				}

				wpLikes.postMessage(
					{
						event: 'showLikeWidget',
						id: 'like-post-wrapper-' + obj_id,
						blog_id: blog_id,
						post_id: post_id,
						obj_id: obj_id,
					},
					parent
				);

				if ( wpLikes.adminBarEnabled ) {
					widgetDocument = window.parent.frames[ 'admin-bar-likes-widget' ].document;
					widgetDocument.querySelector( 'a.like' ).click(
						function () {
							var doc = window.parent.frames[ 'like-post-frame-' + obj_id ].document;
							this.triggerClick(
								{ source: 'adminbar' },
								doc.querySelector( '.wpl-button > a.like, .wpl-button > a.liked' )
							);
						}.bind( this )
					);
				}
			}

			// Build the likers array
			likers = likes.likes;
			if ( likers.length > 0 ) {
				var max_remove = likers.length - 90;
				for ( var i = likers.length - 1; i >= 0 && max_remove > 0; i-- ) {
					if (
						likers[ i ].default_avatar &&
						( ! wpLikes.me || wpLikes.me.ID !== likers[ i ].ID )
					) {
						likers.splice( i, 1 );
						max_remove--;
					}
				}
			}

			if ( wpLikes.me ) {
				wpLikes.isLoggedIn = true;

				for ( var j = 0; j < likers.length; j++ ) {
					if ( likers[ j ].ID === wpLikes.me.ID ) {
						likers[ j ].css_class = 'wp-liker-me';
						// Move this user's avatar to the front of the face pile
						likers.unshift( likers.splice( j, 1 )[ 0 ] );
						break;
					}
				}
			}

			wpLikes.likers[ blog_id + '-' + post_id ] = likers;
			wpLikes.total[ blog_id + '-' + post_id ] = likes.found;

			createPostLikeTemplate.bind( this ).call();
		},

		initialBatch: function ( requests ) {
			var info;
			var request;
			var path;

			var batch = {
				queue: [],
				batchFinished: false,
				batchWaiting: [],
				blogId: null,
				postId: null,
				commentId: null,
			};

			if ( ! wpLikes.me && ! wpLikes.askedMe ) {
				batch.queue.push( '/me' );
				wpLikes.askedMe = true;
			}

			for ( var i = 0; i < requests.length; i++ ) {
				info = requests[ i ];

				if ( info.obj_id && info.obj_id.match( /[^\w-]/ ) ) {
					continue;
				}

				if ( info.blog_id && info.post_id ) {
					batch.blogId = info.blog_id;
					batch.postId = info.post_id;

					path = '/sites/' + info.blog_id + '/posts/' + info.post_id + '/likes';
					request = {
						type: 'post',
						blog_id: info.blog_id,
						post_id: info.post_id,
						obj_id: info.obj_id,
						width: info.width,
					};
					wpLikes.requests[ path ] = request;
					batch.queue.push( path );
					path = '/sites/' + info.blog_id + '/posts/' + info.post_id + '/reblogs/mine';
					request = {
						blog_id: info.blog_id,
						post_id: info.post_id,
					};
					wpLikes.requests[ path ] = request;
					batch.queue.push( path );
				} else if ( info.blog_id && info.comment_id && ! wpLikes.commentLikesKillSwitch ) {
					batch.blogId = info.blog_id;
					batch.commentId = info.comment_id;

					path = '/sites/' + info.blog_id + '/comments/' + info.comment_id + '/likes';
					request = {
						type: 'comment',
						blog_id: info.blog_id,
						comment_id: info.comment_id,
						width: info.width,
					};
					wpLikes.requests[ path ] = request;
					batch.queue.push( path );
				}
			}

			var batchRequest = {
				path: '/batch',
				type: 'GET',
				url: 'https://public-api.wordpress.com/rest/v1/batch',
				data: '',
				success: function ( response ) {
					for ( var responsePath in response ) {
						if ( ! response[ responsePath ].error_data && ! response[ responsePath ].errors ) {
							if ( responsePath === '/me' ) {
								wpLikes.me = response[ responsePath ];
							} else {
								wpLikes.cache[ responsePath ] = response[ responsePath ];
							}
						}
					}

					batch.batchFinished = true;
					for ( var item in batch.batchWaiting ) {
						wpLikes.ajax( batch.batchWaiting[ item ], batch );
					}
				},
				error: function () {
					batch.batchFinished = true;
					for ( var item in batch.batchWaiting ) {
						wpLikes.ajax( batch.batchWaiting[ item ], batch );
					}
				},
			};

			var amp = '';
			for ( var j = 0; j < batch.queue.length; j++ ) {
				if ( j > 0 ) {
					amp = '&';
				}
				batchRequest.data += amp + 'urls[]=' + batch.queue[ j ];
			}

			wpLikes.batches.push( batch );
			wpLikes.ajax( batchRequest );
		},
	};

	// wpLikes.displayWidget is called when the ajax request for post or comment likes completes successfully
	// it is used to display the widget with the likes data
	wpLikes.displayWidget = function ( response, path ) {
		/**
		 * Translation
		 */
		var info = wpLikes.splitParams( location.hash.replace( /^#/, '' ) );
		if ( info.lang ) {
			wpLikes.lang = info.lang;
			wpLikes.langVersion = info.lang_ver ? info.lang_ver : info.ver;
		}

		var load_default = true;
		var json_locale_data;
		if ( wpLikes.lang !== 'en' ) {
			var xhr = new XMLHttpRequest();
			xhr.open(
				'GET',
				'/languages/' + wpLikes.lang + '-v1.1.json' + '?ver=' + wpLikes.langVersion,
				false
			);
			xhr.onload = function () {
				if ( xhr.status === 200 ) {
					var json = JSON.parse( xhr.responseText );
					json_locale_data = json;
					load_default = false;
				}
			};
			xhr.send();
		}
		if ( json_locale_data === null ) {
			load_default = true;
		}

		if ( load_default ) {
			json_locale_data = {
				'': {
					domain: 'messages',
					lang: wpLikes.lang,
					'plural-forms': 'nplurals=2; plural=(n !== 1);',
				},
			};
		}

		i18n = new window.Jed( { locale_data: { messages: json_locale_data }, domain: 'messages' } );

		if ( path in wpLikes.requests ) {
			if ( wpLikes.requests[ path ].type === 'post' ) {
				displayPostLikeWidget(
					wpLikes.requests[ path ].blog_id,
					wpLikes.requests[ path ].post_id,
					wpLikes.requests[ path ].width,
					wpLikes.requests[ path ].slim,
					response,
					wpLikes.requests[ path ].obj_id
				);
			}
			if ( wpLikes.requests[ path ].type === 'comment' ) {
				displayCommentLikeWidget(
					wpLikes.requests[ path ].blog_id,
					wpLikes.requests[ path ].comment_id,
					wpLikes.requests[ path ].width,
					response,
					wpLikes.requests[ path ].obj_id
				);
			}
		}
	};

	// displayPostLikeWidget is called when a post's likes data arrives via ajax (see wpLikes.displayWidget i.e. the ajax success handler)
	function displayPostLikeWidget( blog_id, post_id, width, slim, result, obj_id ) {
		if ( ! obj_id ) {
			obj_id = blog_id + '-' + post_id;
		}

		wpLikes.updatePostFeedback( result, blog_id, post_id, slim, obj_id );

		var likePostFrameDoc = window.parent.frames[ 'like-post-frame-' + obj_id ].document;

		function hasClass( className, el ) {
			if ( el.classList ) {
				return el.classList.contains( className );
			}
			return new RegExp( '(^| )' + className + '( |$)', 'gi' ).test( el.className );
		}

		// Add a click handler to handle the liking action
		var likeButton = likePostFrameDoc.querySelector( '.wpl-button a.like, .wpl-button a.liked' );
		if ( likeButton ) {
			likeButton.onclick = function ( e ) {
				e.preventDefault();
				var source = 'post_flair';
				if ( typeof arguments[ 1 ] !== 'undefined' && arguments[ 1 ].source === 'adminbar' ) {
					source = 'adminbar';
				}
				wpLikes.doLike( blog_id, post_id, obj_id, source );
			}.bind( this );
		}

		// Add a reblog handler to handle the reblog action
		var reblogButton = likePostFrameDoc.querySelector( '.wpl-button a.reblog' );
		if ( reblogButton ) {
			reblogButton.onclick = function ( e ) {
				e.preventDefault();
				if ( hasClass( 'reblog', reblogButton ) ) {
					wpLikes.postMessage( { event: 'clickReblogFlair', obj_id: obj_id, post_id: post_id }, window.parent );
				}
			}.bind( this );
		}

		if ( ! slim ) {
			// Handle the "n other bloggers" list
			var otherGravatars = likePostFrameDoc.querySelector( 'a#other-gravatars' );
			if ( otherGravatars ) {
				otherGravatars.onclick = function ( e ) {
					e.preventDefault();
					var $avatars = window.parent.frames[ 'like-post-frame-' + obj_id ].document.querySelector(
						'.wpl-avatars'
					);

					var likersToSend = 90;
					var myArrayId = -1;
					for (
						var i = 0;
						i < likersToSend && i < wpLikes.likers[ blog_id + '-' + post_id ].length;
						i++
					) {
						if ( wpLikes.likers[ blog_id + '-' + post_id ][ i ].css_class === 'wpl-liker-me' ) {
							myArrayId = i;
						}
						wpLikes.likers[ blog_id + '-' + post_id ][ i ].css_class = 'wpl-liker';
					}

					// Send a message to the likes master iframe (jetpack-likes.php) to update this frame's gravatars (likers)
					var data = {
						event: 'showOtherGravatars',
						likers: wpLikes.likers[ blog_id + '-' + post_id ].slice( 0, likersToSend ),
						total: wpLikes.total[ blog_id + '-' + post_id ],
						parent: 'like-post-frame-' + obj_id,
						width: $avatars.offsetWidth,
						position: {
							top: $avatars.offsetTop,
							left: $avatars.offsetLeft,
						},
					};

					wpLikes.postMessage( data, window.parent );

					if ( myArrayId >= 0 ) {
						wpLikes.likers[ blog_id + '-' + post_id ][ myArrayId ].css_class = 'wpl-liker-me';
					}
				};
			}
		}

		/**
		 * End Prompts
		 */
	}

	function getCommentLikeFeedback( isLiked, found ) {
		var feedback = '';
		var likers = '';
		if ( found === 0 ) {
			feedback = i18n.translate( 'Like' ).fetch();
		} else if ( found === 1 ) {
			if ( isLiked ) {
				feedback = i18n.translate( 'Liked by you' ).fetch();
			} else {
				likers = i18n.translate( '%d person' ).fetch( 1 );
				feedback = i18n.translate( 'Liked by %s' ).fetch( likers );
			}
		} else if ( isLiked ) {
			var userCount = found - 1;
			if ( userCount !== 1 ) {
				likers = i18n.translate( '%d other people' ).fetch( userCount );
				feedback = i18n.translate( 'Liked by you and %s' ).fetch( likers );
			} else {
				likers = i18n.translate( '%d other person' ).fetch( userCount );
				feedback = i18n.translate( 'Liked by you and %s' ).fetch( likers );
			}
		} else {
			likers = i18n.translate( '%d people' ).fetch( found );
			feedback = i18n.translate( 'Liked by %s' ).fetch( likers );
		}
		return feedback;
	}

	// Display the widget
	function displayCommentLikeWidget( blog_id, comment_id, width, likes, obj_id ) {
		if ( wpLikes.commentLikesKillSwitch ) {
			return;
		}

		if ( wpLikes.me ) {
			wpLikes.isLoggedIn = true;
		}

		var isLiked = likes.i_like;

		var label = '';
		var css_state = '';

		var feedback = getCommentLikeFeedback( isLiked, likes.found );

		// Figure out the button label and css class for this button
		if ( isLiked ) {
			label = feedback;
			css_state = 'comment-liked';
		} else {
			label = feedback;
			css_state = 'comment-not-liked';
		}

		var widgetDocument = window.parent.frames[ 'like-comment-frame-' + obj_id ].document;

		// Just the star in the iframe
		var template = window.tmpl( document.querySelector( '#comment-likes' ).innerHTML );
		widgetDocument.querySelector( '#target' ).innerHTML = template( {
			css_state: css_state,
			label: label,
		} );

		wpLikes.postMessage(
			{
				event: 'showCommentLikeWidget',
				id: 'like-comment-wrapper-' + obj_id,
				blog_id: blog_id,
				comment_id: comment_id,
				obj_id: obj_id,
			},
			window.parent
		);

		var likeLink = widgetDocument.querySelector( 'a.comment-like-link' );
		if ( likeLink ) {
			likeLink.onclick = function ( e ) {
				e.preventDefault();

				if ( ! wpLikes.isLoggedIn ) {
					wpLikes.login_blog_id = blog_id;
					wpLikes.login_comment_id = comment_id;
					wpLikes.login_obj_id = obj_id;

					new Image().src =
						document.location.protocol +
						'//pixel.wp.com/b.gif?v=wpcom-no-pv&x_likes=loggedout_comment_like_click&baba=' +
						Math.random();

					// User isn't logged in, so we should get them to do that.
					wpLikes.openLoginWindow();
					return;
				}

				function addClass( className, el ) {
					if ( el.classList ) {
						el.classList.add( className );
					} else {
						el.className += ' ' + className;
					}
				}

				function removeClass( className, el ) {
					if ( el.classList ) {
						el.classList.remove( className );
					} else {
						el.className = el.className.replace(
							new RegExp( '(^|\\b)' + className.split( ' ' ).join( '|' ) + '(\\b|$)', 'gi' ),
							' '
						);
					}
				}

				function hasClass( className, el ) {
					if ( el.classList ) {
						return el.classList.contains( className );
					}
					return new RegExp( '(^| )' + className + '( |$)', 'gi' ).test( el.className );
				}

				var link = e.target;
				addClass( 'loading', link );

				function updateCommentFeedback( action, i_like, count ) {
					if ( action === 'like' ) {
						removeClass( 'comment-not-liked', link.parentNode );
						addClass( 'comment-liked', link.parentNode );
					} else {
						removeClass( 'comment-liked', link.parentNode );
						addClass( 'comment-not-liked', link.parentNode );
					}

					feedback = getCommentLikeFeedback( i_like, count );
					link.textContent = feedback;

					wpLikes.postMessage(
						{
							event: 'showCommentLikeWidget',
							id: 'like-comment-wrapper-' + obj_id,
							blog_id: blog_id,
							comment_id: comment_id,
							obj_id: obj_id,
						},
						window.parent
					);
				}

				if ( hasClass( 'comment-not-liked', link.parentNode ) ) {
					wpLikes.likeComment( blog_id, comment_id, function ( r ) {
						updateCommentFeedback( 'like', true, r.like_count );
						removeClass( 'loading', link );
					} );
				} else {
					wpLikes.unlikeComment( blog_id, comment_id, function ( r ) {
						updateCommentFeedback( 'unlike', false, r.like_count );
						removeClass( 'loading', link );
					} );
				}

				return false;
			};
		}
	}

	// Since we can't know definitively when an iframe has finished loading
	function updateWidgetDimensions() {
		for ( var name in wpLikes.widgetDims ) {
			var widgetDocument = window.parent.frames[ name ].document;
			var likeboxWidth = this.outerWidth( widgetDocument.querySelector( '.wpl-likebox' ) );
			var likeboxHeight = this.outerHeight( widgetDocument.querySelector( '.wpl-likebox' ) );

			// For now, we only care about width changes really
			if ( likeboxWidth > 0 && likeboxWidth !== wpLikes.widgetDims[ name ].w ) {
				wpLikes.widgetDims[ name ].w = likeboxWidth;
				wpLikes.widgetDims[ name ].h = likeboxHeight;
				wpLikes.resizeFrame( name );
			}
		}
	}

	wpLikes.wpLikes();
	window.addEventListener( 'message', function ( e ) {
		var message = e && e.data;
		if ( typeof message === 'string' ) {
			try {
				message = JSON.parse( message );
			} catch ( err ) {
				return;
			}
		}

		var type = message && message.type;

		if ( type === 'likesMessage' || type === 'loginMessage' ) {
			wpLikes.readMessage( message );
		}
	} );

	window.addEventListener( 'load', function () {
		wpLikes.postMessage( { event: 'masterReady' }, parent );
	} );

	setInterval( updateWidgetDimensions, 500 );
} )();
;

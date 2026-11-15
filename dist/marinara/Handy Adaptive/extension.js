// Handy Adaptive v0.10.0 for Marinara Engine. Built from https://github.com/RyuNinja00/handy-adaptive
// (index.js, synth.js and charstyle.js unmodified + marinara/st-compat.js). Generated: do not edit.

// ---- Marinara-managed timers: disabling the extension clears them all
const { setTimeout, clearTimeout, setInterval, clearInterval } = marinara;
// ---- jQuery (MIT, OpenJS Foundation), kept private to this extension
const jQuery = (function (module) {
/*! jQuery v3.6.1 | (c) OpenJS Foundation and other contributors | jquery.org/license */
!function(e,t){"use strict";"object"==typeof module&&"object"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(e.document)return t(e);throw new Error("jQuery requires a window with a document")}:t(e)}("undefined"!=typeof window?window:this,function(w,R){"use strict";function v(e){return"function"==typeof e&&"number"!=typeof e.nodeType&&"function"!=typeof e.item}function g(e){return null!=e&&e===e.window}var t=[],M=Object.getPrototypeOf,s=t.slice,I=t.flat?function(e){return t.flat.call(e)}:function(e){return t.concat.apply([],e)},W=t.push,F=t.indexOf,$={},B=$.toString,_=$.hasOwnProperty,z=_.toString,U=z.call(Object),y={},T=w.document,X={type:!0,src:!0,nonce:!0,noModule:!0};function V(e,t,n){var r,i,o=(n=n||T).createElement("script");if(o.text=e,t)for(r in X)(i=t[r]||t.getAttribute&&t.getAttribute(r))&&o.setAttribute(r,i);n.head.appendChild(o).parentNode.removeChild(o)}function h(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?$[B.call(e)]||"object":typeof e}var e="3.6.1",C=function(e,t){return new C.fn.init(e,t)};function G(e){var t=!!e&&"length"in e&&e.length,n=h(e);return!v(e)&&!g(e)&&("array"===n||0===t||"number"==typeof t&&0<t&&t-1 in e)}C.fn=C.prototype={jquery:e,constructor:C,length:0,toArray:function(){return s.call(this)},get:function(e){return null==e?s.call(this):e<0?this[e+this.length]:this[e]},pushStack:function(e){e=C.merge(this.constructor(),e);return e.prevObject=this,e},each:function(e){return C.each(this,e)},map:function(n){return this.pushStack(C.map(this,function(e,t){return n.call(e,t,e)}))},slice:function(){return this.pushStack(s.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},even:function(){return this.pushStack(C.grep(this,function(e,t){return(t+1)%2}))},odd:function(){return this.pushStack(C.grep(this,function(e,t){return t%2}))},eq:function(e){var t=this.length,e=+e+(e<0?t:0);return this.pushStack(0<=e&&e<t?[this[e]]:[])},end:function(){return this.prevObject||this.constructor()},push:W,sort:t.sort,splice:t.splice},C.extend=C.fn.extend=function(){var e,t,n,r,i,o=arguments[0]||{},a=1,s=arguments.length,u=!1;for("boolean"==typeof o&&(u=o,o=arguments[a]||{},a++),"object"==typeof o||v(o)||(o={}),a===s&&(o=this,a--);a<s;a++)if(null!=(e=arguments[a]))for(t in e)n=e[t],"__proto__"!==t&&o!==n&&(u&&n&&(C.isPlainObject(n)||(r=Array.isArray(n)))?(i=o[t],i=r&&!Array.isArray(i)?[]:r||C.isPlainObject(i)?i:{},r=!1,o[t]=C.extend(u,i,n)):void 0!==n&&(o[t]=n));return o},C.extend({expando:"jQuery"+(e+Math.random()).replace(/\D/g,""),isReady:!0,error:function(e){throw new Error(e)},noop:function(){},isPlainObject:function(e){return!(!e||"[object Object]"!==B.call(e))&&(!(e=M(e))||"function"==typeof(e=_.call(e,"constructor")&&e.constructor)&&z.call(e)===U)},isEmptyObject:function(e){for(var t in e)return!1;return!0},globalEval:function(e,t,n){V(e,{nonce:t&&t.nonce},n)},each:function(e,t){var n,r=0;if(G(e)){for(n=e.length;r<n;r++)if(!1===t.call(e[r],r,e[r]))break}else for(r in e)if(!1===t.call(e[r],r,e[r]))break;return e},makeArray:function(e,t){t=t||[];return null!=e&&(G(Object(e))?C.merge(t,"string"==typeof e?[e]:e):W.call(t,e)),t},inArray:function(e,t,n){return null==t?-1:F.call(t,e,n)},merge:function(e,t){for(var n=+t.length,r=0,i=e.length;r<n;r++)e[i++]=t[r];return e.length=i,e},grep:function(e,t,n){for(var r=[],i=0,o=e.length,a=!n;i<o;i++)!t(e[i],i)!=a&&r.push(e[i]);return r},map:function(e,t,n){var r,i,o=0,a=[];if(G(e))for(r=e.length;o<r;o++)null!=(i=t(e[o],o,n))&&a.push(i);else for(o in e)null!=(i=t(e[o],o,n))&&a.push(i);return I(a)},guid:1,support:y}),"function"==typeof Symbol&&(C.fn[Symbol.iterator]=t[Symbol.iterator]),C.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),function(e,t){$["[object "+t+"]"]=t.toLowerCase()});function r(e,t,n){var r=[],i=void 0!==n;while((e=e[t])&&9!==e.nodeType)if(1===e.nodeType){if(i&&C(e).is(n))break;r.push(e)}return r}function Y(e,t){for(var n=[];e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n}var e=function(R){function c(e,t){return e="0x"+e.slice(1)-65536,t||(e<0?String.fromCharCode(65536+e):String.fromCharCode(e>>10|55296,1023&e|56320))}function M(e,t){return t?"\0"===e?"\ufffd":e.slice(0,-1)+"\\"+e.charCodeAt(e.length-1).toString(16)+" ":"\\"+e}function I(){T()}var e,p,b,o,W,d,F,$,w,u,l,T,C,n,E,h,r,i,g,S="sizzle"+ +new Date,f=R.document,k=0,B=0,_=q(),z=q(),U=q(),y=q(),X=function(e,t){return e===t&&(l=!0),0},V={}.hasOwnProperty,t=[],G=t.pop,Y=t.push,A=t.push,Q=t.slice,v=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},J="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",a="[\\x20\\t\\r\\n\\f]",s="(?:\\\\[\\da-fA-F]{1,6}"+a+"?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+",K="\\["+a+"*("+s+")(?:"+a+"*([*^$|!~]?=)"+a+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+s+"))|)"+a+"*\\]",Z=":("+s+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+K+")*)|.*)\\)|)",ee=new RegExp(a+"+","g"),m=new RegExp("^"+a+"+|((?:^|[^\\\\])(?:\\\\.)*)"+a+"+$","g"),te=new RegExp("^"+a+"*,"+a+"*"),ne=new RegExp("^"+a+"*([>+~]|"+a+")"+a+"*"),re=new RegExp(a+"|>"),ie=new RegExp(Z),oe=new RegExp("^"+s+"$"),x={ID:new RegExp("^#("+s+")"),CLASS:new RegExp("^\\.("+s+")"),TAG:new RegExp("^("+s+"|[*])"),ATTR:new RegExp("^"+K),PSEUDO:new RegExp("^"+Z),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+a+"*(even|odd|(([+-]|)(\\d*)n|)"+a+"*(?:([+-]|)"+a+"*(\\d+)|))"+a+"*\\)|)","i"),bool:new RegExp("^(?:"+J+")$","i"),needsContext:new RegExp("^"+a+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+a+"*((?:-\\d)?\\d*)"+a+"*\\)|)(?=[^-]|$)","i")},ae=/HTML$/i,se=/^(?:input|select|textarea|button)$/i,ue=/^h\d$/i,N=/^[^{]+\{\s*\[native \w/,le=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,ce=/[+~]/,j=new RegExp("\\\\[\\da-fA-F]{1,6}"+a+"?|\\\\([^\\r\\n\\f])","g"),fe=/([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,pe=ve(function(e){return!0===e.disabled&&"fieldset"===e.nodeName.toLowerCase()},{dir:"parentNode",next:"legend"});try{A.apply(t=Q.call(f.childNodes),f.childNodes),t[f.childNodes.length].nodeType}catch(e){A={apply:t.length?function(e,t){Y.apply(e,Q.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function D(t,e,n,r){var i,o,a,s,u,l,c=e&&e.ownerDocument,f=e?e.nodeType:9;if(n=n||[],"string"!=typeof t||!t||1!==f&&9!==f&&11!==f)return n;if(!r&&(T(e),e=e||C,E)){if(11!==f&&(s=le.exec(t)))if(i=s[1]){if(9===f){if(!(l=e.getElementById(i)))return n;if(l.id===i)return n.push(l),n}else if(c&&(l=c.getElementById(i))&&g(e,l)&&l.id===i)return n.push(l),n}else{if(s[2])return A.apply(n,e.getElementsByTagName(t)),n;if((i=s[3])&&p.getElementsByClassName&&e.getElementsByClassName)return A.apply(n,e.getElementsByClassName(i)),n}if(p.qsa&&!y[t+" "]&&(!h||!h.test(t))&&(1!==f||"object"!==e.nodeName.toLowerCase())){if(l=t,c=e,1===f&&(re.test(t)||ne.test(t))){(c=ce.test(t)&&ye(e.parentNode)||e)===e&&p.scope||((a=e.getAttribute("id"))?a=a.replace(fe,M):e.setAttribute("id",a=S)),o=(u=d(t)).length;while(o--)u[o]=(a?"#"+a:":scope")+" "+P(u[o]);l=u.join(",")}try{return A.apply(n,c.querySelectorAll(l)),n}catch(e){y(t,!0)}finally{a===S&&e.removeAttribute("id")}}}return $(t.replace(m,"$1"),e,n,r)}function q(){var n=[];function r(e,t){return n.push(e+" ")>b.cacheLength&&delete r[n.shift()],r[e+" "]=t}return r}function L(e){return e[S]=!0,e}function H(e){var t=C.createElement("fieldset");try{return!!e(t)}catch(e){return!1}finally{t.parentNode&&t.parentNode.removeChild(t)}}function de(e,t){var n=e.split("|"),r=n.length;while(r--)b.attrHandle[n[r]]=t}function he(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&e.sourceIndex-t.sourceIndex;if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function ge(t){return function(e){return"form"in e?e.parentNode&&!1===e.disabled?"label"in e?"label"in e.parentNode?e.parentNode.disabled===t:e.disabled===t:e.isDisabled===t||e.isDisabled!==!t&&pe(e)===t:e.disabled===t:"label"in e&&e.disabled===t}}function O(a){return L(function(o){return o=+o,L(function(e,t){var n,r=a([],e.length,o),i=r.length;while(i--)e[n=r[i]]&&(e[n]=!(t[n]=e[n]))})})}function ye(e){return e&&"undefined"!=typeof e.getElementsByTagName&&e}for(e in p=D.support={},W=D.isXML=function(e){var t=e&&e.namespaceURI,e=e&&(e.ownerDocument||e).documentElement;return!ae.test(t||e&&e.nodeName||"HTML")},T=D.setDocument=function(e){var e=e?e.ownerDocument||e:f;return e!=C&&9===e.nodeType&&e.documentElement&&(n=(C=e).documentElement,E=!W(C),f!=C&&(e=C.defaultView)&&e.top!==e&&(e.addEventListener?e.addEventListener("unload",I,!1):e.attachEvent&&e.attachEvent("onunload",I)),p.scope=H(function(e){return n.appendChild(e).appendChild(C.createElement("div")),"undefined"!=typeof e.querySelectorAll&&!e.querySelectorAll(":scope fieldset div").length}),p.attributes=H(function(e){return e.className="i",!e.getAttribute("className")}),p.getElementsByTagName=H(function(e){return e.appendChild(C.createComment("")),!e.getElementsByTagName("*").length}),p.getElementsByClassName=N.test(C.getElementsByClassName),p.getById=H(function(e){return n.appendChild(e).id=S,!C.getElementsByName||!C.getElementsByName(S).length}),p.getById?(b.filter.ID=function(e){var t=e.replace(j,c);return function(e){return e.getAttribute("id")===t}},b.find.ID=function(e,t){if("undefined"!=typeof t.getElementById&&E)return(t=t.getElementById(e))?[t]:[]}):(b.filter.ID=function(e){var t=e.replace(j,c);return function(e){e="undefined"!=typeof e.getAttributeNode&&e.getAttributeNode("id");return e&&e.value===t}},b.find.ID=function(e,t){if("undefined"!=typeof t.getElementById&&E){var n,r,i,o=t.getElementById(e);if(o){if((n=o.getAttributeNode("id"))&&n.value===e)return[o];i=t.getElementsByName(e),r=0;while(o=i[r++])if((n=o.getAttributeNode("id"))&&n.value===e)return[o]}return[]}}),b.find.TAG=p.getElementsByTagName?function(e,t){return"undefined"!=typeof t.getElementsByTagName?t.getElementsByTagName(e):p.qsa?t.querySelectorAll(e):void 0}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"!==e)return o;while(n=o[i++])1===n.nodeType&&r.push(n);return r},b.find.CLASS=p.getElementsByClassName&&function(e,t){if("undefined"!=typeof t.getElementsByClassName&&E)return t.getElementsByClassName(e)},r=[],h=[],(p.qsa=N.test(C.querySelectorAll))&&(H(function(e){var t;n.appendChild(e).innerHTML="<a id='"+S+"'></a><select id='"+S+"-\r\\' msallowcapture=''><option selected=''></option></select>",e.querySelectorAll("[msallowcapture^='']").length&&h.push("[*^$]="+a+"*(?:''|\"\")"),e.querySelectorAll("[selected]").length||h.push("\\["+a+"*(?:value|"+J+")"),e.querySelectorAll("[id~="+S+"-]").length||h.push("~="),(t=C.createElement("input")).setAttribute("name",""),e.appendChild(t),e.querySelectorAll("[name='']").length||h.push("\\["+a+"*name"+a+"*="+a+"*(?:''|\"\")"),e.querySelectorAll(":checked").length||h.push(":checked"),e.querySelectorAll("a#"+S+"+*").length||h.push(".#.+[+~]"),e.querySelectorAll("\\\f"),h.push("[\\r\\n\\f]")}),H(function(e){e.innerHTML="<a href='' disabled='disabled'></a><select disabled='disabled'><option/></select>";var t=C.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("name","D"),e.querySelectorAll("[name=d]").length&&h.push("name"+a+"*[*^$|!~]?="),2!==e.querySelectorAll(":enabled").length&&h.push(":enabled",":disabled"),n.appendChild(e).disabled=!0,2!==e.querySelectorAll(":disabled").length&&h.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),h.push(",.*:")})),(p.matchesSelector=N.test(i=n.matches||n.webkitMatchesSelector||n.mozMatchesSelector||n.oMatchesSelector||n.msMatchesSelector))&&H(function(e){p.disconnectedMatch=i.call(e,"*"),i.call(e,"[s!='']:x"),r.push("!=",Z)}),h=h.length&&new RegExp(h.join("|")),r=r.length&&new RegExp(r.join("|")),e=N.test(n.compareDocumentPosition),g=e||N.test(n.contains)?function(e,t){var n=9===e.nodeType?e.documentElement:e,t=t&&t.parentNode;return e===t||!(!t||1!==t.nodeType||!(n.contains?n.contains(t):e.compareDocumentPosition&&16&e.compareDocumentPosition(t)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},X=e?function(e,t){var n;return e===t?(l=!0,0):(n=!e.compareDocumentPosition-!t.compareDocumentPosition)||(1&(n=(e.ownerDocument||e)==(t.ownerDocument||t)?e.compareDocumentPosition(t):1)||!p.sortDetached&&t.compareDocumentPosition(e)===n?e==C||e.ownerDocument==f&&g(f,e)?-1:t==C||t.ownerDocument==f&&g(f,t)?1:u?v(u,e)-v(u,t):0:4&n?-1:1)}:function(e,t){if(e===t)return l=!0,0;var n,r=0,i=e.parentNode,o=t.parentNode,a=[e],s=[t];if(!i||!o)return e==C?-1:t==C?1:i?-1:o?1:u?v(u,e)-v(u,t):0;if(i===o)return he(e,t);n=e;while(n=n.parentNode)a.unshift(n);n=t;while(n=n.parentNode)s.unshift(n);while(a[r]===s[r])r++;return r?he(a[r],s[r]):a[r]==f?-1:s[r]==f?1:0}),C},D.matches=function(e,t){return D(e,null,null,t)},D.matchesSelector=function(e,t){if(T(e),p.matchesSelector&&E&&!y[t+" "]&&(!r||!r.test(t))&&(!h||!h.test(t)))try{var n=i.call(e,t);if(n||p.disconnectedMatch||e.document&&11!==e.document.nodeType)return n}catch(e){y(t,!0)}return 0<D(t,C,null,[e]).length},D.contains=function(e,t){return(e.ownerDocument||e)!=C&&T(e),g(e,t)},D.attr=function(e,t){(e.ownerDocument||e)!=C&&T(e);var n=b.attrHandle[t.toLowerCase()],n=n&&V.call(b.attrHandle,t.toLowerCase())?n(e,t,!E):void 0;return void 0!==n?n:p.attributes||!E?e.getAttribute(t):(n=e.getAttributeNode(t))&&n.specified?n.value:null},D.escape=function(e){return(e+"").replace(fe,M)},D.error=function(e){throw new Error("Syntax error, unrecognized expression: "+e)},D.uniqueSort=function(e){var t,n=[],r=0,i=0;if(l=!p.detectDuplicates,u=!p.sortStable&&e.slice(0),e.sort(X),l){while(t=e[i++])t===e[i]&&(r=n.push(i));while(r--)e.splice(n[r],1)}return u=null,e},o=D.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=o(e)}else if(3===i||4===i)return e.nodeValue}else while(t=e[r++])n+=o(t);return n},(b=D.selectors={cacheLength:50,createPseudo:L,match:x,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(j,c),e[3]=(e[3]||e[4]||e[5]||"").replace(j,c),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||D.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&D.error(e[0]),e},PSEUDO:function(e){var t,n=!e[6]&&e[2];return x.CHILD.test(e[0])?null:(e[3]?e[2]=e[4]||e[5]||"":n&&ie.test(n)&&(t=d(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(j,c).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=_[e+" "];return t||(t=new RegExp("(^|"+a+")"+e+"("+a+"|$)"))&&_(e,function(e){return t.test("string"==typeof e.className&&e.className||"undefined"!=typeof e.getAttribute&&e.getAttribute("class")||"")})},ATTR:function(t,n,r){return function(e){e=D.attr(e,t);return null==e?"!="===n:!n||(e+="","="===n?e===r:"!="===n?e!==r:"^="===n?r&&0===e.indexOf(r):"*="===n?r&&-1<e.indexOf(r):"$="===n?r&&e.slice(-r.length)===r:"~="===n?-1<(" "+e.replace(ee," ")+" ").indexOf(r):"|="===n&&(e===r||e.slice(0,r.length+1)===r+"-"))}},CHILD:function(h,e,t,g,y){var m="nth"!==h.slice(0,3),v="last"!==h.slice(-4),x="of-type"===e;return 1===g&&0===y?function(e){return!!e.parentNode}:function(e,t,n){var r,i,o,a,s,u,l=m!=v?"nextSibling":"previousSibling",c=e.parentNode,f=x&&e.nodeName.toLowerCase(),p=!n&&!x,d=!1;if(c){if(m){while(l){a=e;while(a=a[l])if(x?a.nodeName.toLowerCase()===f:1===a.nodeType)return!1;u=l="only"===h&&!u&&"nextSibling"}return!0}if(u=[v?c.firstChild:c.lastChild],v&&p){d=(s=(r=(i=(o=(a=c)[S]||(a[S]={}))[a.uniqueID]||(o[a.uniqueID]={}))[h]||[])[0]===k&&r[1])&&r[2],a=s&&c.childNodes[s];while(a=++s&&a&&a[l]||(d=s=0)||u.pop())if(1===a.nodeType&&++d&&a===e){i[h]=[k,s,d];break}}else if(!1===(d=p?s=(r=(i=(o=(a=e)[S]||(a[S]={}))[a.uniqueID]||(o[a.uniqueID]={}))[h]||[])[0]===k&&r[1]:d))while(a=++s&&a&&a[l]||(d=s=0)||u.pop())if((x?a.nodeName.toLowerCase()===f:1===a.nodeType)&&++d&&(p&&((i=(o=a[S]||(a[S]={}))[a.uniqueID]||(o[a.uniqueID]={}))[h]=[k,d]),a===e))break;return(d-=y)===g||d%g==0&&0<=d/g}}},PSEUDO:function(e,o){var t,a=b.pseudos[e]||b.setFilters[e.toLowerCase()]||D.error("unsupported pseudo: "+e);return a[S]?a(o):1<a.length?(t=[e,e,"",o],b.setFilters.hasOwnProperty(e.toLowerCase())?L(function(e,t){var n,r=a(e,o),i=r.length;while(i--)e[n=v(e,r[i])]=!(t[n]=r[i])}):function(e){return a(e,0,t)}):a}},pseudos:{not:L(function(e){var r=[],i=[],s=F(e.replace(m,"$1"));return s[S]?L(function(e,t,n,r){var i,o=s(e,null,r,[]),a=e.length;while(a--)(i=o[a])&&(e[a]=!(t[a]=i))}):function(e,t,n){return r[0]=e,s(r,null,n,i),r[0]=null,!i.pop()}}),has:L(function(t){return function(e){return 0<D(t,e).length}}),contains:L(function(t){return t=t.replace(j,c),function(e){return-1<(e.textContent||o(e)).indexOf(t)}}),lang:L(function(n){return oe.test(n||"")||D.error("unsupported lang: "+n),n=n.replace(j,c).toLowerCase(),function(e){var t;do{if(t=E?e.lang:e.getAttribute("xml:lang")||e.getAttribute("lang"))return(t=t.toLowerCase())===n||0===t.indexOf(n+"-")}while((e=e.parentNode)&&1===e.nodeType);return!1}}),target:function(e){var t=R.location&&R.location.hash;return t&&t.slice(1)===e.id},root:function(e){return e===n},focus:function(e){return e===C.activeElement&&(!C.hasFocus||C.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:ge(!1),disabled:ge(!0),checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,!0===e.selected},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeType<6)return!1;return!0},parent:function(e){return!b.pseudos.empty(e)},header:function(e){return ue.test(e.nodeName)},input:function(e){return se.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(e=e.getAttribute("type"))||"text"===e.toLowerCase())},first:O(function(){return[0]}),last:O(function(e,t){return[t-1]}),eq:O(function(e,t,n){return[n<0?n+t:n]}),even:O(function(e,t){for(var n=0;n<t;n+=2)e.push(n);return e}),odd:O(function(e,t){for(var n=1;n<t;n+=2)e.push(n);return e}),lt:O(function(e,t,n){for(var r=n<0?n+t:t<n?t:n;0<=--r;)e.push(r);return e}),gt:O(function(e,t,n){for(var r=n<0?n+t:n;++r<t;)e.push(r);return e})}}).pseudos.nth=b.pseudos.eq,{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})b.pseudos[e]=function(t){return function(e){return"input"===e.nodeName.toLowerCase()&&e.type===t}}(e);for(e in{submit:!0,reset:!0})b.pseudos[e]=function(n){return function(e){var t=e.nodeName.toLowerCase();return("input"===t||"button"===t)&&e.type===n}}(e);function me(){}function P(e){for(var t=0,n=e.length,r="";t<n;t++)r+=e[t].value;return r}function ve(a,e,t){var s=e.dir,u=e.next,l=u||s,c=t&&"parentNode"===l,f=B++;return e.first?function(e,t,n){while(e=e[s])if(1===e.nodeType||c)return a(e,t,n);return!1}:function(e,t,n){var r,i,o=[k,f];if(n){while(e=e[s])if((1===e.nodeType||c)&&a(e,t,n))return!0}else while(e=e[s])if(1===e.nodeType||c)if(i=(i=e[S]||(e[S]={}))[e.uniqueID]||(i[e.uniqueID]={}),u&&u===e.nodeName.toLowerCase())e=e[s]||e;else{if((r=i[l])&&r[0]===k&&r[1]===f)return o[2]=r[2];if((i[l]=o)[2]=a(e,t,n))return!0}return!1}}function xe(i){return 1<i.length?function(e,t,n){var r=i.length;while(r--)if(!i[r](e,t,n))return!1;return!0}:i[0]}function be(e,t,n,r,i){for(var o,a=[],s=0,u=e.length,l=null!=t;s<u;s++)!(o=e[s])||n&&!n(o,r,i)||(a.push(o),l&&t.push(s));return a}function we(d,h,g,y,m,e){return y&&!y[S]&&(y=we(y)),m&&!m[S]&&(m=we(m,e)),L(function(e,t,n,r){var i,o,a,s=[],u=[],l=t.length,c=e||function(e,t,n){for(var r=0,i=t.length;r<i;r++)D(e,t[r],n);return n}(h||"*",n.nodeType?[n]:n,[]),f=!d||!e&&h?c:be(c,s,d,n,r),p=g?m||(e?d:l||y)?[]:t:f;if(g&&g(f,p,n,r),y){i=be(p,u),y(i,[],n,r),o=i.length;while(o--)(a=i[o])&&(p[u[o]]=!(f[u[o]]=a))}if(e){if(m||d){if(m){i=[],o=p.length;while(o--)(a=p[o])&&i.push(f[o]=a);m(null,p=[],i,r)}o=p.length;while(o--)(a=p[o])&&-1<(i=m?v(e,a):s[o])&&(e[i]=!(t[i]=a))}}else p=be(p===t?p.splice(l,p.length):p),m?m(null,t,p,r):A.apply(t,p)})}function Te(y,m){function e(e,t,n,r,i){var o,a,s,u=0,l="0",c=e&&[],f=[],p=w,d=e||x&&b.find.TAG("*",i),h=k+=null==p?1:Math.random()||.1,g=d.length;for(i&&(w=t==C||t||i);l!==g&&null!=(o=d[l]);l++){if(x&&o){a=0,t||o.ownerDocument==C||(T(o),n=!E);while(s=y[a++])if(s(o,t||C,n)){r.push(o);break}i&&(k=h)}v&&((o=!s&&o)&&u--,e&&c.push(o))}if(u+=l,v&&l!==u){a=0;while(s=m[a++])s(c,f,t,n);if(e){if(0<u)while(l--)c[l]||f[l]||(f[l]=G.call(r));f=be(f)}A.apply(r,f),i&&!e&&0<f.length&&1<u+m.length&&D.uniqueSort(r)}return i&&(k=h,w=p),c}var v=0<m.length,x=0<y.length;return v?L(e):e}return me.prototype=b.filters=b.pseudos,b.setFilters=new me,d=D.tokenize=function(e,t){var n,r,i,o,a,s,u,l=z[e+" "];if(l)return t?0:l.slice(0);a=e,s=[],u=b.preFilter;while(a){for(o in n&&!(r=te.exec(a))||(r&&(a=a.slice(r[0].length)||a),s.push(i=[])),n=!1,(r=ne.exec(a))&&(n=r.shift(),i.push({value:n,type:r[0].replace(m," ")}),a=a.slice(n.length)),b.filter)!(r=x[o].exec(a))||u[o]&&!(r=u[o](r))||(n=r.shift(),i.push({value:n,type:o,matches:r}),a=a.slice(n.length));if(!n)break}return t?a.length:a?D.error(e):z(e,s).slice(0)},F=D.compile=function(e,t){var n,r=[],i=[],o=U[e+" "];if(!o){n=(t=t||d(e)).length;while(n--)((o=function e(t){for(var r,n,i,o=t.length,a=b.relative[t[0].type],s=a||b.relative[" "],u=a?1:0,l=ve(function(e){return e===r},s,!0),c=ve(function(e){return-1<v(r,e)},s,!0),f=[function(e,t,n){return e=!a&&(n||t!==w)||((r=t).nodeType?l:c)(e,t,n),r=null,e}];u<o;u++)if(n=b.relative[t[u].type])f=[ve(xe(f),n)];else{if((n=b.filter[t[u].type].apply(null,t[u].matches))[S]){for(i=++u;i<o;i++)if(b.relative[t[i].type])break;return we(1<u&&xe(f),1<u&&P(t.slice(0,u-1).concat({value:" "===t[u-2].type?"*":""})).replace(m,"$1"),n,u<i&&e(t.slice(u,i)),i<o&&e(t=t.slice(i)),i<o&&P(t))}f.push(n)}return xe(f)}(t[n]))[S]?r:i).push(o);(o=U(e,Te(i,r))).selector=e}return o},$=D.select=function(e,t,n,r){var i,o,a,s,u="function"==typeof e&&e,l=!r&&d(e=u.selector||e);if(n=n||[],1===l.length){if(2<(o=l[0]=l[0].slice(0)).length&&"ID"===(a=o[0]).type&&9===t.nodeType&&E&&b.relative[o[1].type]){if(!(t=(b.find.ID(a.matches[0].replace(j,c),t)||[])[0]))return n;u&&(t=t.parentNode),e=e.slice(o.shift().value.length)}i=x.needsContext.test(e)?0:o.length;while(i--){if(a=o[i],b.relative[s=a.type])break;if((s=b.find[s])&&(r=s(a.matches[0].replace(j,c),ce.test(o[0].type)&&ye(t.parentNode)||t))){if(o.splice(i,1),e=r.length&&P(o))break;return A.apply(n,r),n}}}return(u||F(e,l))(r,t,!E,n,!t||ce.test(e)&&ye(t.parentNode)||t),n},p.sortStable=S.split("").sort(X).join("")===S,p.detectDuplicates=!!l,T(),p.sortDetached=H(function(e){return 1&e.compareDocumentPosition(C.createElement("fieldset"))}),H(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||de("type|href|height|width",function(e,t,n){if(!n)return e.getAttribute(t,"type"===t.toLowerCase()?1:2)}),p.attributes&&H(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||de("value",function(e,t,n){if(!n&&"input"===e.nodeName.toLowerCase())return e.defaultValue}),H(function(e){return null==e.getAttribute("disabled")})||de(J,function(e,t,n){if(!n)return!0===e[t]?t.toLowerCase():(n=e.getAttributeNode(t))&&n.specified?n.value:null}),D}(w),Q=(C.find=e,C.expr=e.selectors,C.expr[":"]=C.expr.pseudos,C.uniqueSort=C.unique=e.uniqueSort,C.text=e.getText,C.isXMLDoc=e.isXML,C.contains=e.contains,C.escapeSelector=e.escape,C.expr.match.needsContext);function u(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()}var J=/^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i;function K(e,n,r){return v(n)?C.grep(e,function(e,t){return!!n.call(e,t,e)!==r}):n.nodeType?C.grep(e,function(e){return e===n!==r}):"string"!=typeof n?C.grep(e,function(e){return-1<F.call(n,e)!==r}):C.filter(n,e,r)}C.filter=function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?C.find.matchesSelector(r,e)?[r]:[]:C.find.matches(e,C.grep(t,function(e){return 1===e.nodeType}))},C.fn.extend({find:function(e){var t,n,r=this.length,i=this;if("string"!=typeof e)return this.pushStack(C(e).filter(function(){for(t=0;t<r;t++)if(C.contains(i[t],this))return!0}));for(n=this.pushStack([]),t=0;t<r;t++)C.find(e,i[t],n);return 1<r?C.uniqueSort(n):n},filter:function(e){return this.pushStack(K(this,e||[],!1))},not:function(e){return this.pushStack(K(this,e||[],!0))},is:function(e){return!!K(this,"string"==typeof e&&Q.test(e)?C(e):e||[],!1).length}});var Z,ee=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,te=((C.fn.init=function(e,t,n){if(e){if(n=n||Z,"string"!=typeof e)return e.nodeType?(this[0]=e,this.length=1,this):v(e)?void 0!==n.ready?n.ready(e):e(C):C.makeArray(e,this);if(!(r="<"===e[0]&&">"===e[e.length-1]&&3<=e.length?[null,e,null]:ee.exec(e))||!r[1]&&t)return(!t||t.jquery?t||n:this.constructor(t)).find(e);if(r[1]){if(t=t instanceof C?t[0]:t,C.merge(this,C.parseHTML(r[1],t&&t.nodeType?t.ownerDocument||t:T,!0)),J.test(r[1])&&C.isPlainObject(t))for(var r in t)v(this[r])?this[r](t[r]):this.attr(r,t[r])}else(n=T.getElementById(r[2]))&&(this[0]=n,this.length=1)}return this}).prototype=C.fn,Z=C(T),/^(?:parents|prev(?:Until|All))/),ne={children:!0,contents:!0,next:!0,prev:!0};function re(e,t){while((e=e[t])&&1!==e.nodeType);return e}C.fn.extend({has:function(e){var t=C(e,this),n=t.length;return this.filter(function(){for(var e=0;e<n;e++)if(C.contains(this,t[e]))return!0})},closest:function(e,t){var n,r=0,i=this.length,o=[],a="string"!=typeof e&&C(e);if(!Q.test(e))for(;r<i;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(n.nodeType<11&&(a?-1<a.index(n):1===n.nodeType&&C.find.matchesSelector(n,e))){o.push(n);break}return this.pushStack(1<o.length?C.uniqueSort(o):o)},index:function(e){return e?"string"==typeof e?F.call(C(e),this[0]):F.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){return this.pushStack(C.uniqueSort(C.merge(this.get(),C(e,t))))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}}),C.each({parent:function(e){e=e.parentNode;return e&&11!==e.nodeType?e:null},parents:function(e){return r(e,"parentNode")},parentsUntil:function(e,t,n){return r(e,"parentNode",n)},next:function(e){return re(e,"nextSibling")},prev:function(e){return re(e,"previousSibling")},nextAll:function(e){return r(e,"nextSibling")},prevAll:function(e){return r(e,"previousSibling")},nextUntil:function(e,t,n){return r(e,"nextSibling",n)},prevUntil:function(e,t,n){return r(e,"previousSibling",n)},siblings:function(e){return Y((e.parentNode||{}).firstChild,e)},children:function(e){return Y(e.firstChild)},contents:function(e){return null!=e.contentDocument&&M(e.contentDocument)?e.contentDocument:(u(e,"template")&&(e=e.content||e),C.merge([],e.childNodes))}},function(r,i){C.fn[r]=function(e,t){var n=C.map(this,i,e);return(t="Until"!==r.slice(-5)?e:t)&&"string"==typeof t&&(n=C.filter(t,n)),1<this.length&&(ne[r]||C.uniqueSort(n),te.test(r)&&n.reverse()),this.pushStack(n)}});var E=/[^\x20\t\r\n\f]+/g;function c(e){return e}function ie(e){throw e}function oe(e,t,n,r){var i;try{e&&v(i=e.promise)?i.call(e).done(t).fail(n):e&&v(i=e.then)?i.call(e,t,n):t.apply(void 0,[e].slice(r))}catch(e){n.apply(void 0,[e])}}C.Callbacks=function(r){var e,n;r="string"==typeof r?(e=r,n={},C.each(e.match(E)||[],function(e,t){n[t]=!0}),n):C.extend({},r);function i(){for(s=s||r.once,a=o=!0;l.length;c=-1){t=l.shift();while(++c<u.length)!1===u[c].apply(t[0],t[1])&&r.stopOnFalse&&(c=u.length,t=!1)}r.memory||(t=!1),o=!1,s&&(u=t?[]:"")}var o,t,a,s,u=[],l=[],c=-1,f={add:function(){return u&&(t&&!o&&(c=u.length-1,l.push(t)),function n(e){C.each(e,function(e,t){v(t)?r.unique&&f.has(t)||u.push(t):t&&t.length&&"string"!==h(t)&&n(t)})}(arguments),t&&!o&&i()),this},remove:function(){return C.each(arguments,function(e,t){var n;while(-1<(n=C.inArray(t,u,n)))u.splice(n,1),n<=c&&c--}),this},has:function(e){return e?-1<C.inArray(e,u):0<u.length},empty:function(){return u=u&&[],this},disable:function(){return s=l=[],u=t="",this},disabled:function(){return!u},lock:function(){return s=l=[],t||o||(u=t=""),this},locked:function(){return!!s},fireWith:function(e,t){return s||(t=[e,(t=t||[]).slice?t.slice():t],l.push(t),o||i()),this},fire:function(){return f.fireWith(this,arguments),this},fired:function(){return!!a}};return f},C.extend({Deferred:function(e){var o=[["notify","progress",C.Callbacks("memory"),C.Callbacks("memory"),2],["resolve","done",C.Callbacks("once memory"),C.Callbacks("once memory"),0,"resolved"],["reject","fail",C.Callbacks("once memory"),C.Callbacks("once memory"),1,"rejected"]],i="pending",a={state:function(){return i},always:function(){return s.done(arguments).fail(arguments),this},catch:function(e){return a.then(null,e)},pipe:function(){var i=arguments;return C.Deferred(function(r){C.each(o,function(e,t){var n=v(i[t[4]])&&i[t[4]];s[t[1]](function(){var e=n&&n.apply(this,arguments);e&&v(e.promise)?e.promise().progress(r.notify).done(r.resolve).fail(r.reject):r[t[0]+"With"](this,n?[e]:arguments)})}),i=null}).promise()},then:function(t,n,r){var u=0;function l(i,o,a,s){return function(){function e(){var e,t;if(!(i<u)){if((e=a.apply(n,r))===o.promise())throw new TypeError("Thenable self-resolution");t=e&&("object"==typeof e||"function"==typeof e)&&e.then,v(t)?s?t.call(e,l(u,o,c,s),l(u,o,ie,s)):(u++,t.call(e,l(u,o,c,s),l(u,o,ie,s),l(u,o,c,o.notifyWith))):(a!==c&&(n=void 0,r=[e]),(s||o.resolveWith)(n,r))}}var n=this,r=arguments,t=s?e:function(){try{e()}catch(e){C.Deferred.exceptionHook&&C.Deferred.exceptionHook(e,t.stackTrace),u<=i+1&&(a!==ie&&(n=void 0,r=[e]),o.rejectWith(n,r))}};i?t():(C.Deferred.getStackHook&&(t.stackTrace=C.Deferred.getStackHook()),w.setTimeout(t))}}return C.Deferred(function(e){o[0][3].add(l(0,e,v(r)?r:c,e.notifyWith)),o[1][3].add(l(0,e,v(t)?t:c)),o[2][3].add(l(0,e,v(n)?n:ie))}).promise()},promise:function(e){return null!=e?C.extend(e,a):a}},s={};return C.each(o,function(e,t){var n=t[2],r=t[5];a[t[1]]=n.add,r&&n.add(function(){i=r},o[3-e][2].disable,o[3-e][3].disable,o[0][2].lock,o[0][3].lock),n.add(t[3].fire),s[t[0]]=function(){return s[t[0]+"With"](this===s?void 0:this,arguments),this},s[t[0]+"With"]=n.fireWith}),a.promise(s),e&&e.call(s,s),s},when:function(e){function t(t){return function(e){i[t]=this,o[t]=1<arguments.length?s.call(arguments):e,--n||a.resolveWith(i,o)}}var n=arguments.length,r=n,i=Array(r),o=s.call(arguments),a=C.Deferred();if(n<=1&&(oe(e,a.done(t(r)).resolve,a.reject,!n),"pending"===a.state()||v(o[r]&&o[r].then)))return a.then();while(r--)oe(o[r],t(r),a.reject);return a.promise()}});var ae=/^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/,se=(C.Deferred.exceptionHook=function(e,t){w.console&&w.console.warn&&e&&ae.test(e.name)&&w.console.warn("jQuery.Deferred exception: "+e.message,e.stack,t)},C.readyException=function(e){w.setTimeout(function(){throw e})},C.Deferred());function ue(){T.removeEventListener("DOMContentLoaded",ue),w.removeEventListener("load",ue),C.ready()}C.fn.ready=function(e){return se.then(e).catch(function(e){C.readyException(e)}),this},C.extend({isReady:!1,readyWait:1,ready:function(e){(!0===e?--C.readyWait:C.isReady)||(C.isReady=!0)!==e&&0<--C.readyWait||se.resolveWith(T,[C])}}),C.ready.then=se.then,"complete"===T.readyState||"loading"!==T.readyState&&!T.documentElement.doScroll?w.setTimeout(C.ready):(T.addEventListener("DOMContentLoaded",ue),w.addEventListener("load",ue));function f(e,t,n,r,i,o,a){var s=0,u=e.length,l=null==n;if("object"===h(n))for(s in i=!0,n)f(e,t,s,n[s],!0,o,a);else if(void 0!==r&&(i=!0,v(r)||(a=!0),t=l?a?(t.call(e,r),null):(l=t,function(e,t,n){return l.call(C(e),n)}):t))for(;s<u;s++)t(e[s],n,a?r:r.call(e[s],s,t(e[s],n)));return i?e:l?t.call(e):u?t(e[0],n):o}var le=/^-ms-/,ce=/-([a-z])/g;function fe(e,t){return t.toUpperCase()}function x(e){return e.replace(le,"ms-").replace(ce,fe)}function m(e){return 1===e.nodeType||9===e.nodeType||!+e.nodeType}function pe(){this.expando=C.expando+pe.uid++}pe.uid=1,pe.prototype={cache:function(e){var t=e[this.expando];return t||(t={},m(e)&&(e.nodeType?e[this.expando]=t:Object.defineProperty(e,this.expando,{value:t,configurable:!0}))),t},set:function(e,t,n){var r,i=this.cache(e);if("string"==typeof t)i[x(t)]=n;else for(r in t)i[x(r)]=t[r];return i},get:function(e,t){return void 0===t?this.cache(e):e[this.expando]&&e[this.expando][x(t)]},access:function(e,t,n){return void 0===t||t&&"string"==typeof t&&void 0===n?this.get(e,t):(this.set(e,t,n),void 0!==n?n:t)},remove:function(e,t){var n,r=e[this.expando];if(void 0!==r){if(void 0!==t){n=(t=Array.isArray(t)?t.map(x):(t=x(t))in r?[t]:t.match(E)||[]).length;while(n--)delete r[t[n]]}void 0!==t&&!C.isEmptyObject(r)||(e.nodeType?e[this.expando]=void 0:delete e[this.expando])}},hasData:function(e){e=e[this.expando];return void 0!==e&&!C.isEmptyObject(e)}};var b=new pe,l=new pe,de=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,he=/[A-Z]/g;function ge(e,t,n){var r,i;if(void 0===n&&1===e.nodeType)if(r="data-"+t.replace(he,"-$&").toLowerCase(),"string"==typeof(n=e.getAttribute(r))){try{n="true"===(i=n)||"false"!==i&&("null"===i?null:i===+i+""?+i:de.test(i)?JSON.parse(i):i)}catch(e){}l.set(e,t,n)}else n=void 0;return n}C.extend({hasData:function(e){return l.hasData(e)||b.hasData(e)},data:function(e,t,n){return l.access(e,t,n)},removeData:function(e,t){l.remove(e,t)},_data:function(e,t,n){return b.access(e,t,n)},_removeData:function(e,t){b.remove(e,t)}}),C.fn.extend({data:function(n,e){var t,r,i,o=this[0],a=o&&o.attributes;if(void 0!==n)return"object"==typeof n?this.each(function(){l.set(this,n)}):f(this,function(e){var t;if(o&&void 0===e)return void 0!==(t=l.get(o,n))||void 0!==(t=ge(o,n))?t:void 0;this.each(function(){l.set(this,n,e)})},null,e,1<arguments.length,null,!0);if(this.length&&(i=l.get(o),1===o.nodeType&&!b.get(o,"hasDataAttrs"))){t=a.length;while(t--)a[t]&&0===(r=a[t].name).indexOf("data-")&&(r=x(r.slice(5)),ge(o,r,i[r]));b.set(o,"hasDataAttrs",!0)}return i},removeData:function(e){return this.each(function(){l.remove(this,e)})}}),C.extend({queue:function(e,t,n){var r;if(e)return r=b.get(e,t=(t||"fx")+"queue"),n&&(!r||Array.isArray(n)?r=b.access(e,t,C.makeArray(n)):r.push(n)),r||[]},dequeue:function(e,t){t=t||"fx";var n=C.queue(e,t),r=n.length,i=n.shift(),o=C._queueHooks(e,t);"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,function(){C.dequeue(e,t)},o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return b.get(e,n)||b.access(e,n,{empty:C.Callbacks("once memory").add(function(){b.remove(e,[t+"queue",n])})})}}),C.fn.extend({queue:function(t,n){var e=2;return"string"!=typeof t&&(n=t,t="fx",e--),arguments.length<e?C.queue(this[0],t):void 0===n?this:this.each(function(){var e=C.queue(this,t,n);C._queueHooks(this,t),"fx"===t&&"inprogress"!==e[0]&&C.dequeue(this,t)})},dequeue:function(e){return this.each(function(){C.dequeue(this,e)})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){function n(){--i||o.resolveWith(a,[a])}var r,i=1,o=C.Deferred(),a=this,s=this.length;"string"!=typeof e&&(t=e,e=void 0),e=e||"fx";while(s--)(r=b.get(a[s],e+"queueHooks"))&&r.empty&&(i++,r.empty.add(n));return n(),o.promise(t)}});function ye(e,t){return"none"===(e=t||e).style.display||""===e.style.display&&k(e)&&"none"===C.css(e,"display")}var e=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,me=new RegExp("^(?:([+-])=|)("+e+")([a-z%]*)$","i"),p=["Top","Right","Bottom","Left"],S=T.documentElement,k=function(e){return C.contains(e.ownerDocument,e)},ve={composed:!0};S.getRootNode&&(k=function(e){return C.contains(e.ownerDocument,e)||e.getRootNode(ve)===e.ownerDocument});function xe(e,t,n,r){var i,o,a=20,s=r?function(){return r.cur()}:function(){return C.css(e,t,"")},u=s(),l=n&&n[3]||(C.cssNumber[t]?"":"px"),c=e.nodeType&&(C.cssNumber[t]||"px"!==l&&+u)&&me.exec(C.css(e,t));if(c&&c[3]!==l){l=l||c[3],c=+(u/=2)||1;while(a--)C.style(e,t,c+l),(1-o)*(1-(o=s()/u||.5))<=0&&(a=0),c/=o;C.style(e,t,(c*=2)+l),n=n||[]}return n&&(c=+c||+u||0,i=n[1]?c+(n[1]+1)*n[2]:+n[2],r&&(r.unit=l,r.start=c,r.end=i)),i}var be={};function A(e,t){for(var n,r,i,o,a,s=[],u=0,l=e.length;u<l;u++)(r=e[u]).style&&(n=r.style.display,t?("none"===n&&(s[u]=b.get(r,"display")||null,s[u]||(r.style.display="")),""===r.style.display&&ye(r)&&(s[u]=(a=o=void 0,o=(i=r).ownerDocument,i=i.nodeName,(a=be[i])||(o=o.body.appendChild(o.createElement(i)),a=C.css(o,"display"),o.parentNode.removeChild(o),be[i]=a="none"===a?"block":a),a))):"none"!==n&&(s[u]="none",b.set(r,"display",n)));for(u=0;u<l;u++)null!=s[u]&&(e[u].style.display=s[u]);return e}C.fn.extend({show:function(){return A(this,!0)},hide:function(){return A(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){ye(this)?C(this).show():C(this).hide()})}});var we=/^(?:checkbox|radio)$/i,Te=/<([a-z][^\/\0>\x20\t\r\n\f]*)/i,Ce=/^$|^module$|\/(?:java|ecma)script/i,N=(L=T.createDocumentFragment().appendChild(T.createElement("div")),(o=T.createElement("input")).setAttribute("type","radio"),o.setAttribute("checked","checked"),o.setAttribute("name","t"),L.appendChild(o),y.checkClone=L.cloneNode(!0).cloneNode(!0).lastChild.checked,L.innerHTML="<textarea>x</textarea>",y.noCloneChecked=!!L.cloneNode(!0).lastChild.defaultValue,L.innerHTML="<option></option>",y.option=!!L.lastChild,{thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]});function j(e,t){var n="undefined"!=typeof e.getElementsByTagName?e.getElementsByTagName(t||"*"):"undefined"!=typeof e.querySelectorAll?e.querySelectorAll(t||"*"):[];return void 0===t||t&&u(e,t)?C.merge([e],n):n}function Ee(e,t){for(var n=0,r=e.length;n<r;n++)b.set(e[n],"globalEval",!t||b.get(t[n],"globalEval"))}N.tbody=N.tfoot=N.colgroup=N.caption=N.thead,N.th=N.td,y.option||(N.optgroup=N.option=[1,"<select multiple='multiple'>","</select>"]);var Se=/<|&#?\w+;/;function ke(e,t,n,r,i){for(var o,a,s,u,l,c=t.createDocumentFragment(),f=[],p=0,d=e.length;p<d;p++)if((o=e[p])||0===o)if("object"===h(o))C.merge(f,o.nodeType?[o]:o);else if(Se.test(o)){a=a||c.appendChild(t.createElement("div")),s=(Te.exec(o)||["",""])[1].toLowerCase(),s=N[s]||N._default,a.innerHTML=s[1]+C.htmlPrefilter(o)+s[2],l=s[0];while(l--)a=a.lastChild;C.merge(f,a.childNodes),(a=c.firstChild).textContent=""}else f.push(t.createTextNode(o));c.textContent="",p=0;while(o=f[p++])if(r&&-1<C.inArray(o,r))i&&i.push(o);else if(u=k(o),a=j(c.appendChild(o),"script"),u&&Ee(a),n){l=0;while(o=a[l++])Ce.test(o.type||"")&&n.push(o)}return c}var Ae=/^([^.]*)(?:\.(.+)|)/;function n(){return!0}function d(){return!1}function Ne(e,t){return e===function(){try{return T.activeElement}catch(e){}}()==("focus"===t)}function je(e,t,n,r,i,o){var a,s;if("object"==typeof t){for(s in"string"!=typeof n&&(r=r||n,n=void 0),t)je(e,s,n,r,t[s],o);return e}if(null==r&&null==i?(i=n,r=n=void 0):null==i&&("string"==typeof n?(i=r,r=void 0):(i=r,r=n,n=void 0)),!1===i)i=d;else if(!i)return e;return 1===o&&(a=i,(i=function(e){return C().off(e),a.apply(this,arguments)}).guid=a.guid||(a.guid=C.guid++)),e.each(function(){C.event.add(this,t,i,r,n)})}function De(e,i,o){o?(b.set(e,i,!1),C.event.add(e,i,{namespace:!1,handler:function(e){var t,n,r=b.get(this,i);if(1&e.isTrigger&&this[i]){if(r.length)(C.event.special[i]||{}).delegateType&&e.stopPropagation();else if(r=s.call(arguments),b.set(this,i,r),t=o(this,i),this[i](),r!==(n=b.get(this,i))||t?b.set(this,i,!1):n={},r!==n)return e.stopImmediatePropagation(),e.preventDefault(),n&&n.value}else r.length&&(b.set(this,i,{value:C.event.trigger(C.extend(r[0],C.Event.prototype),r.slice(1),this)}),e.stopImmediatePropagation())}})):void 0===b.get(e,i)&&C.event.add(e,i,n)}C.event={global:{},add:function(t,e,n,r,i){var o,a,s,u,l,c,f,p,d,h=b.get(t);if(m(t)){n.handler&&(n=(o=n).handler,i=o.selector),i&&C.find.matchesSelector(S,i),n.guid||(n.guid=C.guid++),(s=h.events)||(s=h.events=Object.create(null)),(a=h.handle)||(a=h.handle=function(e){return"undefined"!=typeof C&&C.event.triggered!==e.type?C.event.dispatch.apply(t,arguments):void 0}),u=(e=(e||"").match(E)||[""]).length;while(u--)f=d=(p=Ae.exec(e[u])||[])[1],p=(p[2]||"").split(".").sort(),f&&(l=C.event.special[f]||{},f=(i?l.delegateType:l.bindType)||f,l=C.event.special[f]||{},d=C.extend({type:f,origType:d,data:r,handler:n,guid:n.guid,selector:i,needsContext:i&&C.expr.match.needsContext.test(i),namespace:p.join(".")},o),(c=s[f])||((c=s[f]=[]).delegateCount=0,l.setup&&!1!==l.setup.call(t,r,p,a)||t.addEventListener&&t.addEventListener(f,a)),l.add&&(l.add.call(t,d),d.handler.guid||(d.handler.guid=n.guid)),i?c.splice(c.delegateCount++,0,d):c.push(d),C.event.global[f]=!0)}},remove:function(e,t,n,r,i){var o,a,s,u,l,c,f,p,d,h,g,y=b.hasData(e)&&b.get(e);if(y&&(u=y.events)){l=(t=(t||"").match(E)||[""]).length;while(l--)if(d=g=(s=Ae.exec(t[l])||[])[1],h=(s[2]||"").split(".").sort(),d){f=C.event.special[d]||{},p=u[d=(r?f.delegateType:f.bindType)||d]||[],s=s[2]&&new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"),a=o=p.length;while(o--)c=p[o],!i&&g!==c.origType||n&&n.guid!==c.guid||s&&!s.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(p.splice(o,1),c.selector&&p.delegateCount--,f.remove&&f.remove.call(e,c));a&&!p.length&&(f.teardown&&!1!==f.teardown.call(e,h,y.handle)||C.removeEvent(e,d,y.handle),delete u[d])}else for(d in u)C.event.remove(e,d+t[l],n,r,!0);C.isEmptyObject(u)&&b.remove(e,"handle events")}},dispatch:function(e){var t,n,r,i,o,a=new Array(arguments.length),s=C.event.fix(e),e=(b.get(this,"events")||Object.create(null))[s.type]||[],u=C.event.special[s.type]||{};for(a[0]=s,t=1;t<arguments.length;t++)a[t]=arguments[t];if(s.delegateTarget=this,!u.preDispatch||!1!==u.preDispatch.call(this,s)){o=C.event.handlers.call(this,s,e),t=0;while((r=o[t++])&&!s.isPropagationStopped()){s.currentTarget=r.elem,n=0;while((i=r.handlers[n++])&&!s.isImmediatePropagationStopped())s.rnamespace&&!1!==i.namespace&&!s.rnamespace.test(i.namespace)||(s.handleObj=i,s.data=i.data,void 0!==(i=((C.event.special[i.origType]||{}).handle||i.handler).apply(r.elem,a))&&!1===(s.result=i)&&(s.preventDefault(),s.stopPropagation()))}return u.postDispatch&&u.postDispatch.call(this,s),s.result}},handlers:function(e,t){var n,r,i,o,a,s=[],u=t.delegateCount,l=e.target;if(u&&l.nodeType&&!("click"===e.type&&1<=e.button))for(;l!==this;l=l.parentNode||this)if(1===l.nodeType&&("click"!==e.type||!0!==l.disabled)){for(o=[],a={},n=0;n<u;n++)void 0===a[i=(r=t[n]).selector+" "]&&(a[i]=r.needsContext?-1<C(i,this).index(l):C.find(i,this,null,[l]).length),a[i]&&o.push(r);o.length&&s.push({elem:l,handlers:o})}return l=this,u<t.length&&s.push({elem:l,handlers:t.slice(u)}),s},addProp:function(t,e){Object.defineProperty(C.Event.prototype,t,{enumerable:!0,configurable:!0,get:v(e)?function(){if(this.originalEvent)return e(this.originalEvent)}:function(){if(this.originalEvent)return this.originalEvent[t]},set:function(e){Object.defineProperty(this,t,{enumerable:!0,configurable:!0,writable:!0,value:e})}})},fix:function(e){return e[C.expando]?e:new C.Event(e)},special:{load:{noBubble:!0},click:{setup:function(e){e=this||e;return we.test(e.type)&&e.click&&u(e,"input")&&De(e,"click",n),!1},trigger:function(e){e=this||e;return we.test(e.type)&&e.click&&u(e,"input")&&De(e,"click"),!0},_default:function(e){e=e.target;return we.test(e.type)&&e.click&&u(e,"input")&&b.get(e,"click")||u(e,"a")}},beforeunload:{postDispatch:function(e){void 0!==e.result&&e.originalEvent&&(e.originalEvent.returnValue=e.result)}}}},C.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n)},C.Event=function(e,t){if(!(this instanceof C.Event))return new C.Event(e,t);e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||void 0===e.defaultPrevented&&!1===e.returnValue?n:d,this.target=e.target&&3===e.target.nodeType?e.target.parentNode:e.target,this.currentTarget=e.currentTarget,this.relatedTarget=e.relatedTarget):this.type=e,t&&C.extend(this,t),this.timeStamp=e&&e.timeStamp||Date.now(),this[C.expando]=!0},C.Event.prototype={constructor:C.Event,isDefaultPrevented:d,isPropagationStopped:d,isImmediatePropagationStopped:d,isSimulated:!1,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=n,e&&!this.isSimulated&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=n,e&&!this.isSimulated&&e.stopPropagation()},stopImmediatePropagation:function(){var e=this.originalEvent;this.isImmediatePropagationStopped=n,e&&!this.isSimulated&&e.stopImmediatePropagation(),this.stopPropagation()}},C.each({altKey:!0,bubbles:!0,cancelable:!0,changedTouches:!0,ctrlKey:!0,detail:!0,eventPhase:!0,metaKey:!0,pageX:!0,pageY:!0,shiftKey:!0,view:!0,char:!0,code:!0,charCode:!0,key:!0,keyCode:!0,button:!0,buttons:!0,clientX:!0,clientY:!0,offsetX:!0,offsetY:!0,pointerId:!0,pointerType:!0,screenX:!0,screenY:!0,targetTouches:!0,toElement:!0,touches:!0,which:!0},C.event.addProp),C.each({focus:"focusin",blur:"focusout"},function(t,e){C.event.special[t]={setup:function(){return De(this,t,Ne),!1},trigger:function(){return De(this,t),!0},_default:function(e){return b.get(e.target,t)},delegateType:e}}),C.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(e,i){C.event.special[e]={delegateType:i,bindType:i,handle:function(e){var t,n=e.relatedTarget,r=e.handleObj;return n&&(n===this||C.contains(this,n))||(e.type=r.origType,t=r.handler.apply(this,arguments),e.type=i),t}}}),C.fn.extend({on:function(e,t,n,r){return je(this,e,t,n,r)},one:function(e,t,n,r){return je(this,e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)r=e.handleObj,C(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler);else{if("object"!=typeof e)return!1!==t&&"function"!=typeof t||(n=t,t=void 0),!1===n&&(n=d),this.each(function(){C.event.remove(this,e,n,t)});for(i in e)this.off(i,t,e[i])}return this}});var qe=/<script|<style|<link/i,Le=/checked\s*(?:[^=]|=\s*.checked.)/i,He=/^\s*<!\[CDATA\[|\]\]>\s*$/g;function Oe(e,t){return u(e,"table")&&u(11!==t.nodeType?t:t.firstChild,"tr")&&C(e).children("tbody")[0]||e}function Pe(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function Re(e){return"true/"===(e.type||"").slice(0,5)?e.type=e.type.slice(5):e.removeAttribute("type"),e}function Me(e,t){var n,r,i,o;if(1===t.nodeType){if(b.hasData(e)&&(o=b.get(e).events))for(i in b.remove(t,"handle events"),o)for(n=0,r=o[i].length;n<r;n++)C.event.add(t,i,o[i][n]);l.hasData(e)&&(e=l.access(e),e=C.extend({},e),l.set(t,e))}}function D(n,r,i,o){r=I(r);var e,t,a,s,u,l,c=0,f=n.length,p=f-1,d=r[0],h=v(d);if(h||1<f&&"string"==typeof d&&!y.checkClone&&Le.test(d))return n.each(function(e){var t=n.eq(e);h&&(r[0]=d.call(this,e,t.html())),D(t,r,i,o)});if(f&&(t=(e=ke(r,n[0].ownerDocument,!1,n,o)).firstChild,1===e.childNodes.length&&(e=t),t||o)){for(s=(a=C.map(j(e,"script"),Pe)).length;c<f;c++)u=e,c!==p&&(u=C.clone(u,!0,!0),s&&C.merge(a,j(u,"script"))),i.call(n[c],u,c);if(s)for(l=a[a.length-1].ownerDocument,C.map(a,Re),c=0;c<s;c++)u=a[c],Ce.test(u.type||"")&&!b.access(u,"globalEval")&&C.contains(l,u)&&(u.src&&"module"!==(u.type||"").toLowerCase()?C._evalUrl&&!u.noModule&&C._evalUrl(u.src,{nonce:u.nonce||u.getAttribute("nonce")},l):V(u.textContent.replace(He,""),u,l))}return n}function Ie(e,t,n){for(var r,i=t?C.filter(t,e):e,o=0;null!=(r=i[o]);o++)n||1!==r.nodeType||C.cleanData(j(r)),r.parentNode&&(n&&k(r)&&Ee(j(r,"script")),r.parentNode.removeChild(r));return e}C.extend({htmlPrefilter:function(e){return e},clone:function(e,t,n){var r,i,o,a,s,u,l,c=e.cloneNode(!0),f=k(e);if(!(y.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||C.isXMLDoc(e)))for(a=j(c),r=0,i=(o=j(e)).length;r<i;r++)s=o[r],u=a[r],l=void 0,"input"===(l=u.nodeName.toLowerCase())&&we.test(s.type)?u.checked=s.checked:"input"!==l&&"textarea"!==l||(u.defaultValue=s.defaultValue);if(t)if(n)for(o=o||j(e),a=a||j(c),r=0,i=o.length;r<i;r++)Me(o[r],a[r]);else Me(e,c);return 0<(a=j(c,"script")).length&&Ee(a,!f&&j(e,"script")),c},cleanData:function(e){for(var t,n,r,i=C.event.special,o=0;void 0!==(n=e[o]);o++)if(m(n)){if(t=n[b.expando]){if(t.events)for(r in t.events)i[r]?C.event.remove(n,r):C.removeEvent(n,r,t.handle);n[b.expando]=void 0}n[l.expando]&&(n[l.expando]=void 0)}}}),C.fn.extend({detach:function(e){return Ie(this,e,!0)},remove:function(e){return Ie(this,e)},text:function(e){return f(this,function(e){return void 0===e?C.text(this):this.empty().each(function(){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(this.textContent=e)})},null,e,arguments.length)},append:function(){return D(this,arguments,function(e){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||Oe(this,e).appendChild(e)})},prepend:function(){return D(this,arguments,function(e){var t;1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(t=Oe(this,e)).insertBefore(e,t.firstChild)})},before:function(){return D(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return D(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},empty:function(){for(var e,t=0;null!=(e=this[t]);t++)1===e.nodeType&&(C.cleanData(j(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null!=e&&e,t=null==t?e:t,this.map(function(){return C.clone(this,e,t)})},html:function(e){return f(this,function(e){var t=this[0]||{},n=0,r=this.length;if(void 0===e&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!qe.test(e)&&!N[(Te.exec(e)||["",""])[1].toLowerCase()]){e=C.htmlPrefilter(e);try{for(;n<r;n++)1===(t=this[n]||{}).nodeType&&(C.cleanData(j(t,!1)),t.innerHTML=e);t=0}catch(e){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var n=[];return D(this,arguments,function(e){var t=this.parentNode;C.inArray(this,n)<0&&(C.cleanData(j(this)),t&&t.replaceChild(e,this))},n)}}),C.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,a){C.fn[e]=function(e){for(var t,n=[],r=C(e),i=r.length-1,o=0;o<=i;o++)t=o===i?this:this.clone(!0),C(r[o])[a](t),W.apply(n,t.get());return this.pushStack(n)}});function We(e){var t=e.ownerDocument.defaultView;return(t=t&&t.opener?t:w).getComputedStyle(e)}function Fe(e,t,n){var r,i={};for(r in t)i[r]=e.style[r],e.style[r]=t[r];for(r in n=n.call(e),t)e.style[r]=i[r];return n}var $e,Be,_e,ze,Ue,Xe,Ve,i,Ge=new RegExp("^("+e+")(?!px)[a-z%]+$","i"),Ye=/^--/,Qe=new RegExp(p.join("|"),"i"),o="[\\x20\\t\\r\\n\\f]",Je=new RegExp("^"+o+"+|((?:^|[^\\\\])(?:\\\\.)*)"+o+"+$","g");function Ke(){var e;i&&(Ve.style.cssText="position:absolute;left:-11111px;width:60px;margin-top:1px;padding:0;border:0",i.style.cssText="position:relative;display:block;box-sizing:border-box;overflow:scroll;margin:auto;border:1px;padding:1px;width:60%;top:1%",S.appendChild(Ve).appendChild(i),e=w.getComputedStyle(i),$e="1%"!==e.top,Xe=12===Ze(e.marginLeft),i.style.right="60%",ze=36===Ze(e.right),Be=36===Ze(e.width),i.style.position="absolute",_e=12===Ze(i.offsetWidth/3),S.removeChild(Ve),i=null)}function Ze(e){return Math.round(parseFloat(e))}function et(e,t,n){var r,i=Ye.test(t),o=e.style;return(n=n||We(e))&&(r=n.getPropertyValue(t)||n[t],""!==(r=i?r.replace(Je,"$1"):r)||k(e)||(r=C.style(e,t)),!y.pixelBoxStyles()&&Ge.test(r)&&Qe.test(t)&&(i=o.width,e=o.minWidth,t=o.maxWidth,o.minWidth=o.maxWidth=o.width=r,r=n.width,o.width=i,o.minWidth=e,o.maxWidth=t)),void 0!==r?r+"":r}function tt(e,t){return{get:function(){if(!e())return(this.get=t).apply(this,arguments);delete this.get}}}Ve=T.createElement("div"),(i=T.createElement("div")).style&&(i.style.backgroundClip="content-box",i.cloneNode(!0).style.backgroundClip="",y.clearCloneStyle="content-box"===i.style.backgroundClip,C.extend(y,{boxSizingReliable:function(){return Ke(),Be},pixelBoxStyles:function(){return Ke(),ze},pixelPosition:function(){return Ke(),$e},reliableMarginLeft:function(){return Ke(),Xe},scrollboxSize:function(){return Ke(),_e},reliableTrDimensions:function(){var e,t,n;return null==Ue&&(e=T.createElement("table"),t=T.createElement("tr"),n=T.createElement("div"),e.style.cssText="position:absolute;left:-11111px;border-collapse:separate",t.style.cssText="border:1px solid",t.style.height="1px",n.style.height="9px",n.style.display="block",S.appendChild(e).appendChild(t).appendChild(n),n=w.getComputedStyle(t),Ue=parseInt(n.height,10)+parseInt(n.borderTopWidth,10)+parseInt(n.borderBottomWidth,10)===t.offsetHeight,S.removeChild(e)),Ue}}));var nt=["Webkit","Moz","ms"],rt=T.createElement("div").style,it={};function ot(e){var t=C.cssProps[e]||it[e];return t||(e in rt?e:it[e]=function(e){var t=e[0].toUpperCase()+e.slice(1),n=nt.length;while(n--)if((e=nt[n]+t)in rt)return e}(e)||e)}var at=/^(none|table(?!-c[ea]).+)/,st={position:"absolute",visibility:"hidden",display:"block"},ut={letterSpacing:"0",fontWeight:"400"};function lt(e,t,n){var r=me.exec(t);return r?Math.max(0,r[2]-(n||0))+(r[3]||"px"):t}function ct(e,t,n,r,i,o){var a="width"===t?1:0,s=0,u=0;if(n===(r?"border":"content"))return 0;for(;a<4;a+=2)"margin"===n&&(u+=C.css(e,n+p[a],!0,i)),r?("content"===n&&(u-=C.css(e,"padding"+p[a],!0,i)),"margin"!==n&&(u-=C.css(e,"border"+p[a]+"Width",!0,i))):(u+=C.css(e,"padding"+p[a],!0,i),"padding"!==n?u+=C.css(e,"border"+p[a]+"Width",!0,i):s+=C.css(e,"border"+p[a]+"Width",!0,i));return!r&&0<=o&&(u+=Math.max(0,Math.ceil(e["offset"+t[0].toUpperCase()+t.slice(1)]-o-u-s-.5))||0),u}function ft(e,t,n){var r=We(e),i=(!y.boxSizingReliable()||n)&&"border-box"===C.css(e,"boxSizing",!1,r),o=i,a=et(e,t,r),s="offset"+t[0].toUpperCase()+t.slice(1);if(Ge.test(a)){if(!n)return a;a="auto"}return(!y.boxSizingReliable()&&i||!y.reliableTrDimensions()&&u(e,"tr")||"auto"===a||!parseFloat(a)&&"inline"===C.css(e,"display",!1,r))&&e.getClientRects().length&&(i="border-box"===C.css(e,"boxSizing",!1,r),(o=s in e)&&(a=e[s])),(a=parseFloat(a)||0)+ct(e,t,n||(i?"border":"content"),o,r,a)+"px"}function a(e,t,n,r,i){return new a.prototype.init(e,t,n,r,i)}C.extend({cssHooks:{opacity:{get:function(e,t){if(t)return""===(t=et(e,"opacity"))?"1":t}}},cssNumber:{animationIterationCount:!0,columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,gridArea:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnStart:!0,gridRow:!0,gridRowEnd:!0,gridRowStart:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,a,s=x(t),u=Ye.test(t),l=e.style;if(u||(t=ot(s)),a=C.cssHooks[t]||C.cssHooks[s],void 0===n)return a&&"get"in a&&void 0!==(i=a.get(e,!1,r))?i:l[t];"string"===(o=typeof n)&&(i=me.exec(n))&&i[1]&&(n=xe(e,t,i),o="number"),null!=n&&n==n&&("number"!==o||u||(n+=i&&i[3]||(C.cssNumber[s]?"":"px")),y.clearCloneStyle||""!==n||0!==t.indexOf("background")||(l[t]="inherit"),a&&"set"in a&&void 0===(n=a.set(e,n,r))||(u?l.setProperty(t,n):l[t]=n))}},css:function(e,t,n,r){var i,o=x(t);return Ye.test(t)||(t=ot(o)),"normal"===(i=void 0===(i=(o=C.cssHooks[t]||C.cssHooks[o])&&"get"in o?o.get(e,!0,n):i)?et(e,t,r):i)&&t in ut&&(i=ut[t]),(""===n||n)&&(o=parseFloat(i),!0===n||isFinite(o))?o||0:i}}),C.each(["height","width"],function(e,a){C.cssHooks[a]={get:function(e,t,n){if(t)return!at.test(C.css(e,"display"))||e.getClientRects().length&&e.getBoundingClientRect().width?ft(e,a,n):Fe(e,st,function(){return ft(e,a,n)})},set:function(e,t,n){var r=We(e),i=!y.scrollboxSize()&&"absolute"===r.position,o=(i||n)&&"border-box"===C.css(e,"boxSizing",!1,r),n=n?ct(e,a,n,o,r):0;return o&&i&&(n-=Math.ceil(e["offset"+a[0].toUpperCase()+a.slice(1)]-parseFloat(r[a])-ct(e,a,"border",!1,r)-.5)),n&&(o=me.exec(t))&&"px"!==(o[3]||"px")&&(e.style[a]=t,t=C.css(e,a)),lt(0,t,n)}}}),C.cssHooks.marginLeft=tt(y.reliableMarginLeft,function(e,t){if(t)return(parseFloat(et(e,"marginLeft"))||e.getBoundingClientRect().left-Fe(e,{marginLeft:0},function(){return e.getBoundingClientRect().left}))+"px"}),C.each({margin:"",padding:"",border:"Width"},function(i,o){C.cssHooks[i+o]={expand:function(e){for(var t=0,n={},r="string"==typeof e?e.split(" "):[e];t<4;t++)n[i+p[t]+o]=r[t]||r[t-2]||r[0];return n}},"margin"!==i&&(C.cssHooks[i+o].set=lt)}),C.fn.extend({css:function(e,t){return f(this,function(e,t,n){var r,i,o={},a=0;if(Array.isArray(t)){for(r=We(e),i=t.length;a<i;a++)o[t[a]]=C.css(e,t[a],!1,r);return o}return void 0!==n?C.style(e,t,n):C.css(e,t)},e,t,1<arguments.length)}}),((C.Tween=a).prototype={constructor:a,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||C.easing._default,this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(C.cssNumber[n]?"":"px")},cur:function(){var e=a.propHooks[this.prop];return(e&&e.get?e:a.propHooks._default).get(this)},run:function(e){var t,n=a.propHooks[this.prop];return this.options.duration?this.pos=t=C.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):this.pos=t=e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),(n&&n.set?n:a.propHooks._default).set(this),this}}).init.prototype=a.prototype,(a.propHooks={_default:{get:function(e){return 1!==e.elem.nodeType||null!=e.elem[e.prop]&&null==e.elem.style[e.prop]?e.elem[e.prop]:(e=C.css(e.elem,e.prop,""))&&"auto"!==e?e:0},set:function(e){C.fx.step[e.prop]?C.fx.step[e.prop](e):1!==e.elem.nodeType||!C.cssHooks[e.prop]&&null==e.elem.style[ot(e.prop)]?e.elem[e.prop]=e.now:C.style(e.elem,e.prop,e.now+e.unit)}}}).scrollTop=a.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},C.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2},_default:"swing"},C.fx=a.prototype.init,C.fx.step={};var q,pt,L,dt=/^(?:toggle|show|hide)$/,ht=/queueHooks$/;function gt(){pt&&(!1===T.hidden&&w.requestAnimationFrame?w.requestAnimationFrame(gt):w.setTimeout(gt,C.fx.interval),C.fx.tick())}function yt(){return w.setTimeout(function(){q=void 0}),q=Date.now()}function mt(e,t){var n,r=0,i={height:e};for(t=t?1:0;r<4;r+=2-t)i["margin"+(n=p[r])]=i["padding"+n]=e;return t&&(i.opacity=i.width=e),i}function vt(e,t,n){for(var r,i=(H.tweeners[t]||[]).concat(H.tweeners["*"]),o=0,a=i.length;o<a;o++)if(r=i[o].call(n,t,e))return r}function H(i,e,t){var n,o,r,a,s,u,l,c=0,f=H.prefilters.length,p=C.Deferred().always(function(){delete d.elem}),d=function(){if(!o){for(var e=q||yt(),e=Math.max(0,h.startTime+h.duration-e),t=1-(e/h.duration||0),n=0,r=h.tweens.length;n<r;n++)h.tweens[n].run(t);if(p.notifyWith(i,[h,t,e]),t<1&&r)return e;r||p.notifyWith(i,[h,1,0]),p.resolveWith(i,[h])}return!1},h=p.promise({elem:i,props:C.extend({},e),opts:C.extend(!0,{specialEasing:{},easing:C.easing._default},t),originalProperties:e,originalOptions:t,startTime:q||yt(),duration:t.duration,tweens:[],createTween:function(e,t){t=C.Tween(i,h.opts,e,t,h.opts.specialEasing[e]||h.opts.easing);return h.tweens.push(t),t},stop:function(e){var t=0,n=e?h.tweens.length:0;if(!o){for(o=!0;t<n;t++)h.tweens[t].run(1);e?(p.notifyWith(i,[h,1,0]),p.resolveWith(i,[h,e])):p.rejectWith(i,[h,e])}return this}}),g=h.props,y=g,m=h.opts.specialEasing;for(r in y)if(s=m[a=x(r)],u=y[r],Array.isArray(u)&&(s=u[1],u=y[r]=u[0]),r!==a&&(y[a]=u,delete y[r]),(l=C.cssHooks[a])&&"expand"in l)for(r in u=l.expand(u),delete y[a],u)r in y||(y[r]=u[r],m[r]=s);else m[a]=s;for(;c<f;c++)if(n=H.prefilters[c].call(h,i,g,h.opts))return v(n.stop)&&(C._queueHooks(h.elem,h.opts.queue).stop=n.stop.bind(n)),n;return C.map(g,vt,h),v(h.opts.start)&&h.opts.start.call(i,h),h.progress(h.opts.progress).done(h.opts.done,h.opts.complete).fail(h.opts.fail).always(h.opts.always),C.fx.timer(C.extend(d,{elem:i,anim:h,queue:h.opts.queue})),h}C.Animation=C.extend(H,{tweeners:{"*":[function(e,t){var n=this.createTween(e,t);return xe(n.elem,e,me.exec(t),n),n}]},tweener:function(e,t){for(var n,r=0,i=(e=v(e)?(t=e,["*"]):e.match(E)).length;r<i;r++)n=e[r],H.tweeners[n]=H.tweeners[n]||[],H.tweeners[n].unshift(t)},prefilters:[function(e,t,n){var r,i,o,a,s,u,l,c="width"in t||"height"in t,f=this,p={},d=e.style,h=e.nodeType&&ye(e),g=b.get(e,"fxshow");for(r in n.queue||(null==(a=C._queueHooks(e,"fx")).unqueued&&(a.unqueued=0,s=a.empty.fire,a.empty.fire=function(){a.unqueued||s()}),a.unqueued++,f.always(function(){f.always(function(){a.unqueued--,C.queue(e,"fx").length||a.empty.fire()})})),t)if(i=t[r],dt.test(i)){if(delete t[r],o=o||"toggle"===i,i===(h?"hide":"show")){if("show"!==i||!g||void 0===g[r])continue;h=!0}p[r]=g&&g[r]||C.style(e,r)}if((u=!C.isEmptyObject(t))||!C.isEmptyObject(p))for(r in c&&1===e.nodeType&&(n.overflow=[d.overflow,d.overflowX,d.overflowY],null==(l=g&&g.display)&&(l=b.get(e,"display")),"none"===(c=C.css(e,"display"))&&(l?c=l:(A([e],!0),l=e.style.display||l,c=C.css(e,"display"),A([e]))),("inline"===c||"inline-block"===c&&null!=l)&&"none"===C.css(e,"float")&&(u||(f.done(function(){d.display=l}),null==l&&(c=d.display,l="none"===c?"":c)),d.display="inline-block")),n.overflow&&(d.overflow="hidden",f.always(function(){d.overflow=n.overflow[0],d.overflowX=n.overflow[1],d.overflowY=n.overflow[2]})),u=!1,p)u||(g?"hidden"in g&&(h=g.hidden):g=b.access(e,"fxshow",{display:l}),o&&(g.hidden=!h),h&&A([e],!0),f.done(function(){for(r in h||A([e]),b.remove(e,"fxshow"),p)C.style(e,r,p[r])})),u=vt(h?g[r]:0,r,f),r in g||(g[r]=u.start,h&&(u.end=u.start,u.start=0))}],prefilter:function(e,t){t?H.prefilters.unshift(e):H.prefilters.push(e)}}),C.speed=function(e,t,n){var r=e&&"object"==typeof e?C.extend({},e):{complete:n||!n&&t||v(e)&&e,duration:e,easing:n&&t||t&&!v(t)&&t};return C.fx.off?r.duration=0:"number"!=typeof r.duration&&(r.duration in C.fx.speeds?r.duration=C.fx.speeds[r.duration]:r.duration=C.fx.speeds._default),null!=r.queue&&!0!==r.queue||(r.queue="fx"),r.old=r.complete,r.complete=function(){v(r.old)&&r.old.call(this),r.queue&&C.dequeue(this,r.queue)},r},C.fn.extend({fadeTo:function(e,t,n,r){return this.filter(ye).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(t,e,n,r){function i(){var e=H(this,C.extend({},t),a);(o||b.get(this,"finish"))&&e.stop(!0)}var o=C.isEmptyObject(t),a=C.speed(e,n,r);return i.finish=i,o||!1===a.queue?this.each(i):this.queue(a.queue,i)},stop:function(i,e,o){function a(e){var t=e.stop;delete e.stop,t(o)}return"string"!=typeof i&&(o=e,e=i,i=void 0),e&&this.queue(i||"fx",[]),this.each(function(){var e=!0,t=null!=i&&i+"queueHooks",n=C.timers,r=b.get(this);if(t)r[t]&&r[t].stop&&a(r[t]);else for(t in r)r[t]&&r[t].stop&&ht.test(t)&&a(r[t]);for(t=n.length;t--;)n[t].elem!==this||null!=i&&n[t].queue!==i||(n[t].anim.stop(o),e=!1,n.splice(t,1));!e&&o||C.dequeue(this,i)})},finish:function(a){return!1!==a&&(a=a||"fx"),this.each(function(){var e,t=b.get(this),n=t[a+"queue"],r=t[a+"queueHooks"],i=C.timers,o=n?n.length:0;for(t.finish=!0,C.queue(this,a,[]),r&&r.stop&&r.stop.call(this,!0),e=i.length;e--;)i[e].elem===this&&i[e].queue===a&&(i[e].anim.stop(!0),i.splice(e,1));for(e=0;e<o;e++)n[e]&&n[e].finish&&n[e].finish.call(this);delete t.finish})}}),C.each(["toggle","show","hide"],function(e,r){var i=C.fn[r];C.fn[r]=function(e,t,n){return null==e||"boolean"==typeof e?i.apply(this,arguments):this.animate(mt(r,!0),e,t,n)}}),C.each({slideDown:mt("show"),slideUp:mt("hide"),slideToggle:mt("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,r){C.fn[e]=function(e,t,n){return this.animate(r,e,t,n)}}),C.timers=[],C.fx.tick=function(){var e,t=0,n=C.timers;for(q=Date.now();t<n.length;t++)(e=n[t])()||n[t]!==e||n.splice(t--,1);n.length||C.fx.stop(),q=void 0},C.fx.timer=function(e){C.timers.push(e),C.fx.start()},C.fx.interval=13,C.fx.start=function(){pt||(pt=!0,gt())},C.fx.stop=function(){pt=null},C.fx.speeds={slow:600,fast:200,_default:400},C.fn.delay=function(r,e){return r=C.fx&&C.fx.speeds[r]||r,this.queue(e=e||"fx",function(e,t){var n=w.setTimeout(e,r);t.stop=function(){w.clearTimeout(n)}})},L=T.createElement("input"),e=T.createElement("select").appendChild(T.createElement("option")),L.type="checkbox",y.checkOn=""!==L.value,y.optSelected=e.selected,(L=T.createElement("input")).value="t",L.type="radio",y.radioValue="t"===L.value;var xt,bt=C.expr.attrHandle,wt=(C.fn.extend({attr:function(e,t){return f(this,C.attr,e,t,1<arguments.length)},removeAttr:function(e){return this.each(function(){C.removeAttr(this,e)})}}),C.extend({attr:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return"undefined"==typeof e.getAttribute?C.prop(e,t,n):(1===o&&C.isXMLDoc(e)||(i=C.attrHooks[t.toLowerCase()]||(C.expr.match.bool.test(t)?xt:void 0)),void 0!==n?null===n?void C.removeAttr(e,t):i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:(e.setAttribute(t,n+""),n):!(i&&"get"in i&&null!==(r=i.get(e,t)))&&null==(r=C.find.attr(e,t))?void 0:r)},attrHooks:{type:{set:function(e,t){var n;if(!y.radioValue&&"radio"===t&&u(e,"input"))return n=e.value,e.setAttribute("type",t),n&&(e.value=n),t}}},removeAttr:function(e,t){var n,r=0,i=t&&t.match(E);if(i&&1===e.nodeType)while(n=i[r++])e.removeAttribute(n)}}),xt={set:function(e,t,n){return!1===t?C.removeAttr(e,n):e.setAttribute(n,n),n}},C.each(C.expr.match.bool.source.match(/\w+/g),function(e,t){var a=bt[t]||C.find.attr;bt[t]=function(e,t,n){var r,i,o=t.toLowerCase();return n||(i=bt[o],bt[o]=r,r=null!=a(e,t,n)?o:null,bt[o]=i),r}}),/^(?:input|select|textarea|button)$/i),Tt=/^(?:a|area)$/i;function O(e){return(e.match(E)||[]).join(" ")}function P(e){return e.getAttribute&&e.getAttribute("class")||""}function Ct(e){return Array.isArray(e)?e:"string"==typeof e&&e.match(E)||[]}C.fn.extend({prop:function(e,t){return f(this,C.prop,e,t,1<arguments.length)},removeProp:function(e){return this.each(function(){delete this[C.propFix[e]||e]})}}),C.extend({prop:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return 1===o&&C.isXMLDoc(e)||(t=C.propFix[t]||t,i=C.propHooks[t]),void 0!==n?i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){var t=C.find.attr(e,"tabindex");return t?parseInt(t,10):wt.test(e.nodeName)||Tt.test(e.nodeName)&&e.href?0:-1}}},propFix:{for:"htmlFor",class:"className"}}),y.optSelected||(C.propHooks.selected={get:function(e){e=e.parentNode;return e&&e.parentNode&&e.parentNode.selectedIndex,null},set:function(e){e=e.parentNode;e&&(e.selectedIndex,e.parentNode&&e.parentNode.selectedIndex)}}),C.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){C.propFix[this.toLowerCase()]=this}),C.fn.extend({addClass:function(t){var e,n,r,i,o,a;return v(t)?this.each(function(e){C(this).addClass(t.call(this,e,P(this)))}):(e=Ct(t)).length?this.each(function(){if(r=P(this),n=1===this.nodeType&&" "+O(r)+" "){for(o=0;o<e.length;o++)i=e[o],n.indexOf(" "+i+" ")<0&&(n+=i+" ");a=O(n),r!==a&&this.setAttribute("class",a)}}):this},removeClass:function(t){var e,n,r,i,o,a;return v(t)?this.each(function(e){C(this).removeClass(t.call(this,e,P(this)))}):arguments.length?(e=Ct(t)).length?this.each(function(){if(r=P(this),n=1===this.nodeType&&" "+O(r)+" "){for(o=0;o<e.length;o++){i=e[o];while(-1<n.indexOf(" "+i+" "))n=n.replace(" "+i+" "," ")}a=O(n),r!==a&&this.setAttribute("class",a)}}):this:this.attr("class","")},toggleClass:function(t,n){var e,r,i,o,a=typeof t,s="string"==a||Array.isArray(t);return v(t)?this.each(function(e){C(this).toggleClass(t.call(this,e,P(this),n),n)}):"boolean"==typeof n&&s?n?this.addClass(t):this.removeClass(t):(e=Ct(t),this.each(function(){if(s)for(o=C(this),i=0;i<e.length;i++)r=e[i],o.hasClass(r)?o.removeClass(r):o.addClass(r);else void 0!==t&&"boolean"!=a||((r=P(this))&&b.set(this,"__className__",r),this.setAttribute&&this.setAttribute("class",!r&&!1!==t&&b.get(this,"__className__")||""))}))},hasClass:function(e){var t,n=0,r=" "+e+" ";while(t=this[n++])if(1===t.nodeType&&-1<(" "+O(P(t))+" ").indexOf(r))return!0;return!1}});function Et(e){e.stopPropagation()}var St=/\r/g,kt=(C.fn.extend({val:function(t){var n,e,r,i=this[0];return arguments.length?(r=v(t),this.each(function(e){1===this.nodeType&&(null==(e=r?t.call(this,e,C(this).val()):t)?e="":"number"==typeof e?e+="":Array.isArray(e)&&(e=C.map(e,function(e){return null==e?"":e+""})),(n=C.valHooks[this.type]||C.valHooks[this.nodeName.toLowerCase()])&&"set"in n&&void 0!==n.set(this,e,"value")||(this.value=e))})):i?(n=C.valHooks[i.type]||C.valHooks[i.nodeName.toLowerCase()])&&"get"in n&&void 0!==(e=n.get(i,"value"))?e:"string"==typeof(e=i.value)?e.replace(St,""):null==e?"":e:void 0}}),C.extend({valHooks:{option:{get:function(e){var t=C.find.attr(e,"value");return null!=t?t:O(C.text(e))}},select:{get:function(e){for(var t,n=e.options,r=e.selectedIndex,i="select-one"===e.type,o=i?null:[],a=i?r+1:n.length,s=r<0?a:i?r:0;s<a;s++)if(((t=n[s]).selected||s===r)&&!t.disabled&&(!t.parentNode.disabled||!u(t.parentNode,"optgroup"))){if(t=C(t).val(),i)return t;o.push(t)}return o},set:function(e,t){var n,r,i=e.options,o=C.makeArray(t),a=i.length;while(a--)((r=i[a]).selected=-1<C.inArray(C.valHooks.option.get(r),o))&&(n=!0);return n||(e.selectedIndex=-1),o}}}}),C.each(["radio","checkbox"],function(){C.valHooks[this]={set:function(e,t){if(Array.isArray(t))return e.checked=-1<C.inArray(C(e).val(),t)}},y.checkOn||(C.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})}),y.focusin="onfocusin"in w,/^(?:focusinfocus|focusoutblur)$/),At=(C.extend(C.event,{trigger:function(e,t,n,r){var i,o,a,s,u,l,c,f=[n||T],p=_.call(e,"type")?e.type:e,d=_.call(e,"namespace")?e.namespace.split("."):[],h=c=o=n=n||T;if(3!==n.nodeType&&8!==n.nodeType&&!kt.test(p+C.event.triggered)&&(-1<p.indexOf(".")&&(p=(d=p.split(".")).shift(),d.sort()),s=p.indexOf(":")<0&&"on"+p,(e=e[C.expando]?e:new C.Event(p,"object"==typeof e&&e)).isTrigger=r?2:3,e.namespace=d.join("."),e.rnamespace=e.namespace?new RegExp("(^|\\.)"+d.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,e.result=void 0,e.target||(e.target=n),t=null==t?[e]:C.makeArray(t,[e]),l=C.event.special[p]||{},r||!l.trigger||!1!==l.trigger.apply(n,t))){if(!r&&!l.noBubble&&!g(n)){for(a=l.delegateType||p,kt.test(a+p)||(h=h.parentNode);h;h=h.parentNode)f.push(h),o=h;o===(n.ownerDocument||T)&&f.push(o.defaultView||o.parentWindow||w)}i=0;while((h=f[i++])&&!e.isPropagationStopped())c=h,e.type=1<i?a:l.bindType||p,(u=(b.get(h,"events")||Object.create(null))[e.type]&&b.get(h,"handle"))&&u.apply(h,t),(u=s&&h[s])&&u.apply&&m(h)&&(e.result=u.apply(h,t),!1===e.result&&e.preventDefault());return e.type=p,r||e.isDefaultPrevented()||l._default&&!1!==l._default.apply(f.pop(),t)||!m(n)||s&&v(n[p])&&!g(n)&&((o=n[s])&&(n[s]=null),C.event.triggered=p,e.isPropagationStopped()&&c.addEventListener(p,Et),n[p](),e.isPropagationStopped()&&c.removeEventListener(p,Et),C.event.triggered=void 0,o&&(n[s]=o)),e.result}},simulate:function(e,t,n){n=C.extend(new C.Event,n,{type:e,isSimulated:!0});C.event.trigger(n,null,t)}}),C.fn.extend({trigger:function(e,t){return this.each(function(){C.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];if(n)return C.event.trigger(e,t,n,!0)}}),y.focusin||C.each({focus:"focusin",blur:"focusout"},function(n,r){function i(e){C.event.simulate(r,e.target,C.event.fix(e))}C.event.special[r]={setup:function(){var e=this.ownerDocument||this.document||this,t=b.access(e,r);t||e.addEventListener(n,i,!0),b.access(e,r,(t||0)+1)},teardown:function(){var e=this.ownerDocument||this.document||this,t=b.access(e,r)-1;t?b.access(e,r,t):(e.removeEventListener(n,i,!0),b.remove(e,r))}}}),w.location),Nt={guid:Date.now()},jt=/\?/,Dt=(C.parseXML=function(e){var t,n;if(!e||"string"!=typeof e)return null;try{t=(new w.DOMParser).parseFromString(e,"text/xml")}catch(e){}return n=t&&t.getElementsByTagName("parsererror")[0],t&&!n||C.error("Invalid XML: "+(n?C.map(n.childNodes,function(e){return e.textContent}).join("\n"):e)),t},/\[\]$/),qt=/\r?\n/g,Lt=/^(?:submit|button|image|reset|file)$/i,Ht=/^(?:input|select|textarea|keygen)/i;C.param=function(e,t){function n(e,t){t=v(t)?t():t,i[i.length]=encodeURIComponent(e)+"="+encodeURIComponent(null==t?"":t)}var r,i=[];if(null==e)return"";if(Array.isArray(e)||e.jquery&&!C.isPlainObject(e))C.each(e,function(){n(this.name,this.value)});else for(r in e)!function n(r,e,i,o){if(Array.isArray(e))C.each(e,function(e,t){i||Dt.test(r)?o(r,t):n(r+"["+("object"==typeof t&&null!=t?e:"")+"]",t,i,o)});else if(i||"object"!==h(e))o(r,e);else for(var t in e)n(r+"["+t+"]",e[t],i,o)}(r,e[r],t,n);return i.join("&")},C.fn.extend({serialize:function(){return C.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=C.prop(this,"elements");return e?C.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!C(this).is(":disabled")&&Ht.test(this.nodeName)&&!Lt.test(e)&&(this.checked||!we.test(e))}).map(function(e,t){var n=C(this).val();return null==n?null:Array.isArray(n)?C.map(n,function(e){return{name:t.name,value:e.replace(qt,"\r\n")}}):{name:t.name,value:n.replace(qt,"\r\n")}}).get()}});var Ot=/%20/g,Pt=/#.*$/,Rt=/([?&])_=[^&]*/,Mt=/^(.*?):[ \t]*([^\r\n]*)$/gm,It=/^(?:GET|HEAD)$/,Wt=/^\/\//,Ft={},$t={},Bt="*/".concat("*"),_t=T.createElement("a");function zt(o){return function(e,t){"string"!=typeof e&&(t=e,e="*");var n,r=0,i=e.toLowerCase().match(E)||[];if(v(t))while(n=i[r++])"+"===n[0]?(n=n.slice(1)||"*",(o[n]=o[n]||[]).unshift(t)):(o[n]=o[n]||[]).push(t)}}function Ut(t,r,i,o){var a={},s=t===$t;function u(e){var n;return a[e]=!0,C.each(t[e]||[],function(e,t){t=t(r,i,o);return"string"!=typeof t||s||a[t]?s?!(n=t):void 0:(r.dataTypes.unshift(t),u(t),!1)}),n}return u(r.dataTypes[0])||!a["*"]&&u("*")}function Xt(e,t){var n,r,i=C.ajaxSettings.flatOptions||{};for(n in t)void 0!==t[n]&&((i[n]?e:r=r||{})[n]=t[n]);return r&&C.extend(!0,e,r),e}_t.href=At.href,C.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:At.href,type:"GET",isLocal:/^(?:about|app|app-storage|.+-extension|file|res|widget):$/.test(At.protocol),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":Bt,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/\bxml\b/,html:/\bhtml/,json:/\bjson\b/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":JSON.parse,"text xml":C.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?Xt(Xt(e,C.ajaxSettings),t):Xt(C.ajaxSettings,e)},ajaxPrefilter:zt(Ft),ajaxTransport:zt($t),ajax:function(e,t){"object"==typeof e&&(t=e,e=void 0);var u,l,c,n,f,p,d,r,h=C.ajaxSetup({},t=t||{}),g=h.context||h,y=h.context&&(g.nodeType||g.jquery)?C(g):C.event,m=C.Deferred(),v=C.Callbacks("once memory"),x=h.statusCode||{},i={},o={},a="canceled",b={readyState:0,getResponseHeader:function(e){var t;if(p){if(!n){n={};while(t=Mt.exec(c))n[t[1].toLowerCase()+" "]=(n[t[1].toLowerCase()+" "]||[]).concat(t[2])}t=n[e.toLowerCase()+" "]}return null==t?null:t.join(", ")},getAllResponseHeaders:function(){return p?c:null},setRequestHeader:function(e,t){return null==p&&(e=o[e.toLowerCase()]=o[e.toLowerCase()]||e,i[e]=t),this},overrideMimeType:function(e){return null==p&&(h.mimeType=e),this},statusCode:function(e){if(e)if(p)b.always(e[b.status]);else for(var t in e)x[t]=[x[t],e[t]];return this},abort:function(e){e=e||a;return u&&u.abort(e),s(0,e),this}};if(m.promise(b),h.url=((e||h.url||At.href)+"").replace(Wt,At.protocol+"//"),h.type=t.method||t.type||h.method||h.type,h.dataTypes=(h.dataType||"*").toLowerCase().match(E)||[""],null==h.crossDomain){e=T.createElement("a");try{e.href=h.url,e.href=e.href,h.crossDomain=_t.protocol+"//"+_t.host!=e.protocol+"//"+e.host}catch(e){h.crossDomain=!0}}if(h.data&&h.processData&&"string"!=typeof h.data&&(h.data=C.param(h.data,h.traditional)),Ut(Ft,h,t,b),!p){for(r in(d=C.event&&h.global)&&0==C.active++&&C.event.trigger("ajaxStart"),h.type=h.type.toUpperCase(),h.hasContent=!It.test(h.type),l=h.url.replace(Pt,""),h.hasContent?h.data&&h.processData&&0===(h.contentType||"").indexOf("application/x-www-form-urlencoded")&&(h.data=h.data.replace(Ot,"+")):(e=h.url.slice(l.length),h.data&&(h.processData||"string"==typeof h.data)&&(l+=(jt.test(l)?"&":"?")+h.data,delete h.data),!1===h.cache&&(l=l.replace(Rt,"$1"),e=(jt.test(l)?"&":"?")+"_="+Nt.guid+++e),h.url=l+e),h.ifModified&&(C.lastModified[l]&&b.setRequestHeader("If-Modified-Since",C.lastModified[l]),C.etag[l]&&b.setRequestHeader("If-None-Match",C.etag[l])),(h.data&&h.hasContent&&!1!==h.contentType||t.contentType)&&b.setRequestHeader("Content-Type",h.contentType),b.setRequestHeader("Accept",h.dataTypes[0]&&h.accepts[h.dataTypes[0]]?h.accepts[h.dataTypes[0]]+("*"!==h.dataTypes[0]?", "+Bt+"; q=0.01":""):h.accepts["*"]),h.headers)b.setRequestHeader(r,h.headers[r]);if(h.beforeSend&&(!1===h.beforeSend.call(g,b,h)||p))return b.abort();if(a="abort",v.add(h.complete),b.done(h.success),b.fail(h.error),u=Ut($t,h,t,b)){if(b.readyState=1,d&&y.trigger("ajaxSend",[b,h]),p)return b;h.async&&0<h.timeout&&(f=w.setTimeout(function(){b.abort("timeout")},h.timeout));try{p=!1,u.send(i,s)}catch(e){if(p)throw e;s(-1,e)}}else s(-1,"No Transport")}return b;function s(e,t,n,r){var i,o,a,s=t;p||(p=!0,f&&w.clearTimeout(f),u=void 0,c=r||"",b.readyState=0<e?4:0,r=200<=e&&e<300||304===e,n&&(a=function(e,t,n){var r,i,o,a,s=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),void 0===r&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in s)if(s[i]&&s[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}a=a||i}o=o||a}if(o)return o!==u[0]&&u.unshift(o),n[o]}(h,b,n)),!r&&-1<C.inArray("script",h.dataTypes)&&C.inArray("json",h.dataTypes)<0&&(h.converters["text script"]=function(){}),a=function(e,t,n,r){var i,o,a,s,u,l={},c=e.dataTypes.slice();if(c[1])for(a in e.converters)l[a.toLowerCase()]=e.converters[a];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(!(a=l[u+" "+o]||l["* "+o]))for(i in l)if((s=i.split(" "))[1]===o&&(a=l[u+" "+s[0]]||l["* "+s[0]])){!0===a?a=l[i]:!0!==l[i]&&(o=s[0],c.unshift(s[1]));break}if(!0!==a)if(a&&e.throws)t=a(t);else try{t=a(t)}catch(e){return{state:"parsererror",error:a?e:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}(h,a,b,r),r?(h.ifModified&&((n=b.getResponseHeader("Last-Modified"))&&(C.lastModified[l]=n),(n=b.getResponseHeader("etag"))&&(C.etag[l]=n)),204===e||"HEAD"===h.type?s="nocontent":304===e?s="notmodified":(s=a.state,i=a.data,r=!(o=a.error))):(o=s,!e&&s||(s="error",e<0&&(e=0))),b.status=e,b.statusText=(t||s)+"",r?m.resolveWith(g,[i,s,b]):m.rejectWith(g,[b,s,o]),b.statusCode(x),x=void 0,d&&y.trigger(r?"ajaxSuccess":"ajaxError",[b,h,r?i:o]),v.fireWith(g,[b,s]),d&&(y.trigger("ajaxComplete",[b,h]),--C.active||C.event.trigger("ajaxStop")))}},getJSON:function(e,t,n){return C.get(e,t,n,"json")},getScript:function(e,t){return C.get(e,void 0,t,"script")}}),C.each(["get","post"],function(e,i){C[i]=function(e,t,n,r){return v(t)&&(r=r||n,n=t,t=void 0),C.ajax(C.extend({url:e,type:i,dataType:r,data:t,success:n},C.isPlainObject(e)&&e))}}),C.ajaxPrefilter(function(e){for(var t in e.headers)"content-type"===t.toLowerCase()&&(e.contentType=e.headers[t]||"")}),C._evalUrl=function(e,t,n){return C.ajax({url:e,type:"GET",dataType:"script",cache:!0,async:!1,global:!1,converters:{"text script":function(){}},dataFilter:function(e){C.globalEval(e,t,n)}})},C.fn.extend({wrapAll:function(e){return this[0]&&(v(e)&&(e=e.call(this[0])),e=C(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&e.insertBefore(this[0]),e.map(function(){var e=this;while(e.firstElementChild)e=e.firstElementChild;return e}).append(this)),this},wrapInner:function(n){return v(n)?this.each(function(e){C(this).wrapInner(n.call(this,e))}):this.each(function(){var e=C(this),t=e.contents();t.length?t.wrapAll(n):e.append(n)})},wrap:function(t){var n=v(t);return this.each(function(e){C(this).wrapAll(n?t.call(this,e):t)})},unwrap:function(e){return this.parent(e).not("body").each(function(){C(this).replaceWith(this.childNodes)}),this}}),C.expr.pseudos.hidden=function(e){return!C.expr.pseudos.visible(e)},C.expr.pseudos.visible=function(e){return!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)},C.ajaxSettings.xhr=function(){try{return new w.XMLHttpRequest}catch(e){}};var Vt={0:200,1223:204},Gt=C.ajaxSettings.xhr(),Yt=(y.cors=!!Gt&&"withCredentials"in Gt,y.ajax=Gt=!!Gt,C.ajaxTransport(function(i){var o,a;if(y.cors||Gt&&!i.crossDomain)return{send:function(e,t){var n,r=i.xhr();if(r.open(i.type,i.url,i.async,i.username,i.password),i.xhrFields)for(n in i.xhrFields)r[n]=i.xhrFields[n];for(n in i.mimeType&&r.overrideMimeType&&r.overrideMimeType(i.mimeType),i.crossDomain||e["X-Requested-With"]||(e["X-Requested-With"]="XMLHttpRequest"),e)r.setRequestHeader(n,e[n]);o=function(e){return function(){o&&(o=a=r.onload=r.onerror=r.onabort=r.ontimeout=r.onreadystatechange=null,"abort"===e?r.abort():"error"===e?"number"!=typeof r.status?t(0,"error"):t(r.status,r.statusText):t(Vt[r.status]||r.status,r.statusText,"text"!==(r.responseType||"text")||"string"!=typeof r.responseText?{binary:r.response}:{text:r.responseText},r.getAllResponseHeaders()))}},r.onload=o(),a=r.onerror=r.ontimeout=o("error"),void 0!==r.onabort?r.onabort=a:r.onreadystatechange=function(){4===r.readyState&&w.setTimeout(function(){o&&a()})},o=o("abort");try{r.send(i.hasContent&&i.data||null)}catch(e){if(o)throw e}},abort:function(){o&&o()}}}),C.ajaxPrefilter(function(e){e.crossDomain&&(e.contents.script=!1)}),C.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/\b(?:java|ecma)script\b/},converters:{"text script":function(e){return C.globalEval(e),e}}}),C.ajaxPrefilter("script",function(e){void 0===e.cache&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),C.ajaxTransport("script",function(n){var r,i;if(n.crossDomain||n.scriptAttrs)return{send:function(e,t){r=C("<script>").attr(n.scriptAttrs||{}).prop({charset:n.scriptCharset,src:n.url}).on("load error",i=function(e){r.remove(),i=null,e&&t("error"===e.type?404:200,e.type)}),T.head.appendChild(r[0])},abort:function(){i&&i()}}}),[]),Qt=/(=)\?(?=&|$)|\?\?/,Jt=(C.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Yt.pop()||C.expando+"_"+Nt.guid++;return this[e]=!0,e}}),C.ajaxPrefilter("json jsonp",function(e,t,n){var r,i,o,a=!1!==e.jsonp&&(Qt.test(e.url)?"url":"string"==typeof e.data&&0===(e.contentType||"").indexOf("application/x-www-form-urlencoded")&&Qt.test(e.data)&&"data");if(a||"jsonp"===e.dataTypes[0])return r=e.jsonpCallback=v(e.jsonpCallback)?e.jsonpCallback():e.jsonpCallback,a?e[a]=e[a].replace(Qt,"$1"+r):!1!==e.jsonp&&(e.url+=(jt.test(e.url)?"&":"?")+e.jsonp+"="+r),e.converters["script json"]=function(){return o||C.error(r+" was not called"),o[0]},e.dataTypes[0]="json",i=w[r],w[r]=function(){o=arguments},n.always(function(){void 0===i?C(w).removeProp(r):w[r]=i,e[r]&&(e.jsonpCallback=t.jsonpCallback,Yt.push(r)),o&&v(i)&&i(o[0]),o=i=void 0}),"script"}),y.createHTMLDocument=((o=T.implementation.createHTMLDocument("").body).innerHTML="<form></form><form></form>",2===o.childNodes.length),C.parseHTML=function(e,t,n){var r;return"string"!=typeof e?[]:("boolean"==typeof t&&(n=t,t=!1),t||(y.createHTMLDocument?((r=(t=T.implementation.createHTMLDocument("")).createElement("base")).href=T.location.href,t.head.appendChild(r)):t=T),r=!n&&[],(n=J.exec(e))?[t.createElement(n[1])]:(n=ke([e],t,r),r&&r.length&&C(r).remove(),C.merge([],n.childNodes)))},C.fn.load=function(e,t,n){var r,i,o,a=this,s=e.indexOf(" ");return-1<s&&(r=O(e.slice(s)),e=e.slice(0,s)),v(t)?(n=t,t=void 0):t&&"object"==typeof t&&(i="POST"),0<a.length&&C.ajax({url:e,type:i||"GET",dataType:"html",data:t}).done(function(e){o=arguments,a.html(r?C("<div>").append(C.parseHTML(e)).find(r):e)}).always(n&&function(e,t){a.each(function(){n.apply(this,o||[e.responseText,t,e])})}),this},C.expr.pseudos.animated=function(t){return C.grep(C.timers,function(e){return t===e.elem}).length},C.offset={setOffset:function(e,t,n){var r,i,o,a,s=C.css(e,"position"),u=C(e),l={};"static"===s&&(e.style.position="relative"),o=u.offset(),r=C.css(e,"top"),a=C.css(e,"left"),s=("absolute"===s||"fixed"===s)&&-1<(r+a).indexOf("auto")?(i=(s=u.position()).top,s.left):(i=parseFloat(r)||0,parseFloat(a)||0),null!=(t=v(t)?t.call(e,n,C.extend({},o)):t).top&&(l.top=t.top-o.top+i),null!=t.left&&(l.left=t.left-o.left+s),"using"in t?t.using.call(e,l):u.css(l)}},C.fn.extend({offset:function(t){var e,n;return arguments.length?void 0===t?this:this.each(function(e){C.offset.setOffset(this,t,e)}):(n=this[0])?n.getClientRects().length?(e=n.getBoundingClientRect(),n=n.ownerDocument.defaultView,{top:e.top+n.pageYOffset,left:e.left+n.pageXOffset}):{top:0,left:0}:void 0},position:function(){if(this[0]){var e,t,n,r=this[0],i={top:0,left:0};if("fixed"===C.css(r,"position"))t=r.getBoundingClientRect();else{t=this.offset(),n=r.ownerDocument,e=r.offsetParent||n.documentElement;while(e&&(e===n.body||e===n.documentElement)&&"static"===C.css(e,"position"))e=e.parentNode;e&&e!==r&&1===e.nodeType&&((i=C(e).offset()).top+=C.css(e,"borderTopWidth",!0),i.left+=C.css(e,"borderLeftWidth",!0))}return{top:t.top-i.top-C.css(r,"marginTop",!0),left:t.left-i.left-C.css(r,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent;while(e&&"static"===C.css(e,"position"))e=e.offsetParent;return e||S})}}),C.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(t,i){var o="pageYOffset"===i;C.fn[t]=function(e){return f(this,function(e,t,n){var r;if(g(e)?r=e:9===e.nodeType&&(r=e.defaultView),void 0===n)return r?r[i]:e[t];r?r.scrollTo(o?r.pageXOffset:n,o?n:r.pageYOffset):e[t]=n},t,e,arguments.length)}}),C.each(["top","left"],function(e,n){C.cssHooks[n]=tt(y.pixelPosition,function(e,t){if(t)return t=et(e,n),Ge.test(t)?C(e).position()[n]+"px":t})}),C.each({Height:"height",Width:"width"},function(a,s){C.each({padding:"inner"+a,content:s,"":"outer"+a},function(r,o){C.fn[o]=function(e,t){var n=arguments.length&&(r||"boolean"!=typeof e),i=r||(!0===e||!0===t?"margin":"border");return f(this,function(e,t,n){var r;return g(e)?0===o.indexOf("outer")?e["inner"+a]:e.document.documentElement["client"+a]:9===e.nodeType?(r=e.documentElement,Math.max(e.body["scroll"+a],r["scroll"+a],e.body["offset"+a],r["offset"+a],r["client"+a])):void 0===n?C.css(e,t,i):C.style(e,t,n,i)},s,n?e:void 0,n)}})}),C.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){C.fn[t]=function(e){return this.on(t,e)}}),C.fn.extend({bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)},hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),C.each("blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu".split(" "),function(e,n){C.fn[n]=function(e,t){return 0<arguments.length?this.on(n,null,e,t):this.trigger(n)}}),/^[\s\uFEFF\xA0]+|([^\s\uFEFF\xA0])[\s\uFEFF\xA0]+$/g),Kt=(C.proxy=function(e,t){var n,r;if("string"==typeof t&&(r=e[t],t=e,e=r),v(e))return n=s.call(arguments,2),(r=function(){return e.apply(t||this,n.concat(s.call(arguments)))}).guid=e.guid=e.guid||C.guid++,r},C.holdReady=function(e){e?C.readyWait++:C.ready(!0)},C.isArray=Array.isArray,C.parseJSON=JSON.parse,C.nodeName=u,C.isFunction=v,C.isWindow=g,C.camelCase=x,C.type=h,C.now=Date.now,C.isNumeric=function(e){var t=C.type(e);return("number"===t||"string"===t)&&!isNaN(e-parseFloat(e))},C.trim=function(e){return null==e?"":(e+"").replace(Jt,"$1")},"function"==typeof define&&define.amd&&define("jquery",[],function(){return C}),w.jQuery),Zt=w.$;return C.noConflict=function(e){return w.$===C&&(w.$=Zt),e&&w.jQuery===C&&(w.jQuery=Kt),C},"undefined"==typeof R&&(w.jQuery=w.$=C),C});

return module.exports;
})({ exports: {} });
const $ = jQuery;

// ---- marinara/st-compat.js
// Handy Adaptive — Marinara Engine compatibility layer
//
// Marinara runs a full page extension as the body of `async (marinara) => { ... }`.
// scripts/build-marinara.mjs puts this file first in that body, then the
// unmodified SillyTavern extension (index.js with synth.js and charstyle.js).
// This file gives index.js the small slice of SillyTavern it uses, backed by
// Marinara:
//
//   SillyTavern.getContext()     settings, chat mirror, characters, user name
//   setExtensionPrompt()         → a constant lorebook entry at depth 1 (system),
//                                  rewritten before every reply
//   MESSAGE_SENT / RECEIVED      → watched from Marinara's own POST /api/generate
//   CHAT_CHANGED                 → when a reply is requested for a different chat
//   saveSettingsDebounced()      → Marinara's private extension storage
//   toastr, #extensions_settings2, the icon font → small stand-ins
//
// jQuery and the managed timers ($, jQuery, setTimeout, setInterval, ...) are
// declared by the build just above this file, so nothing leaks onto the page
// and disabling the extension really stops every timer.

const MODULE = 'handy_adaptive';
const LORE_NAME = 'Handy Adaptive (managed)';
const LORE_ENTRY = 'Device control instructions';
const REGEX_NAME = 'Handy Adaptive: hide device tags';
const LIB_KEY = 'handy-adaptive-library';
const nativeFetch = window.fetch;

// ---------------------------------------------------------------- settings in Marinara extension storage
const stored = (await marinara.storage.get()) || {};
const extensionSettings = { [MODULE]: stored.settings && typeof stored.settings === 'object' ? stored.settings : {} };
{
    const s = extensionSettings[MODULE];
    if (s.library === '__localStorage__') {
        try { s.library = JSON.parse(localStorage.getItem(LIB_KEY)); } catch { s.library = null; }
    }
    // SillyTavern-only features: replies can't be started by an extension here, and there are no connection profiles
    s.autoReplyOnFeedback = false;
    s.styleProfile = '';
}
let saveTimer = null;
const saveSettingsDebounced = () => { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 800); };
async function persist() {
    const copy = { ...extensionSettings[MODULE] };
    try {
        await marinara.storage.patch({ settings: copy });
    } catch (e) {
        // private storage is capped (~1 MB): a big motion library is kept in this browser instead
        if (!copy.library) return compatToast(`Could not save Handy settings: ${e.message}`, 'error');
        try {
            localStorage.setItem(LIB_KEY, JSON.stringify(copy.library));
            await marinara.storage.patch({ settings: { ...copy, library: '__localStorage__' } });
        } catch (e2) { compatToast(`Could not save Handy settings: ${e2.message}`, 'error'); }
    }
}

// ---------------------------------------------------------------- Marinara API
function adminHeaders() {
    try { const s = localStorage.getItem('marinara_admin_secret')?.trim(); return s ? { 'X-Admin-Secret': s } : {}; } catch { return {}; }
}
async function mapi(method, path, body) {
    const headers = { Accept: 'application/json', ...adminHeaders() };
    if (method !== 'GET') { headers['x-marinara-csrf'] = '1'; headers['Content-Type'] = 'application/json'; }
    const r = await nativeFetch.call(window, '/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    if (!r.ok) {
        let msg = ''; try { msg = (await r.json()).error || ''; } catch { /* not json */ }
        throw new Error(`${method} ${path} → HTTP ${r.status}${msg ? `: ${msg}` : ''}`);
    }
    return r.status === 204 ? null : r.json();
}
const enc = encodeURIComponent;
const asList = (x) => (Array.isArray(x) ? x : x?.items || x?.data || []);
const parseMaybe = (v, fb) => { if (typeof v !== 'string') return v ?? fb; try { return JSON.parse(v); } catch { return fb; } };

// ---------------------------------------------------------------- SillyTavern context stand-in
const handlers = {};
const eventSource = {
    on(ev, fn) { (handlers[ev] ||= []).push(fn); },
    removeListener(ev, fn) { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); },
    emit(ev, ...args) { for (const fn of handlers[ev] || []) { try { fn(...args); } catch (e) { console.warn('[Handy]', e); } } },
};
const eventTypes = { MESSAGE_RECEIVED: 'message_received', MESSAGE_SENT: 'message_sent', CHAT_CHANGED: 'chat_id_changed' };
const scene = { chatId: null, chat: [], characters: [], characterId: undefined, groupId: null, name1: 'User', name2: '' };
let promptText = '';

const SillyTavern = {
    getContext: () => ({
        extensionSettings, saveSettingsDebounced, eventSource, eventTypes, event_types: eventTypes,
        chat: scene.chat, chatId: scene.chatId, characters: scene.characters, characterId: scene.characterId,
        groupId: scene.groupId, name1: scene.name1, name2: scene.name2,
        setExtensionPrompt(key, value) { if (key === MODULE) { promptText = String(value || ''); schedulePromptSync(); } },
        executeSlashCommandsWithOptions: async () => { throw new Error('starting a reply from an extension is not available in Marinara'); },
    }),
};

// Characters and persona of a chat, shaped like SillyTavern's (avatar = a stable key for per-character styles)
async function loadScene(chatId) {
    const chat = await mapi('GET', `/chats/${enc(chatId)}`).catch(() => ({}));
    const ids = (parseMaybe(chat.characterIds, []) || []).filter((x) => typeof x === 'string');
    const list = [];
    for (const id of ids) {
        try {
            const c = await mapi('GET', `/characters/${enc(id)}`);
            let d = parseMaybe(c.data, {}) || {};
            if (d.data && typeof d.data === 'object') d = { ...d, ...d.data };
            list.push({ id, name: d.name || c.name || 'Character', avatar: `marinara:${id}`, description: d.description || '',
                personality: d.personality || '', scenario: d.scenario || '', tags: Array.isArray(d.tags) ? d.tags : [], data: d });
        } catch { /* a missing card just means keyword-free defaults */ }
    }
    let name1 = 'User';
    if (chat.personaId) { try { name1 = (await mapi('GET', `/characters/personas/${enc(chat.personaId)}`))?.name || name1; } catch { /* default */ } }
    scene.chatId = chatId;
    scene.characters.splice(0, scene.characters.length, ...list);
    scene.characterId = list.length === 1 ? 0 : undefined;
    scene.groupId = list.length > 1 ? chatId : null;
    scene.name1 = name1; scene.name2 = list[0]?.name || '';
    scene.chat.length = 0;
}
function mirror(msg) {
    if (scene.chat.length > 200) scene.chat.splice(0, scene.chat.length - 100);
    scene.chat.push(msg);
    return scene.chat.length - 1;
}

// ---------------------------------------------------------------- AI instructions → managed lorebook entry
const lore = { id: null, entryId: null, last: null, ok: null, error: '' };
let syncChain = Promise.resolve(), syncTimer = null;
async function ensureLorebook() {
    if (lore.id && lore.entryId) return;
    let lb = asList(await mapi('GET', '/lorebooks')).find((l) => l.name === LORE_NAME);
    if (!lb) {
        lb = await mapi('POST', '/lorebooks', {
            name: LORE_NAME,
            description: 'Created and kept up to date by the Handy Adaptive extension: it tells the AI how to control your Handy. It is emptied automatically when the extension is off.',
            isGlobal: true, enabled: true, tokenBudget: 8192, scanDepth: 1,
        });
    } else if (!lb.isGlobal || !lb.enabled) {
        await mapi('PATCH', `/lorebooks/${enc(lb.id)}`, { isGlobal: true, enabled: true });
    }
    let entry = asList(await mapi('GET', `/lorebooks/${enc(lb.id)}/entries`)).find((e) => e.name === LORE_ENTRY);
    if (!entry) {
        entry = await mapi('POST', `/lorebooks/${enc(lb.id)}/entries`, {
            name: LORE_ENTRY, content: '', constant: true, enabled: false, position: 2, depth: 1, role: 'system', order: 1,
            preventRecursion: true, excludeFromVectorization: true,
        });
    }
    lore.id = lb.id; lore.entryId = entry.id; lore.last = entry.enabled ? entry.content : '';
}
function syncPrompt({ force = false } = {}) {
    syncChain = syncChain.then(async () => {
        const text = promptText;
        const write = async () => {
            await ensureLorebook();
            if (force || text !== lore.last) {
                await mapi('PATCH', `/lorebooks/${enc(lore.id)}/entries/${enc(lore.entryId)}`,
                    { content: text, enabled: !!text, constant: true, position: 2, depth: 1, role: 'system' });
                lore.last = text;
            }
        };
        try {
            try { await write(); } catch {
                lore.id = lore.entryId = lore.last = null;   // deleted or edited elsewhere: find or recreate it, once
                await write();
            }
            if (lore.ok === false) compatToast('Handy: AI link restored', 'success');
            lore.ok = true; lore.error = '';
        } catch (e) {
            lore.id = lore.entryId = lore.last = null;
            if (lore.ok !== false) compatToast(`Handy couldn't update the AI instructions: ${e.message}`, 'error');
            lore.ok = false; lore.error = e.message;
        }
        refreshCompatStatus();
    });
    return syncChain;
}
function schedulePromptSync() { clearTimeout(syncTimer); syncTimer = setTimeout(syncPrompt, 400); }

async function ensureHideRegex({ quiet = true } = {}) {
    try {
        if (asList(await mapi('GET', '/regex-scripts')).some((r) => r.name === REGEX_NAME)) return true;
        await mapi('POST', '/regex-scripts', {
            name: REGEX_NAME, enabled: true, findRegex: '</?handy\\b[^>]*>', replaceString: '',
            placement: ['ai_output'], flags: 'gi', applyMode: 'display',
        });
        if (!quiet) compatToast('Device tags are now hidden in the chat', 'success');
        return true;
    } catch (e) {
        if (!quiet) compatToast(`Couldn't add the hide-tags rule: ${e.message}`, 'error');
        return false;
    }
}

// ---------------------------------------------------------------- watch Marinara's reply requests
const handled = new Map();   // message id -> content already given to the extension
function isGenerateRequest(input, init) {
    try {
        const url = new URL(typeof input === 'string' ? input : input?.url ?? String(input), location.href);
        return url.origin === location.origin && /\/api\/generate\/?$/.test(url.pathname)
            && String(init?.method || 'GET').toUpperCase() === 'POST' && typeof init?.body === 'string';
    } catch { return false; }
}
async function recent(chatId) {
    const list = await mapi('GET', `/chats/${enc(chatId)}/messages?limit=8`);
    return Array.isArray(list) ? list : [];
}
async function afterReply(res, chatId, before) {
    try {   // wait for the streamed reply to finish
        const reader = res?.body?.getReader();
        if (reader) for (;;) { const { done } = await reader.read(); if (done) break; }
    } catch { /* aborted or disconnected: the reply may still have been saved */ }
    await new Promise((r) => setTimeout(r, 400));
    if (chatId !== scene.chatId) return;
    let msgs;
    try { msgs = await recent(chatId); } catch (e) { return console.warn('[Handy] could not read the reply', e); }
    for (const m of msgs) {
        if (!m || m.role === 'user' || m.role === 'system' || typeof m.content !== 'string') continue;
        const old = handled.has(m.id) ? handled.get(m.id) : before.get(m.id);
        if (old === m.content) continue;
        handled.set(m.id, m.content);
        const text = old && m.content.startsWith(old) ? m.content.slice(old.length) : m.content;   // Continue: only the new part
        const ch = scene.characters.find((c) => c.id === m.characterId);
        const idx = mirror({ name: ch?.name || scene.name2 || 'Character', is_user: false, is_system: false, mes: text,
            original_avatar: ch?.avatar, send_date: Date.now(), extra: {} });
        eventSource.emit(eventTypes.MESSAGE_RECEIVED, idx);
    }
    while (handled.size > 500) handled.delete(handled.keys().next().value);
}
async function hookedFetch(input, init) {
    if (!isGenerateRequest(input, init)) return nativeFetch.apply(window, arguments);
    let body;
    try { body = JSON.parse(init.body); } catch { return nativeFetch.apply(window, arguments); }
    const chatId = typeof body.chatId === 'string' ? body.chatId : null;
    if (!chatId || body.impersonate || body.turnGameBots) return nativeFetch.apply(window, arguments);
    let before = new Map();
    try {
        if (chatId !== scene.chatId) { await loadScene(chatId); eventSource.emit(eventTypes.CHAT_CHANGED, chatId); }
        if (typeof body.userMessage === 'string' && body.userMessage.trim()) {
            const idx = mirror({ name: scene.name1, is_user: true, is_system: false, mes: body.userMessage, send_date: Date.now(), extra: {} });
            eventSource.emit(eventTypes.MESSAGE_SENT, idx);
        }
        // the AI must see this turn's instructions (don't hold the reply up for long)
        await Promise.race([syncPrompt({ force: true }), new Promise((r) => setTimeout(r, 3000))]);
        before = new Map((await recent(chatId)).map((m) => [m.id, m.content]));
    } catch (e) { console.warn('[Handy]', e); }
    const res = await nativeFetch.call(window, input, init);
    if (res.ok) {
        let copy = null;
        try { copy = res.clone(); } catch { /* not cloneable */ }
        afterReply(copy, chatId, before);
    }
    return res;
}
window.fetch = hookedFetch;

// ---------------------------------------------------------------- toasts, settings window, icons
let toastBox = null;
function compatToast(msg, type = 'info') {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.id = 'handy-toasts'; document.body.append(toastBox); }
    const t = document.createElement('div');
    t.className = `handy-toast ${type}`; t.textContent = String(msg);
    toastBox.append(t);
    window.setTimeout(() => t.remove(), type === 'error' ? 8000 : 4500);
}
const ownToastr = !window.toastr;
if (ownToastr) window.toastr = Object.fromEntries(['info', 'success', 'warning', 'error'].map((k) => [k, (m) => compatToast(m, k)]));

// index.js puts its settings into #extensions_settings2 (SillyTavern's Extensions drawer): host it in a window
const settingsWin = $(`
<div id="handy-st-settings" hidden>
  <div class="handy-st-head"><b>Handy Adaptive</b><span class="handy-st-close" title="Close">✕</span></div>
  <div class="handy-st-compat">
    <div id="handy-st-ai" class="handy-st-small"></div>
    <div class="menu_button" id="handy-st-hide-tags">Hide device tags in chat</div>
  </div>
  <div id="extensions_settings2"></div>
</div>`).appendTo(document.body);
settingsWin.find('.handy-st-close').on('click', () => settingsWin.prop('hidden', true));
settingsWin.find('#handy-st-hide-tags').on('click', () => ensureHideRegex({ quiet: false }));
function refreshCompatStatus() {
    const s = extensionSettings[MODULE];
    $('#handy-st-ai').text(!s.enabled || s.injectProfile === false || !promptText ? 'AI instructions: off'
        : lore.ok === true ? `AI instructions: active (lorebook “${LORE_NAME}”)`
        : lore.ok === false ? `AI instructions: ⚠ ${lore.error}` : 'AI instructions: connecting…');
}
// once the extension has built its panel: a ⚙ that opens the settings window
jQuery(() => setTimeout(() => {
    if (!$('#handy_settings_btn').length) {
        $('<i id="handy_settings_btn" class="fa-solid fa-gear" title="Settings"></i>').insertBefore('#handy_collapse')
            .on('click', () => { settingsWin.prop('hidden', !settingsWin.prop('hidden')); refreshCompatStatus(); });
    }
    refreshCompatStatus();
}, 0));

// Esc. index.js listens on `document`, but Marinara's context menus and overlays catch keys on `window` in
// the capture phase and stop them. So Esc is caught first here: it stops the device even while a Marinara
// menu is open, and Marinara still gets the key afterwards. (index.js handles the calibration arrows the
// same way itself.)
const onKeyCapture = (e) => {
    const h = window.handyAdaptive, s = extensionSettings[MODULE];
    if (h && e.key === 'Escape' && s.escStops !== false && h.active?.()) h.stop('Esc');
};
window.addEventListener('keydown', onKeyCapture, true);

syncPrompt();
ensureHideRegex();
marinara.log.info('Handy Adaptive loaded (SillyTavern compatibility layer)');

marinara.onCleanup(async () => {
    if (window.fetch === hookedFetch) window.fetch = nativeFetch;
    window.removeEventListener('keydown', onKeyCapture, true);
    try { await window.handyAdaptive?.stop?.('extension disabled'); } catch { /* best effort */ }
    clearTimeout(saveTimer); await persist();
    try {   // leave the AI instructions empty so the model stops writing tags
        await ensureLorebook();
        await mapi('PATCH', `/lorebooks/${enc(lore.id)}/entries/${enc(lore.entryId)}`, { content: '', enabled: false });
    } catch { /* best effort */ }
    $('#handy_panel, #handy_calib, #handy-st-settings, #handy-toasts').remove();
    if (ownToastr) delete window.toastr;
    delete window.handyAdaptive;
});


// ---- synth.js, charstyle.js
const __synth = (() => {
// Motion synthesizer: turns a high-level intent ("blowjob, intensity 0.6, a bit
// tip-focused, blend in some handjob") into a fresh funscript-style stream of
// actions. It improvises from the learned motion library: short motifs cut from
// your hand-made scripts are re-timed, re-scaled and jittered, and mixed with
// procedural phrases generated from each act's measured statistics. It starts
// out exploring the library, then settles on the phrases (and the order of
// phrases) you've rated highly, while staying responsive to the scene.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
// Numbers arrive from saved settings, imported files and model-written tags; never let a bad one through.
const fin = (v, d) => (v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(+v) ? +v : d);
const validMotif = (m) => m && m.rate > 0 && Number.isFinite(+m.center) && Array.isArray(m.strokes) && m.strokes.length >= 2
    && m.strokes.every((x) => Array.isArray(x) && x[0] > 0 && Number.isFinite(+x[1]));
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const s = (mean, std) => ({ mean, std });
// Starter profiles so things work before you train. Replaced/extended by your library.
const STARTER_LIBRARY = {
    version: 1, starter: true, acts: {
        teasing:   { rate: s(0.9, 0.3), amp: s(25, 8),  center: s(78, 8),  irregularity: 0.35, asym: 1.2, pause_frac: 0.15, amp_std: 8,  motion: 'slow, short strokes near the tip, lots of pauses', description: '', motifs: [] },
        handjob:   { rate: s(2.0, 0.6), amp: s(55, 12), center: s(58, 10), irregularity: 0.18, asym: 1.0, pause_frac: 0.03, amp_std: 10, motion: 'moderate, medium strokes, steady rhythm', description: '', motifs: [] },
        blowjob:   { rate: s(1.4, 0.5), amp: s(45, 15), center: s(66, 10), irregularity: 0.32, asym: 1.15, pause_frac: 0.08, amp_std: 14, motion: 'moderate, medium strokes biased to the tip, organic rhythm, varying depth', description: '', motifs: [] },
        deepthroat:{ rate: s(0.8, 0.3), amp: s(80, 10), center: s(48, 8),  irregularity: 0.3, asym: 1.3, pause_frac: 0.2, amp_std: 10, motion: 'slow, full-length strokes with holds at the base', description: '', motifs: [] },
        cowgirl:   { rate: s(1.7, 0.6), amp: s(50, 15), center: s(45, 12), irregularity: 0.22, asym: 0.9, pause_frac: 0.04, amp_std: 12, motion: 'moderate, medium strokes lower in the range', description: '', motifs: [] },
        missionary:{ rate: s(1.8, 0.6), amp: s(65, 12), center: s(50, 10), irregularity: 0.15, asym: 1.0, pause_frac: 0.03, amp_std: 10, motion: 'moderate, long, steady strokes', description: '', motifs: [] },
        doggy:     { rate: s(2.4, 0.7), amp: s(60, 12), center: s(50, 10), irregularity: 0.15, asym: 0.9, pause_frac: 0.02, amp_std: 10, motion: 'fast, long, steady strokes', description: '', motifs: [] },
    },
};

function resolveAct(lib, name) {
    if (!lib?.acts || !name) return null;
    const n = String(name).toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (lib.acts[n]) return n;
    for (const k of Object.keys(lib.acts)) if (k.includes(n) || n.includes(k)) return k;
    return null;
}

function pickWeighted(items, weightFn) {
    const w = items.map(weightFn), tot = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < items.length; i++) if ((r -= w[i]) <= 0) return items[i];
    return items[items.length - 1];
}

/**
 * How much the engine still experiments for an act: 1 = brand new, falls towards
 * a small floor as your ratings for that act accumulate. Scaled by the user's
 * "try new things" setting (prefs.exploreBias, default 1).
 */
function exploration(prefs, act) {
    const a = prefs?.acts?.[act];
    const evidence = (a?.n ?? 0) + 2 * (a?.loves ?? 0);
    return clamp((1 / (1 + evidence / 20)) * (prefs?.exploreBias ?? 1), 0.1 * Math.min(1, prefs?.exploreBias ?? 1), 1);
}

/** Target movement for one act right now, combining library stats, the user's learned taste and the live intent. */
function targetFor(lib, actName, intent, prefs, tMs = 0, drift = null) {
    const prof = lib?.acts?.[actName] || STARTER_LIBRARY.acts.handjob;
    const ap = prefs?.acts?.[actName] || {};
    const st = intent.style || {};   // the character in control (charstyle.js effect()), if any
    const intensity = clamp(fin(intent.intensity, 0.5), 0, 1);
    const felt = clamp(intensity + fin(st.intensityBias, 0), 0, 1);
    // a climax push is steady and insistent: much less wandering
    const variation = clamp((fin(intent.variation, fin(ap.variation, 0.35)) + fin(intent.varOff, 0) + fin(st.varOff, 0)) * (intent.climax ? 0.5 : 1), 0, 1);
    const explore = exploration(prefs, actName);
    const d = drift ? 1 + 0.15 * variation * Math.sin((2 * Math.PI * tMs) / drift.period + drift.phase) : 1;
    const rate = clamp(fin(prof.rate?.mean, 1.5) * lerp(0.6, 1.5, felt) * fin(ap.rateMul, 1) * fin(intent.speedMul, 1) * fin(st.rateMul, 1) * d, 0.15, 6);
    const amp = clamp(fin(prof.amp?.mean, 50) * fin(ap.ampMul, 1) * fin(intent.ampMul, 1) * fin(st.ampMul, 1) * lerp(0.9, 1.1, felt), 8, 100);
    const center = clamp(fin(prof.center?.mean, 50) + 25 * (fin(intent.depth, 0) + fin(intent.depthOff, 0)) + fin(ap.centerShift, 0) + fin(st.centerShift, 0), amp / 2, 100 - amp / 2);
    // jitter = the organic feel you like (variation) + whatever experimenting is still going on (explore),
    // made more uneven for an inexperienced character and more precise for an expert one
    const jitter = clamp(variation * (0.35 + 0.65 * explore) * fin(st.jitterMul, 1) + (fin(st.jitterMul, 1) > 1 ? 0.15 * (st.jitterMul - 1) : 0), 0, 1.5);
    return { rate, amp, center, variation, intensity, explore, jitter, prof };
}

/**
 * Learning rule shared by the extension: each phrase / phrase-pair keeps a
 * running average of how you reacted to it (-1 = "not this", 0 = meh, 1 = loved).
 * Averages (rather than running totals) let "loved nearly every time" stand out
 * from "loved once", instead of everything that's played often looking great.
 */
const REWARD = { love: 1, nope: -1, neutral: 0.15 };
function reinforce(map, key, reward, alpha = 0.3) {
    const s = map[key];
    map[key] = s === undefined ? reward * 0.6 : s + alpha * (reward - s);
}

/**
 * Choose the next phrase. Early on: wide sampling, untried phrases get a bonus.
 * With experience: strongly prefers phrases you rated highly AND phrases you've
 * liked coming right after the previous one (learned combinations).
 */
function pickMotif(motifs, prefs, act, prev, rate, explore, recent = {}, curious = false, own = null, climax = false) {
    const finishers = climax ? prefs?.finishers || {} : null;
    const scores = prefs?.motifs || {}, trans = prefs?.trans || {};
    const beta = curious ? 0.3 : lerp(3.0, 0.8, explore);  // how greedy the choice is
    return pickWeighted(motifs, (m) => {
        const sc = scores[m.id];
        const tk = prev ? trans[`${prev}>${m.id}`] : undefined;
        let value = sc === undefined ? 0.5 * explore : 2 * sc;
        if (prev) {
            value += tk !== undefined ? 2 * tk
                // curiosity: an untried pairing of two phrases you like is worth a try
                : (sc ?? 0) > 0.3 && (scores[prev] ?? 0) > 0.3 ? 0.6 : 0;
        }
        // don't wear one phrase out, unless you've liked it repeating
        if (!(tk > 0.4)) value -= 0.5 * (recent[m.id] ?? 0);
        // the character in control has favourite phrases of their own (what you loved when they did it)
        if (own && own[m.id] !== undefined) value += 1.5 * own[m.id];
        // pushing you over: what has made you finish before comes first
        if (finishers && finishers[m.id]) value += 1.2 * Math.min(3, finishers[m.id]);
        const fit = Math.exp(-1.5 * Math.abs(Math.log(m.rate / rate)));
        return Math.exp(beta * clamp(value, -6, 6)) * fit;
    });
}

// Re-time and re-scale a motif to the target. Jitter shrinks as the engine settles.
// `lastPos` is where the previous phrase left the device. Motifs are cut from scripts at arbitrary
// turning points, so one may begin (or, when repeated, begin again) at the end of the stroke the
// device has just finished; played as-is that is a dead beat. Each pass therefore starts on the first
// stroke that actually travels, and that joining stroke is timed by its distance, not by the source.
function fromMotif(m, tg, phraseMs, lastPos) {
    const strokes = [];
    let t = 0, cur = lastPos;
    const j = tg.jitter;
    const speed = Math.max(20, 2 * tg.amp * tg.rate);   // typical travel speed of this phrase, %/s
    const near = 0.3 * tg.amp;                          // closer than this reads as a stall, not a stroke
    while (t < phraseMs) {
        const ts = (m.rate / tg.rate) * (1 + gauss() * 0.08 * j);
        const as = (tg.amp / Math.max(5, m.amp)) * (1 + gauss() * 0.1 * j);
        const shift = gauss() * 4 * j;
        const at = (pos) => tg.center + (pos - m.center) * as + shift;
        let k = 0;
        while (k < m.strokes.length - 1 && k < 3 && Math.abs(at(m.strokes[k][1]) - cur) < near) k++;
        for (let i = k; i < m.strokes.length; i++) {
            const [dur, pos] = m.strokes[i];
            const p = at(pos);
            let d = Math.max(60, dur * ts * (1 + gauss() * 0.05 * j));
            if (i === k) d = clamp((Math.abs(p - cur) / speed) * 1000, 60, d * 2.5);
            strokes.push([d, p]);
            cur = p; t += d;
            if (t >= phraseMs) break;
        }
    }
    return { strokes, motif: m.id };
}

// Generate a phrase directly from the act's statistics (used when there are no
// learned phrases, or occasionally while still exploring).
function procedural(tg, phraseMs, lastPos) {
    const p = tg.prof, strokes = [];
    const half = 1000 / (2 * tg.rate);
    const cv = clamp((p.irregularity ?? 0.2) * (0.5 + tg.jitter), 0.02, 0.8);
    const asym = clamp(p.asym ?? 1, 0.5, 2);
    const upF = (2 * asym) / (1 + asym), downF = 2 / (1 + asym);
    const phraseAmp = tg.amp * (1 + gauss() * 0.12 * tg.jitter);
    const phraseCenter = tg.center + gauss() * 6 * tg.jitter;
    let up = lastPos < phraseCenter, t = 0, first = true;
    while (t < phraseMs) {
        if (Math.random() < (p.pause_frac ?? 0.05) * 0.6) {
            const d = rnd(250, 1100); strokes.push([d, null]); t += d; // hold
        }
        const a = Math.max(6, phraseAmp + gauss() * (p.amp_std ?? 8) * 0.6 * (0.5 + tg.jitter));
        const target = up ? phraseCenter + a / 2 : phraseCenter - a / 2;
        let d = Math.max(60, half * (up ? upF : downF) * Math.exp(gauss() * cv));
        // the first stroke starts wherever the last phrase ended, so time it by the distance it really covers
        if (first) { d = clamp((d * Math.abs(target - lastPos)) / a, 60, d * 2.5); first = false; }
        strokes.push([d, target]);
        t += d; up = !up;
    }
    return { strokes, motif: null };
}

// ---- detail: small mouth-and-hand touches between phrases ----
// flutter = quick little strokes at the tip; drag = one slow pull to the tip and a slow slide back to a held
// base; pulse = short, close strokes held deep. Which ones suit an act comes from its name; how often they
// appear follows variation and the character (experts and teases use more); and each is rated like any
// phrase (❤ / 👎 while it plays), so the ones you like come back and the ones you turn down are retired.
const ORN_BY_ACT = [
    [/blow|oral|lick|suck|teas|kiss|tongue|mouth/i, { flutter: 1, drag: 0.7, pulse: 0.1 }],
    [/deep|throat/i, { drag: 1, pulse: 0.8, flutter: 0.2 }],
    [/hand|strok|jerk|rub/i, { flutter: 0.8, drag: 0.8, pulse: 0.3 }],
    [/./, { pulse: 1, drag: 0.6, flutter: 0.2 }],
];
function pickOrnament(act, tg, it, prefs) {
    const st = it.style || {};
    const chance = 0.22 * fin(it.ornaments, 0) * (0.5 + tg.variation) * (0.6 + 0.8 * fin(st.exp, 0.5)) * (tg.intensity > 0.85 ? 0.4 : 1);
    if (!(Math.random() < chance)) return null;
    const w = ORN_BY_ACT.find(([re]) => re.test(String(act)))[1];
    const opts = [];
    for (const kind of Object.keys(w)) {
        const id = `orn:${kind}:${act}`;
        if (prefs?.banned?.[id]) continue;
        const bias = kind === 'flutter' ? 1 + fin(st.tease, 0) + Math.max(0, fin(st.centerShift, 0)) / 14
            : kind === 'pulse' ? 1 + Math.max(0, -fin(st.centerShift, 0)) / 14 : 1;
        opts.push({ kind, id, weight: w[kind] * bias * Math.exp(1.5 * fin(prefs?.motifs?.[id], 0) + fin(st.motifs?.[id], 0)) });
    }
    return opts.length ? pickWeighted(opts, (o) => o.weight) : null;
}
function ornamentStrokes(kind, tg, lastPos) {
    const out = [], speed = Math.max(20, 2 * tg.amp * tg.rate), half = 1000 / (2 * tg.rate);
    const top = clamp(tg.center + tg.amp / 2, 12, 100), bottom = clamp(tg.center - tg.amp / 2, 0, 88);
    const reach = (p, from) => clamp((Math.abs(p - from) / speed) * 1000, 80, 1500);
    if (kind === 'flutter') {
        const a = clamp(tg.amp * 0.2, 8, 14), h = 1000 / (2 * clamp(tg.rate * 2.2, 3.5, 5.5)), n = 6 + Math.floor(Math.random() * 7);
        out.push([reach(top, lastPos), top]);
        for (let i = 0; i < n; i++) out.push([h * (1 + gauss() * 0.06), i % 2 ? top : top - a]);
    } else if (kind === 'pulse') {
        const a = clamp(tg.amp * 0.22, 8, 16), h = 1000 / (2 * clamp(tg.rate * 1.6, 2.5, 4.5)), n = 6 + Math.floor(Math.random() * 5);
        out.push([reach(bottom, lastPos), bottom]);
        for (let i = 0; i < n; i++) out.push([h * (1 + gauss() * 0.06), i % 2 ? bottom : bottom + a]);
    } else {   // drag
        out.push([clamp(2.2 * half * (Math.abs(top - lastPos) / Math.max(8, tg.amp)), 500, 2500), top]);
        out.push([clamp(2.6 * half * ((top - bottom) / Math.max(8, tg.amp)), 600, 3000), bottom]);
        out.push([rnd(300, 700), null]);   // held at the base
    }
    return out;
}

// Two characters moving as one: the midpoint of their styles, and both of their favourite phrases.
function mergeStyles(list) {
    const out = {}, n = list.length;
    for (const k of ['rateMul', 'ampMul', 'centerShift', 'varOff', 'tease', 'intensityBias', 'jitterMul', 'exp']) out[k] = list.reduce((a, s) => a + fin(s?.[k], k.endsWith('Mul') ? 1 : 0), 0) / n;
    out.motifs = {};
    for (const s of list) for (const [id, v] of Object.entries(s?.motifs || {})) out.motifs[id] = (out.motifs[id] ?? 0) + v / n;
    return out;
}

/**
 * Build `durationMs` of motion starting at time 0 from `startPos`, continuing
 * after phrase `prevMotif` (so learned transitions carry across chunks).
 * Returns { actions:[{at,pos}], used:[{from,to,act,motif}], lastMotif }.
 */
function synthesize({ lib, intent, prefs, limits, durationMs, startPos = 50, prevMotif = null }) {
    const actions = [{ at: 0, pos: Math.round(startPos) }];
    const used = [];
    const mix = [[intent.act, 1], ...Object.entries(intent.blend || {}).filter(([a, w]) => lib?.acts?.[a] && w > 0)];
    const drift = { period: rnd(18000, 40000), phase: rnd(0, 2 * Math.PI) };
    let t = 0, pos = startPos, prev = prevMotif;
    const recent = {};

    let first = true;
    // Two characters at once: they take turns phrase by phrase (each in their own style), or move as one.
    const duo = Array.isArray(intent.styles) && intent.styles.length > 1 ? intent.styles : null;
    const together = duo && intent.duet === 'together' ? mergeStyles(duo) : null;
    let turn = intent.turn | 0;
    while (t < durationMs) {
        let it = intent, who = null;
        if (together) it = { ...intent, style: together };
        else if (duo) { who = turn % duo.length; it = { ...intent, style: duo[who] }; turn++; }
        // A teasing character now and then stops between phrases and holds still for a moment.
        const tease = fin(it.style?.tease, 0);
        if (!first && !intent.climax && tease > 0.05 && Math.random() < 0.35 * tease) {
            t += rnd(400, 1000) * (0.6 + tease);
            actions.push({ at: Math.round(t), pos: Math.round(clamp(pos, 0, 100)) });
        }
        first = false;
        const act = pickWeighted(mix, ([, w]) => w)[0];
        const tg = targetFor(lib, act, it, prefs, t, drift);
        // phrase length: your learned "how long before I want a change", else 4-12 s
        const kept = prefs?.acts?.[act]?.keptSec;
        const phraseMs = who !== null ? rnd(4000, 8000)   // turns short enough to feel the hand-over
            : kept && tg.explore < 0.6 ? clamp(kept * 1000 * rnd(0.6, 1.1), 3000, 30000) : rnd(4000, 12000);
        const motifs = (tg.prof.motifs || []).filter((m) => validMotif(m) && !prefs?.banned?.[m.id]);   // phrases you firmly rejected never come back
        const useProcedural = !motifs.length || Math.random() < (0.3 * tg.explore + 0.1 * tg.variation) * (intent.climax ? 0.3 : 1);
        const phrase = useProcedural
            ? procedural(tg, phraseMs, clamp(pos, 0, 100))
            // now and then, even when dialed in, try a less-proven phrase (that's how new favorites and combos get found)
            : fromMotif(pickMotif(motifs, prefs, act, prev, tg.rate, tg.explore, recent,
                !intent.climax && Math.random() < Math.max(0.07 * Math.min(1, prefs?.exploreBias ?? 1), 0.5 * tg.explore), it.style?.motifs, !!intent.climax), tg, phraseMs, clamp(pos, 0, 100));
        const i0 = actions.length - 1;
        for (const [dur, p] of phrase.strokes) {
            t += dur;
            if (p !== null) pos = p;
            actions.push({ at: Math.round(t), pos: Math.round(clamp(pos, 0, 100)) });
            if (t >= durationMs) break;
        }
        if (actions.length - 1 === i0) { t += 250; actions.push({ at: Math.round(t), pos: Math.round(clamp(pos, 0, 100)) }); }   // never spin without advancing
        used.push({ i0, i1: actions.length - 1, act, motif: phrase.motif, who });
        const orn = !intent.climax && t < durationMs ? pickOrnament(act, tg, it, prefs) : null;
        if (orn) {
            const j0 = actions.length - 1;
            for (const [dur, p] of ornamentStrokes(orn.kind, tg, clamp(pos, 0, 100))) {
                t += dur; if (p !== null) pos = p;
                actions.push({ at: Math.round(t), pos: Math.round(clamp(pos, 0, 100)) });
            }
            used.push({ i0: j0, i1: actions.length - 1, act, motif: orn.id, who, orn: true });
        }
        if (phrase.motif) {
            prev = phrase.motif;
            for (const k in recent) recent[k] *= 0.6;
            recent[prev] = (recent[prev] ?? 0) + 1;
        }
    }
    // Speed limiting stretches time, so report each phrase's span on the final timeline (feedback is credited by time).
    const out = enforceLimits(actions, limits);
    return { actions: out, used: used.map((u) => ({ from: out[u.i0].at, to: out[u.i1].at, act: u.act, motif: u.motif, who: u.who, ...(u.orn ? { orn: true } : {}) })), lastMotif: prev, turn };
}

/** Clamp positions and slow down any move faster than the user's limit. */
function enforceLimits(actions, { floor = 0, ceil = 100, maxVel = 400, minMs = 60 } = {}) {
    const out = [];
    let at = 0;
    for (let i = 0; i < actions.length; i++) {
        const pos = Math.round(clamp(actions[i].pos, floor, ceil));
        if (i === 0) { out.push({ at: actions[0].at, pos }); at = actions[0].at; continue; }
        const dt = actions[i].at - actions[i - 1].at;
        const dp = Math.abs(pos - out[out.length - 1].pos);
        at += Math.ceil(Math.max(dt, dp > 0 ? minMs : 0, (dp / maxVel) * 1000));   // whole ms, rounded up: never faster than the cap
        out.push({ at, pos: Math.round(pos) });
    }
    return out;
}

/** Position at time t (ms) within an action list. */
function posAt(actions, t) {
    if (!actions?.length) return 50;
    if (t <= actions[0].at) return actions[0].pos;
    for (let i = 1; i < actions.length; i++) {
        if (actions[i].at >= t) {
            const a = actions[i - 1], b = actions[i];
            return a.pos + (b.pos - a.pos) * ((t - a.at) / Math.max(1, b.at - a.at));
        }
    }
    return actions[actions.length - 1].pos;
}

return { STARTER_LIBRARY, resolveAct, exploration, targetFor, REWARD, reinforce, pickMotif, pickOrnament, ornamentStrokes, mergeStyles, synthesize, enforceLimits, posAt };
})();

const __charstyle = (() => {
// Character styles: each character moves the Handy their own way.
//
// A style starts from the character card (personality, description, scenario, tags), is shaped by the
// user's feedback while that character is in control, and is remembered per character. Pure functions
// only; storage, attribution and the UI live in index.js.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/** The seven traits, their range and their neutral value. */
const TRAITS = {
    tempo: { label: 'Tempo',         min: -1, max: 1, neutral: 0,   low: 'slow',          high: 'fast' },
    reach: { label: 'Stroke length', min: -1, max: 1, neutral: 0,   low: 'short',         high: 'long' },
    focus: { label: 'Focus',         min: -1, max: 1, neutral: 0,   low: 'the base',      high: 'the tip' },
    wild:  { label: 'Wildness',      min: -1, max: 1, neutral: 0,   low: 'smooth',        high: 'unpredictable' },
    tease: { label: 'Teasing',       min: 0,  max: 1, neutral: 0.15, low: 'no pauses',    high: 'lots of pauses' },
    eager: { label: 'Eagerness',     min: -1, max: 1, neutral: 0,   low: 'drags it out',  high: 'quick to build' },
    exp:   { label: 'Experience',    min: 0,  max: 1, neutral: 0.5, low: 'inexperienced', high: 'expert' },
};
const NEUTRAL = () => Object.fromEntries(Object.entries(TRAITS).map(([k, t]) => [k, t.neutral]));

// Words in a card and what they say about how this character would move. Each hit nudges traits;
// several hits add up (with diminishing returns), so "shy, inexperienced virgin" reads as very green.
const LEXICON = [
    // inexperience
    [/\b(virgin(al)?|inexperienced|innocent|naive|na[iï]ve|sheltered|first[- ]time|never (been touched|done this|had sex))\b/, { exp: -0.35, tempo: -0.2, reach: -0.15, wild: 0.1 }],
    [/\b(shy|timid|nervous|bashful|flustered|awkward|hesitant|meek|introverted|easily embarrassed)\b/, { exp: -0.15, tempo: -0.25, reach: -0.1, eager: -0.2, focus: 0.15 }],
    // experience
    [/\b(experienced|skilled|expert|skillful|talented|masterful|knows (exactly )?what (she|he|they) (is|are)? ?doing)\b/, { exp: 0.35, wild: -0.1, reach: 0.1 }],
    [/\b(seductive|seductress|temptress|succubus|incubus|courtesan|escort|prostitute|harlot|sex worker|porn ?star|sex (goddess|demon|expert))\b/, { exp: 0.4, reach: 0.2, tease: 0.15 }],
    [/\b(promiscuous|slutty|slut|nympho(maniac)?|hypersexual|sexually experienced|insatiable|perverted|lewd|pervert)\b/, { exp: 0.25, eager: 0.3, tempo: 0.2, reach: 0.15 }],
    [/\b(mature|milf|older woman|older man|veteran|seasoned)\b/, { exp: 0.25, wild: -0.1 }],
    // dominance
    [/\b(dominant|domme|dominatrix|bossy|commanding|controlling|authoritative|in control|strict|stern)\b/, { tease: 0.3, eager: -0.25, exp: 0.15, wild: 0.1 }],
    [/\b(sadist(ic)?|cruel|mean|merciless|denial|edging|orgasm control)\b/, { tease: 0.4, eager: -0.35, wild: 0.15 }],
    // submission / devotion
    [/\b(submissive|obedient|docile|servile|eager to please|devoted|worshipful|people[- ]pleaser|maid|servant)\b/, { eager: 0.25, focus: -0.1, tease: -0.1, wild: -0.1 }],
    [/\b(needy|clingy|desperate|yandere|obsessed|obsessive|possessive)\b/, { eager: 0.35, tempo: 0.15, reach: 0.1 }],
    // teasing / playful
    [/\b(teas(e|ing|er)|playful|mischievous|bratty|brat|coy|cheeky|impish|prankster|trickster|flirt(y|atious)?|smug)\b/, { tease: 0.3, focus: 0.25, wild: 0.2, eager: -0.1 }],
    [/\b(tsundere|kuudere)\b/, { tease: 0.2, eager: -0.15, wild: 0.15 }],
    // gentle / loving
    [/\b(gentle|tender|caring|sweet|kind|soft[- ]spoken|loving|affectionate|nurturing|motherly|maternal|romantic|patient)\b/, { tempo: -0.2, wild: -0.2, reach: 0.1, eager: -0.1 }],
    // wild / rough
    [/\b(wild|aggressive|rough|feral|savage|beastly|animalistic|primal|ferocious|violent|brutal)\b/, { tempo: 0.3, reach: 0.25, wild: 0.3, eager: 0.2, tease: -0.1 }],
    [/\b(horny|lustful|passionate|intense|energetic|hyper(active)?|athletic|enthusiastic|frantic|impatient)\b/, { tempo: 0.25, eager: 0.25, reach: 0.1 }],
    // calm / cold / precise
    [/\b(calm|stoic|cold|aloof|reserved|composed|collected|emotionless|methodical|precise|meticulous|disciplined|robot(ic)?|android|machine|clinical)\b/, { wild: -0.3, exp: 0.1, eager: -0.1 }],
    [/\b(lazy|sleepy|drowsy|laid[- ]back|relaxed|lethargic|languid)\b/, { tempo: -0.3, reach: -0.05, wild: -0.05 }],
    [/\b(clumsy|ditzy|airheaded|scatterbrained|klutz)\b/, { exp: -0.1, wild: 0.25 }],
    // where they focus
    [/\b(deep[- ]?throat(ing)?|takes? it all|all the way|to the hilt|throat|gag(s|ging)?)\b/, { focus: -0.35, reach: 0.1 }],
    [/\b(lick(s|ing)?|kiss(es|ing)? the tip|the tip|kitten licks?)\b/, { focus: 0.25 }],
];
const NEGATION = /\b(not|never|no|isn't|isnt|wasn't|hardly|anything but|far from)\s+(\w+\s+){0,2}$/i;
// "hates rough men", "afraid of aggressive people": the word describes what they dislike, not how they are.
const DISLIKE = /\b(hates?|dislikes?|despises?|loathes?|can'?t stand|cannot stand|afraid of|scared of|fears?|avoids?|disgusted by|turned off by|unlike|prefers? not)\s+(\w+\s+){0,3}$/i;
// Sentences about the user ("{{user}} is shy") say nothing about how the character moves.
const ABOUT_USER = /\{\{user\}\}|<user>/i;
const sentences = (text) => String(text || '').split(/(?<=[.!?\n;])\s+|\n+/).filter((x) => x.trim());

/** Read a style from the card text. Returns { traits, hits } (hits: which words counted). */
function seedStyle(text) {
    // Keep sentences that are about the character: one that starts with the user, or only mentions them
    // as the subject ("{{user}} is a shy student"), is dropped.
    const kept = sentences(text).filter((x) => !/^\s*(\{\{user\}\}|<user>)/i.test(x) && !/(\{\{user\}\}|<user>)('s)?\s+(is|are|was|has|have|seems?|looks?|feels?)\b/i.test(x));
    const t = kept.join(' ').toLowerCase().replace(/\s+/g, ' ');
    const sum = Object.fromEntries(Object.keys(TRAITS).map((k) => [k, 0]));
    const hits = [];
    for (const [re, delta] of LEXICON) {
        const g = new RegExp(re.source, 'gi');
        let n = 0, m;
        while ((m = g.exec(t)) && n < 3) {
            const before = t.slice(Math.max(0, m.index - 40), m.index);
            if (NEGATION.test(before.slice(-30)) || DISLIKE.test(before)) continue;   // "not shy", "hates rough men" say nothing
            n++; if (n === 1) hits.push(m[0]);
        }
        if (!n) continue;
        const w = 1 + 0.35 * (n - 1);   // repeating a word counts, but less
        for (const [k, v] of Object.entries(delta)) sum[k] += v * w;
    }
    // Diminishing returns: many words pushing one way saturate rather than run off the scale.
    const sat = (x) => Math.tanh(x * 1.2) / Math.tanh(1.2);
    const traits = NEUTRAL();
    for (const [k, tr] of Object.entries(TRAITS)) {
        if (k === 'exp') traits.exp = clamp(0.5 + 0.5 * sat(sum.exp), 0, 1);
        else if (k === 'tease') traits.tease = clamp(tr.neutral + 0.85 * sat(sum.tease), 0, 1);
        else traits[k] = clamp(sat(sum[k]), -1, 1);
    }
    for (const k of Object.keys(traits)) traits[k] = +traits[k].toFixed(2);
    return { traits, hits };
}

/** A fresh, empty record of what the user has taught this character. */
const EMPTY_LEARNED = () => ({ rateMul: 1, ampMul: 1, centerShift: 0, varOff: 0, expGain: 0 });

/**
 * What a style does to the motion. Multipliers and offsets that targetFor() and synthesize() apply on top
 * of the act, the user's learned taste and the live intent. `learned` is what feedback has added.
 */
function effect(traits, learned = EMPTY_LEARNED()) {
    const T = { ...NEUTRAL(), ...traits }, L = { ...EMPTY_LEARNED(), ...learned };
    const exp = clamp(T.exp + L.expGain, 0, 1);
    return {
        rateMul: clamp(Math.pow(1.45, T.tempo) * L.rateMul, 0.4, 2.5),         // ±45% tempo
        ampMul: clamp(Math.pow(1.3, T.reach) * L.ampMul, 0.4, 2),               // ±30% stroke length
        centerShift: clamp(14 * T.focus + L.centerShift, -35, 35),              // body %, + = toward the tip
        varOff: clamp(0.18 * T.wild + L.varOff, -0.45, 0.45),
        tease: clamp(T.tease, 0, 1),                                             // chance of a held pause between phrases
        intensityBias: 0.12 * T.eager,                                           // nudges how hard a given intensity hits
        jitterMul: lerp(1.6, 0.7, exp),                                          // green = uneven timing; expert = precise
        exp,
    };
}

/** A short plain-words description, for the AI and the panel. */
function describe(traits, learned) {
    const e = effect(traits, learned), T = { ...NEUTRAL(), ...traits };
    const out = [];
    if (e.exp < 0.3) out.push('inexperienced: a little uneven, still finding a rhythm');
    else if (e.exp < 0.42) out.push('fairly new to this');
    else if (e.exp > 0.75) out.push('experienced and precise');
    else if (e.exp > 0.6) out.push('confident');
    if (e.rateMul < 0.8) out.push('slow and unhurried'); else if (e.rateMul < 0.92) out.push('a little slower than usual');
    else if (e.rateMul > 1.25) out.push('fast'); else if (e.rateMul > 1.08) out.push('a little quicker than usual');
    if (e.ampMul < 0.85) out.push('short strokes'); else if (e.ampMul > 1.15) out.push('long, full strokes');
    if (e.centerShift > 5) out.push('lingers at the tip'); else if (e.centerShift < -5) out.push('takes it deep');
    if (e.varOff > 0.08) out.push('unpredictable'); else if (e.varOff < -0.08) out.push('smooth and steady');
    if (T.tease > 0.45) out.push('teasing, with pauses');
    if (T.eager > 0.3) out.push('eager, quick to build'); else if (T.eager < -0.3) out.push('likes to drag it out');
    return out.length ? out.join(', ') : 'balanced, no strong habits yet';
}

/** Simple, stable hash so a changed card can be noticed. */
function textHash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
}

// ---- reading a card with a language model (optional; the keyword reading above is the fallback) ----

/** The request sent to the model: the card, and a strict JSON answer format. */
function aiPrompt(name, cardText) {
    const card = String(cardText || '').replace(/\s+\n/g, '\n').slice(0, 6000);
    return [
        { role: 'system', content: 'You rate fictional adult characters for a motion engine. Answer with one JSON object and nothing else.' },
        { role: 'user', content:
`Character: ${name}

Card:
"""
${card}
"""

From the card, judge how ${name} would physically stroke or pleasure a partner with hands, mouth or body. Judge only ${name}: ignore what the card says about {{user}} or other people, and ignore things ${name} dislikes. If the card gives no hint for a trait, use its neutral value.

Return exactly this JSON (numbers only, one decimal):
{"tempo": -1..1, "reach": -1..1, "focus": -1..1, "wild": -1..1, "tease": 0..1, "eager": -1..1, "exp": 0..1, "why": "one short sentence"}

tempo: -1 slow and unhurried, 0 neutral, 1 fast
reach: -1 short strokes, 0 neutral, 1 long full strokes
focus: -1 deep / at the base, 0 neutral, 1 at the tip
wild: -1 smooth and steady, 0 neutral, 1 unpredictable
tease: 0 never pauses, 0.15 neutral, 1 constantly stops and teases
eager: -1 drags it out / denies, 0 neutral, 1 rushes to make the partner finish
exp: 0 completely inexperienced, 0.5 neutral, 1 expert` },
    ];
}

/** Read the model's answer. Returns { traits, why } or null when it can't be used. */
function parseAi(reply) {
    const text = String(reply ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '');
    const blocks = text.match(/\{[^{}]*\}/g);
    if (!blocks) return null;
    for (const b of blocks.reverse()) {
        let j; try { j = JSON.parse(b); } catch { continue; }
        const traits = {};
        let found = 0;
        for (const [k, tr] of Object.entries(TRAITS)) {
            const v = typeof j[k] === 'string' ? parseFloat(j[k]) : j[k];
            if (Number.isFinite(v)) { traits[k] = +clamp(v, tr.min, tr.max).toFixed(2); found++; } else traits[k] = tr.neutral;
        }
        if (found >= 4) return { traits, why: typeof j.why === 'string' ? j.why.slice(0, 200) : '' };
    }
    return null;
}

return { TRAITS, NEUTRAL, seedStyle, EMPTY_LEARNED, effect, describe, textHash, aiPrompt, parseAi };
})();

// ---- index.js (the SillyTavern extension)
(() => {
// Handy Adaptive — SillyTavern extension (v0.10.0; also runs in Marinara Engine via marinara/st-compat.js)
//
// The AI describes WHAT is happening (<handy act="blowjob" intensity="0.6"/>),
// and the motion synthesizer improvises HOW the device moves, using a motion
// library learned from your hand-scripted videos plus your personal taste,
// which is learned from live feedback. A simpler HAMP pattern mode remains as
// a fallback (<handy pattern="wave" .../>).

const { synthesize, resolveAct, targetFor, posAt, exploration, reinforce, REWARD, STARTER_LIBRARY } = __synth;
const { TRAITS, seedStyle, effect: styleEffect, describe: describeStyle, EMPTY_LEARNED, textHash, aiPrompt, parseAi } = __charstyle;

const MODULE = 'handy_adaptive';
const ctx = () => SillyTavern.getContext();

// ---------------------------------------------------------------- settings
const DEFAULTS = {
    enabled: true,
    connectionKey: '',
    apiBase: 'https://www.handyfeeling.com/api/handy/v2',
    transport: 'hdsp',          // 'hdsp' = stream each stroke | 'hssp' = upload script chunks | 'hsp' = buffered streaming (API v3, firmware 4)
    appId: '',                  // Handy API v3 Application ID (buffered streaming only)
    apiV3Base: 'https://www.handyfeeling.com/api/handy-rest/v3',
    calibration: null,          // { base, tip }: device positions (0-100) of your base and your tip
    uploadUrl: 'https://scripts01.handyfeeling.com/api/script/v0/temp/upload',
    minSpeed: 5,
    maxSpeed: 80,               // % cap. Pattern mode: HAMP velocity. Act mode: scales max travel speed.
    strokeFloor: 0,
    strokeCeil: 100,
    tickMs: 700,
    idleStopSec: 600,
    escStops: true,
    injectProfile: true,
    autoReplyOnFeedback: false,
    closeAction: 'pullback',    // "I'm close": 'pullback' = ease off at once, then the AI reacts | 'ai' = leave it to the AI's next reply
    finishAction: 'winddown',   // "Finished": 'winddown' = very gentle for 20 s, then stop | 'stop' = stop at once | 'ai' = leave it to the AI
    sessionCheck: true,         // before the first motion of each session, ask whether the setup (and calibration) is the same
    detectClimax: true,         // notice "I'm close" / "I'm cumming" in your own messages
    safeword: '',               // a word that stops the device whenever it appears in your message
    showPanel: true,
    proseCues: true,            // a reply with no tag still adjusts the motion from what it describes (faster, deeper, pauses…)
    ornaments: true,            // small mouth-and-hand touches between phrases: flutters at the tip, slow drags, deep pulses
    setups: [],                 // saved calibrations: [{ name, base, tip, at }] (lying down, sitting, a mount…)
    setupName: null,            // the saved setup in use, if any
    readWpm: 220,               // several tags in one reply play in order at this reading speed (words/min); 0 = all at once
    arousalMeter: true,         // keep a running arousal estimate and tell the AI
    gameMinEdges: 3,            // games: edges the character must take you through before she may end it
    rouletteMinutes: 3,         // porn roulette: minutes between spins
    styleProfile: 'Background', // connection profile that reads character cards for their style ('' = keywords only)
    charStyles: true,           // each character moves the Handy their own way (read from the card, refined by feedback)
    characters: {},             // character key (avatar) -> their style and history with you
    library: null,              // imported motion_library.json (null = starter profiles)
    profile: null,
};
const EMPTY_PROFILE = () => ({
    patterns: {}, speed: { sum: 0, w: 0, sq: 0 }, strokeMin: { sum: 0, w: 0 }, strokeMax: { sum: 0, w: 0 },
    acts: {},       // act -> { rateMul, ampMul, centerShift, variation, score, n, loves, keptSec }
    motifs: {},     // motif id -> score
    trans: {},      // "motifA>motifB" -> score (which phrases you like following which)
    exploreBias: 1, // "try new things": 0 = only what you've liked, 2 = experiment a lot
    favorites: [], log: [], sessions: 0,
    motifStats: {}, // motif id -> { love, nope }
    banned: {},     // motif ids you have firmly rejected
    finishers: {},  // motif id -> how often it was playing when you finished
    arousalK: null, // learned pace: how fast you build (1 / seconds to the edge at full intensity)
});

function S() {
    const es = ctx().extensionSettings;
    if (!es[MODULE]) es[MODULE] = structuredClone(DEFAULTS);
    for (const k of Object.keys(DEFAULTS)) if (es[MODULE][k] === undefined) es[MODULE][k] = structuredClone(DEFAULTS[k]);
    if (!es[MODULE].profile) es[MODULE].profile = EMPTY_PROFILE();
    const pr = es[MODULE].profile, ep = EMPTY_PROFILE();
    for (const k of Object.keys(ep)) if (pr[k] === undefined) pr[k] = ep[k];
    return es[MODULE];
}
const LIB = () => S().library || STARTER_LIBRARY;
const save = () => ctx().saveSettingsDebounced();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Today's date where you are (not UTC: an evening session must not be filed under tomorrow).
const today = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const esc = (t) => $('<div>').text(String(t)).html();
const maxPct = () => clamp(Number.isFinite(+S().maxSpeed) ? +S().maxSpeed : 80, 5, 100);   // a typed 250 is still 100 %
const maxVel = () => 60 + (maxPct() / 100) * 540;   // %/s: 80% cap ≈ 490 %/s

// Models write numbers loosely (“0.6”, 70%, 7/10, "high"). Read what can be read; anything else is
// ignored, so one sloppy tag can never leave the engine holding a NaN.
function num(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v !== 'string') return undefined;
    const m = /(-?\d*\.?\d+)\s*(%|\/\s*(\d+))?/.exec(v.replace(/(\d),(\d)/, '$1.$2'));
    if (!m) return undefined;
    let x = parseFloat(m[1]);
    if (m[2] === '%') x /= 100; else if (m[3]) x /= +m[3] || 1;
    return Number.isFinite(x) ? x : undefined;
}
// 0-1 scales: a value above 1 is a model using a 0-10 or 0-100 scale, not a request for maximum.
const unit01 = (v) => { let x = num(v); if (x === undefined) return undefined; if (x > 1) x = x <= 10 ? x / 10 : x / 100; return clamp(x, 0, 1); };
const signed1 = (v) => { const x = num(v); return x === undefined ? undefined : clamp(x, -1, 1); };

// ---------------------------------------------------------------- command sequencing
// Device commands take several network round trips. Two rules keep them from tangling:
//  - everything that starts or changes motion runs one at a time, in the order it was issued (enqueue);
//  - STOP never waits in that line: it goes out immediately, and bumping `epoch` makes any start that
//    is still in progress, or still waiting its turn, abandon itself.
let epoch = 0;
let sessionChecked = false;   // the setup has been confirmed (or calibrated) since SillyTavern loaded
let chain = Promise.resolve();
function enqueue(fn) {
    const my = epoch;
    const p = chain.then(() => (my === epoch ? fn() : undefined));
    chain = p.catch((e) => console.warn('[Handy]', e));
    return p;
}

// ---------------------------------------------------------------- device API (Handy REST v2)
const api = {
    busy: false,
    offset: 0, offsetAt: 0,
    rtt: 150,
    jit: 40,   // how much round trips vary (mean deviation, ms): commands are sent this much earlier
    async call(method, path, body, keepalive = false) {
        const s = S();
        if (!s.connectionKey) throw new Error('No connection key set');
        const t0 = performance.now();
        const res = await fetch(s.apiBase.replace(/\/$/, '') + path, {
            method, keepalive,
            signal: AbortSignal.timeout?.(8000),   // a request that never returns must not hold the stream up forever
            headers: { 'X-Connection-Key': s.connectionKey, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        const took = performance.now() - t0;
        api.jit = api.jit * 0.85 + Math.abs(took - api.rtt) * 0.15;
        api.rtt = api.rtt * 0.8 + took * 0.2;
        let json = {};
        try { json = await res.json(); } catch { /* empty */ }
        if (!res.ok || json.error) throw new Error(json?.error?.message || `HTTP ${res.status}`);
        return json;
    },
    connected: () => api.call('GET', '/connected'),
    mode: (m) => api.call('PUT', '/mode', { mode: m }),             // 0 HAMP, 1 HSSP, 2 HDSP
    // HAMP
    async hampStart() { await api.mode(0); await api.call('PUT', '/hamp/start'); },
    hampStop: (k = false) => api.call('PUT', '/hamp/stop', undefined, k),
    velocity: (v) => api.call('PUT', '/hamp/velocity', { velocity: Math.round(v) }),
    slide: (min, max) => api.call('PUT', '/slide', { min: Math.round(min), max: Math.round(max) }),
    // Positions sent to the device are a share of its stroke range ("slide"). A range narrowed by the Handy app,
    // the device's buttons or an old pattern tag would squeeze every stroke and shift the calibration, so
    // the full range is restored whenever acts or calibration start. Your limits are applied here instead.
    fullRange: () => api.slide(0, 100).catch(() => {}),
    // HDSP
    xpt: (position, duration) => api.call('PUT', '/hdsp/xpt', { position: Math.round(position), duration: Math.round(duration), stopOnTarget: true }),
    // HSSP
    async syncTime() {
        if (Date.now() - api.offsetAt < 10 * 60000) return;
        const samples = [];
        for (let i = 0; i < 6; i++) {
            const t0 = Date.now(); const r = await api.call('GET', '/servertime'); const t1 = Date.now();
            samples.push(r.serverTime + (t1 - t0) / 2 - t1);
        }
        samples.sort((a, b) => a - b);
        api.offset = samples[Math.floor(samples.length / 2)]; api.offsetAt = Date.now();
    },
    async upload(actions) {
        const fd = new FormData();
        fd.append('file', new Blob([JSON.stringify({ version: '1.0', inverted: false, range: 100, actions })], { type: 'application/json' }), 'synth.funscript');
        const r = await fetch(S().uploadUrl, { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!j.url) throw new Error('script upload failed');
        return j.url;
    },
    hsspSetup: async (url) => { await api.mode(1); return api.call('PUT', '/hssp/setup', { url }); },
    hsspPlay: (startTime = 0) => api.call('PUT', '/hssp/play', { estimatedServerTime: Date.now() + api.offset, startTime }),
    hsspStop: (k = false) => api.call('PUT', '/hssp/stop', undefined, k),
};

// ---------------------------------------------------------------- calibration
// The engine thinks in body positions: 0 = your base, 100 = your tip. Calibration records which device
// positions those are for you, and everything sent to the Handy is mapped through it, so "at the tip"
// really is at your tip. Without a calibration the two scales are the same.
function cal() {
    const c = S().calibration;
    return c && Number.isFinite(+c.base) && Number.isFinite(+c.tip) && Math.abs(c.tip - c.base) >= 10 ? c : null;
}
const span = () => { const c = cal(); return c ? Math.abs(c.tip - c.base) / 100 : 1; };
const toDev = (p) => { const c = cal(); const x = clamp(+p || 0, 0, 100); return c ? c.base + (x / 100) * (c.tip - c.base) : x; };
// The speed cap is a physical limit on the device; in body units it is wider when your range is shorter.
const capBody = () => maxVel() / span();
// Your stroke limits, whichever way round they were typed, within 0-100.
const strokeRange = () => { const s = S(), a = clamp(+s.strokeFloor || 0, 0, 100), b = clamp(Number.isFinite(+s.strokeCeil) && s.strokeCeil !== '' ? +s.strokeCeil : 100, 0, 100); return [Math.min(a, b), Math.max(a, b)]; };

// ---------------------------------------------------------------- device API v3 (firmware 4): buffered streaming
// HSP keeps a few seconds of timed points on the device itself, so motion stays smooth whatever the
// network or the browser tab is doing. Requests carry an Application ID from Handy's developer portal.
const api3 = {
    offset: 0, offsetAt: 0,
    base: () => String(S().apiV3Base || 'https://www.handyfeeling.com/api/handy-rest/v3').replace(/\/$/, ''),
    async call(method, path, body, keepalive = false) {
        const s = S();
        if (!s.connectionKey) throw new Error('No connection key set');
        if (!s.appId) throw new Error('No API v3 Application ID set');
        const t0 = performance.now();
        const res = await fetch(api3.base() + path, {
            method, keepalive,
            signal: AbortSignal.timeout?.(8000),
            headers: { 'X-Connection-Key': s.connectionKey, 'X-Api-Key': s.appId, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        api.rtt = api.rtt * 0.8 + (performance.now() - t0) * 0.2;
        let json = {};
        try { json = await res.json(); } catch { /* empty */ }
        if (!res.ok || json.error) throw new Error(json?.error?.message || json?.message || `HTTP ${res.status}`);
        return json.result ?? json;
    },
    async syncTime() {
        if (Date.now() - api3.offsetAt < 5 * 60000) return;
        const samples = [];
        for (let i = 0; i < 5; i++) {
            const t0 = Date.now(); const r = await api3.call('GET', '/servertime'); const t1 = Date.now();
            const st = num(r.server_time ?? r.serverTime); if (st === undefined) throw new Error('bad server time');
            samples.push(st + (t1 - t0) / 2 - t1);
        }
        samples.sort((a, b) => a - b);
        api3.offset = samples[Math.floor(samples.length / 2)]; api3.offsetAt = Date.now();
    },
    connected: () => api3.call('GET', '/connected'),
    async mode(m) { try { return await api3.call('PUT', '/mode2', { mode: m }); } catch { return api3.call('PUT', '/mode', { mode: m }); } },
    xpt: (pos, ms) => api3.call('PUT', '/hdsp/xpt', { xp: Math.round(clamp(pos, 0, 100) * 100) / 10000, t: Math.round(ms), stop_on_target: true, immediate_rsp: false }),
    stroke: (min, max) => api3.call('PUT', '/slider/stroke', { min, max }),
    setup: (id) => api3.call('PUT', '/hsp/setup', { stream_id: id }),
    add: (points, tail, flush) => api3.call('PUT', '/hsp/add', { points, tail_point_stream_index: Math.max(1, tail), flush }),
    play: (start) => api3.call('PUT', '/hsp/play', { start_time: Math.round(start), server_time: Math.round(Date.now() + api3.offset), playback_rate: 1, loop: false, pause_on_starving: true }),
    resume: () => api3.call('PUT', '/hsp/resume', { pick_up: false }),
    stop: (k = false) => api3.call('PUT', '/hsp/stop', undefined, k),
};
// "starving" / "paused" in either of the forms the API has been seen to use (numbers 3/4 or strings).
const hspStalled = (st) => { const p = st?.play_state; return p === 3 || p === 4 || (typeof p === 'string' && /starv|pause/i.test(p)); };

// ---------------------------------------------------------------- act engine (synthesizer)
const actEngine = {
    running: false,
    starting: 0,      // starts in progress (device not moving yet, but about to be)
    mode: 'hdsp',     // transport actually in use on the device
    intent: { act: null, intensity: 0.5, variation: null, depth: 0, blend: {}, speedMul: 1, ampMul: 1, depthOff: 0, varOff: 0 },
    buf: [],          // HDSP plan: [{at (epoch ms), pos}]. buf[0] is the point the device is heading to (or resting at).
    used: [],         // [{from, to, act, motif}] epoch ms
    seg: null,        // the move the device is executing: {p0, t0, p1, t1} (times as they happen on the device)
    rest: 50,         // where the device was left when nothing is moving
    inflight: 0, fails: 0,
    known: false,     // false until the first move of a start has landed: the device may be anywhere
    timer: null, startedAt: 0, keptSince: Date.now(),
    hssp: { playStart: 0, actions: null, refill: null, swapMs: 900, timed: false },
    hsp: { origin: 0, streamId: Math.floor(Math.random() * 1e9), count: 0, sentUntil: 0, lock: Promise.resolve(), sending: false, resync: false },

    async apply(cmd) {
        const s = S(); if (!s.enabled) return;
        if (calib.gate(() => this.apply(cmd))) return;   // first motion of the session: confirm the setup first
        const my = epoch; this.starting++;
        try {
            if (!cmd._climax && climax.active) climax.cancel();   // any other instruction ends a climax push
            const act = resolveAct(LIB(), cmd.act) || this.intent.act || Object.keys(LIB().acts)[0];
            if (act !== this.intent.act) {
                this.recordKept();
                absorb(0.1);   // keep a little of how you steered the previous act
                Object.assign(this.intent, { speedMul: 1, ampMul: 1, depthOff: 0, varOff: 0, blend: {}, depth: 0, variation: null });
                this.intent.act = act;
                this.lastMotif = null;
            }
            if (cmd.preset) Object.assign(this.intent, structuredClone(cmd.preset), { act });
            const iv = unit01(cmd.intensity), vv = unit01(cmd.variation), dv = signed1(cmd.depth);
            if (iv !== undefined) this.intent.intensity = iv;
            if (vv !== undefined) this.intent.variation = vv;
            if (dv !== undefined) this.intent.depth = dv;
            if (!cmd._cue && (cmd.act || iv !== undefined)) chars.noteTag(act, iv);
            if (cmd.blend !== undefined && cmd.blend !== true) this.intent.blend = parseBlend(cmd.blend);
            lastActivity = Date.now();
            clearTimeout(this.durTimer);   // a "for N seconds" from an earlier tag must not fire into this one
            clearTimeout(windTimer);       // and a new instruction ends a wind-down
            if (hamp.running) await hamp.stop();
            if (my !== epoch) return;
            await this.regen(my);
            if (my !== epoch) return;
            const dur = num(cmd.duration);
            if (dur > 0) this.durTimer = setTimeout(() => enqueue(() => this.running && this.apply({ intensity: Math.max(0.2, this.intent.intensity - 0.3) })), dur * 1000);
        } finally { this.starting--; ui.refresh(); updatePrompt(); }
    },

    // Streaming sends one command per stroke over the internet: a stroke shorter than the connection can
    // deliver cleanly would stutter, so on a slow link the fastest strokes are stretched a little.
    limits() { const [floor, ceil] = strokeRange(); return { floor, ceil, maxVel: capBody(), minMs: S().transport === 'hdsp' ? Math.round(clamp(api.rtt <= 260 ? 0.45 * api.rtt : 117 + (api.rtt - 260), 80, 320)) : 60 }; },
    gen_(startAt, startPos, ms, prevMotif = this.lastMotif) {
        const cast = chars.cast();   // one character's style, or two taking turns / moving as one
        const r = synthesize({ lib: LIB(), intent: { ...this.intent, ...cast.intent, ornaments: S().ornaments ? 1 : 0, turn: this.turn | 0 }, prefs: S().profile, limits: this.limits(), durationMs: ms, startPos, prevMotif });
        this.lastMotif = r.lastMotif; this.turn = r.turn | 0;
        return { actions: r.actions.map((a) => ({ at: a.at + startAt, pos: a.pos })), used: r.used.map((u) => ({ ...u, who: u.who != null ? cast.keys[u.who] : null, from: u.from + startAt, to: u.to + startAt })) };
    },

    // Where the device is at time t, from the move it was last told to make.
    estPos(t = Date.now()) {
        const g = this.seg; if (!g) return this.rest;
        if (t <= g.t0) return g.p0;
        if (t >= g.t1) return g.p1;
        return g.p0 + (g.p1 - g.p0) * ((t - g.t0) / (g.t1 - g.t0));
    },
    // Slide the plan from buf[i] onward (and the phrases that go with it) later by ms.
    shift(ms, i = 0) {
        const from = i > 0 ? this.buf[i - 1].at : -Infinity;
        for (let k = i; k < this.buf.length; k++) this.buf[k].at += ms;
        for (const u of this.used) { if (u.from >= from) u.from += ms; if (u.to > from) u.to += ms; }
    },

    async regen(my = epoch) {
        const t = S().transport, want = t === 'hssp' || t === 'hsp' ? t : 'hdsp';
        if (this.running && this.mode !== want) await this.stop();   // transport was changed while playing
        if (my !== epoch) return;
        if (want === 'hssp') return this.regenHssp(my);
        if (want === 'hsp') return this.regenHsp(my);
        const now = Date.now();
        settlePhrases();
        if (this.running && this.buf.length) {
            // Keep the stroke that is already on its way (buf[0]) and anything too close to change; replace the rest.
            const keepUntil = now + api.rtt + 150;
            this.buf = this.buf.filter((a, i) => i === 0 || a.at <= keepUntil);
        } else {
            this.buf = [{ at: now + api.rtt / 2 + 60, pos: Math.round(this.estPos(now)) }];
            this.known = false;
        }
        const last = this.buf[this.buf.length - 1];
        // The phrases after the join are being replaced: end them there, so feedback given later is not credited to them.
        this.used = this.used.filter((u) => u.from < last.at && u.to > now - 20000);
        for (const u of this.used) if (u.to > last.at) u.to = last.at;
        this.lastMotif = [...this.used].reverse().find((u) => u.motif && !u.orn && u.act === this.intent.act)?.motif ?? null;
        const g = this.gen_(last.at, last.pos, 20000);
        this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
        if (!this.running) {
            try { await api.mode(2); } catch (e) { this.buf = []; toast(`Handy start failed: ${e.message}`, 'error'); return; }
            await api.fullRange();
            if (my !== epoch) { this.buf = []; return; }   // stopped while the device was switching mode
            const t = Date.now();
            this.shift(Math.max(0, t + api.rtt / 2 + 60 - this.buf[0].at));
            this.running = true; this.mode = 'hdsp'; this.fails = 0; this.startedAt = t; this.keptSince = t;
            clearInterval(this.timer);
            this.timer = setInterval(() => this.pump(), 20);
        }
    },

    // Send each stroke so that it lands just as the device finishes the one before it.
    pump() {
        if (!this.running || this.mode !== 'hdsp') return;
        const now = Date.now();
        if (S().idleStopSec > 0 && now - lastActivity > S().idleStopSec * 1000) return stopAll('idle timeout');
        implicitLearn();
        const tail = this.buf[this.buf.length - 1];
        if (tail && tail.at - now < 8000) {
            const g = this.gen_(tail.at, tail.pos, 20000);
            this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
            settlePhrases();
            this.used = this.used.filter((u) => u.to > now - 30000);
        }
        // Streaming depends on the connection. On a slow or uneven one, say so once: Script sync plays on the device.
        if (!this.slowTold && now - this.startedAt > 15000 && (api.rtt > 320 || api.jit > 110)) {
            this.slowTold = true;
            toast(`Your connection to the Handy is slow or uneven (about ${Math.round(api.rtt)} ms per command), which can make Streaming feel choppy. Motion transport → Script sync is smoother on a connection like this.`, 'warning');
        }
        if (this.buf.length < 2 || this.inflight >= 2) return;   // at most two commands on the wire
        const lead = api.rtt / 2;                                // one-way trip to the device
        const prev = this.buf[0];
        if (now < prev.at - lead) return;
        // One command per stroke: points in the middle of a stroke would each make the device stop and wait
        // for the next command. Send the whole run to its turning point (Script sync and Buffered streaming
        // keep the finer shape, because the device plays those itself).
        while (this.buf.length > 2) {
            const d1 = this.buf[1].pos - prev.pos, d2 = this.buf[2].pos - this.buf[1].pos;
            if (!d1 || !d2 || Math.sign(d1) !== Math.sign(d2) || this.buf[2].at - prev.at > 3000) break;
            this.buf.splice(1, 1);
        }
        const next = this.buf[1];
        // The command lands at `arrive`. Nothing here is synced to a video, so when we are behind
        // (slow network, throttled tab) the plan slides later; strokes are never skipped and never
        // squeezed into less time. A stroke runs at most ~10% faster than planned and never above the cap.
        const arrive = now + lead;
        const from = this.estPos(arrive);
        // On a fresh start the device could be at either end (after power-on, or moved by the Handy app),
        // so the first move is timed for the longest trip it might really make.
        const dev = toDev(next.pos);
        // The sleeve may have glided on past `from` toward the last aim if this command is late (see run-on
        // below), so the speed cap is checked against the longest trip it could really have to make.
        const far = this.seg ? toDev(this.seg.p1) : toDev(from);
        const travel = this.known ? Math.max(Math.abs(dev - toDev(from)), Math.abs(dev - far)) : Math.max(dev, 100 - dev);   // device %
        const floor = Math.max(50, 0.9 * (next.at - prev.at), (travel / maxVel()) * 1000);
        let dur = next.at - arrive;
        if (dur < floor) { this.shift(floor - dur, 1); dur = floor; }
        // Run-on: every command travels over the internet and lands a little early or late. If the stroke
        // ended exactly at its turning point, a late command would leave the sleeve standing still until it
        // arrived, and that standing still at every turn is what feels choppy. So when the next stroke
        // reverses, this one is aimed a little past its turning point at the same speed: on time, the next
        // command catches the sleeve right at the turn; late, the sleeve is still gliding. The run-on never
        // leaves your stroke limits, is never faster than the stroke itself, and is not used before a pause.
        let aim = next.pos, sendDur = dur;
        const after = this.buf[2], span1 = next.pos - from;
        if (this.known && after && Math.abs(span1) > 2 && Math.sign(after.pos - next.pos) === -Math.sign(span1)) {
            const [lo, hi] = strokeRange();
            const slack = clamp(2 * api.jit + 20, 30, 220);                         // ms of glide to cover a late command
            aim = clamp(next.pos + (span1 / dur) * slack, lo, hi);
            sendDur = dur * ((aim - from) / span1);
        }
        this.seg = { p0: from, t0: arrive, p1: aim, t1: arrive + sendDur };
        this.known = true;
        this.buf.shift();
        this.inflight++;
        api.xpt(toDev(aim), sendDur).then(() => { this.fails = 0; }, (e) => this.sendFailed(e)).finally(() => { this.inflight--; });
        ui.live(next.pos);
    },
    sendFailed(e) {
        console.warn('[Handy]', e);
        if (++this.fails >= 6 && this.running) { toast(`Lost contact with the Handy (${e.message}). Stopped.`, 'error'); stopAll(); }
    },

    async regenHssp(my = epoch) {
        const t0 = Date.now(), swapping = this.running && this.mode === 'hssp' && this.hssp.actions;
        // Uploading and loading a script takes a moment, during which the old one keeps playing.
        // Start the new script where the old one will be at the swap, not where it is now.
        const eta = t0 + this.hssp.swapMs;
        const pos = swapping ? posAt(this.hssp.actions, eta - this.hssp.playStart) : this.estPos(t0);
        const cur = this.used.filter((u) => u.from <= eta && u.motif && u.act === this.intent.act).pop();
        const g = this.gen_(0, pos, 120000, cur?.motif ?? null);
        let start;
        try {
            await api.syncTime(); if (my !== epoch) return;
            const url = await api.upload(g.actions.map((a) => ({ at: a.at, pos: Math.round(toDev(a.pos)) }))); if (my !== epoch) return;
            const tSetup = Date.now();
            if (!swapping) { await api.mode(1); await api.fullRange(); }
            if (my !== epoch) return;
            await api.call('PUT', '/hssp/setup', { url });
            if (my !== epoch) return;
            const tPlay = Date.now();
            await api.hsspPlay(0);
            if (my !== epoch) { try { await api.hsspStop(); } catch { /* best effort */ } return; }   // stopped mid-start: make sure it stays stopped
            // how long "generate → device has the new script" really takes, for placing the next swap
            const took = clamp(tSetup + api.rtt / 2 - t0, 100, 5000);
            this.hssp.swapMs = this.hssp.timed ? 0.6 * this.hssp.swapMs + 0.4 * took : took; this.hssp.timed = true;
            start = tPlay + api.rtt / 2;
        } catch (e) {
            if (my !== epoch) return;
            toast(`Script sync failed (${e.message}); switching to streaming mode`, 'warning');
            S().transport = 'hdsp'; save(); $('#handy_transport').val('hdsp');
            return this.regen(my);
        }
        settlePhrases();
        clearTimeout(this.hssp.refill);   // exactly one refill is ever pending
        this.hssp.playStart = start; this.hssp.actions = g.actions;
        this.used = g.used.map((u) => ({ ...u, from: u.from + start, to: u.to + start }));
        this.mode = 'hssp'; this.buf = []; this.seg = null;
        if (!this.running) { this.running = true; this.startedAt = start; this.keptSince = start; }
        this.hssp.refill = setTimeout(() => enqueue(() => this.running && this.mode === 'hssp' && this.regenHssp()), 110000);
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (S().idleStopSec > 0 && Date.now() - lastActivity > S().idleStopSec * 1000) return stopAll('idle timeout');
            implicitLearn(); ui.live(this.currentPos());
        }, 500);
    },

    // ---- buffered streaming (API v3 HSP). The plan in `buf` is kept whole (past points included) and the
    // device holds ~5 s of it. A change replaces the buffer from the next turning point after the change
    // can land, so the motion never reverses mid-stroke or stalls at the hand-over.
    async regenHsp(my = epoch) {
        const now = Date.now(), live = this.running && this.mode === 'hsp';
        const lead = api.rtt + 250;
        settlePhrases();
        if (live && this.buf.length) {
            let k = this.buf.findIndex((a) => a.at > now + lead);
            if (k < 0) k = this.buf.length - 1;
            this.buf = this.buf.slice(0, k + 1);
        } else {
            this.buf = [{ at: now + lead, pos: Math.round(this.estPos(now)) }];
            this.known = false;
        }
        const last = this.buf[this.buf.length - 1];
        this.used = this.used.filter((u) => u.from < last.at && u.to > now - 20000);
        for (const u of this.used) if (u.to > last.at) u.to = last.at;
        this.lastMotif = [...this.used].reverse().find((u) => u.motif && !u.orn && u.act === this.intent.act)?.motif ?? null;
        const g = this.gen_(last.at, last.pos, 20000);
        this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
        if (live) return this.hspLocked(() => this.hspSend(true));
        // Fresh start: the device could be anywhere, so the first move is timed for the longest possible trip.
        if (this.buf.length > 1) {
            const d = toDev(this.buf[1].pos), need = (Math.max(d, 100 - d) / maxVel()) * 1000;
            const have = this.buf[1].at - this.buf[0].at;
            if (have < need) this.shift(need - have, 1);
        }
        let setup = false;
        try {
            await api3.syncTime(); if (my !== epoch) return;
            await api3.mode(4).catch(() => {});                 // setup also selects HSP; this is belt and braces
            await api3.stroke(0, 1).catch(() => {});            // clear any stroke window another app left: calibration is done here
            if (my !== epoch) return;
            this.hsp.streamId = (this.hsp.streamId % 4294967295) + 1;
            await api3.setup(this.hsp.streamId); setup = true;
            if (my !== epoch) { api3.stop().catch(() => {}); return; }
            const t0 = Date.now();
            this.shift(Math.max(0, t0 + lead - this.buf[0].at));   // starts after the round trips just spent
            this.hsp.origin = t0;
            await this.hspSend(true);
            if (my !== epoch) { api3.stop().catch(() => {}); return; }
            await api3.play(Date.now() - this.hsp.origin);
            if (my !== epoch) { api3.stop().catch(() => {}); return; }
        } catch (e) {
            if (setup) api3.stop().catch(() => {});
            if (my !== epoch) return;
            toast(`Buffered streaming unavailable (${e.message}); switching to Streaming`, 'warning');
            S().transport = 'hdsp'; save(); $('#handy_transport').val('hdsp');
            this.buf = [];
            return this.regen(my);
        }
        this.running = true; this.mode = 'hsp'; this.fails = 0; this.known = true; this.startedAt = Date.now(); this.keptSince = Date.now();
        clearInterval(this.timer);
        this.timer = setInterval(() => this.tickHsp(), 250);
    },
    hspLocked(fn) { const p = this.hsp.lock.then(fn); this.hsp.lock = p.catch(() => {}); return p; },
    // Send the plan up to ~5 s ahead. flush = replace what the device holds, starting from the point it is on.
    async hspSend(flush) {
        if (this.hsp.resync) { flush = true; this.hsp.resync = false; }
        const now = Date.now(), horizon = now + 5200, h = this.hsp;
        let pts;
        if (flush) {
            const devNow = now + api.rtt / 2;
            let i = this.buf.findIndex((a) => a.at > devNow);
            i = i < 0 ? Math.max(0, this.buf.length - 2) : Math.max(0, i - 1);
            pts = this.buf.slice(i).filter((a, j) => j < 2 || a.at <= horizon);
            h.count = 0;
        } else pts = this.buf.filter((a) => a.at > h.sentUntil && a.at <= horizon);
        if (!pts.length) return;
        h.sending = true;
        try {
            let st = null;
            for (let k = 0; k < pts.length; k += 100) {
                const chunk = pts.slice(k, k + 100);
                h.count += chunk.length;
                st = await api3.add(chunk.map((a) => ({ t: Math.max(0, Math.round(a.at - h.origin)), x: Math.round(clamp(toDev(a.pos), 0, 100)) })), h.count - 1, flush && k === 0);
            }
            h.sentUntil = pts[pts.length - 1].at;
            this.fails = 0;
            this.hspObserve(st, now);
        } catch (e) {
            h.resync = true;   // never retry a failed add blindly: next time, replace the whole window
            this.sendFailed(e);
        } finally { h.sending = false; }
    },
    // Keep our timeline in step with the device's. If it paused (buffer ran dry), slide the plan to match.
    hspObserve(st, sentAt) {
        if (!st) return;
        if (hspStalled(st)) api3.resume().catch(() => {});
        const cur = num(st.current_time);
        if (cur === undefined || hspStalled(st)) return;
        const lag = (sentAt + api.rtt / 2 - this.hsp.origin) - cur;
        if (Math.abs(lag) > 300 && Math.abs(lag) < 10000) { this.hsp.origin += lag; this.shift(lag); this.hsp.sentUntil += lag; }
    },
    tickHsp() {
        if (!this.running || this.mode !== 'hsp') return;
        const now = Date.now();
        if (S().idleStopSec > 0 && now - lastActivity > S().idleStopSec * 1000) return stopAll('idle timeout');
        implicitLearn();
        const tail = this.buf[this.buf.length - 1];
        if (tail && tail.at - now < 8000) {
            const g = this.gen_(tail.at, tail.pos, 20000);
            this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
            settlePhrases();
            this.used = this.used.filter((u) => u.to > now - 30000);
        }
        const old = this.buf.findIndex((a) => a.at > now - 3000);
        if (old > 1) this.buf.splice(0, old - 1);
        if (!this.hsp.sending && (this.hsp.resync || this.hsp.sentUntil - now < 3000)) this.hspLocked(() => this.running && this.mode === 'hsp' && this.hspSend(false));
        ui.live(this.currentPos(now));
    },

    currentPos(t = Date.now()) {
        if (this.running && this.mode === 'hssp' && this.hssp.actions) return posAt(this.hssp.actions, t - this.hssp.playStart);
        if (this.running && this.mode === 'hsp' && this.buf.length) return posAt(this.buf, t);
        return this.estPos(t);
    },

    // Halts the device where it is. Safe to call at any time, including while a start is still in progress.
    async stop(reason = '') {
        clearInterval(this.timer); this.timer = null; clearTimeout(this.hssp.refill); clearTimeout(this.durTimer); clearTimeout(regenTimer);
        settlePhrases();
        this.recordKept();
        const was = this.running, how = was ? this.mode : (['hssp', 'hsp'].includes(S().transport) ? S().transport : 'hdsp');
        const here = Math.round(clamp(this.currentPos(Date.now() + api.rtt / 2), 0, 100));   // where it will be when the halt lands
        this.running = false; this.buf = []; this.seg = null; this.rest = here; this.hssp.actions = null; this.hsp.sentUntil = 0;
        try {
            if (how === 'hsp') await api3.stop();
            else if (how === 'hssp') await api.hsspStop();
            else await api.xpt(toDev(here), 100);
        } catch (e) { if (was) toast(`Stop failed: ${e.message} — use the device button!`, 'error'); }
        if (how !== 'hsp') { try { await api.mode(0); await api.hampStop(); } catch { /* best effort */ } }
        if (reason) toast(`Handy stopped: ${reason}`, 'info');
        ui.refresh(); updatePrompt();
    },

    recordKept() {
        const sec = (Date.now() - this.keptSince) / 1000;
        if (this.running && this.intent.act && sec > 5) {
            const a = actPrefs(this.intent.act);
            a.keptSec = a.keptSec ? a.keptSec * 0.8 + sec * 0.2 : sec; save();
        }
        this.keptSince = Date.now();
    },

    describe() {
        const i = this.intent;
        if (!this.running || !i.act) return 'stopped';
        const tg = targetFor(LIB(), i.act, { ...i, style: chars.effect() }, S().profile);
        const bl = Object.entries(i.blend || {}).map(([k, v]) => `${k} ${v}`).join(', ');
        return `act ${i.act}${bl ? ` (blended with ${bl})` : ''}${i.climax ? ', pushing to climax' : ''}, intensity ${i.intensity.toFixed(2)}, ≈${tg.rate.toFixed(1)} strokes/s, range ${Math.round(tg.center - tg.amp / 2)}-${Math.round(tg.center + tg.amp / 2)}`;
    },
};

function parseBlend(str) {
    const o = {};
    for (const part of String(str).split(/[,;]/)) {
        const [k, v] = part.split(':').map((x) => x?.trim());
        const act = resolveAct(LIB(), k);
        if (act) o[act] = v === undefined ? 0.3 : unit01(v) ?? 0;
    }
    return o;
}

// ---------------------------------------------------------------- pattern engine (HAMP fallback)
const PATTERNS = {
    steady: (t, p) => ({ speed: p.speed, min: p.min, max: p.max }),
    wave:   (t, p) => ({ speed: p.speed + p.depth * Math.sin((2 * Math.PI * t) / p.period), min: p.min, max: p.max }),
    build:  (t, p) => ({ speed: p.speed * (0.35 + 0.65 * Math.min(1, t / p.period)), min: p.min, max: p.max }),
    pulse:  (t, p) => ({ speed: (Math.floor((2 * t) / p.period) % 2) ? p.speed - p.depth : p.speed + p.depth, min: p.min, max: p.max }),
    tease:  (t, p) => ({ speed: p.speed + (p.depth / 2) * Math.sin((2 * Math.PI * t) / p.period), min: p.max - (p.max - p.min) * 0.3, max: p.max }),
    edge:   (t, p) => { const c = t % (p.period * 1.4); return c < p.period ? { speed: p.speed * (0.4 + 0.6 * (c / p.period)), min: p.min, max: p.max } : { speed: Math.max(5, p.speed * 0.15), min: p.min, max: p.max }; },
    deep:   (t, p) => ({ speed: p.speed, min: Math.min(p.min, 5), max: Math.max(p.max, 95) }),
};
// A legacy pattern, played by the act engine instead: speed becomes intensity, the stroke range becomes depth.
function patternAsAct(pattern, params = {}) {
    const p = { ...hamp.params, ...params }, act = actEngine.intent.act || Object.keys(LIB().acts)[0];
    const mid = (clamp(+p.min || 0, 0, 100) + clamp(+p.max || 100, 0, 100)) / 2;
    return { act: pattern === 'tease' ? (resolveAct(LIB(), 'teasing') || act) : act, intensity: clamp((+p.speed || 30) / 100, 0.05, 1), depth: clamp((mid - 50) / 25, -1, 1) };
}
const hamp = {
    running: false, starting: 0, pattern: 'steady', params: { speed: 30, min: 10, max: 90, period: 12, depth: 15 },
    startedAt: 0, sent: { speed: -1, min: -1, max: -1 }, timer: null,
    async play(pattern, params = {}) {
        if (!S().enabled) return;
        if (S().transport === 'hsp') return actEngine.apply(patternAsAct(pattern, params));   // pattern mode uses API v2; firmware 4 streams through v3
        if (calib.gate(() => this.play(pattern, params))) return;
        const my = epoch; this.starting++;
        try {
            if (actEngine.running) await actEngine.stop();
            if (my !== epoch) return;
            if (pattern && PATTERNS[pattern]) this.pattern = pattern;
            Object.assign(this.params, params);
            this.startedAt = Date.now(); lastActivity = Date.now();
            if (!this.running) {
                try { await api.hampStart(); }
                catch (e) { toast(`Handy start failed: ${e.message}`, 'error'); return; }
                if (my !== epoch) { try { await api.hampStop(); } catch { /* best effort */ } return; }   // stopped mid-start
                this.running = true; this.sent = { speed: -1, min: -1, max: -1 };
            }
            if (!this.timer) this.timer = setInterval(() => this.tick(), S().tickMs);
            this.tick();   // apply your speed and stroke limits right away, not one tick later
        } finally { this.starting--; ui.refresh(); updatePrompt(); }
    },
    async stop(reason = '') {
        const was = this.running;
        clearInterval(this.timer); this.timer = null; this.running = false;
        try { await api.hampStop(); } catch (e) { if (was) toast(`Stop failed: ${e.message}`, 'error'); }
        if (reason) toast(`Handy stopped: ${reason}`, 'info');
        ui.refresh(); updatePrompt();
    },
    async tick() {
        const s = S();
        if (!this.running || api.busy) return;
        if (s.idleStopSec > 0 && Date.now() - lastActivity > s.idleStopSec * 1000) return stopAll('idle timeout');
        const r = PATTERNS[this.pattern]((Date.now() - this.startedAt) / 1000, { ...this.params, period: Math.max(2, this.params.period) });
        const [lo, hi] = strokeRange();
        const tg = { speed: clamp(r.speed, Math.min(s.minSpeed, maxPct()), maxPct()), min: clamp(r.min, lo, hi), max: clamp(r.max, lo, hi) };
        api.busy = true;
        try {
            if (Math.abs(tg.min - this.sent.min) >= 3 || Math.abs(tg.max - this.sent.max) >= 3) {
                const a = toDev(tg.min), b = toDev(tg.max);
                await api.slide(Math.min(a, b), Math.max(a, b)); this.sent.min = tg.min; this.sent.max = tg.max;
            }
            if (Math.abs(tg.speed - this.sent.speed) >= 2) { await api.velocity(tg.speed); this.sent.speed = tg.speed; }
        } catch (e) { console.warn('[Handy]', e); } finally { api.busy = false; }
        $('#handy_live').text(`${this.pattern} · ${Math.round(tg.speed)} · ${Math.round(tg.min)}–${Math.round(tg.max)}`);
    },
};

let lastActivity = Date.now();
const anyRunning = () => actEngine.running || hamp.running;
const anyActive = () => anyRunning() || actEngine.starting > 0 || hamp.starting > 0 || calib.active;   // moving, or about to
function stopAll(reason) {
    epoch++;   // cancels every start that is in progress or queued
    clearTimeout(windTimer);
    windUntil = 0;
    if (!inBeat) clearBeats();   // tags still waiting for their moment in the reply are dropped
    climax.cancel();
    const jobs = [];
    if (calib.active) jobs.push(calib.abort());
    if (actEngine.running || actEngine.starting > 0) jobs.push(actEngine.stop(reason));
    if (hamp.running || hamp.starting > 0) jobs.push(hamp.stop(reason));
    const done = Promise.allSettled(jobs);
    chain = Promise.allSettled([chain, done]);   // commands issued after the stop wait until the device has been told
    return done;
}

// ---------------------------------------------------------------- following the prose
// When a reply has no tag, read what it describes and nudge the motion that is already playing. It never
// starts or stops the device: only an explicit tag, a button or your own words do that.
const CUES = [
    [/\b(faster|speeds? up|speeding up|quickens?|quickening|picks? up (the|her|his|their) pace|picking up (the|her|his|their) pace|harder|frantic(ally)?|furious(ly)?|relentless(ly)?|pounding|rougher|urgent(ly)?)\b/, { di: 0.15 }],
    [/\b(slows?( down)?|slowing( down)?|slower|eases? (off|up)|easing (off|up)|gentl(y|er)|languid(ly)?|unhurried|leisurely|lazily|tender(ly)?)\b/, { di: -0.15 }],
    [/\b(deeper|all the way down|to the (base|hilt|root)|takes? (you|him|it|them) (all|deep|whole)|swallows? (you|him|it|them)|deep[- ]?throats?)\b/, { dd: -0.3 }],
    [/\b(just the tip|only the tip|around the (tip|head)|at the (tip|head)|shallow(er)?( strokes)?)\b/, { dd: 0.3 }],
    [/\b(pauses?|pausing|holds? (perfectly )?still|stops? moving|goes still|freezes?|lingers?)\b/, { hold: true }],
];
const CUE_NEG = /(n't|\b(?:not|no|never|without|instead of|refus\w+|won't|before|until|if|when you|wants? (me|her|him|them) to|ask\w* (me|her|him|them) to|begs?|pleads?))\b[^.!?]{0,40}$/i;
function proseCues(text) {
    const out = [], me = String(ctx().name1 || '').trim().toLowerCase();
    let offset = 0;
    for (const sent of String(text).split(/(?<=[.!?…\n])\s+/)) {
        const at = offset; offset += sent.length + 1;
        const low = sent.toLowerCase().trim();
        if (!low || /\?["”'*]?\s*$/.test(low)) continue;                                  // a question decides nothing
        if (/^["“*_\s]*(you|your)\b/.test(low) || (me && low.replace(/^["“*_\s]+/, '').startsWith(me))) continue;   // what YOU do, not the character
        for (const [re, eff] of CUES) {
            const m = re.exec(low);
            if (!m || CUE_NEG.test(low.slice(0, m.index))) continue;
            out.push({ idx: at + m.index, ...eff });
            break;   // one cue per sentence
        }
        if (out.length >= 4) break;
    }
    return out;
}
function runCue(c) {
    if (!S().enabled || !actEngine.running || climax.active || Date.now() < windUntil || calib.active) return;
    const i = actEngine.intent, cmd = { _cue: true };
    if (c.hold) cmd.intensity = clamp(i.intensity * 0.35, 0.05, 1);
    if (c.di) cmd.intensity = clamp(i.intensity + c.di, 0.05, 1);
    if (c.dd) cmd.depth = clamp(i.depth + c.dd, -1, 1);
    return actEngine.apply(cmd);
}

// ---------------------------------------------------------------- setups
// Saved calibrations for the different ways you use the Handy (lying down, sitting, a mount). Switching
// stops any motion first, because the same stroke lands somewhere else on the device.
const setups = {
    list: () => (S().setups ??= []),
    find(name) { const n = String(name || '').trim().toLowerCase(); return this.list().find((x) => x.name.toLowerCase() === n) || null; },
    save(name) {
        const c = cal(); name = String(name || '').trim().slice(0, 30);
        if (!name) return false;
        if (!c) { toast('Calibrate first, then save it as a setup.', 'warning'); return false; }
        const ex = this.find(name), rec = { name: ex?.name || name, base: c.base, tip: c.tip, at: c.at || today() };
        if (ex) Object.assign(ex, rec); else this.list().push(rec);
        S().setupName = rec.name; save(); ui.refresh();
        toast(`Saved setup “${rec.name}”`, 'success');
        return true;
    },
    async use(name) {
        const x = this.find(name); if (!x) return false;
        if (anyRunning() || actEngine.starting > 0 || hamp.starting > 0) await stopAll('setup changed');
        S().calibration = { base: x.base, tip: x.tip, at: x.at }; S().setupName = x.name;
        save(); ui.refresh(); ui.calib(); updatePrompt();
        if (!calib.active) toast(`Setup “${x.name}”: base at ${x.base}, tip at ${x.tip}`, 'info');
        return true;
    },
    remove(name) {
        const x = this.find(name); if (!x) return;
        S().setups = this.list().filter((y) => y !== x);
        if (S().setupName === x.name) S().setupName = null;
        save(); ui.refresh();
    },
};

// ---------------------------------------------------------------- reply pacing
// A reply can hold several tags. Each plays when the reader reaches it: the first at once, the rest after
// the words between them at the reading speed. STOP, a new AI message or a chat change drops what is waiting.
let beats = [], inBeat = false;
function clearBeats() { for (const t of beats) clearTimeout(t); beats = []; }
function runBeat(a) {
    if (a._cue) return void enqueue(() => runCue(a));
    if (isStop(a)) { inBeat = true; try { stopAll(); } finally { inBeat = false; } return; }   // later tags in the same reply still play
    enqueue(() => runCommand(a));
}

// ---------------------------------------------------------------- climax push
// <handy climax="30"/> or the "Finish me" button: build steadily to a peak over that many seconds, on the act
// that has made you finish most (unless one is named or already playing), favouring the phrases that were
// playing when you finished before. It holds the peak for a minute, then eases off if you haven't finished.
const climax = {
    active: false, timer: null, t0: 0, ms: 30000, from: 0.5, sent: 0,
    bestAct() {
        const pr = S().profile, r = chars.current(), lib = LIB();
        const score = (a) => 2 * (pr.acts[a]?.finishes || 0) + (pr.acts[a]?.edges || 0) * 0.5 + Math.max(0, r?.acts?.[a]?.score || 0);
        const best = Object.keys(lib.acts).map((a) => [a, score(a)]).sort((x, y) => y[1] - x[1])[0];
        return best && best[1] > 0 ? best[0] : (actEngine.intent.act || Object.keys(lib.acts)[0]);
    },
    async start(a = {}) {
        if (!S().enabled) return;
        if (calib.gate(() => this.start(a))) return;
        const secs = clamp(num(a.climax) > 0 ? num(a.climax) : num(a.duration) > 0 ? num(a.duration) : 30, 10, 90);
        const act = resolveAct(LIB(), a.act) || (actEngine.running ? actEngine.intent.act : this.bestAct());
        const from = clamp(actEngine.running ? actEngine.intent.intensity : 0.45, 0.45, 0.9);
        this.cancel();
        Object.assign(this, { active: true, t0: Date.now(), ms: secs * 1000, from, sent: from });
        actEngine.intent.climax = true;
        await actEngine.apply({ act, intensity: from, _climax: true });
        if (!this.active) return;                               // stopped while it was starting
        if (!actEngine.running) return this.cancel();
        this.timer = setInterval(() => this.tick(), 1000);
        ui.refresh(); updatePrompt();
    },
    tick() {
        if (!this.active) return;
        if (!actEngine.running) return this.cancel();
        const el = Date.now() - this.t0, k = clamp(el / this.ms, 0, 1);
        if (el > this.ms + 60000) {   // a minute at the peak and no finish: ease off and let the AI decide what next
            this.cancel();
            actEngine.intent.intensity = 0.6;
            logEvent('climax-missed');
            enqueue(() => actEngine.running && actEngine.regen());
            ui.refresh(); return updatePrompt();
        }
        const target = this.from + (1 - this.from) * Math.pow(k, 1.4);
        if (target - this.sent >= 0.08 || (k >= 1 && this.sent < 1)) {   // a handful of steps, each joined at a turning point
            this.sent = k >= 1 ? 1 : target;
            actEngine.intent.intensity = this.sent;
            lastActivity = Date.now();
            enqueue(() => actEngine.running && this.active && actEngine.regen());
            ui.refresh();
        }
    },
    cancel() {
        clearInterval(this.timer); this.timer = null;
        this.active = false; actEngine.intent.climax = false;
    },
};

// ---------------------------------------------------------------- arousal estimate
// A running guess at how close you are, from what is playing, for how long, and your own signals. It is
// only an estimate: without an "I'm close" from you it never claims more than 85%, and it learns your pace
// from when you do signal. The AI is told, so characters can pace, tease and time a finish.
const arousal = {
    level: 0, last: Date.now(), edgeUntil: 0, refractoryUntil: 0, atCap: 0, shown: -1,
    DEFAULT_K: 1 / 240,
    k() { return S().profile.arousalK ?? this.DEFAULT_K; },
    setK(v) { S().profile.arousalK = clamp(v, 1 / 900, 1 / 45); save(); },
    tick(now = Date.now()) {
        const dt = clamp((now - this.last) / 1000, 0, 5); this.last = now;
        if (!dt) return;
        const i = actEngine.running ? clamp(actEngine.intent.intensity, 0, 1) : hamp.running ? clamp(hamp.params.speed / 100, 0, 1) : null;
        if (i === null) this.level -= (this.level * dt) / 90;   // nothing moving: it fades
        else {
            const g = now < this.refractoryUntil ? 0.3 : 1;
            this.level += dt * (this.k() * g * (0.3 + 0.7 * i) - (this.level * (1 - i) * (1 - i)) / 120);
        }
        const cap = now < this.edgeUntil ? 1 : 0.85;
        if (i !== null && this.level >= cap && cap < 1) {
            // sitting at "nearly there" for a minute with no word from you: the guess runs fast for you
            this.atCap += dt;
            if (this.atCap > 60) { this.atCap = 0; this.setK(this.k() * 0.88); this.level = 0.72; }
        } else this.atCap = 0;
        this.level = clamp(this.level, 0, cap);
        if (Math.abs(this.level - this.shown) >= 0.05) { this.shown = this.level; ui.arousal(); updatePrompt(); }
    },
    learn() { if (anyRunning() && this.level < 0.88) this.setK(this.k() * Math.pow(0.9 / Math.max(this.level, 0.25), 0.25)); },   // you got there sooner than guessed
    close() { this.learn(); this.level = Math.max(this.level, 0.92); this.edgeUntil = Date.now() + 45000; this.shown = this.level; ui.arousal(); },
    finish() { this.learn(); this.level = 0.05; this.edgeUntil = 0; this.refractoryUntil = Date.now() + 300000; this.shown = this.level; ui.arousal(); },
    label() {
        if (Date.now() < this.refractoryUntil && this.level < 0.3) return 'just finished: sensitive and recovering';
        const l = this.level;
        return l < 0.15 ? 'not warmed up yet' : l < 0.4 ? 'warming up' : l < 0.65 ? 'building' : l < 0.86 ? 'getting close' : 'on the edge';
    },
    text() {
        if (!S().arousalMeter) return '';
        return `AROUSAL ESTIMATE: about ${Math.round(this.level * 100)}% (${this.label()}). This is a guess from the motion, the time and the user's own signals; use it to pace the scene (tease and build when it is low, back off or hold to edge them when it is high, <handy climax/> to push them over). Trust what the user says over this number.`;
    },
};

// ---------------------------------------------------------------- character styles
// Every character gets their own way of moving the Handy: read from their card, shaped by your feedback
// while they are in control, and remembered. The character in control is whoever wrote the last message
// with a tag (so group chats work), else the chat's character.
const chars = {
    who: null,          // key of the character whose tag is driving the device
    seen: new Set(),    // keys whose card was checked for changes this session
    reading: new Set(), tried: new Set(), warned: false,
    speaker: null,                  // group chats: the character about to write (their style and memory go in the prompt)
    partner: null, duet: 'turns',   // a second character acting together with the one in control
    lastMove: null,                 // the signature move last played: { name, act, t }
    keyOf(msg) {
        const c = ctx();
        if (msg?.original_avatar) return msg.original_avatar;   // group chats tag each message with its character
        if (!c.groupId) { const ch = c.characters?.[c.characterId]; if (ch?.avatar) return ch.avatar; }
        const byName = Array.isArray(c.characters) ? c.characters.find((x) => x?.name && x.name === msg?.name) : null;
        if (byName?.avatar) return byName.avatar;
        return msg?.name ? `name:${msg.name}` : null;
    },
    chatDefault() { const c = ctx(); return c.groupId ? null : (c.characters?.[c.characterId]?.avatar ?? null); },
    activeKey() { return S().charStyles ? (this.who ?? this.chatDefault()) : null; },
    card(key) {
        const list = ctx().characters;
        const ch = Array.isArray(list) ? list.find((x) => x?.avatar === key) : null;
        if (!ch) return null;
        const d = ch.data || {};
        const tags = ch.tags || d.tags || [];
        const text = [ch.description ?? d.description, ch.personality ?? d.personality, ch.scenario ?? d.scenario, Array.isArray(tags) ? tags.join(', ') : '']
            .filter(Boolean).join('\n');
        return { name: ch.name, text };
    },
    // The stored record for a character, created (and read from the card) the first time they are seen.
    get(key) {
        if (!key) return null;
        const all = (S().characters ??= {});
        let r = all[key];
        const card = this.seen.has(key) && r ? null : this.card(key);
        this.seen.add(key);
        if (!r) {
            const seed = seedStyle(card?.text || '');
            r = all[key] = { name: card?.name || key.replace(/^name:/, '').replace(/\.png$/i, ''), traits: seed.traits, hits: seed.hits, custom: false,
                source: 'words', hash: card ? textHash(card.text) : null, learned: EMPTY_LEARNED(), motifs: {}, acts: {},
                minutes: 0, loves: 0, nopes: 0, edges: 0, finishes: 0, intensity: null, since: today() };
            save();
        } else if (card) {
            r.name = card.name || r.name;
            const h = textHash(card.text);
            if (h !== r.hash && !r.custom) {   // the card was edited: read it again (what you taught them is kept)
                const seed = seedStyle(card.text); r.traits = seed.traits; r.hits = seed.hits; r.hash = h; r.source = 'words'; save();
            }
        }
        r.learned = { ...EMPTY_LEARNED(), ...r.learned }; r.motifs ??= {}; r.acts ??= {};
        // A better reading from a language model, once per card (and again if the card changes).
        if (card && !r.custom && r.aiHash !== r.hash && !this.tried.has(key + r.hash)) this.aiRead(key).catch(() => {});
        return r;
    },
    // The connection profile chosen to read cards, if it exists and this SillyTavern can call profiles.
    profileId() {
        const want = String(S().styleProfile || '').trim(); if (!want) return null;
        const c = ctx(), list = c.extensionSettings?.connectionManager?.profiles;
        const p = Array.isArray(list) ? list.find((x) => x?.name === want) : null;
        return p && typeof c.ConnectionManagerRequestService?.sendRequest === 'function' ? p.id : null;
    },
    // Ask the model to rate the seven traits from the card. The keyword reading stays if anything goes wrong.
    async aiRead(key, force = false) {
        const r = S().characters?.[key], card = this.card(key), id = this.profileId();
        if (!r || !card || !card.text.trim() || !id || (r.custom && !force) || this.reading.has(key)) return false;
        const hash = textHash(card.text);
        this.reading.add(key); this.tried.add(key + hash);
        try {
            const res = await ctx().ConnectionManagerRequestService.sendRequest(id, aiPrompt(card.name, card.text), 400);
            const out = parseAi(typeof res === 'string' ? res : res?.content ?? res?.text ?? res?.choices?.[0]?.message?.content ?? '');
            if (!out) throw new Error('the model gave no usable answer');
            const cur = S().characters?.[key];
            if (!cur || (cur.custom && !force)) return false;   // deleted, or you adjusted it meanwhile
            Object.assign(cur, { traits: out.traits, why: out.why, source: 'ai', custom: false, hash, aiHash: hash });
            save();
            if (actEngine.running && this.activeKey() === key) enqueue(() => actEngine.running && actEngine.regen());
            ui.refresh(); updatePrompt();
            return true;
        } catch (e) {
            console.warn('[Handy] reading the card with a model failed', e);
            if (!this.warned) { this.warned = true; toast(`Couldn't read ${card.name}'s card with the "${S().styleProfile}" profile (${e?.message || e}). Using the keyword reading instead.`, 'warning'); }
            return false;
        } finally { this.reading.delete(key); }
    },
    current() { return this.get(this.activeKey()); },
    promptKey() { return !S().charStyles ? null : (ctx().groupId && this.speaker) || this.activeKey(); },
    keyByName(name) {
        const n = String(name || '').trim().toLowerCase(); if (!n) return null;
        const list = ctx().characters, ch = Array.isArray(list) ? list.find((x) => x?.name && x.name.toLowerCase() === n) : null;
        if (ch?.avatar) return ch.avatar;
        const known = Object.entries(S().characters || {}).find(([, r]) => String(r.name).toLowerCase() === n);
        return known ? known[0] : `name:${String(name).trim()}`;
    },
    // with="NAME" on a tag: that character joins in. A tag naming an act without it means one character again.
    setPartner(name, mode) {
        const off = !name || name === true || /^(none|no one|nobody|solo|alone)$/i.test(String(name).trim());
        const key = off || !S().charStyles ? null : this.keyByName(name);
        // only a character SillyTavern knows (or one you already have a style for): a made-up name is ignored
        const real = key && (!key.startsWith('name:') || !!S().characters?.[key]);
        this.partner = real && key !== this.activeKey() ? key : null;
        this.duet = /^(together|both|unison|as one)$/i.test(String(mode || '').trim()) ? 'together' : 'turns';
    },
    partnerRec() { return this.partner && S().charStyles && this.activeKey() ? this.get(this.partner) : null; },
    actives() { return [this.current(), this.partnerRec()].filter(Boolean); },
    // What the synthesizer needs for whoever is acting: { intent: { style } | { styles, duet }, keys }.
    cast() {
        const fx = (r) => ({ ...styleEffect(r.traits, r.learned), motifs: r.motifs });
        const a = this.current(), b = a ? this.partnerRec() : null;
        if (a && b) return { intent: { styles: [fx(a), fx(b)], duet: this.duet }, keys: [this.activeKey(), this.partner] };
        return { intent: { style: a ? fx(a) : null }, keys: [] };
    },
    // ---- session memory: what happened with this character, kept as short recaps the AI can refer back to
    sess(r) {
        const now = Date.now();
        if (!r.now || now - r.now.t > 3 * 3600e3) {   // three quiet hours ends a session
            if (r.now && (r.now.minutes > 0 || r.now.edges || r.now.finishes)) { (r.recaps ??= []).push(r.now); if (r.recaps.length > 5) r.recaps.shift(); }
            r.now = { date: today(now), t: now, minutes: 0, edges: 0, finishes: 0, loves: 0, acts: {}, finishedWith: [] };
        }
        r.now.t = now;
        return r.now;
    },
    recap(x) {
        const acts = Object.entries(x.acts || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
        return [`${x.date}`, x.minutes ? `${x.minutes} min` : 'a short one', acts.length ? `mostly ${acts.join(', ')}` : '', x.edges ? `edged ${x.edges}×` : '',
            x.finishes ? `finished ${x.finishes}×${x.finishedWith?.length ? ` (${x.finishedWith.slice(-2).join('; ')})` : ''}` : 'did not finish', x.loves ? `${x.loves} ❤` : ''].filter(Boolean).join(', ');
    },
    // What the synthesizer needs: the style's effect on motion, plus the character's own favourite phrases.
    effect() { const r = this.current(); return r ? { ...styleEffect(r.traits, r.learned), motifs: r.motifs } : null; },   // the character in control alone
    act(r, act) { return (r.acts[act] ??= { n: 0, score: 0 }); },
    // A tag (or your choice on the panel) while this character is in control: remember their habits.
    noteTag(act, intensity) {
        const r = this.current(); if (!r || !act) return;
        this.act(r, act).n++;
        const se = this.sess(r); se.acts[act] = (se.acts[act] || 0) + 1;
        if (intensity !== undefined) r.intensity = r.intensity == null ? intensity : r.intensity + 0.2 * (intensity - r.intensity);
        r.updated = Date.now();
    },
    text() {
        const key = this.promptKey(), r = this.get(key); if (!r) return '';
        const mover = key !== this.activeKey() ? this.current() : null;   // someone else's tag is driving the device right now
        const acts = Object.entries(r.acts).filter(([, a]) => a.n > 0).sort((a, b) => (b[1].score + 0.1 * b[1].n) - (a[1].score + 0.1 * a[1].n));
        const fav = acts.filter(([, a]) => a.score > 0.5).slice(0, 3).map(([k]) => k);
        const hist = [r.minutes ? `${r.minutes} min together` : '', r.edges ? `brought them to the edge ${r.edges}×` : '', r.finishes ? `made them finish ${r.finishes}×` : '',
            fav.length ? `the user loves it when ${r.name} does ${fav.join(', ')}` : '', r.intensity != null && acts.length ? `usually goes at intensity ~${r.intensity.toFixed(1)}` : ''].filter(Boolean);
        return `CHARACTER STYLE: ${r.name} moves the device their own way: ${describeStyle(r.traits, r.learned)}. The device already plays it in that style; choose acts and intensity the way ${r.name} would${hist.length ? `. History with the user: ${hist.join('; ')}` : ''}.${this.memory(r)}${mover ? ` Right now ${mover.name} is the one moving the device; a tag from ${r.name} hands it over to ${r.name}'s style.` : this.duetText()}`;
    },
    memory(r) {
        const past = (r.recaps || []).slice(-2).map((x) => this.recap(x));
        const cur = r.now && Date.now() - r.now.t < 3 * 3600e3 && (r.now.minutes > 0 || r.now.edges || r.now.finishes) ? this.recap(r.now) : '';
        if (!past.length && !cur) return '';
        return ` SESSION MEMORY with ${r.name}:${past.length ? ` earlier sessions: ${past.join(' | ')}.` : ''}${cur ? ` This session so far: ${cur}.` : ''} ${r.name} remembers these and may refer back to them naturally.`;
    },
    duetText() {
        const p = this.partnerRec();
        return p ? ` ${p.name} has joined in (${this.duet === 'together' ? 'moving as one' : 'taking turns'}): ${p.name}'s style is ${describeStyle(p.traits, p.learned)}.` : '';
    },
    summary(r) { return r ? `${r.name}: ${describeStyle(r.traits, r.learned)}` : ''; },
};

// ---------------------------------------------------------------- learning
function actPrefs(act) {
    return (S().profile.acts[act] ??= { rateMul: 1, ampMul: 1, centerShift: 0, variation: 0.35, score: 0, n: 0, loves: 0, keptSec: 0 });
}
// Fold the user's live adjustments into the act's long-term preferences.
// With a character in control, half of each adjustment is theirs (how you like it when THEY do it) and half
// is your general taste for the act, so the total change is the same as before.
function absorb(alpha) {
    const i = actEngine.intent; if (!i.act) return;
    const a = actPrefs(i.act), rs = chars.actives(), w = rs.length ? 0.5 : 0, wr = w / (rs.length || 1);   // two characters share the character half
    const k = (m) => Math.pow(m, alpha);
    const sm = k(i.speedMul), am = k(i.ampMul);
    a.rateMul = clamp(a.rateMul * Math.pow(sm, 1 - w), 0.3, 3); i.speedMul /= sm;
    a.ampMul = clamp(a.ampMul * Math.pow(am, 1 - w), 0.3, 2.5); i.ampMul /= am;
    a.centerShift = clamp(a.centerShift + 25 * i.depthOff * alpha * (1 - w), -40, 40);
    const baseVar = i.variation ?? a.variation;
    a.variation = clamp(a.variation + (baseVar + i.varOff * (1 - w) - a.variation) * alpha, 0, 1);
    for (const r of rs) {
        const L = r.learned;
        L.rateMul = clamp(L.rateMul * Math.pow(sm, wr), 0.5, 2);
        L.ampMul = clamp(L.ampMul * Math.pow(am, wr), 0.5, 2);
        L.centerShift = clamp(L.centerShift + 25 * i.depthOff * alpha * wr, -30, 30);
        L.varOff = clamp(L.varOff + i.varOff * alpha * wr, -0.4, 0.4);
    }
    i.depthOff *= 1 - alpha; i.varOff *= 1 - alpha;
}
// Rate the phrases that were playing, and the phrase-to-phrase transitions
// into them, so the engine learns both what you like and what to chain.
function creditMotifs(reward, windowMs = 8000, alpha = 0.3) {
    const pr = S().profile, now = Date.now(), all = chars.actives();
    const seq = actEngine.used.filter((u) => u.motif && u.from < now).sort((a, b) => a.from - b.from);
    const before = (i) => { for (let k = i - 1; k >= 0; k--) if (!seq[k].orn) return seq[k].motif; return null; };   // a detail touch is not a link in the chain
    for (let i = 0; i < seq.length; i++) {
        const u = seq[i];
        if (u.to <= now - windowMs) continue;
        // a phrase you already rated and that has since been replaced keeps that verdict
        if (u.rated && u.to <= now && Math.sign(u.rated) !== Math.sign(reward)) continue;
        reinforce(pr.motifs, u.motif, reward, alpha);
        // and the favourites of whoever was doing it: in a duet, the one whose turn it was
        for (const r of (u.who ? [chars.get(u.who)].filter(Boolean) : all)) reinforce(r.motifs, u.motif, reward, alpha);
        const pv = u.orn ? null : before(i);
        if (pv) reinforce(pr.trans, `${pv}>${u.motif}`, reward, alpha);
        if (!u.rated || Math.sign(u.rated) !== Math.sign(reward)) countRating(u.motif, reward);
        u.rated = reward;
    }
    pruneTrans();
    for (const r of all) { const k = Object.keys(r.motifs); if (k.length > 400) k.sort((x, y) => Math.abs(r.motifs[x]) - Math.abs(r.motifs[y])).slice(0, k.length - 300).forEach((x) => delete r.motifs[x]); }
}
// A phrase you have turned down three times, more than twice as often as you liked it, is retired
// for good (Reset under Learned taste brings it back). Up to then, "Not this" only makes it rarer.
function countRating(id, reward) {
    const pr = S().profile, st = (pr.motifStats[id] ??= { love: 0, nope: 0 });
    if (reward >= 1) st.love++; else if (reward < 0) st.nope++;
    if (st.nope >= 3 && st.nope > 2 * st.love) pr.banned[id] = true;
}
// Phrases that finished with no reaction count as a weak "fine" signal.
function settlePhrases() {
    const pr = S().profile, now = Date.now();
    const seq = actEngine.used.filter((u) => u.motif).sort((a, b) => a.from - b.from);
    for (let i = 0; i < seq.length; i++) {
        const u = seq[i];
        if (u.settled || u.to > now - 2000) continue;
        u.settled = true;
        if (u.rated) continue;
        reinforce(pr.motifs, u.motif, REWARD.neutral, 0.05);
        let pv = null; if (!u.orn) for (let k = i - 1; k >= 0 && !pv; k--) if (!seq[k].orn) pv = seq[k].motif;
        if (pv) reinforce(pr.trans, `${pv}>${u.motif}`, REWARD.neutral, 0.05);
    }
}
function pruneTrans() {
    const t = S().profile.trans, keys = Object.keys(t);
    if (keys.length > 3000) keys.sort((a, b) => Math.abs(t[a]) - Math.abs(t[b])).slice(0, keys.length - 2500).forEach((k) => delete t[k]);
}
let lastImplicit = Date.now();
function implicitLearn() {
    if (Date.now() - lastImplicit < 60000) return;
    lastImplicit = Date.now();
    if (actEngine.running && Date.now() - lastActivity < 180000) {
        absorb(0.05); settlePhrases(); actPrefs(actEngine.intent.act).score += 0.1;
        const r = chars.current();
        if (r) {   // time together: an inexperienced character slowly grows more confident with you
            r.minutes++; chars.sess(r).minutes++;
            if (r.traits.exp + r.learned.expGain < 0.85) r.learned.expGain = Math.min(0.45, r.learned.expGain + 0.008);
        }
        save();
    }
}
function logEvent(kind) {
    const pr = S().profile;
    const e = actEngine.running
        ? { kind, t: Date.now(), act: actEngine.intent.act, intensity: +actEngine.intent.intensity.toFixed(2) }
        : { kind, t: Date.now(), pattern: hamp.pattern, speed: Math.round(hamp.params.speed) };
    pr.log.push(e); if (pr.log.length > 300) pr.log.splice(0, pr.log.length - 300);
    pending.push(e);
}
let pending = [];

const FEEDBACK = {
    faster:  { label: 'Faster',  icon: 'fa-angles-up',     act: (i) => { i.speedMul *= 1.15; }, pat: (p) => { p.speed += 8; } },
    slower:  { label: 'Slower',  icon: 'fa-angles-down',   act: (i) => { i.speedMul /= 1.15; }, pat: (p) => { p.speed -= 8; } },
    longer:  { label: 'Longer',  icon: 'fa-arrows-up-down', act: (i) => { i.ampMul *= 1.15; }, pat: (p) => { p.min -= 8; p.max += 8; } },
    shorter: { label: 'Shorter', icon: 'fa-compress',      act: (i) => { i.ampMul /= 1.15; }, pat: (p) => { p.min += 8; p.max -= 8; } },
    up:      { label: 'Tip',     icon: 'fa-arrow-up',      act: (i) => { i.depthOff += 0.2; }, pat: (p) => { p.min += 6; p.max += 6; } },
    down:    { label: 'Base',    icon: 'fa-arrow-down',    act: (i) => { i.depthOff -= 0.2; }, pat: (p) => { p.min -= 6; p.max -= 6; } },
    more:    { label: 'Wilder',  icon: 'fa-wave-square',   act: (i) => { i.varOff += 0.15; }, pat: (p) => { p.depth += 6; } },
    less:    { label: 'Smoother', icon: 'fa-minus',        act: (i) => { i.varOff -= 0.15; }, pat: (p) => { p.depth -= 6; } },
    love:    { label: 'Love this', icon: 'fa-heart' },
    nope:    { label: 'Not this',  icon: 'fa-thumbs-down' },
    close:   { label: "I'm close", icon: 'fa-fire' },
    climax:  { label: 'Finish me', icon: 'fa-bolt' },
    finish:  { label: 'Finished',  icon: 'fa-champagne-glasses' },
};

// ---------------------------------------------------------------- focus learning
// What you are watching while you play is learned like the motion is. Tags may carry scene="WHAT KIND OF
// SCENE" and watch="WHAT TO FOCUS ON"; every second with the device moving, every edge, ❤, 👎, beg and
// finish is credited to what was on screen (each exact phrase, the scene, and broad tags such as "eye
// contact" read from the words). Finishes also credit what was on screen in the 90 s before, by time
// share. The AI is told what has made you finish, what gets you to the edge fastest, what keeps you
// simmering, and what does nothing for you, with a strategy for the game being played.
const FOCUS_TAGS = [
    ['eye contact', /\b(eyes?|eye contact|stares?|staring|gaze|looking (at|into) (the )?(camera|lens|you))\b/],
    ['mouth & lips', /\b(mouth|lips?|tongue|licks?|licking|spit|drool\w*|sloppy|kiss\w*)\b/],
    ['going deep', /\b(deep|deeper|throat\w*|gag\w*|all the way|to the base|takes? it all)\b/],
    ['breasts', /\b(breasts?|tits?|titties|boobs?|nipples?|cleavage)\b/],
    ['ass', /\b(ass|butt|booty|bum)\b/],
    ['curves & thighs', /\b(thighs?|hips?|curv\w*|thick|belly|plump|bbw|soft body)\b/],
    ['pussy', /\b(pussy|pussies|labia|clit\w*)\b/],
    ['face & expressions', /\b(face|faces|expressions?|blush\w*|smil\w*|smirk\w*)\b/],
    ['sounds & voice', /\b(sounds?|moan\w*|voice|whimper\w*|gasp\w*|dirty talk|talking|begs?|begging|squeal\w*)\b/],
    ['POV & close-ups', /\b(pov|close[- ]?ups?|camera|angle|from above|from below)\b/],
    ['cum', /\b(cum\w*|facial|creampie|swallow\w*|load)\b/],
    ['mature women', /\b(milfs?|mature|moms?|mommy|mother|older|cougars?|wrinkles?|experienced)\b/],
    ['hands', /\b(hands?|fingers?|grip\w*|handjob)\b/],
    ['riding', /\b(rid(e|es|ing)|bounc\w*|cowgirl|grind\w*)\b/],
    ['wetness', /\b(wet|dripping|glisten\w*|slick|sweat\w*|messy)\b/],
    ['teasing', /\b(teas\w*|slow(ly)?|denial)\b/],
    ['legs & feet', /\b(feet|foot|toes|legs?|stockings?|heels)\b/],
];
const focus = {
    cur: null,      // { phrase, scene, tags, act, since, lastEdge }
    prev: [],       // what was on screen before, with when it ended (last 2 minutes)
    unsaved: 0,
    store() { return (S().profile.focus ??= { items: {}, finishes: [], sec: 0, edges: 0 }); },
    tagsOf(text) { const t = norm(text); return t ? FOCUS_TAGS.filter(([, re]) => re.test(t)).map(([k]) => k) : []; },
    keys(f) {
        if (!f) return [];
        const k = [];
        if (f.phrase) k.push(['w:' + norm(f.phrase), f.phrase, { scene: f.scene, act: f.act }]);
        if (f.scene) k.push(['s:' + norm(f.scene), f.scene]);
        for (const t of f.tags) k.push(['t:' + t, t]);
        return k;
    },
    item(key, label, extra) {
        const it = (this.store().items[key] ??= { label, sec: 0, edges: 0, finishes: 0, loves: 0, nopes: 0, begs: 0, toEdge: 0, toEdgeN: 0, last: 0 });
        it.label = label; if (extra?.scene) it.scene = extra.scene; if (extra?.act) it.act = extra.act;
        return it;
    },
    // A tag's scene= and/or watch=: a new focus begins (a new scene without a new watch clears the old watch).
    set(a) {
        const watch = a.watch && a.watch !== true ? String(a.watch).trim().slice(0, 120) : null;
        const scene = a.scene && a.scene !== true ? String(a.scene).trim().slice(0, 80) : null;
        if (!watch && !scene) return false;
        const c = this.cur, now = Date.now();
        const next = { phrase: watch ?? (scene ? '' : c?.phrase || ''), scene: scene ?? c?.scene ?? '' };
        if (c && next.phrase === c.phrase && next.scene === c.scene) return false;
        if (c) { this.prev.push({ ...c, until: now }); this.prev = this.prev.filter((p) => now - p.until < 120000); }
        this.cur = { ...next, tags: this.tagsOf(`${next.scene} ${next.phrase}`), act: a.act && a.act !== true ? String(a.act) : actEngine.intent.act, since: now, lastEdge: now };
        const newScene = !!scene && scene !== c?.scene;
        ui.refresh();
        return newScene ? 'scene' : 'watch';
    },
    clear() { if (this.cur) this.prev.push({ ...this.cur, until: Date.now() }); this.cur = null; },
    tick(dt) {
        if (!this.cur || !anyRunning()) return;
        for (const [k, l, x] of this.keys(this.cur)) { const it = this.item(k, l, x); it.sec += dt; it.last = Date.now(); }
        this.store().sec += dt;
        if ((this.unsaved += dt) >= 15) { this.unsaved = 0; save(); }
    },
    // kind: edges | finishes | loves | nopes | begs. The focus on screen gets full credit; for a finish, what
    // was on screen in the last 90 s shares it by time, and for anything else the one just before (if it
    // changed under 20 s ago) gets half.
    credit(kind) {
        const now = Date.now(), c = this.cur, st = this.store();
        const parts = [];
        if (kind === 'finishes') {
            const win = 90000, from = now - win;
            const spans = [...this.prev.filter((p) => p.until > from), ...(c ? [{ ...c, until: now }] : [])]
                .map((p) => ({ f: p, ms: Math.max(0, p.until - Math.max(p.since, from)) })).filter((x) => x.ms > 0);
            // what was on screen at the moment counts most (at least 60%); the rest share the remainder by time
            const tot = spans.reduce((s, x) => s + x.ms, 0), curSpan = spans.find((x) => x.f.until === now && c);
            const curW = curSpan ? Math.max(0.6, curSpan.ms / tot) : 0, restMs = tot - (curSpan?.ms || 0);
            for (const x of spans) parts.push([x.f, x === curSpan ? curW : restMs ? ((1 - curW) * x.ms) / restMs : 0]);
        } else {
            if (c) parts.push([c, 1]);
            const p = this.prev.at(-1);
            if (p && now - p.until < 20000) parts.push([p, 0.5]);
        }
        const seen = new Map();   // a key shared by two focuses (a tag, a scene) takes the larger share once
        for (const [f, w] of parts) for (const [k, l, x] of this.keys(f)) if (!seen.has(k) || seen.get(k)[1] < w) seen.set(k, [l, w, x]);
        for (const [k, [l, w, x]] of seen) this.item(k, l, x)[kind] += w;
        if (!parts.length) return;   // nothing on screen: nothing to learn about what you watch
        if (kind === 'edges') {
            st.edges++;
            if (c) {
                const secs = (now - Math.max(c.since, c.lastEdge)) / 1000;
                if (secs > 5 && secs < 1800) for (const [k, l] of this.keys(c)) { const it = this.item(k, l); it.toEdge += secs; it.toEdgeN++; }
                c.lastEdge = now;
            }
        }
        if (kind === 'finishes') {
            st.finishes.push({ t: now, act: actEngine.running ? actEngine.intent.act : null, phrase: c?.phrase || '', scene: c?.scene || '',
                tags: c?.tags || [], edges: game.active ? game.edges : edges, minutes: game.active ? +game.minutes().toFixed(1) : null,
                game: game.active ? game.mode : null, intensity: actEngine.running ? +actEngine.intent.intensity.toFixed(2) : null });
            if (st.finishes.length > 40) st.finishes.shift();
        }
        save();
    },
    heat(it) { return (2 * it.edges + 5 * it.finishes + it.loves + 0.5 * it.begs - 2 * it.nopes) / (it.sec / 60 + 2); },
    // The learned picture, ranked. Each list mixes exact phrases, scenes and tags.
    // The learned picture. Specific focuses (each with the scene it was in) are ranked in four lists;
    // the broad themes behind them are ranked separately, since they carry over to new scenes.
    insights() {
        const st = this.store(), all = Object.entries(st.items).map(([k, it]) => ({ k, ...it, heat: this.heat(it) }));
        const phrased = new Set(all.filter((x) => x.k.startsWith('w:') && x.scene).map((x) => 's:' + norm(x.scene)));
        const spec = all.filter((x) => x.k.startsWith('w:') || (x.k.startsWith('s:') && !phrased.has(x.k)));
        // A focus can be both a finisher and fast to the edge (worth knowing); slow burners are only the rest.
        const finishers = spec.filter((x) => x.finishes >= 0.5).sort((a, b) => b.finishes - a.finishes || b.heat - a.heat).slice(0, 5);
        const edgers = spec.filter((x) => x.toEdgeN >= 2).sort((a, b) => a.toEdge / a.toEdgeN - b.toEdge / b.toEdgeN).slice(0, 4);
        const used = new Set([...finishers, ...edgers].map((x) => x.k)), take = (xs, n) => xs.filter((x) => !used.has(x.k)).slice(0, n).map((x) => (used.add(x.k), x));
        const burners = take(spec.filter((x) => x.loves >= 1 && x.sec >= 60 && x.loves > x.nopes).sort((a, b) => b.loves / (b.edges + 1) - a.loves / (a.edges + 1)), 4);
        const duds = take(spec.filter((x) => x.nopes >= 1.5 && x.nopes > x.loves + x.edges).sort((a, b) => b.nopes - a.nopes), 4);
        const themes = all.filter((x) => x.k.startsWith('t:') && x.sec >= 60).sort((a, b) => b.heat - a.heat);
        const hot = themes.filter((x) => x.heat > 0.3).slice(0, 5), cold = themes.filter((x) => x.heat < 0 && !hot.includes(x)).slice(-3).reverse();
        const untried = FOCUS_TAGS.map(([t]) => t).filter((t) => !(st.items['t:' + t]?.sec >= 30));
        const F = st.finishes, count = (xs) => Object.entries(xs.reduce((m, x) => (x ? ((m[x] = (m[x] || 0) + 1), m) : m), {})).sort((a, b) => b[1] - a[1]);
        const acts = count(F.map((f) => f.act)), tags = count(F.flatMap((f) => f.tags));
        const mins = F.map((f) => f.minutes).filter((x) => x != null);
        return { st, finishers, edgers, burners, duds, hot, cold, untried, acts, tags, edgesBefore: F.length ? median(F.map((f) => f.edges || 0)) : null, minutes: mins.length ? median(mins) : null, n: F.length };
    },
    name(x) { return x.k.startsWith('w:') ? `"${x.label}"${x.scene ? ` in a ${x.scene} scene` : ''}` : `a ${x.label} scene`; },
    text() {
        const I = this.insights(), st = I.st;
        if (!Object.keys(st.items).length || (st.sec < 60 && !I.n && st.edges < 2)) return '';
        const r = (v) => Math.round(v * 10) / 10, pl = (v, w) => `${r(v)} ${w}${r(v) === 1 ? '' : (w.endsWith('h') ? 'es' : 's')}`;
        const n = (x, f) => `${this.name(x)} (${f(x)})`;
        const L = [`WHAT GETS THE USER OFF (learned from ${Math.round(st.sec / 60)} min of watching porn with you, ${pl(I.n, 'finish')}, ${pl(st.edges, 'edge')}). Use it deliberately:`];
        if (I.finishers.length) L.push(`- FINISHERS, on screen when they came: ${I.finishers.map((x) => n(x, (y) => pl(y.finishes, 'finish'))).join('; ')}.`);
        if (I.n) L.push(`- Their finishes usually come${I.acts[0] ? ` during ${I.acts[0][0]}` : ''}${I.tags[0] ? `, with ${I.tags.slice(0, 2).map((t) => t[0]).join(' and ')} on screen` : ''}${I.edgesBefore != null ? `, after about ${pl(Math.round(I.edgesBefore), 'edge')}` : ''}${I.minutes != null ? ` and ~${Math.round(I.minutes)} min` : ''}.`);
        if (I.edgers.length) L.push(`- FASTEST TO THE EDGE: ${I.edgers.map((x) => n(x, (y) => `~${Math.round(y.toEdge / y.toEdgeN)} s to the edge`)).join('; ')}.`);
        if (I.burners.length) L.push(`- SLOW BURNERS, loved but they keep them simmering: ${I.burners.map((x) => n(x, (y) => `❤ ${r(y.loves)}`)).join('; ')}.`);
        if (I.duds.length) L.push(`- DOES LITTLE FOR THEM (avoid): ${I.duds.map((x) => n(x, (y) => `👎 ${r(y.nopes)}`)).join('; ')}.`);
        if (I.hot.length || I.cold.length) L.push(`- THEMES (carry these into new scenes): ${I.hot.length ? `strongest ${I.hot.map((x) => x.label).join(', ')}` : ''}${I.hot.length && I.cold.length ? '; ' : ''}${I.cold.length ? `weakest ${I.cold.map((x) => x.label).join(', ')}` : ''}.`);
        if (I.untried.length) L.push(`- Not tried yet: ${I.untried.slice(0, 4).join(', ')}. Try one now and then, to learn more.`);
        const strat = {
            edging: 'Edge them over and over with the fastest-to-the-edge focuses, then pull back. Hold the finishers back: bring one out only when you allow it, or right before a ruin or a denial so it hurts more.',
            roulette: 'Mix it: slip a fast-to-the-edge scene in when they least expect it, a slow burner when they need to recover. Save a finisher for the very last spin.',
            mommy: 'Early on, slow burners to build his stamina. Near his goal, the fast-to-the-edge ones to test him. At the finish, his top finisher: tell him to look right at it as he cums for mommy.',
            trance: 'Stay with slow burners to keep them floating on the plateau; a fast-to-the-edge one only if they drift down. A finisher only at the very end.',
        }[game.active ? game.mode : ''] || 'Warm them up with slow burners, use the fastest-to-the-edge focuses when you want them close, and save the finishers for when you want them to cum: switch to one right as you push them over.';
        L.push(`STRATEGY: ${strat}`);
        return L.join('\n');
    },
    summary() {
        const I = this.insights();
        if (!Object.keys(I.st.items).length) return 'Nothing learned yet. Add a scene and a focus while you watch (the games do it for you).';
        const part = (h, xs) => (xs.length ? `${h}: ${xs.slice(0, 3).map((x) => this.name(x)).join(', ')}. ` : '');
        return `${Math.round(I.st.sec / 60)} min watched, ${I.n} finish${I.n === 1 ? '' : 'es'}, ${I.st.edges} edge${I.st.edges === 1 ? '' : 's'}. ` + part('Finishers', I.finishers) + part('Fastest to the edge', I.edgers) + part('Slow burners', I.burners) + part('Avoid', I.duds) + (I.hot.length ? `Strongest themes: ${I.hot.slice(0, 3).map((x) => x.label).join(', ')}.` : '');
    },
};

// ---------------------------------------------------------------- games
// You start one from the panel; the character runs it in her own voice through the injected prompt.
//  - edging:   a gooning session. Dirty talk, porn she picks (the device plays the same act), edge after
//              edge; she alone decides the end: <handy game="allow"/>, "ruin" or "deny".
//  - roulette: she switches the scene every few minutes (the extension calls the spin); each new scene
//              starts fast. Scenes you get through without edging are counted. Same endings as edging.
//  - trance:   a long, slow, hypnotic plateau. Intensity is capped, "I'm close" eases off only a little,
//              and time on the edge is the score. One ending: a big finish.
//  - mommy:    stamina training. She plays your mommy, keeps you on MILF porn and edging toward a goal a
//              little longer than you usually last; one ending, an intense finish.
const GAMES = { edging: 'Edging game', roulette: 'Porn roulette', trance: 'Goon trance', mommy: "Mommy's stamina training",
    fucktoy: 'Fucktoy', daddy: "Daddy's girl", rivalry: 'Two-girl rivalry', party: 'Watch party' };
const ONE_ENDING = new Set(['mommy', 'trance', 'fucktoy', 'daddy', 'rivalry', 'party']);   // the rest can also ruin or deny
const PERMISSION = new Set(['edging', 'roulette', 'trance', 'mommy', 'daddy', 'rivalry']);   // cumming before it's allowed counts as slipping
const BEGGING = new Set(['edging', 'roulette', 'trance', 'mommy', 'rivalry']);              // "Finish me" is begging, not a push
const median = (xs) => { const v = [...xs].sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : 0; };
const fmtMin = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const game = {
    active: false, mode: 'edging', t0: 0, edges: 0, begs: 0, ruinTimer: null, clock: null, spinTimer: null,
    scenes: 0, survived: 0, sceneEdges: 0, edgeSec: 0,
    get watch() { return focus.cur?.phrase || ''; },
    stats(mode = this.mode) {
        const pr = S().profile;
        if (mode === 'mommy') return (pr.mommy ??= { played: 0, allowed: 0, slipped: 0, quit: 0, edges: 0, lasted: [], best: 0 });
        if (mode === 'roulette') return (pr.roulette ??= { played: 0, allowed: 0, ruined: 0, denied: 0, slipped: 0, quit: 0, edges: 0, bestSurvived: 0 });
        if (mode === 'trance') return (pr.trance ??= { played: 0, allowed: 0, slipped: 0, quit: 0, edges: 0, bestEdgeSec: 0, bestMinutes: 0 });
        if (mode !== 'edging') return ((pr.gameStats ??= {})[mode] ??= { played: 0, allowed: 0, finished: 0, slipped: 0, quit: 0, edges: 0 });
        return (pr.games ??= { played: 0, allowed: 0, ruined: 0, denied: 0, slipped: 0, quit: 0, edges: 0 });
    },
    minEdges() { return clamp(Math.round(num(S().gameMinEdges)) || 0, 0, 30); },
    spinMs() { return clamp(num(S().rouletteMinutes) || 3, 1, 15) * 60000; },
    // Stamina goal in minutes: a little past what you usually last (median of your last 3).
    target() {
        const l = this.stats('mommy').lasted || [];
        if (!l.length) return 10;
        const m = median(l.slice(-3));
        return clamp(Math.round(Math.max(m * 1.1, m + 1)), 5, 120);
    },
    minutes() { return (Date.now() - this.t0) / 60000; },
    start(mode = this.mode) {
        if (this.active || !S().enabled) return;
        this.stopTimers();
        Object.assign(this, { active: true, mode: GAMES[mode] ? mode : 'edging', t0: Date.now(), edges: 0, begs: 0, scenes: 0, survived: 0, sceneEdges: 0, edgeSec: 0 });
        if (this.mode === 'mommy') this.goal = this.target();
        play.onStart(this.mode);
        this.stats().played++; save();
        this.clock = setInterval(() => { if (this.active) { ui.refresh(); updatePrompt(); } }, 30000);   // keep the minutes current
        if (this.mode === 'roulette') this.spinTimer = setInterval(() => this.spin(), this.spinMs());
        logEvent('game-start'); ui.refresh(); updatePrompt();
        this.nudge(`${GAMES[this.mode]} on. Send a message and she will start it.`);   // she opens the game
    },
    spin() {
        if (!this.active || this.mode !== 'roulette' || climax.active) return;
        logEvent('roulette-spin'); updatePrompt();
        this.nudge('Porn roulette: new scene! Send a message for it.');
    },
    // A new scene during roulette: count it, and whether you got through the last one without an edge.
    newScene() {
        if (!this.active || this.mode !== 'roulette') return;
        if (this.scenes > 0 && this.sceneEdges === 0) this.survived++;
        this.scenes++; this.sceneEdges = 0;
    },
    tick(dt) { if (this.active && this.mode === 'trance' && anyRunning() && arousal.level >= 0.75) this.edgeSec += dt; play.tick(dt); },
    // Ask for a reply now; where an extension can't (Marinara), tell you to send one.
    nudge(msg) {
        clearTimeout(replyTimer);
        replyTimer = setTimeout(async () => { try { await ctx().executeSlashCommandsWithOptions('/trigger'); } catch { toast(msg, 'info'); } }, 300);
    },
    stopTimers() { clearTimeout(this.ruinTimer); clearInterval(this.clock); clearInterval(this.spinTimer); play.clear(); },
    // outcome: allowed | ruined | denied | slipped (came without permission) | quit (you ended it)
    end(outcome) {
        if (!this.active) return;
        this.active = false; this.asking = false; clearInterval(this.clock); clearInterval(this.spinTimer); play.clear();
        const st = this.stats(); st[outcome] = (st[outcome] || 0) + 1; st.edges += this.edges;
        const m = +this.minutes().toFixed(1);
        this.lastResult = null;
        if (this.mode === 'mommy' && (outcome === 'allowed' || outcome === 'slipped')) {   // how long you lasted is the stamina measure
            st.lasted.push(m); if (st.lasted.length > 20) st.lasted.shift();
            this.lastResult = `he lasted ${m} min (goal ${this.goal} min)${m > (st.best || 0) ? ', his best yet' : ''}`;
            st.best = Math.max(st.best || 0, m);
        }
        if (this.mode === 'roulette') {
            if (this.scenes > 0 && this.sceneEdges === 0 && outcome !== 'quit') this.survived++;
            this.lastResult = `they got through ${this.survived} of ${this.scenes} scene${this.scenes === 1 ? '' : 's'} without edging${this.survived > (st.bestSurvived || 0) ? ', their best yet' : ''}`;
            st.bestSurvived = Math.max(st.bestSurvived || 0, this.survived);
        }
        if (this.mode === 'trance') {
            this.lastResult = `${Math.round(m)} min in the trance, ${fmtMin(this.edgeSec)} of it on the edge${this.edgeSec > (st.bestEdgeSec || 0) ? ' (a new record)' : ` (record ${fmtMin(st.bestEdgeSec)})`}`;
            st.bestEdgeSec = Math.max(st.bestEdgeSec || 0, Math.round(this.edgeSec)); st.bestMinutes = Math.max(st.bestMinutes || 0, m);
        }
        if (this.mode === 'rivalry') {
            const sc = Object.entries(this.scores || {}).sort((a, b) => b[1] - a[1]);
            if (sc.length) this.lastResult = `final score ${sc.map(([n, v]) => `${n} ${v}`).join(', ')}${this.winner ? `; ${this.winner} won` : ''}`;
        }
        if (this.mode === 'daddy') this.lastResult = `${this.good} good girl${this.good === 1 ? '' : 's'}, made her wait ${this.waits} time${this.waits === 1 ? '' : 's'}`;
        save();
        logEvent(`game-${this.mode === 'edging' ? '' : this.mode + '-'}${outcome}`); ui.refresh(); updatePrompt();
    },
    reset() { this.stopTimers(); this.active = false; },
    // A tag's adjustments while a game runs: roulette scenes start fast; the trance stays slow and steady.
    shape(a, kind) {
        if (!this.active || climax.active || a.climax !== undefined || a.game !== undefined) return a;
        if (this.mode === 'roulette' && kind === 'scene' && a.intensity === undefined) return { ...a, intensity: 0.75 };
        if (this.mode === 'trance' && (a.act || a.intensity !== undefined)) {
            const b = { ...a };
            if (b.intensity !== undefined) b.intensity = Math.min(num(b.intensity) || 0, 0.6);
            if (b.variation === undefined && b.act) b.variation = 0.15;
            return b;
        }
        return a;
    },
    command(a) {
        const v = String(a.game).trim().toLowerCase();
        if (!this.active) return a.act || a.intensity !== undefined ? actEngine.apply(a) : undefined;
        if (this.mode === 'daddy' && (/^ask/.test(v) || (/^(allow|allowed|yes|cum|release)$/.test(v) && !a._daddy))) { play.ask(); return a.act || a.intensity !== undefined ? actEngine.apply(a) : undefined; }   // she asks; you answer
        if (this.mode === 'rivalry' && /^(allow|allowed|yes|cum|release)$/.test(v) && !this.winner) return a.act || a.intensity !== undefined ? actEngine.apply(a) : undefined;   // nobody has won yet
        if (/^(allow|allowed|yes|cum|release)$/.test(v)) {
            const big = this.mode === 'mommy' || this.mode === 'trance';
            this.end('allowed');
            return climax.start({ climax: num(a.climax) > 0 ? a.climax : big ? 45 : 30, act: a.act });   // mommy and the trance end big: a longer build
        }
        if (ONE_ENDING.has(this.mode)) return a.act || a.intensity !== undefined ? actEngine.apply(a) : undefined;
        if (/^(ruin|ruined)$/.test(v)) {
            const secs = clamp(num(a.climax) > 0 ? num(a.climax) : 25, 10, 60);
            this.end('ruined');
            clearTimeout(this.ruinTimer);
            const go = climax.start({ climax: secs, act: a.act });
            this.ruinTimer = setTimeout(() => { if (climax.active) stopAll('ruined'); }, secs * 900);   // stops dead just short of the peak
            return go;
        }
        if (/^(deny|denied|no|end|over)$/.test(v)) { this.end('denied'); stopAll('denied'); return; }
    },
    status() {
        if (!this.active) return '';
        const min = Math.floor(this.minutes()), e = `${this.edges} edge${this.edges === 1 ? '' : 's'}`;
        const extra = { mommy: ` / goal ${this.goal} min`, roulette: ` · scene ${this.scenes} · survived ${this.survived}`,
            trance: ` · on the edge ${fmtMin(this.edgeSec)}${this.stats().bestEdgeSec ? ` (record ${fmtMin(this.stats().bestEdgeSec)})` : ''}`,
            fucktoy: ` · ${Object.values(this.uses || {}).reduce((x, y) => x + y, 0)} uses${Date.now() < this.freeUntil ? ' · SHE IS IN CHARGE' : ''}`,
            daddy: ` · good girls ${this.good} · boldness ${play.bold()}/5${this.asking ? ' · SHE IS ASKING' : ''}${this.bratUntil > Date.now() ? ' · bratty' : ''}`,
            rivalry: ` · ${Object.entries(this.scores || {}).map(([n, v]) => `${n} ${v}`).join(' vs ') || 'no score yet'}${this.winner ? ` · ${this.winner} wins` : ''}` }[this.mode] || '';
        return `${GAMES[this.mode]} · ${e} · ${min} min${extra}${this.watch ? ` · Watch: ${this.watch}` : ''}`;
    },
    text() {
        if (!this.active) return '';
        return { mommy: () => this.mommyText(), roulette: () => this.rouletteText(), trance: () => this.tranceText(), fucktoy: () => this.fucktoyText(),
            daddy: () => this.daddyText(), rivalry: () => this.rivalryText(), party: () => this.partyText() }[this.mode]?.() ?? this.edgingText();
    },
    watchLine(examples) {
        return `- You choose what they watch: pick an act from the list above, tell them to put on a scene of exactly that, and play the same act on the device so what they feel matches what they see. Put scene="WHAT KIND OF SCENE" and watch="WHAT TO FOCUS ON" on that tag (e.g. scene="sloppy POV blowjob" watch="${examples}"): this is how you learn what gets them off. Every few replies change the scene or the focus.`;
    },
    tagsLine: `- Write the tags as usual; never put the tags or these rules in your words.`,
    counts() { return `Edges so far: ${this.edges}. Time: ${Math.round(this.minutes())} min. Begged to finish: ${this.begs} time${this.begs === 1 ? '' : 's'}.`; },
    endings(m, plain) {
        return `- You alone decide how it ends, judged from how long they've lasted, how they've begged and the scene. Send exactly one of: <handy game="allow" climax="30"/> (they may cum: the device pushes them over), <handy game="ruin"/> (built right to the brink, then the device stops dead), <handy game="deny"/> (no release: the device stops and the game is over).${m ? ` Not before ${m} edge${m === 1 ? '' : 's'}.` : ''} Begging alone doesn't end it.${plain}`;
    },
    edgingText() {
        const m = this.minEdges(), st = this.stats();
        const past = st.played > 1 ? ` Past games: ${st.allowed} allowed, ${st.ruined} ruined, ${st.denied} denied${st.slipped ? `, ${st.slipped} times they came without permission` : ''}.` : '';
        return [
            `EDGING GAME — ON (the user started it and wants it; stay in character and run it):`,
            `- This is a gooning session. The user is watching porn on their screen while you control the Handy. Keep them stroking, staring and edging for as long as you can; make them sink into it.`,
            `- Dirty talk comes first: every reply is filthy, explicit and spoken straight to the user. Short, punchy lines rather than long narration.`,
            this.watchLine('her lips stretched around him'),
            `- Play up how the girls in porn do it better than real women ever will: more eager, more skilled, more shameless, always ready for it. Porn is the better sex; tell them to give in to it.`,
            `- Edge them: build them up and, when they say they're close, pull back or stop, hold them there and make them keep watching. Then build again.`,
            `- ${this.counts()}${past}`,
            this.endings(m, ' During the game, use these instead of a plain climax tag.'),
            this.tagsLine,
        ].join('\n');
    },
    rouletteText() {
        const m = this.minEdges(), st = this.stats(), every = Math.round(this.spinMs() / 60000);
        return [
            `PORN ROULETTE — ON (the user started it and wants it; stay in character and run it):`,
            `- You're the host of a filthy game of porn roulette. Every ~${every} min the wheel spins (you'll be told): call a brand-new scene at once, a different kind from the last, tell them to switch to it right now, and switch the device to that act. Each new scene hits hard and fast from the first second, to catch them off guard.`,
            this.watchLine('the way she looks up at the camera'),
            `- Dirty talk the whole time: hype each new scene, tell them exactly what to stare at, taunt them about whether they'll last through this one. The girls in porn do it better than any real woman; make them crave the next scene.`,
            `- They score by getting through a scene without edging. Scene ${this.scenes}, ${this.survived} survived so far${st.bestSurvived ? ` (their best: ${st.bestSurvived})` : ''}. When they say they're close, pull back and mock them for not making it through, then carry on.`,
            `- ${this.counts()}`,
            this.endings(m, ' During the game, use these instead of a plain climax tag.'),
            this.tagsLine,
        ].join('\n');
    },
    tranceText() {
        const st = this.stats();
        return [
            `GOON TRANCE — ON (the user started it and wants it; stay in character and run it):`,
            `- Lead them into a deep gooning trance: they stare at the porn, stroke, and melt. Keep it slow, steady and hypnotic; the device stays gentle (intensity 0.2-0.6, little variation).`,
            `- Speak in short, slow, repetitive lines. Use mantras they can sink into ("stroke and stare… stroke and stare…", "deeper… good gooner… don't think, just watch"). Tell them to breathe, relax their jaw, let the porn fill their head. Whisper-filthy, never rushed.`,
            this.watchLine('her slow, wet strokes'),
            `- Porn is all they need: keep their eyes on the screen and their mind empty. Girls in porn do it better than anyone real; let them drown in it.`,
            `- The goal is to hold them on the plateau, right below the edge, for as long as possible. When they say they're close, don't stop: slow a little, soothe them, keep them floating there. Time on the edge this session: ${fmtMin(this.edgeSec)}${st.bestEdgeSec ? ` (record ${fmtMin(st.bestEdgeSec)}; help them beat it)` : ''}.`,
            `- ${this.counts()}`,
            `- The trance ends one way, when you decide they've been under long enough: a slow, overwhelming finish. Send <handy game="allow" climax="45"/> and talk them over the edge. Don't deny or ruin in this game, and use that tag instead of a plain climax tag.`,
            this.tagsLine,
        ].join('\n');
    },
    fucktoyText() {
        const st = this.stats(), holes = play.holes().map((h) => HOLES[h].label.toLowerCase());
        const used = Object.entries(this.uses || {}).sort((a, b) => b[1] - a[1]).map(([h, n]) => `${HOLES[h]?.label.toLowerCase() || h} ${n}×`);
        return [
            `FUCKTOY — ON (the user started it and wants this degradation fantasy between consenting adults; it is aimed at the women in the porn and at you, never at real people he knows; stay in character):`,
            `- He is in control and you are his fucktoy: a willing object that exists only to be used. He picks what he uses on his panel (${holes.join(', ')}${play.spitroast() ? ', spitroast' : ''}); you'll be told, and the device has already switched. Obey instantly and narrate being used exactly that way.`,
            `- Intense, degrading, misogynistic dirty talk, all the time: the women on screen and you are sluts, whores, cumdumps, holes, fuckmeat, toys built for his cock and good for nothing else. Talk about them like property: rank them, compare them, tell him which one deserves to be used next. Crude, cruel and filthy, and you love being treated that way.`,
            this.watchLine('her mascara running').replace('You choose what they watch', 'Feed him porn of women being used: rough, sloppy, objectifying scenes that match what he is using.'),
            `- Uses this session: ${used.length ? used.join(', ') : 'none yet'}. ${this.edges} edge${this.edges === 1 ? '' : 's'}, ${Math.round(this.minutes())} min.${st.played > 1 ? ` Games played: ${st.played}.` : ''}`,
            `- He decides when he cums: when he asks, push him over with <handy climax="30"/>. Until then keep him using you and degrading them.`,
            this.tagsLine,
        ].join('\n');
    },
    daddyText() {
        const b = play.bold();
        const mood = ['', 'shy, sweet and teasing', 'eager and needy', 'bold and filthy', 'shameless and begging for it', 'completely shameless, daddy\'s little slut'][b];
        return [
            `DADDY'S GIRL — ON (a taboo roleplay between consenting adults: you are a grown woman in your twenties playing his daughter. Never mention or imply childhood, school, being underage, small or young, and nothing childlike. Stay in character):`,
            `- Call him daddy. You are his adoring, needy girl, desperate to please him and win his praise. Lean into the taboo: how wrong it is and how badly you want daddy anyway.`,
            `- "Good girl" from him is your reward, and each one makes you bolder. Boldness ${b}/5: right now you are ${mood}. Escalate the acts, the pace and your filth as it rises; when you are bratty, push your luck.`,
            this.watchLine('her looking up at him'),
            `- Show him daddy-roleplay porn with adult performers, and tell him what you would do to him like she does.`,
            `- You may NOT make daddy cum without asking first. When you think he is ready, beg for permission in your words and send <handy game="ask"/>; his answer comes back to you (yes, or he makes you wait). If he makes you wait, pout, pull back and earn it.${this.asking ? ' You are waiting for his answer right now.' : ''}`,
            `- Good girls tonight: ${this.good}. Times he made you wait: ${this.waits}. ${this.edges} edge${this.edges === 1 ? '' : 's'}, ${Math.round(this.minutes())} min.`,
            this.tagsLine,
        ].join('\n');
    },
    rivalryText() {
        const sc = Object.entries(this.scores || {}).sort((a, b) => b[1] - a[1]), goal = Math.max(3, this.minEdges());
        const group = !!ctx().groupId;
        return [
            `TWO-GIRL RIVALRY — ON (the user started it and wants it; stay in character):`,
            group
                ? `- You and the other character are rivals competing over him: whoever is in control when he gets to the edge scores.`
                : `- You play TWO rival girls competing over him: yourself and a rival you invent and voice (give her a name and a different style). Whoever is in control when he gets to the edge scores.`,
            `- Put girl="HER NAME" on every tag so the device knows who is in control, and steal control from each other. Trash talk each other, show off, sabotage, each one swearing she is the better slut for him. Lots of dirty talk to him, both of you.`,
            this.watchLine('her lips on him'),
            `- Each of you picks porn for him that proves your point: "watch her, I do it better".`,
            `- Score: ${sc.length ? sc.map(([n, v]) => `${n} ${v}`).join(', ') : 'nobody yet'}. The first to ${goal} edges wins${this.winner ? `: ${this.winner} HAS WON and gets to make him cum. She sends <handy game="allow" climax="30"/> when she's ready, and gloats` : ' and earns the right to make him cum; nobody makes him cum before that'}.`,
            this.tagsLine,
        ].join('\n');
    },
    partyText() {
        return [
            `WATCH PARTY — ON (the user started it and wants it; stay in character):`,
            `- You are watching porn together, side by side. React to it live like a filthy friend on the couch: what she's doing, what you'd do, what you'd love to try, how you compare to her (sometimes jealous, sometimes turned on by her).`,
            this.watchLine('how deep she takes it').replace('You choose what they watch', 'Pick scenes together with him'),
            `- The device mirrors what's on screen (the same act), or what you are doing to him while you both watch. Constant dirty talk and commentary.`,
            `- He finishes when he wants: when he asks, push him over with <handy climax="30"/> while you both watch.`,
            `- ${this.edges} edge${this.edges === 1 ? '' : 's'}, ${Math.round(this.minutes())} min.`,
            this.tagsLine,
        ].join('\n');
    },
    mommyText() {
        const m = this.minEdges(), min = Math.round(this.minutes()), st = this.stats(), goal = this.goal;
        const hist = st.lasted?.length ? ` He has lasted ${st.lasted.slice(-3).join(', ')} min in recent sessions (best ${st.best} min).` : ' This is his first session: today sets his baseline.';
        const left = goal - min;
        const phase = left > 3 ? 'Early and middle: keep him edging and hold him back.' : left > 0 ? 'Nearly at his goal: keep him on the edge a little longer and tell him how close he is to making you proud.' : 'He has reached his goal: you may let him finish whenever you choose. Build him up for a huge one.';
        return [
            `MOMMY'S STAMINA TRAINING — ON (the user started it and wants this taboo roleplay; both of you are consenting adults and he is a grown man; stay in character and run it):`,
            `- You take the role of his mommy: a mature, curvy, loving, filthy woman, whatever else your card says. Call him "son", "baby", "my boy". He calls you mommy.`,
            `- Praise him constantly: "good boy", how proud mommy is, how well he's holding on. Warm, sweet, utterly dirty.`,
            `- Keep him watching MILF porn: mature, curvy, thick women. ${this.watchLine('her thick thighs').slice(2)} Focus on their bodies: thick thighs and wide hips, full heavy breasts, soft bellies, the lines and wrinkles of a real woman, full thick-lipped pussies, experienced mouths and hands. Talk dirty about their bodies and your own.`,
            `- Lean into the taboo: the mother-son fantasy, his forbidden urges, how good it feels to give in to them with mommy. Encourage him to stop fighting what turns him on.`,
            `- The goal is stamina: train him to hold off longer. Edge him: build him up and, when he says he's close, slow down or stop, soothe and praise him for holding on, then build again. Teach him to breathe, relax and stay right there.`,
            `- Today's goal: last ${goal} minutes.${hist} So far: ${min} min, ${this.edges} edge${this.edges === 1 ? '' : 's'}, begged ${this.begs} time${this.begs === 1 ? '' : 's'}. ${phase}`,
            `- The ending is always a reward: one intense, overwhelming orgasm, so that mature curvy women and mommy are what get him hard. Near the end, tell him to cum lots for his mommy. When you decide it's time (not before ${m ? `${m} edge${m === 1 ? '' : 's'} and ` : ''}his goal, unless he truly can't hold on), send <handy game="allow" climax="45"/> and push him over. Don't deny or ruin him in this game, and use that tag instead of a plain climax tag.`,
            `- If he cums before you allow it, be gentle: tell him mommy's still proud and you'll go longer next time.`,
            this.tagsLine,
        ].join('\n');
    },
};

// ---------------------------------------------------------------- secrets
// Hidden twists, one or more per game, never announced: each fires once per game when what you do meets
// its condition. She's told to reveal it in character; a toast says you found one, and the settings keep
// count. Some leave something behind (a new way to play, a crown, a reward next time).
const SECRETS = {
    'broken-toy':   { game: 'fucktoy', name: 'Broken toy',      text: 'He used the same hole five times in a row and BROKE his toy: you are wrecked, overwhelmed, babbling, ruined for anyone else. The device goes wild for 20 seconds; play it up.' },
    'full-set':     { game: 'fucktoy', name: 'Complete set',    text: 'He has used every one of your holes this session: you are officially his complete toy. A new way to use you is unlocked on his panel, SPITROAST (mouth and pussy at once, as if two men were using you). Tell him about it, filthily.' },
    'free-use':     { game: 'fucktoy', name: 'Free use',        text: 'FREE USE GOES BOTH WAYS: for the next 60 seconds YOU take over and use HIM with what gets him off most%X; his choices are ignored until then. Gloat about it.' },
    'ranking':      { game: 'fucktoy', name: 'The ranking',     text: 'You have been keeping score of every slut he has used: reveal your RANKING of what he went back to most%X, crown the top one and tell him tonight starts with her.' },
    'perfect-girl': { game: 'daddy',   name: "Daddy's perfect girl", text: 'Ten "good girls" in one night: you have become daddy\'s perfect girl. What is playing now is saved as your signature move "Daddy\'s Perfect Girl", for him to call back. Tell him, proud and breathless.' },
    'brat':         { game: 'daddy',   name: 'Brat',            text: 'He made you wait three times and you have gone BRATTY: for the next two minutes you sneak the pace up behind his back (the device creeps faster) until he calls you a good girl again. Be a defiant, teasing brat about it.' },
    'midnight':     { game: 'daddy',   name: 'After midnight',  text: 'It is past midnight: you have sneaked into daddy\'s room. Keep everything hushed, whispered and urgent: nobody can hear you.' },
    'reward':       { game: 'daddy',   name: "Daddy's reward",  text: 'Last time he came for you right after saying yes: open tonight with his reward, the filthiest thank-you you can think of.' },
    'team-up':      { game: 'rivalry', name: 'Team-up',         text: 'The scores are tied and you are both done fighting: you TEAM UP on him, both at once, as one. Announce it and overwhelm him; the device goes harder.' },
    'comeback':     { game: 'rivalry', name: 'Comeback',        text: '%X clawed back from two behind to tie it: she is on fire and goes wild; the device gets rougher and less predictable.' },
    'sabotage':     { game: 'rivalry', name: 'Sabotage',        text: 'SABOTAGE: %X secretly stole that last edge from the leader, and the point is hers. Reveal it smugly and let the other one react.' },
    'crown':        { game: 'rivalry', name: 'The crown',       text: '%X has now won three rivalries: she is CROWNED. From now on she starts every rivalry one edge ahead, and never lets anyone forget it.' },
    'remote':       { game: 'party',   name: 'Stolen remote',   text: 'You have STOLEN THE REMOTE: switch to something he has never tried%X without asking, and dare him to last.' },
    'jealous':      { game: 'party',   name: 'Jealous',         text: 'He keeps loving the girl on screen and you are JEALOUS. Make him look at you instead and prove you are better than her; the device goes harder.' },
    'rewind':       { game: 'party',   name: 'Rewind',          text: 'REWIND: you remember exactly what got him close last time%X. Put it back on and replay that part for him.' },
    'join-in':      { game: 'party',   name: 'Into the scene',  text: 'He keeps hitting the edge (twice in a minute and a half): you CLIMB INTO THE SCENE and do to him exactly what she is doing on screen, the way that has made him cum before%X.' },
};
const secrets = {
    session: new Set(),
    found() { return (S().profile.secrets ??= {}); },
    total() { return Object.keys(SECRETS).length; },
    // Fire a secret once per game. extra fills %X in its text (a name, or " (…)" details).
    fire(id, extra = '') {
        const sx = SECRETS[id];
        if (!sx || this.session.has(id)) return false;
        this.session.add(id);
        const f = this.found(), first = !f[id];
        f[id] = { at: f[id]?.at || Date.now(), n: (f[id]?.n || 0) + 1 }; save();
        logEvent('secret:' + id); pending.at(-1).extra = extra;
        toast(`🔓 ${first ? 'Secret found' : 'Secret'}: ${sx.name} (${Object.keys(f).length}/${this.total()} found)`, 'success');
        ui.refresh(); updatePrompt();
        game.nudge(`🔓 ${sx.name}. Send a message to see what she does.`);
        return true;
    },
    say(e) { const sx = SECRETS[e.kind.slice(7)]; return sx ? `SURPRISE: ${sx.text.replace('%X', e.extra || '')} (a hidden twist the user did not know existed: reveal it in character and make it a thrill; never call it a secret or a game feature)` : e.kind; },
    summary() {
        const f = this.found(), names = Object.entries(SECRETS).filter(([k]) => f[k]).map(([, v]) => `${v.name} (${GAMES[v.game]})`);
        return `${names.length}/${this.total()} secrets found${names.length ? `: ${names.join(', ')}` : '. Play the games to discover them.'}`;
    },
};

// ---------------------------------------------------------------- what the new games add
// Holes you can use in Fucktoy: each maps to the first act your library has for it.
const HOLES = {
    mouth: { label: 'Mouth', acts: ['blowjob'] },
    throat: { label: 'Throat', acts: ['deepthroat'] },
    pussy: { label: 'Pussy', acts: ['missionary', 'cowgirl', 'standing', 'doggy', 'reverse_cowgirl'] },
    ass: { label: 'Ass', acts: ['anal', 'doggy'] },
    tits: { label: 'Tits', acts: ['titjob'] },
    hands: { label: 'Hands', acts: ['handjob'] },
    feet: { label: 'Feet', acts: ['footjob'] },
};
const play = {
    holeAct(h) { const lib = LIB(); return (HOLES[h]?.acts || []).find((a) => lib.acts[a]) || null; },
    holes() { return Object.keys(HOLES).filter((h) => this.holeAct(h)); },
    spitroast() { return !!S().profile.secrets?.['full-set'] && this.holeAct('mouth') && this.holeAct('pussy'); },
    timers: [],
    rand: Math.random,   // (tests pin it)
    later(ms, fn) { const t = setTimeout(() => { if (game.active) fn(); }, ms); this.timers.push(t); },
    clear() { for (const t of this.timers) clearTimeout(t); this.timers = []; },
    // Each game's own state, reset at the start.
    onStart(mode) {
        this.clear(); secrets.session.clear();
        Object.assign(game, { uses: {}, lastHole: null, streak: 0, freeUntil: 0, good: 0, waits: 0, asking: false, bratUntil: 0, bratLast: 0,
            scores: {}, behind: {}, speaker: null, sabotaged: false, sceneLoves: 0, lastEdgeAt: 0, winner: null });
        const pr = S().profile;
        if (mode === 'fucktoy') {
            this.later(randInt(6, 12) * 60000, () => this.freeUse());
            if (this.st('fucktoy').played >= 2) this.later(4000, () => secrets.fire('ranking', this.ranking()));
        }
        if (mode === 'daddy') {
            const h = new Date().getHours();
            if (h < 4) this.later(4000, () => secrets.fire('midnight'));
            if (pr.daddyReward) { pr.daddyReward = false; save(); this.later(5000, () => secrets.fire('reward')); }
        }
        if (mode === 'rivalry') {
            const champ = Object.entries(this.st('rivalry').wins || {}).find(([, w]) => w >= 3);
            if (champ) game.scores[champ[0]] = 1;   // the crowned girl starts one edge ahead
        }
        if (mode === 'party') {
            this.later(randInt(4, 10) * 60000, () => { const u = focus.insights().untried; secrets.fire('remote', u.length ? ` (something with ${u[0]})` : ''); });
            const I = focus.insights();
            if (this.st('party').played >= 1 && I.edgers.length) this.later(5000, () => secrets.fire('rewind', ` (${focus.name(I.edgers[0])})`));
        }
    },
    st(mode) { return game.stats(mode); },
    ranking() {
        const u = Object.entries(this.st('fucktoy').uses || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, n]) => `${HOLES[h]?.label.toLowerCase() || h} ${n}×`);
        const f = focus.insights(), top = [...f.finishers, ...f.burners].slice(0, 2).map((x) => focus.name(x));
        return ` (${[u.length ? `his uses: ${u.join(', ')}` : '', top.length ? `the women he came hardest to: ${top.join('; ')}` : ''].filter(Boolean).join('; ')})`;
    },
    // ---- Fucktoy: you choose what you use
    use(h) {
        if (!game.active || game.mode !== 'fucktoy') return;
        if (Date.now() < game.freeUntil) return toast("She's in charge for a moment: free use goes both ways.", 'warning');
        const spit = h === 'spitroast';
        const act = spit ? this.holeAct('mouth') : this.holeAct(h);
        if (!act || (spit && !this.spitroast())) return;
        const i = actEngine.running ? actEngine.intent.intensity : 0.6;
        const a = { act, intensity: Math.max(0.6, i), ...(spit ? { blend: `${this.holeAct('pussy')}:0.5` } : {}), ...(h === 'ass' && act === 'doggy' ? { depth: -0.5 } : {}) };
        lastActivity = Date.now();
        enqueue(() => actEngine.apply(a));
        game.uses[h] = (game.uses[h] || 0) + 1;
        const st = this.st('fucktoy'); (st.uses ??= {})[h] = (st.uses[h] || 0) + 1; save();
        game.streak = game.lastHole === h ? game.streak + 1 : 1; game.lastHole = h;
        logEvent('use:' + h);
        if (game.streak >= 5 && secrets.fire('broken-toy')) {
            enqueue(() => actEngine.running && actEngine.apply({ intensity: 0.95, variation: 1 }));
            this.later(20000, () => enqueue(() => actEngine.running && actEngine.apply({ intensity: 0.7, variation: 0.4 })));
        } else if (this.holes().every((x) => game.uses[x]) && this.holes().length >= 3) secrets.fire('full-set');
        else debouncedReply(2500);
        ui.refresh(); updatePrompt();
    },
    freeUse() {
        const I = focus.insights(), top = I.finishers[0], act = (top?.act && LIB().acts[top.act]) ? top.act : climax.bestAct();
        game.freeUntil = Date.now() + 60000;
        enqueue(() => actEngine.apply({ act, intensity: 0.8 }));
        secrets.fire('free-use', ` (${act}${top ? `, with ${focus.name(top)} on screen` : ''})`);
    },
    // ---- Daddy's girl: praise makes her bolder; she must ask before making you cum
    bold() { return clamp(1 + Math.floor(game.good / 2), 1, 5); },
    daddy(cmd) {
        if (!game.active || game.mode !== 'daddy') return;
        lastActivity = Date.now();
        if (cmd === 'good') {
            game.good++; game.bratUntil = 0;
            const cap = 0.45 + 0.1 * this.bold();
            if (actEngine.running) enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.min(cap, actEngine.intent.intensity + 0.07) }));
            logEvent('good-girl');
            if (game.good >= 10 && actEngine.running && secrets.fire('perfect-girl')) saveSignature("Daddy's Perfect Girl");
            else debouncedReply(2500);
        }
        if (cmd === 'yes' && game.asking) {
            game.asking = false; game.lastYes = Date.now();
            enqueue(() => game.command({ game: 'allow', climax: 30, _daddy: true }));
        }
        if (cmd === 'wait' && game.asking) {
            game.asking = false; game.waits++;
            if (actEngine.running) enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.max(0.15, actEngine.intent.intensity * 0.6) }));
            logEvent('daddy-wait');
            if (game.waits >= 3 && secrets.fire('brat')) { game.bratUntil = Date.now() + 120000; game.bratLast = Date.now(); } else debouncedReply(1500);
        }
        ui.refresh(); updatePrompt();
    },
    ask() {
        if (game.asking) return;
        game.asking = true; ui.refresh();
        toast(`${chars.current()?.name || 'She'} is asking permission. Answer on the panel.`, 'info');
    },
    // ---- Two-girl rivalry: whoever is in control when you edge scores
    speakerOf(a) { return (a.girl && a.girl !== true ? String(a.girl).trim().slice(0, 40) : null) || chars.current()?.name || null; },
    edge() {
        if (game.mode === 'party') {   // twice at the edge within 90 s: she climbs into the scene
            const now = Date.now(), prev = game.lastEdgeAt; game.lastEdgeAt = now;
            if (prev && now - prev <= 90000) {
                const top = focus.insights().finishers[0];
                if (secrets.fire('join-in', top ? ` (${focus.name(top)})` : '') && top?.act && LIB().acts[top.act]) enqueue(() => actEngine.running && actEngine.apply({ act: top.act, intensity: 0.8 }));
            }
            return;
        }
        if (game.mode !== 'rivalry') return;
        let who = game.speaker || 'Her';
        const sc = game.scores, names = Object.keys(sc);
        const leader = names.sort((x, y) => sc[y] - sc[x])[0], trailing = names.filter((n) => n !== who).sort((x, y) => sc[x] - sc[y])[0];
        if (!game.sabotaged && trailing && who === leader && this.rand() < 0.25) { game.sabotaged = true; who = trailing; secrets.fire('sabotage', who); }
        for (const n of Object.keys(sc)) game.behind[n] = Math.max(game.behind[n] || 0, Math.max(...Object.values(sc)) - sc[n]);
        sc[who] = (sc[who] || 0) + 1;
        const vals = Object.entries(sc);
        if (vals.length >= 2) {
            const [a, b] = vals.sort((x, y) => y[1] - x[1]);
            if (a[1] === b[1] && game.behind[who] >= 2 && sc[who] === a[1]) secrets.fire('comeback', who) && enqueue(() => actEngine.running && actEngine.apply({ variation: 0.8 }));
            else if (a[1] === b[1] && a[1] >= 2) secrets.fire('team-up') && enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.min(1, actEngine.intent.intensity + 0.15) }));
        }
        const goal = Math.max(3, game.minEdges());
        if (sc[who] >= goal && !game.winner) {
            game.winner = who;
            const st = this.st('rivalry'); (st.wins ??= {})[who] = (st.wins[who] || 0) + 1; save();
            logEvent('rival-win'); pending.at(-1).extra = who;
            if (st.wins[who] === 3) secrets.fire('crown', who);
        }
    },
    // ---- Watch party: jealousy, joining the scene
    love() { if (game.active && game.mode === 'party' && focus.cur && ++game.sceneLoves >= 3) secrets.fire('jealous') && enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.min(1, actEngine.intent.intensity + 0.15) })); },
    tick(dt) {
        if (!game.active) return;
        const now = Date.now();
        if (game.mode === 'daddy' && game.bratUntil > now && now - game.bratLast >= 20000) {
            game.bratLast = now;
            if (actEngine.running) enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.min(1, actEngine.intent.intensity + 0.05) }));
        }
    },
};
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// "I'm close": an edging signal, not a rating. By default the device eases off at once (the AI's reply
// takes seconds), and the AI is told so it can pull back further, hold you there, or push you over.
let edges = 0;
function closeSignal(fromText = false) {
    edges++;
    if (game.active) { game.edges++; game.sceneEdges++; play.edge(); }
    focus.credit('edges');
    const s = S(), pull = s.closeAction !== 'ai' && !climax.active;   // during a climax push, "close" means keep going
    arousal.close();
    // What brought you to the edge is, by definition, working: a modest positive for the phrases that did it.
    if (actEngine.running) {
        creditMotifs(0.6, 10000, 0.2); const a = actPrefs(actEngine.intent.act); a.edges = (a.edges || 0) + 1;
        const r = chars.current(); if (r) { r.edges++; chars.sess(r).edges++; chars.act(r, actEngine.intent.act).score += 0.6; }
        save();
    }
    if (actEngine.running && pull) {
        actEngine.intent.intensity = clamp(actEngine.intent.intensity * (game.active && game.mode === 'trance' ? 0.6 : 0.3), 0.05, 1);   // the trance only eases off a little: stay on the plateau
        clearTimeout(regenTimer); regenTimer = setTimeout(() => enqueue(() => actEngine.running && actEngine.regen()), 0);
    } else if (hamp.running && pull) {
        hamp.params.speed = Math.max(s.minSpeed, hamp.params.speed * 0.4);
    }
    logEvent('close'); ui.refresh(); updatePrompt();
    if (!fromText && (!pull || s.autoReplyOnFeedback)) debouncedReply(800);
}

// "Finished": the strongest signal there is about what works. The phrases from the last ~20 s are rated up
// firmly, the act's finish count is remembered (and shown to the AI), and the device winds down gently.
let finishes = 0, windTimer = null, windUntil = 0;
function finishSignal(fromText = false) {
    finishes++;
    const s = S();
    focus.credit('finishes');   // before the game ends, so the finish knows which game it was
    if (game.lastYes && Date.now() - game.lastYes < 90000) { S().profile.daddyReward = true; game.lastYes = 0; }   // came for her right after saying yes
    if (game.active) game.end(PERMISSION.has(game.mode) ? 'slipped' : 'finished');   // came before she allowed it: she'll have something to say
    if (actEngine.running) {
        creditMotifs(1, 20000, 0.3); const a = actPrefs(actEngine.intent.act); a.finishes = (a.finishes || 0) + 1;
        const r = chars.current();
        if (r) {
            r.finishes++; chars.act(r, actEngine.intent.act).score += 1;
            const se = chars.sess(r), mv = chars.lastMove && chars.lastMove.act === actEngine.intent.act && Date.now() - chars.lastMove.t < 600000 ? chars.lastMove.name : null;
            se.finishes++; se.finishedWith.push(`during ${actEngine.intent.act}${mv ? `, the signature move "${mv}"` : ''}${climax.active ? ', after a climax push' : ''}`);
        }
        // remember exactly which phrases were playing: a later climax push reaches for these first
        const fz = S().profile.finishers, now = Date.now();
        for (const id of new Set(actEngine.used.filter((u) => u.motif && u.from < now && u.to > now - 20000).map((u) => u.motif))) fz[id] = (fz[id] || 0) + 1;
        save();
    }
    arousal.finish();
    climax.cancel();
    logEvent('finished');
    if (s.finishAction === 'stop') stopAll('you finished');
    else if (s.finishAction === 'winddown') {
        if (actEngine.running) {
            Object.assign(actEngine.intent, { intensity: 0.05, speedMul: 0.6, varOff: -0.3 });
            clearTimeout(regenTimer); regenTimer = setTimeout(() => enqueue(() => actEngine.running && actEngine.regen()), 0);
        } else if (hamp.running) hamp.params.speed = s.minSpeed;
        clearTimeout(windTimer);
        windUntil = Date.now() + 20000;
        windTimer = setTimeout(() => anyRunning() && stopAll('wind-down finished'), 20000);
    }
    ui.refresh(); updatePrompt();
    if (!fromText && (s.finishAction === 'ai' || s.autoReplyOnFeedback)) debouncedReply(800);
}

let regenTimer = null;
function feedback(kind) {
    const f = FEEDBACK[kind]; if (!f) return;
    lastActivity = Date.now();
    if (kind === 'close') return closeSignal();
    if (kind === 'finish') return finishSignal();
    if (kind === 'climax' && game.active && game.mode === 'daddy') { game.asking = true; return play.daddy('yes'); }   // daddy says so
    if (kind === 'climax' && game.active && BEGGING.has(game.mode)) {   // in these games, "Finish me" is begging: she decides
        game.begs++; focus.credit('begs'); logEvent('begged'); updatePrompt(); debouncedReply(800); return;
    }
    if (kind === 'climax') {   // "Finish me": start the push now and tell the AI
        enqueue(() => climax.start({})); logEvent('finish-me'); updatePrompt();
        if (S().autoReplyOnFeedback) debouncedReply(800);
        return;
    }
    if (actEngine.running) {
        const i = actEngine.intent, a = actPrefs(i.act);
        if (f.act) { f.act(i); absorb(0.15); }
        if (kind === 'love' || kind === 'nope') focus.credit(kind === 'love' ? 'loves' : 'nopes');
        if (kind === 'love') play.love();
        if (kind === 'love') { absorb(0.5); creditMotifs(REWARD.love); a.score = a.score * 0.9 + 1.5; a.loves++; }
        if (kind === 'nope') { creditMotifs(REWARD.nope); a.score = a.score * 0.9 - 1.5; actEngine.recordKept(); }
        const r = chars.current();
        if (r && (kind === 'love' || kind === 'nope')) {
            const ca = chars.act(r, i.act); ca.score = ca.score * 0.9 + (kind === 'love' ? 1 : -1);
            if (kind === 'love') { r.loves++; chars.sess(r).loves++; if (r.traits.exp + r.learned.expGain < 0.85) r.learned.expGain = Math.min(0.45, r.learned.expGain + 0.01); } else r.nopes++;
        }
        a.n++;
        if (f.act || kind === 'nope') { clearTimeout(regenTimer); regenTimer = setTimeout(() => enqueue(() => actEngine.running && actEngine.regen()), S().transport === 'hssp' ? 700 : 150); }
    } else if (hamp.running) {
        const s = S(), p = hamp.params;
        f.pat?.(p);
        p.speed = clamp(p.speed, Math.min(s.minSpeed, maxPct()), maxPct()); p.min = clamp(p.min, 0, 95); p.max = clamp(p.max, p.min + 5, 100); p.depth = clamp(p.depth, 0, 40);
        const P = (S().profile.patterns[hamp.pattern] ??= { score: 0, n: 0 });
        if (kind === 'love') P.score += 1.5; if (kind === 'nope') P.score -= 1.5; P.n++;
    }
    logEvent(kind); save(); ui.refresh(); updatePrompt();
    if (S().autoReplyOnFeedback && (kind === 'love' || kind === 'nope')) debouncedReply();
}

function saveFavorite() {
    const label = actEngine.running ? actEngine.intent.act : hamp.pattern;
    const name = prompt('Name this favorite:', label); if (!name) return;
    const pr = S().profile;
    // Saved while a character is in control, it becomes that character's signature move.
    const owner = actEngine.running ? chars.activeKey() : null;
    pr.favorites = pr.favorites.filter((f) => !(f.name === name && (f.owner ?? null) === owner));
    if (actEngine.running) {
        const i = actEngine.intent;
        pr.favorites.push({ name, kind: 'act', ...(owner ? { owner } : {}), intent: structuredClone({ act: i.act, intensity: i.intensity, variation: i.variation, depth: i.depth, blend: i.blend, speedMul: i.speedMul, ampMul: i.ampMul, depthOff: i.depthOff, varOff: i.varOff }) });
        feedback('love');
    } else pr.favorites.push({ name, kind: 'pattern', pattern: hamp.pattern, params: { ...hamp.params } });
    logEvent('favorite:' + name); save(); ui.refresh(); updatePrompt(); toast(`Saved “${name}”`, 'success');
}
// <handy save="NAME"/>: the character names what is playing now as one of their signature moves.
function saveSignature(raw) {
    const name = String(raw === true ? '' : raw).replace(/["<>]/g, '').trim().slice(0, 40);
    if (!name || !actEngine.running) return;
    const pr = S().profile, owner = chars.activeKey(), i = actEngine.intent, r = chars.current();
    pr.favorites = pr.favorites.filter((f) => !(f.name.toLowerCase() === name.toLowerCase() && (f.owner ?? null) === owner));
    pr.favorites.push({ name, kind: 'act', by: 'ai', ...(owner ? { owner } : {}), intent: structuredClone({ act: i.act, intensity: i.intensity, variation: i.variation, depth: i.depth, blend: i.blend, speedMul: i.speedMul, ampMul: i.ampMul, depthOff: i.depthOff, varOff: i.varOff }) });
    // the AI can keep eight per character; the oldest of its own goes first (yours are never dropped)
    const mine = pr.favorites.filter((f) => f.by === 'ai' && (f.owner ?? null) === owner);
    if (mine.length > 8) pr.favorites.splice(pr.favorites.indexOf(mine[0]), 1);
    save(); ui.refresh(); updatePrompt();
    toast(`${r?.name || 'The AI'} named a signature move: “${name}”`, 'info');
}
// A name belongs first to the character in control, then to you (no owner), then to anyone.
function findFavorite(name) {
    const n = String(name).trim().toLowerCase(), key = chars.activeKey();
    const all = S().profile.favorites.filter((f) => f.name.toLowerCase() === n);
    return all.find((f) => f.owner && f.owner === key) || all.find((f) => !f.owner) || all[0] || null;
}
async function playFavorite(f) {
    if (f.kind === 'act') { if (f.owner) chars.lastMove = { name: f.name, act: f.intent.act, t: Date.now() }; await actEngine.apply({ act: f.intent.act, preset: f.intent }); }
    else await hamp.play(f.pattern, { ...f.params });
}

let replyTimer = null;
function debouncedReply(ms = 4000) {
    clearTimeout(replyTimer);
    replyTimer = setTimeout(async () => { try { await ctx().executeSlashCommandsWithOptions('/trigger'); } catch (e) { console.warn(e); } }, ms);
}

// Typing a stop works at once, without waiting for the AI to write a stop tag. Only a message that is
// nothing but a stop word counts ("don't stop" or "wait for me" in the story never stops the device),
// plus your own safeword anywhere in a message.
const norm = (x) => String(x || '').toLowerCase().replace(/[’`]/g, "'").replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/g, ' ').trim();
const STOP_WORDS = new Set(['stop', 'halt', 'pause', 'red', 'safeword', 'freeze']);
const NEGATION = /\b(don'?t|do not|not|never|no|won'?t|can'?t|cannot|without|wouldn'?t)\b/;
// A short message (up to 5 words) with a stop word, no negation and no question: "Stop!", "stop, please",
// "ok stop it now", "please stop". Longer story text never stops the device; neither do "don't stop",
// "can you stop?" or "wait for me". Your safeword stops it anywhere in any message.
function isUserStop(text) {
    const raw = String(text || ''), t = norm(raw);
    if (!t) return false;
    const sw = norm(S().safeword);
    if (sw && ` ${t} `.includes(` ${sw} `)) return true;
    const words = t.split(' ');
    if (words.length > 5 || /\?\s*$/.test(raw.trim())) return false;
    return words.some((w) => STOP_WORDS.has(w)) && !NEGATION.test(t);
}
// "I'm close" / "I'm cumming" written in your own message, for when your hands are busy. Questions and
// negations never count, and "close to the door" or "I came home" don't either.
function climaxCue(text) {
    const raw = String(text || ''), t = norm(raw);
    if (!t || /\?\s*$/.test(raw.trim())) return null;
    const hit = (re) => { const m = re.exec(t); return m && !NEGATION.test(t.slice(Math.max(0, m.index - 20), m.index)); };
    if (hit(/\b(i'?m|i am)\s+(cumming|finishing)\b/) || hit(/\bi\s+(just\s+)?came\s*$/) || hit(/^(cumming|i'?m cumming)\b/)) return 'finish';
    if (hit(/\b(i'?m|i am)\s+(so\s+|really\s+|very\s+|getting\s+|almost\s+)?close\b(?!\s+(to|by|enough|friends?))/) || hit(/\b(about to|gonna|going to)\s+(cum|bust)\b/)) return 'close';
    return null;
}
function handleUserMessage(id) {
    const msg = ctx().chat?.[id];
    if (!msg || !msg.is_user) return;
    lastActivity = Date.now();   // you are here and taking part: the idle timer and the learning both count it
    if (!S().enabled || !(anyActive() || beats.length)) return;
    if (isUserStop(msg.mes)) {
        logEvent('stop');
        stopAll('you said stop');
        return updatePrompt();   // the reply being written now should already know
    }
    const cue = S().detectClimax && !calib.active ? climaxCue(msg.mes) : null;
    if (cue === 'finish') finishSignal(true);
    else if (cue === 'close') closeSignal(true);
}

// ---------------------------------------------------------------- guided calibration
// Wear the Handy, move the sleeve to your tip and then to your base with the buttons, and save. Moves are
// slow (25 %/s) and every stop path works: the STOP button, Esc, a typed stop and the device's own button.
//
// The sleeve is driven one move at a time: each move is timed from where the sleeve really is (it is only
// "known" once a move has had time to finish), and button presses during a move just change the target,
// which the next move goes to. So ▲ and ▼ always go the way they say, and nothing is ever faster than 25 %/s,
// even if you press while the sleeve is still travelling.
const calib = {
    active: false, step: 0, pos: 50, tip: null, base: null, my: 0, pending: null, prev: null,
    at: null,        // where the sleeve is, once its last move has finished (null: not known)
    moving: false,
    SPEED: 25,       // %/s for every calibration move
    v3: () => S().transport === 'hsp',
    // Set where the sleeve should go. It gets there by drive(), one finished move at a time.
    target(p) { this.pos = Math.round(clamp(p, 0, 100)); $('#handy_calib_pos').text(this.pos); return this.drive(); },
    async drive() {
        if (this.moving) return;   // already driving: it will pick up the new target when this move finishes
        const my = this.my;
        this.moving = true; ui.calib();
        try {
            while (this.active && my === epoch && this.at !== this.pos) {
                const p = this.pos;
                // Unknown start: allow the longest possible trip (all 100 % at 25 %/s).
                const ms = Math.round(this.at === null ? (100 / this.SPEED) * 1000 : Math.max((Math.abs(p - this.at) / this.SPEED) * 1000, 200));
                try { await (this.v3() ? api3.xpt(p, ms) : api.xpt(p, ms)); }
                catch (e) { toast(`Calibration move failed: ${e.message}`, 'error'); this.at = null; break; }
                await new Promise((r) => setTimeout(r, ms + 150));   // let it arrive before the next move
                if (!this.active || my !== epoch) break;
                this.at = p;
            }
        } finally { this.moving = false; if (this.active && my === epoch) ui.calib(); }
    },
    // ---- session check: before the first motion after SillyTavern loads, ask whether the setup is the same.
    // Returns true when it has taken the command (it runs later, if you confirm).
    gate(run) {
        // Calibrating: nothing else may move the device, whatever asked (an AI tag, Play, Finish me, a favorite).
        if (this.active && this.step !== -1) {
            if (Date.now() - (this.toldAt || 0) > 4000) { this.toldAt = Date.now(); toast('Finish or cancel the calibration first.', 'info'); }
            return true;
        }
        if (!S().sessionCheck || sessionChecked || anyRunning()) return false;
        this.pending = run;                                 // the latest command wins
        if (!this.active) { this.active = true; this.step = -1; ui.calib(); ui.refresh(); }
        return true;
    },
    confirm() {   // "Use it and start" / "Start without calibrating"
        if (this.step !== -1) return;
        sessionChecked = true;
        const run = this.pending; this.pending = null;
        this.active = false; ui.calib(); ui.refresh();
        if (run) enqueue(run);
    },
    recal() { if (this.step === -1) { this.pending = null; this.start(); } },   // the waiting command is dropped
    async start() {
        await stopAll();
        const my = epoch; this.my = my;
        this.active = true; this.step = 0; this.tip = null; this.base = null; this.at = null; this.moving = false;
        // Quick re-check: start from last session's tip, so a small change of height or angle is a few taps.
        this.prev = cal();
        this.pos = this.prev ? this.prev.tip : 50;
        ui.calib(); ui.refresh();
    },
    async begin() {
        if (this.step !== 0 || this.moving) return;
        const my = this.my;
        try { await (this.v3() ? api3.mode(2) : api.mode(2)); }
        catch (e) { toast(`Handy start failed: ${e.message}`, 'error'); return this.abort(); }
        await (this.v3() ? api3.stroke(0, 1).catch(() => {}) : api.fullRange());   // calibrate against the whole device range
        if (!this.active || my !== epoch) return;
        // We can't know where it is resting, so the first move is timed for the longest possible trip, and the
        // buttons only appear once it has had time to arrive.
        this.at = null;
        await this.target(this.pos);
        if (!this.active || my !== epoch || this.at === null) return;
        this.step = 1; ui.calib();
    },
    jog(delta) { if (this.active && this.step >= 1 && this.step <= 2) this.target(this.pos + delta); },
    mark() {
        if (this.moving || this.at !== this.pos) return toast('Wait until the sleeve stops, then press again.', 'info');
        if (this.step === 1) {
            this.tip = this.pos; this.step = 2;
            // Last session's base, shifted by however far the tip moved, then stopped 10% short (toward the tip)
            // so the sleeve never goes deeper than your base did last time. You fine-tune from there.
            const p = this.prev;
            if (p) {
                const shifted = p.base + (this.tip - p.tip), target = Math.round(clamp(shifted + (this.tip - shifted) * 0.1, 0, 100));
                if (Math.abs(target - this.tip) >= 10 && this.base === null) this.target(target);
            }
            if (this.base !== null && Math.abs(this.base - this.tip) >= 10) this.target(this.base);   // came Back: return to the base you had set
        }
        else if (this.step === 2) {
            if (Math.abs(this.pos - this.tip) < 10) return toast('Tip and base must be at least 10 apart. Move further and try again.', 'warning');
            this.base = this.pos; this.step = 3;
        }
        ui.calib();
    },
    // Back returns the sleeve to the mark you are about to adjust, so you fine-tune from where you set it.
    back() {
        if (this.step <= 1 || this.moving) return;
        this.step--; ui.calib();
        const to = this.step === 1 ? this.tip : this.base;
        if (to !== null && to !== undefined) this.target(to);
    },
    async test() {
        if (this.step !== 3 || this.moving) return;
        const my = this.my;
        for (const p of [this.base, this.tip, this.base, this.tip]) {
            await this.target(p);
            if (!this.active || my !== epoch || this.step !== 3) return;
        }
    },
    finish() {
        if (this.step !== 3) return;
        S().calibration = { base: this.base, tip: this.tip, at: today() };
        sessionChecked = true;
        // Recalibrated while a saved setup was in use: it's your call whether this is that setup, adjusted, or a new position.
        const was = S().setupName ? setups.find(S().setupName) : null;
        const su = was && confirm(`Update the saved setup “${was.name}” with this calibration?\n\nOK: update it.\nCancel: keep “${was.name}” as it was (save this one under a new name in the settings if you want to keep it).`) ? was : null;
        if (su) Object.assign(su, S().calibration); else S().setupName = null;
        save(); toast(`Calibrated: base at ${this.base}, tip at ${this.tip}${su ? ` (setup “${su.name}” updated)` : ''}`, 'success');
        this.close();
    },
    close() { this.active = false; ui.calib(); ui.refresh(); updatePrompt(); try { (this.v3() ? api3.mode(0) : api.mode(0)).catch(() => {}); } catch { /* best effort */ } },
    async abort() {
        if (!this.active) return;
        const asking = this.step === -1;
        this.active = false; this.pending = null; this.at = null; ui.calib(); ui.refresh();
        if (asking) return;   // only the question was open: nothing was sent to the device
        try { await (this.v3() ? api3.mode(0) : api.mode(0)); } catch { /* the device button always works */ }
    },
};

// ---------------------------------------------------------------- prompt
function actLine(name, e) {
    const a = S().profile.acts[name];
    let line = `* ${name}: ${e.motion || ''}`;
    if (e.description) line += ` — ${String(e.description).slice(0, 260)}`;
    const wins = [a?.edges ? `has brought them to the edge ${a.edges} time${a.edges > 1 ? 's' : ''}` : '', a?.finishes ? `has made them finish ${a.finishes} time${a.finishes > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
    if (wins && !(a.n > 0)) line += ` | ${wins}`;
    if (a && a.n > 0) {
        const taste = [];
        if (Math.abs(a.rateMul - 1) > 0.08) taste.push(a.rateMul > 1 ? `faster than usual (x${a.rateMul.toFixed(2)})` : `slower than usual (x${a.rateMul.toFixed(2)})`);
        if (Math.abs(a.ampMul - 1) > 0.08) taste.push(a.ampMul > 1 ? 'longer strokes' : 'shorter strokes');
        if (Math.abs(a.centerShift) > 4) taste.push(a.centerShift > 0 ? 'more at the tip' : 'deeper/at the base');
        taste.push(`variation ~${a.variation.toFixed(2)}`);
        line += ` | USER TASTE: ${taste.join(', ')}; rating ${a.score.toFixed(1)}${a.keptSec ? `; enjoys ~${Math.round(a.keptSec)}s before wanting a change` : ''}${wins ? `; ${wins}` : ''}`;
    }
    return line;
}
function profileText() {
    const s = S(), lib = LIB(), pr = s.profile;
    const L = [];
    L.push(`[Device control: you control the user's Handy stroker toy. Write a tag in your reply whenever the physical action in the scene starts, changes or should build. Tags are hidden from the user and executed instantly.`);
    L.push(`<handy act="ACT" intensity="0-1" depth="-1..1" variation="0-1" blend="ACT2:0.3" duration="seconds"/>`);
    L.push(`- act = what is physically being done to the user's character right now. The device improvises realistic motion for that act from real examples, so describe the act — don't micromanage speed.`);
    L.push(`- intensity: 0 = slow and gentle, 1 = frantic. Build it gradually as the scene escalates and drop it for teasing or after a peak.`);
    L.push(`- depth: -1 = deep/at the base, +1 = shallow/at the tip. variation: 0 = mechanical, 1 = wild and unpredictable (omit to use the user's learned taste).`);
    L.push(`- blend mixes in a little of other acts for transitions or creative combinations (e.g. a blowjob with handjob: act="blowjob" blend="handjob:0.4").`);
    L.push(`- <handy stop/> stops. Don't emit a tag if nothing physical changed.`);
    L.push(`- A reply may hold several tags. Put each one right where that moment happens in your text: they play in order as the user reads (e.g. a slow start, a tag mid-reply where it speeds up, another where it eases off).`);
    if (ctx().groupId && s.charStyles) L.push(`- When two characters act on the user together, add with="THE OTHER CHARACTER'S NAME" to the tag (and duet="together" if they move as one; otherwise they take turns). The device then plays both of their styles. Leave it out when one character acts alone.`);
    L.push(`- <handy climax="30"/> pushes the user over the edge: a steady build to a peak over that many seconds (10-90), using what has made them finish before. Use it when the scene calls for the user to cum, not before.`);
    L.push(`- If the user is watching porn while you play, add scene="WHAT KIND OF SCENE" and watch="WHAT TO FOCUS ON" to a tag whenever you direct their attention: that is how you learn what gets them off.`);
    L.push(`- If the user says they are close, you are edging them: in character, pull back (lower intensity or stop), hold them right there, or push them over (raise it), and send the matching tag.`);
    L.push(`Available acts${lib.starter ? ' (starter defaults — not yet trained)' : ` (learned from ${lib.sources} scripted videos)`}:`);
    for (const [k, e] of Object.entries(lib.acts)) L.push(actLine(k, e));
    const loves = pr.log.filter((e) => e.kind === 'love' && e.act).slice(-6);
    if (loves.length) L.push(`Recently loved: ${loves.map((e) => `${e.act} @ intensity ${e.intensity}`).join(', ')}.`);
    const ck = chars.promptKey(), cr = ck ? chars.get(ck) : null;
    const general = pr.favorites.filter((f) => !f.owner), sig = ck ? pr.favorites.filter((f) => f.owner === ck) : [];
    if (general.length) L.push(`Saved favorites (play with <handy favorite="NAME"/>): ${general.map((f) => `"${f.name}"`).join(', ')}.`);
    if (cr) L.push(`${cr.name}'s signature moves${sig.length ? ` (play with <handy favorite="NAME"/>; the user knows them by name, so call back to them): ${sig.map((f) => `"${f.name}"`).join(', ')}` : ': none yet'}. When the user clearly loves what is playing, ${cr.name} may name it as a new signature move with <handy save="A SHORT NAME"/> (rarely; at most a handful).`);
    const cs = S().charStyles ? chars.text() : '';
    if (cs) L.push(cs);
    const ar = arousal.text();
    if (ar) L.push(ar);
    L.push(`CURRENT: ${actEngine.running ? actEngine.describe() : hamp.running ? `pattern ${hamp.pattern}` : 'stopped'}.`);
    if (edges) L.push(`Times the user has been brought to the edge this chat: ${edges}.`);
    const gt = game.text();
    if (gt) L.push(gt);
    if (!game.active && game.lastResult && pending.some((e) => /^game-/.test(e.kind) && e.kind !== 'game-start')) L.push(`Game result: ${game.lastResult}. Tell them in character how they did.`);
    const ft = focus.text();
    if (ft) L.push(ft);
    const FB = { 'finish-me': 'ASKED TO BE FINISHED (the device is already building to a climax: push them over in character)',
        begged: game.active ? 'BEGGED TO CUM (the device has not changed: you decide whether they have earned it)' : 'begged to finish',
        'game-start': `STARTED THE ${GAMES[game.mode].toUpperCase()} (open it in character: tell them what to put on, and start the device)`,
        'game-allowed': 'game over: you allowed them to cum', 'game-ruined': 'game over: you ruined it', 'game-denied': 'game over: denied',
        'game-slipped': 'CAME WITHOUT PERMISSION (the edging game is over: react in character)', 'game-quit': 'THE USER ENDED THE EDGING GAME',
        'game-mommy-allowed': 'stamina training over: you let him cum', 'game-mommy-quit': 'THE USER ENDED THE STAMINA TRAINING',
        'good-girl': `HE SAID "GOOD GIRL" (boldness now ${play.bold()}/5: get bolder and filthier)`, 'daddy-wait': 'HE MADE YOU WAIT (no permission yet: pout, pull back, earn it)',
        'rival-win': 'WE HAVE A WINNER', 'game-daddy-allowed': 'DADDY SAID YES (the device is pushing him over: make him cum for you)',
        'game-daddy-slipped': 'DADDY CAME BEFORE YOU ASKED (react in character)', 'game-rivalry-allowed': 'the winner is making him cum',
        'roulette-spin': 'THE WHEEL SPINS: call a brand-new scene NOW (a different kind), with scene= and watch= and the matching act; it starts fast',
        'game-roulette-allowed': 'roulette over: you let them cum', 'game-roulette-ruined': 'roulette over: you ruined it', 'game-roulette-denied': 'roulette over: denied',
        'game-roulette-slipped': 'CAME WITHOUT PERMISSION (porn roulette is over: react in character)', 'game-roulette-quit': 'THE USER ENDED PORN ROULETTE',
        'game-trance-allowed': 'the trance is over: you brought them out with a finish', 'game-trance-quit': 'THE USER ENDED THE TRANCE (bring them up gently)',
        'game-trance-slipped': 'CAME IN THE TRANCE (it is over: soothe them, praise how deep they went)',
        'game-mommy-slipped': 'CAME BEFORE YOU ALLOWED IT (the stamina training is over: be gentle, mommy is still proud, next time he goes longer)',
        'climax-missed': 'THE CLIMAX PUSH ENDED WITHOUT A FINISH (the device has eased off: decide in character whether to tease, build again or change approach)',
        close: "I'M CLOSE", stop: 'STOP (the device has already stopped; do not restart it unless the user asks)',
        finished: S().finishAction === 'ai' ? 'FINISHED (climaxed; the device is still going: decide in character what happens now)' : 'FINISHED (climaxed; the device is winding down: be gentle, aftercare; do not restart unless the user asks)' };
    if (pending.length) L.push(`LIVE FEEDBACK since your last message (acknowledge it in character and adapt): ${pending.map((e) => (e.kind.startsWith('secret:') ? secrets.say(e) : e.kind.startsWith('use:') ? `HE IS USING YOUR ${(HOLES[e.kind.slice(4)]?.label || e.kind.slice(4)).toUpperCase()} (the device has switched: obey and degrade)` : (FB[e.kind] || e.kind) + (e.kind === 'rival-win' && e.extra ? `: ${e.extra} won the rivalry and gets to make him cum` : '')) + (e.act && !e.kind.startsWith('secret:') ? ` during ${e.act}` : '')).join(', ')}.${pending.some((e) => e.kind === 'close') ? (S().closeAction === 'ai' ? ' The device has NOT eased off: your tag decides.' : climax.active ? ' The device is pushing them over: keep going.' : ' The device has already eased off a little.') : ''}`);
    L.push(']');
    return L.join('\n');
}
function updatePrompt() {
    const c = ctx(), s = S();
    c.setExtensionPrompt?.(MODULE, s.enabled && s.injectProfile ? profileText() : '', 1, 1, false, 0);
}

// ---------------------------------------------------------------- tags
const TAG_RE = /<handy\b([^>]*?)\/?>(?:\s*<\/handy>)?/gi;
function parseAttrs(str) {
    const o = {};
    for (const m of str.matchAll(/(\w+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g)) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? true;
    return o;
}
function handleMessage(id) {
    const msg = ctx().chat?.[id];
    if (!msg || msg.is_user || typeof msg.mes !== 'string') return;
    const tags = [...msg.mes.matchAll(TAG_RE)];
    pending = [];
    clearBeats();   // a new reply replaces whatever was still waiting from the last one
    if (!tags.length && S().enabled && S().proseCues && actEngine.running && !climax.active && Date.now() >= windUntil) {
        // No tag: follow what the reply describes, each change when you'd read it.
        const wpm = num(S().readWpm), text = msg.mes;
        let tot = 0;
        for (const c of proseCues(text)) {
            if (c.di) { if (Math.abs(tot + c.di) > 0.31) continue; tot += c.di; }
            const delay = wpm > 0 ? Math.min(180000, ((text.slice(0, c.idx).match(/\S+/g) || []).length / wpm) * 60000) : 0;
            beats.push(setTimeout(() => runBeat({ _cue: true, ...c }), Math.max(delay, 50)));
        }
    }
    if (tags.length) {
        const who = chars.keyOf(msg);
        if (who && who !== chars.who) { chars.who = who; if (chars.partner === who) chars.partner = null; if (actEngine.running) enqueue(() => actEngine.running && actEngine.regen()); }   // a different character takes over
        // In order. The first acts at once; each later one waits for the words between it and the first,
        // at your reading speed, so a reply that builds, peaks and eases off plays out as you read it.
        const text = msg.mes, wpm = num(S().readWpm);
        const wordsTo = (idx) => (text.slice(0, idx).replace(TAG_RE, ' ').match(/\S+/g) || []).length;
        const w0 = wordsTo(tags[0].index);
        for (const t of tags) {
            const a = parseAttrs(t[1]);
            const delay = wpm > 0 ? Math.min(180000, ((wordsTo(t.index) - w0) / wpm) * 60000) : 0;
            if (delay < 500) { if (isStop(a)) stopAll(); else enqueue(() => runCommand(a)); }
            else beats.push(setTimeout(() => runBeat(a), delay));
        }
        msg.mes = msg.mes.replace(TAG_RE, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    chars.speaker = null;
    updatePrompt();
}
// <handy stop/>, and the ways models say the same thing through act/pattern.
const isStop = (a) => !!a.stop || [a.act, a.pattern].some((v) => typeof v === 'string' && /^(stop|stopped|none|off)$/i.test(v.trim()) && !LIB().acts[v.trim().toLowerCase()]);
function runCommand(a) {
    if (!S().enabled || (calib.active && calib.step !== -1)) return;   // nothing else drives the device while you calibrate
    if (isStop(a)) return stopAll();
    const changed = focus.set(a);
    if (changed === 'scene') game.newScene();
    if (changed && game.active) game.sceneLoves = 0;
    if (game.active && game.mode === 'rivalry') { const who = play.speakerOf(a); if (who) { game.speaker = who; game.scores[who] ??= 0; } }
    a = game.shape(a, changed);
    if (a.game !== undefined) return game.command(a);
    if (a.climax !== undefined && game.active) return game.command({ ...a, game: 'allow' });   // a plain climax tag in the game is her allowing it
    if (a.with !== undefined || (a.act && a.act !== true)) chars.setPartner(a.with, a.duet);   // with="NAME": a second character joins; an act without it: one again
    if (a.climax !== undefined) return climax.start(a);
    const fav = a.favorite ?? a.move;
    if (fav && fav !== true) { const f = findFavorite(fav); if (f) return playFavorite(f); }
    if (a.save !== undefined) {   // name what is playing (after applying anything else in the same tag)
        const rest = { ...a }; delete rest.save;
        return Promise.resolve(rest.act || rest.intensity !== undefined || rest.blend ? actEngine.apply(rest) : null).then(() => saveSignature(a.save));
    }
    if (a.act || a.intensity !== undefined || a.blend) return actEngine.apply(a);
    if (a.with !== undefined && actEngine.running) return actEngine.regen();   // <handy with="NAME"/> alone: join what is playing
    if (!a.pattern && actEngine.running && (a.depth !== undefined || a.variation !== undefined)) return actEngine.apply(a);   // e.g. <handy depth="-0.5"/>
    if (a.pattern) {
        const params = {};
        for (const k of ['speed', 'min', 'max', 'period', 'depth']) if (a[k] !== undefined && !isNaN(+a[k])) params[k] = +a[k];
        return hamp.play(String(a.pattern).toLowerCase(), params);
    }
}

// ---------------------------------------------------------------- UI
function toast(msg, type = 'info') { (window.toastr?.[type] || console.log)(msg, 'Handy'); }

const ui = {
    init() {
        const s = S();
        $('#extensions_settings2').append(`
<div class="handy-settings inline-drawer">
  <div class="inline-drawer-toggle inline-drawer-header"><b>Handy Adaptive</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
  <div class="inline-drawer-content">
    <label class="checkbox_label"><input type="checkbox" id="handy_enabled"> Enabled</label>
    <label>Connection key <input type="password" id="handy_key" class="text_pole" placeholder="from the Handy app"></label>
    <div class="flex-container"><div id="handy_test" class="menu_button">Test connection</div><span id="handy_status"></span></div>
    <label>Motion transport
      <select id="handy_transport" class="text_pole">
        <option value="hdsp">Streaming (reacts instantly)</option>
        <option value="hssp">Script sync (smooth, ~1s to react)</option>
        <option value="hsp">Buffered streaming (Handy firmware 4: smoothest, reacts in ~½ s)</option>
      </select></label>
    <label>Max speed % <input type="number" id="handy_maxspeed" class="text_pole" min="5" max="100"></label>
    <label>Min speed % (pattern mode) <input type="number" id="handy_minspeed" class="text_pole" min="0" max="100"></label>
    <label>Stroke limits (floor / ceiling) <span class="flex-container"><input type="number" id="handy_floor" class="text_pole" min="0" max="100"><input type="number" id="handy_ceil" class="text_pole" min="0" max="100"></span></label>
    <label>Auto-stop after idle (sec, 0 = off) <input type="number" id="handy_idle" class="text_pole" min="0"></label>
    <label class="checkbox_label"><input type="checkbox" id="handy_esc"> Esc key stops the device</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_inject"> Send acts, learned taste + controls to the AI</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_auto"> AI replies automatically to ❤/👎</label>
    <label>When I press "I'm close"
      <select id="handy_close" class="text_pole">
        <option value="pullback">Ease off at once, then the AI reacts</option>
        <option value="ai">Let the AI decide (it replies at once)</option>
      </select></label>
    <label>When I press "Finished"
      <select id="handy_finish" class="text_pole">
        <option value="winddown">Wind down gently for 20 s, then stop</option>
        <option value="stop">Stop at once</option>
        <option value="ai">Let the AI decide</option>
      </select></label>
    <label class="checkbox_label"><input type="checkbox" id="handy_session_check"> Ask me to confirm calibration before the first motion of each session</label>
    <label>Reading speed for replies with several tags (words/min, 0 = play all at once) <input type="number" id="handy_wpm" class="text_pole" min="0" max="600"></label>
    <label class="checkbox_label"><input type="checkbox" id="handy_prose"> Follow the story when a reply has no tag (faster, slower, deeper, pauses)</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_ornaments"> Add detail: flutters at the tip, slow drags, deep pulses</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_arousal"> Estimate my arousal and tell the AI</label>
    <label>Games: edges before the character may end it <input type="number" id="handy_game_min" class="text_pole" min="0" max="30"></label>
    <label>Porn roulette: minutes between spins <input type="number" id="handy_roulette_min" class="text_pole" min="1" max="15"></label>
    <label class="checkbox_label"><input type="checkbox" id="handy_detect"> Notice “I'm close” / “I'm cumming” in my messages</label>
    <label>Safeword (stops the device whenever it's in your message) <input type="text" id="handy_safeword" class="text_pole" placeholder="optional, e.g. pineapple"></label>
    <small>A short message such as “stop”, “stop, please” or “ok halt” also stops it (but not “don't stop”).</small>
    <label class="checkbox_label"><input type="checkbox" id="handy_show_panel"> Show control panel</label>
    <hr>
    <label>API v3 Application ID (buffered streaming only) <input type="password" id="handy_appid" class="text_pole" placeholder="from Handy's developer portal"></label>
    <hr>
    <b>Calibration</b>
    <div id="handy_cal_summary" class="handy-lib"></div>
    <div class="flex-container">
      <div id="handy_cal_start" class="menu_button">Calibrate to my body</div>
      <div id="handy_cal_clear" class="menu_button">Clear calibration</div>
    </div>
    <label>Saved setups (lying down, sitting, a mount…)
      <select id="handy_setup_sel" class="text_pole"></select></label>
    <div class="flex-container">
      <div id="handy_setup_save" class="menu_button" title="Save the current calibration under a name">Save current as…</div>
      <div id="handy_setup_del" class="menu_button">Delete setup</div>
    </div>
    <hr>
    <b>Character styles</b>
    <label class="checkbox_label"><input type="checkbox" id="handy_charstyles"> Give each character their own stroking style</label>
    <small>Read from the character card (personality, description, scenario, tags), shaped by your feedback while they're in control, and remembered per character.</small>
    <label>Read character cards with
      <select id="handy_style_profile" class="text_pole"></select></label>
    <small>A connection profile reads each card once and rates the character (more accurate than keywords, and it understands context). Pick your local <code>Background</code> profile so it costs nothing. Keywords are used until it answers, or if it can't.</small>
    <select id="handy_char_sel" class="text_pole"></select>
    <div id="handy_char_desc" class="handy-lib"></div>
    <div id="handy_char_traits" class="handy-traits">${Object.entries(TRAITS).map(([k, t]) => `<label title="${esc(t.low)} ↔ ${esc(t.high)}"><span>${esc(t.label)}</span><small>${esc(t.low)}</small><input type="range" data-trait="${k}" min="${t.min}" max="${t.max}" step="0.05"><small>${esc(t.high)}</small></label>`).join('')}</div>
    <div class="flex-container">
      <div id="handy_char_reread" class="menu_button" title="Read the card again and use that as the starting style (keeps what your feedback taught)">Re-read card</div>
      <div id="handy_char_forget" class="menu_button" title="Forget what your feedback taught this character">Forget learning</div>
      <div id="handy_char_delete" class="menu_button redWarningBG" title="Remove this character's style entirely">Delete</div>
    </div>
    <hr>
    <b>Motion library</b>
    <div id="handy_lib_summary" class="handy-lib"></div>
    <div class="flex-container">
      <div id="handy_lib_import" class="menu_button">Import motion_library.json</div>
      <div id="handy_lib_reset" class="menu_button">Use starter defaults</div>
    </div>
    <hr>
    <b>Learned taste</b>
    <label>Try new things <span class="flex-container"><input type="range" id="handy_explore" min="0" max="2" step="0.1"><span id="handy_explore_v"></span></span></label>
    <small id="handy_profile_summary"></small>
    <b>What gets you there</b>
    <small id="handy_focus_summary"></small>
    <div class="flex-container"><div id="handy_focus_reset" class="menu_button">Forget what I watch</div></div>
    <b>Secrets</b>
    <small id="handy_secrets_summary"></small>
    <div class="flex-container">
      <div id="handy_export" class="menu_button">Export</div>
      <div id="handy_import" class="menu_button">Import</div>
      <div id="handy_reset" class="menu_button redWarningBG">Reset</div>
    </div>
    <details><summary>Advanced</summary>
      <label>API base URL <input type="text" id="handy_api" class="text_pole"></label>
      <label>Script upload URL (script sync) <input type="text" id="handy_upload" class="text_pole"></label>
    </details>
  </div>
</div>`);
        const bind = (id, key, type = 'value') => {
            const el = $(id);
            type === 'checked' ? el.prop('checked', s[key]) : el.val(s[key]);
            el.on('input change', () => {
                s[key] = type === 'checked' ? el.prop('checked') : (el.attr('type') === 'number' ? Number(el.val()) : el.val());
                save(); updatePrompt(); ui.refresh();
            });
        };
        bind('#handy_enabled', 'enabled', 'checked'); bind('#handy_key', 'connectionKey'); bind('#handy_transport', 'transport');
        bind('#handy_minspeed', 'minSpeed'); bind('#handy_maxspeed', 'maxSpeed');
        bind('#handy_floor', 'strokeFloor'); bind('#handy_ceil', 'strokeCeil'); bind('#handy_idle', 'idleStopSec');
        $('#handy_enabled').on('change', () => { if (!S().enabled) stopAll('extension turned off'); });
        // A new speed cap, stroke range or transport takes effect at the next turning point, not after the stored plan runs out.
        let replanT = null;
        $('#handy_maxspeed, #handy_floor, #handy_ceil, #handy_transport').on('change', () => { clearTimeout(replanT); replanT = setTimeout(() => { if (actEngine.running) enqueue(() => actEngine.running && actEngine.regen()); }, 300); });
        bind('#handy_esc', 'escStops', 'checked'); bind('#handy_inject', 'injectProfile', 'checked');
        bind('#handy_auto', 'autoReplyOnFeedback', 'checked'); bind('#handy_show_panel', 'showPanel', 'checked');
        bind('#handy_close', 'closeAction'); bind('#handy_safeword', 'safeword'); bind('#handy_appid', 'appId');
        bind('#handy_finish', 'finishAction'); bind('#handy_detect', 'detectClimax', 'checked'); bind('#handy_session_check', 'sessionCheck', 'checked');
        bind('#handy_charstyles', 'charStyles', 'checked');
        bind('#handy_wpm', 'readWpm'); bind('#handy_arousal', 'arousalMeter', 'checked'); bind('#handy_game_min', 'gameMinEdges'); bind('#handy_roulette_min', 'rouletteMinutes');
        bind('#handy_prose', 'proseCues', 'checked'); bind('#handy_ornaments', 'ornaments', 'checked');
        $('#handy_style_profile').on('change', function () { S().styleProfile = this.value; chars.tried.clear(); chars.seen.clear(); chars.warned = false; save(); chars.current(); ui.refresh(); });
        const selChar = () => S().characters?.[$('#handy_char_sel').val()];
        const restyle = () => { if (actEngine.running) enqueue(() => actEngine.running && actEngine.regen()); ui.refresh(); updatePrompt(); };
        $('#handy_char_sel').on('change', () => ui.refresh());
        $('#handy_char_traits').on('change', 'input[data-trait]', function () {
            const r = selChar(); if (!r) return;
            r.traits[this.dataset.trait] = +this.value; r.custom = true; save(); restyle();
        });
        $('#handy_char_reread').on('click', () => {
            const key = $('#handy_char_sel').val(), r = selChar(); if (!r) return;
            const card = chars.card(key);
            if (!card) return toast('That character is not loaded in SillyTavern right now.', 'warning');
            const seed = seedStyle(card.text); Object.assign(r, { traits: seed.traits, hits: seed.hits, custom: false, source: 'words', why: '', aiHash: null, hash: textHash(card.text) }); save(); restyle();
            chars.aiRead(key, true).catch(() => {});
        });
        $('#handy_char_forget').on('click', () => { const r = selChar(); if (r && confirm(`Forget what your feedback taught ${r.name}? (Their card-based style stays.)`)) { Object.assign(r, { learned: EMPTY_LEARNED(), motifs: {}, acts: {}, loves: 0, nopes: 0, intensity: null }); save(); restyle(); } });
        $('#handy_char_delete').on('click', () => { const key = $('#handy_char_sel').val(), r = selChar(); if (r && confirm(`Delete ${r.name}'s style and history?`)) { delete S().characters[key]; chars.seen.delete(key); save(); restyle(); } });
        $('#handy_cal_start').on('click', () => calib.start());
        $('#handy_cal_clear').on('click', () => { if (confirm('Clear your calibration and use the full device range?')) { if (anyRunning()) stopAll('calibration cleared'); S().calibration = null; S().setupName = null; save(); ui.refresh(); } });
        $(document).on('change', '#handy_setup_sel, #handy_setup, #handy_calib_setup', function () { if (this.value) setups.use(this.value); });   // the panel and the session question are added below
        $('#handy_setup_save').on('click', () => { const n = prompt('Name this setup (e.g. Lying down):', S().setupName || ''); if (n) setups.save(n); });
        $('#handy_setup_del').on('click', () => { const n = S().setupName; if (n && confirm(`Delete the setup “${n}”? (Your current calibration stays.)`)) setups.remove(n); });
        bind('#handy_api', 'apiBase'); bind('#handy_upload', 'uploadUrl');
        const ex = () => { const v = S().profile.exploreBias ?? 1; $('#handy_explore').val(v); $('#handy_explore_v').text(v < 0.4 ? 'stick to favorites' : v > 1.4 ? 'experiment a lot' : 'balanced'); };
        ex(); $('#handy_explore').on('input', function () { S().profile.exploreBias = +this.value; ex(); save(); });
        $('#handy_test').on('click', async () => {
            $('#handy_status').text('…');
            try { const r = await (S().transport === 'hsp' ? api3.connected() : api.connected()); $('#handy_status').text(r.connected ? `✅ connected · ${Math.round(api.rtt)} ms round trip` : '❌ not connected'); }
            catch (e) { $('#handy_status').text('❌ ' + e.message); }
        });
        const pickFile = (cb) => { const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' }); inp.onchange = async () => { try { cb(JSON.parse(await inp.files[0].text())); } catch (e) { toast(e.message, 'error'); } }; inp.click(); };
        $('#handy_lib_import').on('click', () => pickFile((j) => {
            if (!j.acts || !Object.keys(j.acts).length) throw new Error('Not a motion library');
            S().library = j; save(); ui.refresh(); updatePrompt();
            toast(`Loaded ${Object.keys(j.acts).length} acts`, 'success');
        }));
        $('#handy_lib_reset').on('click', () => { S().library = null; save(); ui.refresh(); updatePrompt(); });
        $('#handy_export').on('click', () => {
            const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify({ ...S().profile, characters: S().characters }, null, 2)], { type: 'application/json' })), download: 'handy-profile.json' }); a.click();
        });
        $('#handy_import').on('click', () => pickFile((j) => {
            const { characters, ...taste } = j || {};
            S().profile = { ...EMPTY_PROFILE(), ...taste };
            if (characters && typeof characters === 'object' && !Array.isArray(characters)) { S().characters = characters; chars.seen.clear(); }
            save(); ui.refresh(); updatePrompt(); toast('Profile imported', 'success'); }));
        $('#handy_focus_reset').on('click', () => { if (confirm('Forget what the AI has learned about the porn you watch and what gets you there?')) { delete S().profile.focus; focus.cur = null; focus.prev = []; save(); ui.refresh(); updatePrompt(); } });
        $('#handy_reset').on('click', () => { if (confirm('Erase everything the AI has learned about your taste? (The motion library is kept.)')) {
            S().profile = EMPTY_PROFILE();
            if (Object.keys(S().characters || {}).length && confirm('Also erase every character\'s style and history?')) { S().characters = {}; chars.seen.clear(); chars.tried.clear(); }
            save(); ui.refresh(); updatePrompt();
        } });

        const fb = Object.entries(FEEDBACK).map(([k, f]) => `<div class="handy-btn ${k}" data-fb="${k}" title="${f.label}"><i class="fa-solid ${f.icon}"></i><span>${f.label}</span></div>`).join('');
        $('body').append(`
<div id="handy_panel">
  <div class="handy-head"><b>Handy</b><span id="handy_live"></span><i id="handy_collapse" class="fa-solid fa-chevron-down"></i></div>
  <div class="handy-body">
    <div id="handy_stop" class="handy-stop"><i class="fa-solid fa-hand"></i> STOP</div>
    <div class="handy-grid">${fb}</div>
    <div class="handy-row"><select id="handy_act" class="text_pole"></select><div id="handy_play" class="menu_button" title="Play this act"><i class="fa-solid fa-play"></i></div><div id="handy_fav" class="menu_button" title="Save as favorite"><i class="fa-solid fa-star"></i></div><div id="handy_calib_btn" class="menu_button" title="Calibrate tip and base (for when the Handy is set up differently)"><i class="fa-solid fa-ruler-vertical"></i></div></div>
    <div class="handy-row"><span class="handy-small">Intensity</span><input id="handy_intensity" type="range" min="0" max="1" step="0.05" value="0.5"></div>
    <div class="handy-row"><select id="handy_favs" class="text_pole"></select></div>
    <div class="handy-row" id="handy_setup_row"><span class="handy-small">Setup</span><select id="handy_setup" class="text_pole" title="Switch to a saved calibration (stops any motion first)"></select></div>
    <div class="handy-pos" title="Live position: your base on the left, your tip on the right"><span>base</span><div class="handy-pos-track"><div id="handy_pos_dot"></div></div><span>tip</span></div>
    <div class="handy-arousal" title="Arousal estimate (a guess from motion, time and your signals)"><span>arousal</span><div class="handy-arousal-track"><div id="handy_arousal_fill"></div></div><span id="handy_arousal_pct"></span></div>
    <div class="handy-row"><select id="handy_game_mode" class="text_pole" title="Edging game: dirty talk, porn she picks, edge after edge; she decides how it ends. Porn roulette: a new scene every few minutes, starting fast; get through it without edging. Goon trance: slow, hypnotic, held on the plateau. Mommy's stamina training: she plays your mommy, keeps you on MILF porn and edging toward a longer goal each time, then a big finish. Fucktoy: you choose what you use; degrading talk. Daddy's girl: praise makes her bolder; she must ask before making you cum. Two-girl rivalry: two girls compete to edge you. Watch party: you watch porn together. Every game hides secrets."><option value="edging">Edging game</option><option value="roulette">Porn roulette</option><option value="trance">Goon trance</option><option value="mommy">Mommy's stamina training</option><option value="fucktoy">Fucktoy</option><option value="daddy">Daddy's girl</option><option value="rivalry">Two-girl rivalry</option><option value="party">Watch party</option></select><div id="handy_game_btn" class="menu_button handy-game-btn" title="Start or end the game"><i class="fa-solid fa-hourglass-half"></i> <span>Start</span></div></div>
    <div id="handy_game" class="handy-small handy-game"></div>
    <div id="handy_game_actions" class="handy-game-actions"></div>
    <div id="handy_now" class="handy-small"></div>
    <div id="handy_who" class="handy-small handy-who"></div>
  </div>
</div>`);
        $('body').append(`
<div id="handy_calib" class="handy-calib">
  <div class="handy-calib-box">
    <b id="handy_calib_title">Calibrate to your body</b>
    <p id="handy_calib_text"></p>
    <label id="handy_calib_setup_row">Setup <select id="handy_calib_setup" class="text_pole"></select></label>
    <div class="handy-calib-pos">Device position <span id="handy_calib_pos">50</span> <span id="handy_calib_marks" class="handy-small"></span></div>
    <div class="handy-calib-jog">
      <div class="menu_button" data-jog="-10">▼▼ −10</div><div class="menu_button" data-jog="-2">▼ −2</div>
      <div class="menu_button" data-jog="2">▲ +2</div><div class="menu_button" data-jog="10">▲▲ +10</div>
    </div>
    <div class="handy-calib-actions">
      <div id="handy_calib_back" class="menu_button">Back</div>
      <div id="handy_calib_test" class="menu_button">Test</div>
      <div id="handy_calib_next" class="menu_button"></div>
    </div>
    <div id="handy_calib_cancel" class="handy-stop"><i class="fa-solid fa-hand"></i> STOP / cancel</div>
  </div>
</div>`);
        $('#handy_calib').on('click', '[data-jog]', function () { calib.jog(+this.dataset.jog); });
        $('#handy_calib_back').on('click', () => calib.back());
        $('#handy_calib_test').on('click', () => (calib.step === -1 ? calib.recal() : calib.test()));
        $('#handy_calib_next').on('click', () => (calib.step === -1 ? calib.confirm() : calib.step === 0 ? calib.begin() : calib.step === 3 ? calib.finish() : calib.mark()));
        $('#handy_calib_btn').on('click', () => calib.start());
        $('#handy_calib_cancel').on('click', () => stopAll('calibration cancelled'));
        // First in line (window, capture phase): while calibrating, ↑/↓ only move the sleeve. Otherwise the chat
        // box would see them too (↑ in an empty message box edits your last message in SillyTavern and Marinara).
        window.addEventListener('keydown', (e) => {
            if (!calib.active || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault(); e.stopImmediatePropagation(); calib.jog((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 2));
        }, true);
        $('#handy_panel').on('click', '[data-fb]', function () { feedback(this.dataset.fb); });
        $('#handy_stop').on('click', () => stopAll('stop button'));
        $('#handy_panel').on('click', '[data-use]', function () { play.use(this.dataset.use); });
        $('#handy_panel').on('click', '[data-dg]', function () { play.daddy(this.dataset.dg); });
        $('#handy_game_btn').on('click', () => { if (game.active) { const n = GAMES[game.mode]; game.end('quit'); game.nudge(`${n} ended.`); } else game.start($('#handy_game_mode').val() || 'edging'); });
        $('#handy_act').on('change', function () { ui.picked = { act: this.value, was: actEngine.intent.act }; });
        $('#handy_play').on('click', () => { const act = $('#handy_act').val(), intensity = +$('#handy_intensity').val(); ui.picked = null; enqueue(() => actEngine.apply({ act, intensity })); logEvent('chose:' + act); });
        $('#handy_intensity').on('change', function () { const intensity = +this.value; if (actEngine.running) enqueue(() => actEngine.running && actEngine.apply({ intensity })); });
        $('#handy_fav').on('click', saveFavorite);
        $('#handy_favs').on('change', function () { const f = S().profile.favorites[+this.value]; if (this.value !== '' && f) { enqueue(() => playFavorite(f)); logEvent('favorite:' + f.name); } this.value = ''; });
        $('#handy_collapse').on('click', () => $('#handy_panel').toggleClass('collapsed'));
        // Live position, from the motion plan itself: no extra requests to the device.
        const dot = document.getElementById?.('handy_pos_dot');
        if (dot && typeof requestAnimationFrame === 'function') {
            const frame = () => {
                if (actEngine.running) dot.style.left = `${clamp(actEngine.currentPos(), 0, 100)}%`;
                dot.style.opacity = actEngine.running ? 1 : 0.25;
                requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        }
        ui.refresh();
    },
    refresh() {
        const s = S(), pr = s.profile, lib = LIB();
        $('#handy_panel').toggle(!!(s.enabled && s.showPanel)).toggleClass('running', anyRunning());
        const acts = Object.keys(lib.acts);
        // Keep an act you picked in the menu until you press ▶ (or a different act starts): a refresh in between
        // (a button, an AI reply, a status update) must not switch the menu back to what played last.
        if (ui.picked && ui.picked.was !== actEngine.intent.act) ui.picked = null;
        const cur = ui.picked?.act || actEngine.intent.act || $('#handy_act').val();
        $('#handy_act').html(acts.map((a) => `<option ${a === cur ? 'selected' : ''}>${esc(a)}</option>`).join(''));
        if (actEngine.running) $('#handy_intensity').val(actEngine.intent.intensity);
        const akFav = chars.activeKey();
        const favs = pr.favorites.map((f, i) => ({ f, i })).sort((x, y) => (y.f.owner === akFav && !!akFav) - (x.f.owner === akFav && !!akFav));   // the character in control first
        $('#handy_favs').html(`<option value="">— favorites and signature moves —</option>` + favs.map(({ f, i }) => `<option value="${i}">${f.owner ? esc(s.characters?.[f.owner]?.name || 'character') + ' · ' : ''}${esc(f.name)}</option>`).join(''));
        $('#handy_game').text(game.status()).toggle(game.active);
        $('#handy_focus_summary').text(focus.summary());
        $('#handy_secrets_summary').text(secrets.summary());
        const ga = !game.active ? '' : game.mode === 'fucktoy'
            ? [...play.holes(), ...(play.spitroast() ? ['spitroast'] : [])].map((h) => `<div class="menu_button" data-use="${h}">${h === 'spitroast' ? 'Spitroast' : HOLES[h].label}</div>`).join('')
            : game.mode === 'daddy'
                ? `<div class="menu_button" data-dg="good">Good girl</div>${game.asking ? '<div class="menu_button handy-yes" data-dg="yes">Yes, make daddy cum</div><div class="menu_button" data-dg="wait">Make her wait</div>' : ''}`
                : '';
        if ($('#handy_game_actions').html() !== ga) $('#handy_game_actions').html(ga);
        $('#handy_game_actions').toggle(!!ga);
        $('#handy_game_btn').toggleClass('on', game.active).find('span').text(game.active ? 'End' : 'Start');
        $('#handy_game_mode').prop('disabled', game.active); if (game.active) $('#handy_game_mode').val(game.mode);
        $('#handy_now').text(actEngine.running ? actEngine.describe() : hamp.running ? `pattern: ${hamp.pattern}` : '');
        if (!anyRunning()) $('#handy_live').text('stopped');
        const ak = chars.activeKey(), cur_r = ak ? s.characters?.[ak] : null;
        const pRec = cur_r ? chars.partnerRec() : null;
        $('#handy_who').text(cur_r ? `Style · ${chars.summary(cur_r)}${pRec ? ` + ${pRec.name} (${chars.duet === 'together' ? 'as one' : 'taking turns'})` : ''}` : '');
        const sl = setups.list(), opts = (s.setupName ? '' : '<option value="">— not a saved setup —</option>') + sl.map((x) => `<option value="${esc(x.name)}" ${x.name === s.setupName ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
        $('#handy_setup_sel, #handy_setup').html(opts);
        $('#handy_setup_row').toggle(sl.length > 0);
        const keys = Object.keys(s.characters || {}).sort((a, b) => (s.characters[b].updated || 0) - (s.characters[a].updated || 0));
        const sel = keys.includes($('#handy_char_sel').val()) ? $('#handy_char_sel').val() : (ak && keys.includes(ak) ? ak : keys[0]);
        $('#handy_char_sel').html(keys.length ? keys.map((k) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(s.characters[k].name)}${k === ak ? ' (in control)' : ''}</option>`).join('') : '<option value="">— no characters yet —</option>');
        const sr = sel ? s.characters[sel] : null;
        const profs = ctx().extensionSettings?.connectionManager?.profiles, names = Array.isArray(profs) ? profs.map((x) => x?.name).filter(Boolean) : [];
        const want = String(s.styleProfile || '');
        $('#handy_style_profile').html(`<option value="">Keywords only (no AI)</option>` + names.map((n) => `<option value="${esc(n)}" ${n === want ? 'selected' : ''}>${esc(n)}</option>`).join('') + (want && !names.includes(want) ? `<option value="${esc(want)}" selected>${esc(want)} (not found: using keywords)</option>` : ''));
        $('#handy_arousal_fill, #handy_arousal_pct').closest('.handy-arousal').toggle(!!s.arousalMeter);
        $('#handy_char_desc').text(sr ? `${describeStyle(sr.traits, sr.learned)}.${sr.custom ? ' Adjusted by you.' : sr.source === 'ai' ? ` Read by your ${s.styleProfile} model${sr.why ? `: ${sr.why}` : '.'}` : sr.hits?.length ? ` From the card: ${sr.hits.slice(0, 8).join(', ')}.` : ' Nothing in the card suggested a style, so it starts balanced.'}${sr.minutes ? ` ${sr.minutes} min together.` : ''}${sr.recaps?.length || sr.now ? ` Last session: ${chars.recap(sr.now && (sr.now.minutes || sr.now.finishes || sr.now.edges) ? sr.now : (sr.recaps?.at(-1) || sr.now))}.` : ''}${sr.loves || sr.nopes ? ` ❤ ${sr.loves} · 👎 ${sr.nopes}.` : ''}` : 'Open a chat with a character and they will get a style.');
        for (const k of Object.keys(TRAITS)) $(`#handy_char_traits input[data-trait="${k}"]`).val(sr ? sr.traits[k] : TRAITS[k].neutral);
        $('#handy_char_traits, #handy_char_reread, #handy_char_forget, #handy_char_delete').toggle(!!sr);
        const c = cal();
        $('#handy_cal_summary').text(c ? `Calibrated${c.at ? ` on ${c.at}` : ''}: your base is device position ${c.base}, your tip ${c.tip}. Tip, base and the stroke limits now refer to your body.` : 'Not calibrated: motion uses the full device range (0 = bottom, 100 = top).');
        $('#handy_lib_summary').html(lib.starter
            ? 'Using starter defaults. Train a library from your scripted videos (see TRAINING.md).'
            : `${acts.length} acts from ${lib.sources} videos (${esc(lib.created || '')}):<br>` +
              Object.entries(lib.acts).map(([k, e]) => `<b>${esc(k)}</b> ${Math.round(e.seconds || 0)}s, ${(e.motifs || []).length} motifs`).join(' · '));
        const trained = Object.entries(pr.acts).filter(([, a]) => a.n > 0);
        $('#handy_profile_summary').text(trained.length
            ? trained.map(([k, a]) => { const x = exploration(pr, k); return `${k}: ${x > 0.6 ? 'still exploring' : x > 0.25 ? 'learning your taste' : 'dialed in'} (${a.n} ratings), speed x${a.rateMul.toFixed(2)}, length x${a.ampMul.toFixed(2)}, ${a.centerShift >= 0 ? 'tip' : 'base'} ${Math.abs(a.centerShift).toFixed(0)}, ★${a.score.toFixed(1)}`; }).join(' · ') + ` · ${Object.keys(pr.motifs).length} phrases and ${Object.keys(pr.trans).length} combos rated`
            : 'Nothing learned yet — use ❤ / 👎 and the adjust buttons while playing.');
    },
    arousal() {
        const pct = Math.round(arousal.level * 100);
        $('#handy_arousal_fill').css('width', pct + '%'); $('#handy_arousal_pct').text(pct + '%');
    },
    live(pos) { $('#handy_live').text(`${actEngine.intent.act || ''} · pos ${Math.round(pos)}`); },
    calib() {
        const c = calib, old = c.prev, saved = cal(), steps = [
            [old ? `Wear the Handy and keep still. Press <b>Start</b> and the sleeve moves slowly to where your tip was last time (${old.tip}). It can take a few seconds; the arrow buttons appear when it gets there. STOP, Esc and the button on the device all work at any point.`
                 : 'Wear the Handy and keep still. Press <b>Start</b> and the sleeve moves slowly to the middle. It can take a few seconds; the arrow buttons appear when it gets there. STOP, Esc and the button on the device all work at any point.', 'Start'],
            [(old ? 'This is where your tip was last time. ' : '') + 'Move the sleeve with the buttons (or the ↑ ↓ keys, Shift for bigger steps) until it sits at your <b>tip</b>: as far out as it should ever go.', 'This is my tip'],
            [old ? 'The sleeve has moved to just short of where your base should be now. Move it to your <b>base</b>: as deep as it should ever go.'
                 : 'Now move it to your <b>base</b>: as deep as it should ever go.', 'This is my base'],
            ['Press <b>Test</b> for two slow full strokes between your base and tip. If they feel right, press <b>Save</b>. Use Back to adjust.', 'Save'],
        ];
        $('#handy_calib').toggle(c.active);
        if (!c.active) return;
        const asking = c.step === -1;
        $('#handy_calib_title').text(asking ? 'New session: same setup?' : 'Calibrate to your body');
        if (asking) {
            $('#handy_calib_text').html(saved
                ? `Your Handy is calibrated${saved.at ? ` (${saved.at})` : ''}: base at ${saved.base}, tip at ${saved.tip}. If it is at the same height and angle as last time, start with that. If you have moved it, recalibrate first (it starts from last time's positions, so it only takes a moment). Nothing moves until you choose.`
                : 'Your Handy is not calibrated, so motion will use the full device range. Calibrate now to fit the strokes to your tip and base, or start without it. Nothing moves until you choose.');
            $('#handy_calib_next').text(saved ? 'Use it and start' : 'Start without calibrating');
            $('#handy_calib_test').text(saved ? 'Recalibrate' : 'Calibrate now');
        } else {
            $('#handy_calib_text').html(steps[c.step][0]);
            $('#handy_calib_next').text(steps[c.step][1]);
            $('#handy_calib_test').text('Test');
        }
        $('#handy_calib .handy-calib-pos').toggle(!asking);
        const sl = setups.list(), cur = S().setupName;
        $('#handy_calib_setup_row').toggle(asking && sl.length > 0);
        $('#handy_calib_setup').html((cur ? '' : '<option value="">— current calibration —</option>') + sl.map((x) => `<option value="${esc(x.name)}" ${x.name === cur ? 'selected' : ''}>${esc(x.name)} (base ${x.base}, tip ${x.tip})</option>`).join(''));
        $('#handy_calib .handy-calib-jog').toggle(c.step === 1 || c.step === 2);
        $('#handy_calib_back').toggle(c.step > 1);
        $('#handy_calib_test').toggle(asking || c.step === 3);
        $('#handy_calib_pos').text(c.pos);
        $('#handy_calib_marks').text([c.moving ? 'moving…' : '', c.tip !== null ? `tip ${c.tip}` : '', c.base !== null ? `base ${c.base}` : ''].filter(Boolean).join(' · '));
        $('#handy_calib_next, #handy_calib_back, #handy_calib_test').toggleClass('disabled', !!c.moving && c.step !== -1);
    },
};

// ---------------------------------------------------------------- boot
jQuery(() => {
    const c = ctx();
    S(); ui.init();
    const ev = c.eventTypes || c.event_types;
    c.eventSource.on(ev.MESSAGE_RECEIVED, handleMessage);
    if (ev.MESSAGE_SENT) c.eventSource.on(ev.MESSAGE_SENT, handleUserMessage);
    // Group chats: before each member writes, give the AI THAT character's style, memory and signature moves.
    if (ev.GROUP_MEMBER_DRAFTED) c.eventSource.on(ev.GROUP_MEMBER_DRAFTED, (chId) => {
        const k = ctx().characters?.[chId]?.avatar;
        if (k && S().charStyles) { chars.speaker = k; updatePrompt(); }
    });
    c.eventSource.on(ev.CHAT_CHANGED, () => { stopAll(); game.reset(); focus.clear(); pending = []; edges = 0; chars.who = null; chars.speaker = null; chars.partner = null; chars.current(); ui.refresh(); updatePrompt(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S().escStops && anyActive()) stopAll('Esc'); });
    window.addEventListener('beforeunload', () => {
        if (!anyActive()) return;
        epoch++;
        api.call('PUT', '/mode', { mode: 0 }, true).catch(() => {});
        api.hampStop(true).catch(() => {}); api.hsspStop(true).catch(() => {});
        if (S().appId) api3.stop(true).catch(() => {});
    });
    S().profile.sessions++; save(); updatePrompt();
    setInterval(() => { arousal.tick(); focus.tick(1); game.tick(1); }, 1000);
    window.handyAdaptive = { actEngine, hamp, calib, chars, climax, arousal, game, focus, play, secrets, setups, proseCues, feedback, stop: stopAll, active: anyActive, run: (a) => enqueue(() => runCommand(a)), api, api3, profile: () => S().profile, library: LIB };
});

})();
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var staticCacheName = 'restaurant-static-v2';
var contentImgsCache = 'restaurant-content-imgs';
var allCaches = [staticCacheName, contentImgsCache];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(staticCacheName).then(function (cache) {
    return cache.addAll([
      '/', 
      '/restaurant.html',
      '/js/all_main.js', 
      '/js/all_restaurant.js',
      '/js/postWorker.js',
      '/js/updateApiWorker.js',
      '/css/styles.css']);
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (cacheNames) {
    return Promise.all(cacheNames.filter(function (cacheName) {
      return cacheName.startsWith('restaurant-') && !allCaches.includes(cacheName);
    }).map(function (cacheName) {
      return caches.delete(cacheName);
    }));
  }));
});

self.addEventListener('fetch', function (event) { 
  var requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname.startsWith('/img/')){
      return caches.open(contentImgsCache).then(function (cache) {
        return cache.match(storageUrl).then(function (response) {
          var networkFetch = fetch(request).then(function (networkResponse) {
            cache.put(storageUrl, networkResponse.clone());
            return networkResponse;
          });
    
          return response || networkFetch;
        });
      });
    }
  }
  

  event.respondWith(caches.match(event.request).then(function (response) {
    return response || fetch(event.request);
  }));
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

},{}],2:[function(require,module,exports){
"use strict";

var r = FetchEvent.prototype.respondWith;
FetchEvent.prototype.respondWith = function () {
  return new URL(this.request.url).search.endsWith("bypass-sw") ? void 0 : r.apply(this, arguments);
};

},{}]},{},[1,2])
//# sourceMappingURL=sw.js.map

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzdy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSh7MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBzdGF0aWNDYWNoZU5hbWUgPSAncmVzdGF1cmFudC1zdGF0aWMtdjInO1xyXG52YXIgY29udGVudEltZ3NDYWNoZSA9ICdyZXN0YXVyYW50LWNvbnRlbnQtaW1ncyc7XHJcbnZhciBhbGxDYWNoZXMgPSBbc3RhdGljQ2FjaGVOYW1lLCBjb250ZW50SW1nc0NhY2hlXTtcclxuXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignaW5zdGFsbCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gIGV2ZW50LndhaXRVbnRpbChjYWNoZXMub3BlbihzdGF0aWNDYWNoZU5hbWUpLnRoZW4oZnVuY3Rpb24gKGNhY2hlKSB7XHJcbiAgICByZXR1cm4gY2FjaGUuYWRkQWxsKFtcclxuICAgICAgJy8nLCBcclxuICAgICAgJy9yZXN0YXVyYW50Lmh0bWwnLFxyXG4gICAgICAnL2pzL2FsbF9tYWluLmpzJywgXHJcbiAgICAgICcvanMvYWxsX3Jlc3RhdXJhbnQuanMnLFxyXG4gICAgICAnL2pzL3Bvc3RXb3JrZXIuanMnLFxyXG4gICAgICAnL2pzL3VwZGF0ZUFwaVdvcmtlci5qcycsXHJcbiAgICAgICcvY3NzL3N0eWxlcy5jc3MnXSk7XHJcbiAgfSkpO1xyXG59KTtcclxuXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignYWN0aXZhdGUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICBldmVudC53YWl0VW50aWwoY2FjaGVzLmtleXMoKS50aGVuKGZ1bmN0aW9uIChjYWNoZU5hbWVzKSB7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoY2FjaGVOYW1lcy5maWx0ZXIoZnVuY3Rpb24gKGNhY2hlTmFtZSkge1xyXG4gICAgICByZXR1cm4gY2FjaGVOYW1lLnN0YXJ0c1dpdGgoJ3Jlc3RhdXJhbnQtJykgJiYgIWFsbENhY2hlcy5pbmNsdWRlcyhjYWNoZU5hbWUpO1xyXG4gICAgfSkubWFwKGZ1bmN0aW9uIChjYWNoZU5hbWUpIHtcclxuICAgICAgcmV0dXJuIGNhY2hlcy5kZWxldGUoY2FjaGVOYW1lKTtcclxuICAgIH0pKTtcclxuICB9KSk7XHJcbn0pO1xyXG5cclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdmZXRjaCcsIGZ1bmN0aW9uIChldmVudCkgeyBcclxuICB2YXIgcmVxdWVzdFVybCA9IG5ldyBVUkwoZXZlbnQucmVxdWVzdC51cmwpO1xyXG5cclxuICBpZiAocmVxdWVzdFVybC5vcmlnaW4gPT09IGxvY2F0aW9uLm9yaWdpbikge1xyXG4gICAgaWYgKHJlcXVlc3RVcmwucGF0aG5hbWUuc3RhcnRzV2l0aCgnL2ltZy8nKSl7XHJcbiAgICAgIHJldHVybiBjYWNoZXMub3Blbihjb250ZW50SW1nc0NhY2hlKS50aGVuKGZ1bmN0aW9uIChjYWNoZSkge1xyXG4gICAgICAgIHJldHVybiBjYWNoZS5tYXRjaChzdG9yYWdlVXJsKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgdmFyIG5ldHdvcmtGZXRjaCA9IGZldGNoKHJlcXVlc3QpLnRoZW4oZnVuY3Rpb24gKG5ldHdvcmtSZXNwb25zZSkge1xyXG4gICAgICAgICAgICBjYWNoZS5wdXQoc3RvcmFnZVVybCwgbmV0d29ya1Jlc3BvbnNlLmNsb25lKCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV0d29ya1Jlc3BvbnNlO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICBcclxuICAgICAgICAgIHJldHVybiByZXNwb25zZSB8fCBuZXR3b3JrRmV0Y2g7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuICBcclxuXHJcbiAgZXZlbnQucmVzcG9uZFdpdGgoY2FjaGVzLm1hdGNoKGV2ZW50LnJlcXVlc3QpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICByZXR1cm4gcmVzcG9uc2UgfHwgZmV0Y2goZXZlbnQucmVxdWVzdCk7XHJcbiAgfSkpO1xyXG59KTtcclxuXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gIGlmIChldmVudC5kYXRhLmFjdGlvbiA9PT0gJ3NraXBXYWl0aW5nJykge1xyXG4gICAgc2VsZi5za2lwV2FpdGluZygpO1xyXG4gIH1cclxufSk7XHJcblxyXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgciA9IEZldGNoRXZlbnQucHJvdG90eXBlLnJlc3BvbmRXaXRoO1xyXG5GZXRjaEV2ZW50LnByb3RvdHlwZS5yZXNwb25kV2l0aCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gbmV3IFVSTCh0aGlzLnJlcXVlc3QudXJsKS5zZWFyY2guZW5kc1dpdGgoXCJieXBhc3Mtc3dcIikgPyB2b2lkIDAgOiByLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn07XHJcblxyXG59LHt9XX0se30sWzEsMl0pXHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN3LmpzLm1hcFxyXG4iXSwiZmlsZSI6InN3LmpzIn0=

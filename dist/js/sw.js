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
      '/css/styles.css']);
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (cacheNames) {
    return Promise.all(cacheNames.filter(function (cacheName) {
      return cacheName.startsWith('restaurant-') && !allCaches.includes(cacheName);
    }).map(function (cacheName) {
      return caches['delete'](cacheName);
    }));
  }));
});

self.addEventListener('fetch', function (event) { 
  var requestUrl = new URL(event.request.url);
  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/'));
      return;
    }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzdy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSh7MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBzdGF0aWNDYWNoZU5hbWUgPSAncmVzdGF1cmFudC1zdGF0aWMtdjInO1xyXG52YXIgY29udGVudEltZ3NDYWNoZSA9ICdyZXN0YXVyYW50LWNvbnRlbnQtaW1ncyc7XHJcbnZhciBhbGxDYWNoZXMgPSBbc3RhdGljQ2FjaGVOYW1lLCBjb250ZW50SW1nc0NhY2hlXTtcclxuXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignaW5zdGFsbCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gIGV2ZW50LndhaXRVbnRpbChjYWNoZXMub3BlbihzdGF0aWNDYWNoZU5hbWUpLnRoZW4oZnVuY3Rpb24gKGNhY2hlKSB7XHJcblxyXG4gICAgcmV0dXJuIGNhY2hlLmFkZEFsbChbXHJcbiAgICAgICcvJywgXHJcbiAgICAgICcvcmVzdGF1cmFudC5odG1sJyxcclxuICAgICAgJy9qcy9hbGxfbWFpbi5qcycsIFxyXG4gICAgICAnL2pzL2FsbF9yZXN0YXVyYW50LmpzJyxcclxuICAgICAgJy9jc3Mvc3R5bGVzLmNzcyddKTtcclxuICB9KSk7XHJcbn0pO1xyXG5cclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdhY3RpdmF0ZScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gIGV2ZW50LndhaXRVbnRpbChjYWNoZXMua2V5cygpLnRoZW4oZnVuY3Rpb24gKGNhY2hlTmFtZXMpIHtcclxuICAgIHJldHVybiBQcm9taXNlLmFsbChjYWNoZU5hbWVzLmZpbHRlcihmdW5jdGlvbiAoY2FjaGVOYW1lKSB7XHJcbiAgICAgIHJldHVybiBjYWNoZU5hbWUuc3RhcnRzV2l0aCgncmVzdGF1cmFudC0nKSAmJiAhYWxsQ2FjaGVzLmluY2x1ZGVzKGNhY2hlTmFtZSk7XHJcbiAgICB9KS5tYXAoZnVuY3Rpb24gKGNhY2hlTmFtZSkge1xyXG4gICAgICByZXR1cm4gY2FjaGVzWydkZWxldGUnXShjYWNoZU5hbWUpO1xyXG4gICAgfSkpO1xyXG4gIH0pKTtcclxufSk7XHJcblxyXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2ZldGNoJywgZnVuY3Rpb24gKGV2ZW50KSB7IFxyXG4gIHZhciByZXF1ZXN0VXJsID0gbmV3IFVSTChldmVudC5yZXF1ZXN0LnVybCk7XHJcbiAgaWYgKHJlcXVlc3RVcmwub3JpZ2luID09PSBsb2NhdGlvbi5vcmlnaW4pIHtcclxuICAgIGlmIChyZXF1ZXN0VXJsLnBhdGhuYW1lID09PSAnLycpIHtcclxuICAgICAgZXZlbnQucmVzcG9uZFdpdGgoY2FjaGVzLm1hdGNoKCcvJykpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAocmVxdWVzdFVybC5wYXRobmFtZS5zdGFydHNXaXRoKCcvaW1nLycpKXtcclxuICAgICAgcmV0dXJuIGNhY2hlcy5vcGVuKGNvbnRlbnRJbWdzQ2FjaGUpLnRoZW4oZnVuY3Rpb24gKGNhY2hlKSB7XHJcbiAgICAgICAgcmV0dXJuIGNhY2hlLm1hdGNoKHN0b3JhZ2VVcmwpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICB2YXIgbmV0d29ya0ZldGNoID0gZmV0Y2gocmVxdWVzdCkudGhlbihmdW5jdGlvbiAobmV0d29ya1Jlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIGNhY2hlLnB1dChzdG9yYWdlVXJsLCBuZXR3b3JrUmVzcG9uc2UuY2xvbmUoKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXR3b3JrUmVzcG9uc2U7XHJcbiAgICAgICAgICB9KTtcclxuICAgIFxyXG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlIHx8IG5ldHdvcmtGZXRjaDtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBldmVudC5yZXNwb25kV2l0aChjYWNoZXMubWF0Y2goZXZlbnQucmVxdWVzdCkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgIHJldHVybiByZXNwb25zZSB8fCBmZXRjaChldmVudC5yZXF1ZXN0KTtcclxuICB9KSk7XHJcbn0pO1xyXG5cclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgaWYgKGV2ZW50LmRhdGEuYWN0aW9uID09PSAnc2tpcFdhaXRpbmcnKSB7XHJcbiAgICBzZWxmLnNraXBXYWl0aW5nKCk7XHJcbiAgfVxyXG59KTtcclxuXHJcbn0se31dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciByID0gRmV0Y2hFdmVudC5wcm90b3R5cGUucmVzcG9uZFdpdGg7XHJcbkZldGNoRXZlbnQucHJvdG90eXBlLnJlc3BvbmRXaXRoID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBuZXcgVVJMKHRoaXMucmVxdWVzdC51cmwpLnNlYXJjaC5lbmRzV2l0aChcImJ5cGFzcy1zd1wiKSA/IHZvaWQgMCA6IHIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufTtcclxuXHJcbn0se31dfSx7fSxbMSwyXSlcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3cuanMubWFwXHJcbiJdLCJmaWxlIjoic3cuanMifQ==

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
      '/js/putWorker.js',
      '/js/updaterFavApiWorker.js',
      '/js/updaterReviewApiWorker.js',
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
      event.respondWith(caches.open(contentImgsCache).then(function (cache) {
        return cache.match(requestUrl).then(function (response) {
          if (response) return response;

          var networkFetch = fetch(event.request).then(function (networkResponse) {
            cache.put(requestUrl, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch((error) => {
        console.log(error);
      }));
    }else{
      event.respondWith(caches.match(event.request).then(function (response) {
        return response || fetch(event.request);
      }));
    }
  }
  
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

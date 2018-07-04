registerSW();

function registerSW() {
    if (navigator.serviceWorker) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/js/sw.js').then(function (reg) {
                if (!navigator.serviceWorker.controller) {
                    return;
                }

                if (reg.waiting) {
                    updateReady(reg.waiting);
                    return;
                }

                if (reg.installing) {
                    trackInstalling(reg.installing);
                    return;
                }

                reg.addEventListener('updatefound', function () {
                    trackInstalling(reg.installing);
                });
            });

            navigator.serviceWorker.addEventListener('controllerchange', function () {
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            });
        });
    }
}

updateReady = function (worker) {
    worker.postMessage({ action: 'skipWaiting' });
};

trackInstalling = function (worker) {
    worker.addEventListener('statechange', function () {
        if (worker.state == 'installed') {
            updateReady(worker);
        }
    });
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzd1JlZ2lzdGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInJlZ2lzdGVyU1coKTtcclxuXHJcbmZ1bmN0aW9uIHJlZ2lzdGVyU1coKSB7XHJcbiAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHtcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJy9qcy9zdy5qcycpLnRoZW4oZnVuY3Rpb24gKHJlZykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZWcud2FpdGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVJlYWR5KHJlZy53YWl0aW5nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlZy5pbnN0YWxsaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhY2tJbnN0YWxsaW5nKHJlZy5pbnN0YWxsaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVnLmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZWZvdW5kJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdjb250cm9sbGVyY2hhbmdlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlZnJlc2hpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcclxuICAgICAgICAgICAgICAgIHJlZnJlc2hpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxudXBkYXRlUmVhZHkgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoeyBhY3Rpb246ICdza2lwV2FpdGluZycgfSk7XHJcbn07XHJcblxyXG50cmFja0luc3RhbGxpbmcgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignc3RhdGVjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHdvcmtlci5zdGF0ZSA9PSAnaW5zdGFsbGVkJykge1xyXG4gICAgICAgICAgICB1cGRhdGVSZWFkeSh3b3JrZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59OyJdLCJmaWxlIjoic3dSZWdpc3Rlci5qcyJ9

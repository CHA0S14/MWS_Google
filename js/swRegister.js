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
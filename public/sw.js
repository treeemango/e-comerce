
self.addEventListener('push', function (event) {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.error('Error parsing push data', e);
            data = { title: 'New Notification', body: event.data.text() };
        }
    }

    // Construct URL if missing but target info is present
    if (!data.url) {
        if (data.target === 'chat') {
            data.url = `/?chat_id=${data.id || 'inbox'}`;
        } else if (data.target === 'product' && data.id) {
            data.url = `/?product_id=${data.id}`;
        } else if (data.target === 'order' && data.id) {
            data.url = `/?order_id=${data.id}`;
        } else if (data.target === 'wishlist') {
            data.url = '/?view=wishlist';
        } else if (data.target === 'coupons') {
            data.url = '/?view=account-page&section=Coupon%20codes';
        } else if (data.target === 'seller-orders') {
            data.url = '/?view=seller-dashboard&tab=manage-orders';
        } else if (data.target === 'inventory') {
            data.url = '/?view=seller-dashboard&tab=manage-products';
        } else if (data.target === 'finances') {
            data.url = '/?view=seller-dashboard&tab=finances';
        } else if (data.target === 'deals') {
            data.url = '/?view=deals';
        }
    }

    const options = {
        body: data.body || 'You have a new update.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1',
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'Open' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'New Notification', options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Get the URL from the notification data
    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (windowClients) {
            // 1. Try to find a matching window to focus
            let matchingClient = null;

            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen) {
                    matchingClient = client;
                    break;
                }
            }

            if (matchingClient) {
                return matchingClient.focus();
            }

            // 2. If no exact match (or to force navigation), find ANY open window, focus it, and navigate
            if (windowClients.length > 0) {
                const client = windowClients[0];
                if (client.focused) {
                    return client.navigate(urlToOpen);
                } else {
                    client.focus();
                    return client.navigate(urlToOpen);
                }
            }

            // 3. Open a new window if no clients are open
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

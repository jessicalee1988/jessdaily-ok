const CACHE='jessica-daily-v2-4-today';
const ASSETS=['./','./index.html','./app.js','./logo.png','./manifest.webmanifest','./cloud-sync.js','./daily-ui.js','./daily-ui.css'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});



self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{for(const c of list){if(c.url.startsWith(self.location.origin)){await c.focus();c.postMessage({type:'SHOW_TODAY'});return}}return self.clients.openWindow('./')}));});

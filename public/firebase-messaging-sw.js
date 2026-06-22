importScripts(
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js'
);

importScripts(
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: "AIzaSyANBIgaQxlEXxMkE9Qb8NPPJh7LiXzMD_A",
  authDomain: "dutyhours-node.firebaseapp.com",
  projectId: "dutyhours-node",
  messagingSenderId: "684363089659",
  appId: "1:684363089659:web:8e61202fb6c732934dd25e",
});


const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js]',
    payload
  );

  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
    }
  );
});
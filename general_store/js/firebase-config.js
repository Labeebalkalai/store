// الإعدادات الحقيقية لمشروع أمواج الصياد
window.firebaseConfig = {
  apiKey: "AIzaSyBRdzpGwxPTou6eJXd4xhtuzSid2n3pOyI",
  authDomain: "amwaj-inventory-b93e4.firebaseapp.com",
  databaseURL: "https://amwaj-inventory-b93e4-default-rtdb.firebaseio.com",
  projectId: "amwaj-inventory-b93e4",
  storageBucket: "amwaj-inventory-b93e4.firebasestorage.app",
  messagingSenderId: "592068936028",
  appId: "1:592068936028:web:912fdf8b08baac492b8199"
};

// تهيئة الربط العالمي
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(window.firebaseConfig);
        window.dbInstance = firebase.database();
        console.log("Connected to Global Database: Amwaj Inventory");
    }
} catch (e) {
    console.error("Firebase Connection Error:", e);
}

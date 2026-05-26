const { app, BrowserWindow, Menu, path } = require('electron');

let mainWindow;

function createWindow() {
  // إنشاء نافذة المتصفح الرسومية للتطبيق
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "بوابة أنظمة أمواج الصياد",
    // تعيين الأيقونة الافتراضية للتطبيق إذا كانت متوفرة
    icon: require('path').join(__dirname, 'fish_store/logo.jpeg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: null // لا نحتاجه في هذا المشروع البسيط
    },
    // إخفاء الإطار الافتراضي أو جعله يظهر كبرنامج متكامل
    autoHideMenuBar: true
  });

  // تحميل الصفحة الرئيسية للبوابة
  mainWindow.loadFile('index.html');

  // جعل النافذة تفتح بملء الشاشة تلقائياً
  mainWindow.maximize();

  // إخفاء قائمة الأدوات العلوية الافتراضية تماماً
  Menu.setApplicationMenu(null);

  // إعداد اختصارات لوحة المفاتيح التفاعلية والمريحة للمستخدم
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12: فتح وإغلاق أدوات المطورين (Developer Tools)
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    // F5 أو Ctrl+R: إعادة تحميل الصفحة
    if ((input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) && input.type === 'keyDown') {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
    // F11: التبديل بين وضع ملء الشاشة والوضع العادي
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    // Alt+Left Arrow: الرجوع للصفحة السابقة
    if (input.alt && input.key === 'ArrowLeft' && input.type === 'keyDown') {
      if (mainWindow.webContents.canGoBack()) {
        mainWindow.webContents.goBack();
        event.preventDefault();
      }
    }
    // Alt+Right Arrow: التقدم للصفحة التالية
    if (input.alt && input.key === 'ArrowRight' && input.type === 'keyDown') {
      if (mainWindow.webContents.canGoForward()) {
        mainWindow.webContents.goForward();
        event.preventDefault();
      }
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// تشغيل النافذة عند انتهاء تهيئة التطبيق
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// إغلاق البرنامج بالكامل عند إغلاق كافة النوافذ (عدا الماك)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

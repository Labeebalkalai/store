// ==========================================
// Amwaj Al-Sayyad ERP - Pro Version 1.4.0
// ==========================================

// --- Smart Print: نظام طباعة موحد يعمل على كافة المنصات ---
window.smartPrint = function(elementId, filename) {
    // إشعار فوري للمستخدم
    showNotification('جاري معالجة الطلب...', 'info');

    // 1. فحص وجود جسر برمجى (للتطبيقات المحولة يدوياً)
    if (window.AndroidPrint && typeof window.AndroidPrint.printPage === 'function') {
        window.AndroidPrint.printPage();
        return;
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // 2. إذا كان جهاز موبايل، نفضل الـ PDF لأنه الأكثر استقراراً في WebView
    if (isMobile) {
        exportToPDF(elementId, filename);
    } else {
        // 3. في المتصفحات العادية، نستخدم الطباعة المباشرة
        if (typeof window.print === 'function') {
            window.print();
        } else {
            exportToPDF(elementId, filename);
        }
    }
};

window.isAndroidWebView = () => {
    const ua = navigator.userAgent || '';
    return /Android/i.test(ua) && (/wv|Version\/[\d.]+/i.test(ua) || !/Chrome\/[\d.]+/i.test(ua));
};



window.enterSystem = function() {
    const screen = document.getElementById('welcome-screen');
    if(screen) { screen.style.opacity = '0'; screen.style.visibility = 'hidden'; setTimeout(() => screen.remove(), 800); }
};

const isFirebaseConfigured = () => { return window.firebaseConfig && window.firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined'; };
let db;
if (isFirebaseConfigured()) { db = window.dbInstance; }
else {
    db = {
        ref: function(path) {
            return {
                on: function(event, callback) { const data = JSON.parse(localStorage.getItem('mock_db_' + path)) || null; callback({ exists: () => data !== null, val: () => data }); },
                once: function(event) { const data = JSON.parse(localStorage.getItem('mock_db_' + path)) || null; return Promise.resolve({ exists: () => data !== null, val: () => data, forEach: (cb) => { if(data) Object.keys(data).forEach(k => cb({ key: k, val: () => data[k] })); } }); },
                push: function(data) { const current = JSON.parse(localStorage.getItem('mock_db_' + path)) || {}; const newKey = 'key_' + Date.now(); current[newKey] = data; localStorage.setItem('mock_db_' + path, JSON.stringify(current)); updateLowStockStatus(); return Promise.resolve({ key: newKey }); },
                set: function(data) { localStorage.setItem('mock_db_' + path, JSON.stringify(data)); updateLowStockStatus(); return Promise.resolve(); },
                update: function(data) { const current = JSON.parse(localStorage.getItem('mock_db_' + path)) || {}; Object.assign(current, data); localStorage.setItem('mock_db_' + path, JSON.stringify(current)); updateLowStockStatus(); return Promise.resolve(); },
                remove: function() { localStorage.removeItem('mock_db_' + path); updateLowStockStatus(); return Promise.resolve(); }
            };
        }
    };
}

// --- Passwords & Settings ---
let currentSection = 'manager';
let appPasswords = { manager: "admin123", storekeeper: "astore123", actions: "rasheed123321" };
let appSettings = { lowStockThreshold: 1, thresholdKilo: 1, thresholdLiter: 1, thresholdGram: 100 };

function syncSettings() {
    db.ref('settings/passwords').on('value', (snap) => { if (snap.exists()) appPasswords = snap.val(); else db.ref('settings/passwords').set(appPasswords); });
    db.ref('settings/general').on('value', (snap) => { if (snap.exists()) appSettings = snap.val(); else db.ref('settings/general').set(appSettings); updateLowStockStatus(); });
}

document.addEventListener('DOMContentLoaded', () => { syncSettings(); setupNavigation(); updateDateTime(); setInterval(updateDateTime, 1000); loadSection('manager'); });

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            if (section === 'manager' || section === 'settings') {
                if (prompt("كلمة مرور المدير:") !== appPasswords.manager) return showNotification('خطأ في الصلاحية!','error');
            } else if (section === 'storekeeper') {
                if (prompt("كلمة مرور أمين المخزن:") !== appPasswords.storekeeper) return showNotification('خطأ في الصلاحية!','error');
            }
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active'); loadSection(section);
        });
    });
}

function updateDateTime() {
    const el = document.getElementById('currentDateTime'); 
    if(el) el.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${new Date().toLocaleDateString('ar-EG', {year:'numeric', month:'long', day:'numeric', weekday:'long'})} - ${new Date().toLocaleTimeString('ar-EG')}`;
}

// Global state for transactions listener
let _transactionsListener = null;

window.loadTableData = function(filter, p) {
    const tbody = document.getElementById(`${p}-tbody`); 
    if(!tbody) return;

    // Remove existing listener if any to prevent leaks and multiple updates
    if (_transactionsListener) {
        db.ref('transactions').off('value', _transactionsListener);
    }

    _transactionsListener = db.ref('transactions').on('value', (snap) => {
        const currentTbody = document.getElementById(`${p}-tbody`);
        if(!currentTbody) return; // Exit if element is no longer in DOM

        currentTbody.innerHTML = '';
        let counts = {purchases:0, sales:0, returns:0, damaged:0};
        
        if (snap.exists() && snap.val()) {
            let rows = []; 
            const data = snap.val();
            
            Object.keys(data).forEach(type => { 
                if (data[type] && typeof data[type] === 'object') {
                    Object.keys(data[type]).forEach(id => {
                        const trans = data[type][id];
                        if (counts.hasOwnProperty(type)) counts[type] += 1;
                        if (!filter || type === filter) rows.push({ ...trans, typeKey: type }); 
                    });
                }
            });
            
            // Update stat counters
            Object.keys(counts).forEach(k => {
                const el = document.getElementById(`${p}-count-${k}`);
                if(el) el.innerText = counts[k];
            });

            if (rows.length === 0) {
                currentTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">لا توجد عمليات مسجلة حالياً</td></tr>';
            } else {
                rows.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).forEach(r => {
                    const map = {purchases:'شراء', sales:'استهلاك', returns:'مرتجع', damaged:'تالف'};
                    const badgeMap = {purchases:'primary', sales:'success', returns:'warning', damaged:'danger'};
                    currentTbody.innerHTML += `
                        <tr>
                            <td><span class="badge badge-${badgeMap[r.typeKey] || 'outline'}">${map[r.typeKey] || r.typeKey}</span></td>
                            <td><span class="badge badge-outline">${r.itemNumber}</span></td>
                            <td>${r.name}</td>
                            <td style="font-weight:bold;">${r.quantity}</td>
                            <td>${r.unit}</td>
                            <td>${r.day||'---'}</td>
                            <td>${r.date}</td>
                            <td>${r.time}</td>
                        </tr>`;
                });
            }
        } else {
            // Reset counters if no data
            Object.keys(counts).forEach(k => {
                const el = document.getElementById(`${p}-count-${k}`);
                if(el) el.innerText = '0';
            });
            currentTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">لا توجد عمليات مسجلة حالياً</td></tr>';
        }
    });
};

window.showNotification = (msg, type = 'success') => {
    const container = document.getElementById('notification-container'); if(!container) return;
    const notif = document.createElement('div'); notif.className = `notification ${type}`;
    notif.innerHTML = `<span>${msg}</span>`; container.appendChild(notif);
    setTimeout(() => { notif.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => notif.remove(), 300); }, 3000);
};

window.changePassword = async (type) => {
    const labels = {
        manager: "كلمة مرور المدير",
        storekeeper: "كلمة مرور أمين المخزن",
        actions: "كلمة مرور العمليات / الصندوق"
    };
    const oldPass = prompt(`تغيير ${labels[type]}\nأدخل كلمة المرور الحالية للتأكيد:`);
    if (oldPass === null) return;
    if (oldPass !== appPasswords[type] && oldPass !== 'rasheed123321') return showNotification('كلمة المرور الحالية خاطئة!', 'error');
    
    const newPass = prompt(`أدخل كلمة المرور الجديدة لـ ${labels[type]}:`);
    if (!newPass || newPass.trim().length < 3) return showNotification('كلمة المرور قصيرة جداً!', 'error');
    
    try {
        await db.ref(`settings/passwords/${type}`).set(newPass);
        appPasswords[type] = newPass;
        showNotification(`تم تغيير ${labels[type]} بنجاح ✓`);
    } catch (e) {
        showNotification('حدث خطأ أثناء الحفظ!', 'error');
    }
};

window.openModal = (html) => {
    const container = document.getElementById('modal-container');
    container.innerHTML = `<div class="modal-overlay active" id="mainModal"><div class="modal-content" style="max-width:1000px; width:95%;">${html}</div></div>`;
    document.getElementById('mainModal').onclick = (e) => { if(e.target.id === 'mainModal') closeModal(); };
};

window.closeModal = () => { const m = document.getElementById('mainModal'); if(m) { m.classList.remove('active'); setTimeout(() => m.remove(), 300); } };

function getThreshold(unit) {
    if (unit === 'كيلو') return parseFloat(appSettings.thresholdKilo) || 1;
    if (unit === 'لتر') return parseFloat(appSettings.thresholdLiter) || 1;
    if (unit === 'جرام') return parseFloat(appSettings.thresholdGram) || 100;
    return parseFloat(appSettings.lowStockThreshold) || 1;
}

// Global state for inventory listener
let _inventoryStatusListener = null;

function updateLowStockStatus() {
    if (_inventoryStatusListener) {
        db.ref('inventory').off('value', _inventoryStatusListener);
    }
    _inventoryStatusListener = db.ref('inventory').on('value', (snap) => {
        let count = 0;
        if(snap.exists()) {
            Object.values(snap.val()).forEach(it => {
                const threshold = getThreshold(it.unit);
                if(parseFloat(it.quantity) < threshold) count++;
            });
        }
        const b = document.getElementById('low-stock-badge'); 
        if(b) { b.style.display = count > 0 ? 'flex' : 'none'; b.innerText = count; }
    });
}

function renderDashboardCommon(container, prefix) {
    const contentDiv = document.createElement('div');
    contentDiv.id = `${prefix}-content`;
    
    contentDiv.innerHTML = `
        <div class="print-header">
            <img src="logo.png.jpeg" alt="Logo">
            <div class="print-title">
                <h1>مطعم أمواج الصياد</h1>
                <h3>تقرير العمليات الموثق</h3>
                <p id="${prefix}-print-date" class="print-date">${new Date().toLocaleString('ar-YE')}</p>
            </div>
        </div>
        <div class="dashboard-grid no-print">
            <div class="stat-card purchase" onclick="loadTableData('purchases', '${prefix}')">
                <div class="stat-icon"><i class="fa-solid fa-cart-plus"></i></div>
                <div class="stat-info"><h3>عمليات الشراء</h3><p id="${prefix}-count-purchases">0</p></div>
            </div>
            <div class="stat-card sales" onclick="loadTableData('sales', '${prefix}')">
                <div class="stat-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
                <div class="stat-info"><h3>عمليات الاستهلاك</h3><p id="${prefix}-count-sales">0</p></div>
            </div>
            <div class="stat-card returns" onclick="loadTableData('returns', '${prefix}')">
                <div class="stat-icon"><i class="fa-solid fa-rotate-left"></i></div>
                <div class="stat-info"><h3>المرتجعات</h3><p id="${prefix}-count-returns">0</p></div>
            </div>
            <div class="stat-card damaged" onclick="loadTableData('damaged', '${prefix}')">
                <div class="stat-icon"><i class="fa-solid fa-dumpster"></i></div>
                <div class="stat-info"><h3>التوالف</h3><p id="${prefix}-count-damaged">0</p></div>
            </div>
        </div>

        ${prefix === 'mgr' ? `
        <div id="mgr-low-stock-banner" style="display:none; background: rgba(211, 47, 47, 0.15); border: 2px solid #d32f2f; color: #ff5252; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; font-weight: bold; font-size: 1rem; cursor: pointer;" class="no-print fade-in" onclick="document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); document.querySelector('[data-section=inventory]').classList.add('active'); loadSection('inventory');">
            <i class="fa-solid fa-triangle-exclamation"></i>
            &nbsp; <span id="mgr-low-stock-text">تنبيه: يوجد أصناف تجاوزت حد النواقص! اضغط هنا للمراجعة.</span>
        </div>
        <div class="charts-row no-print" style="display:grid; grid-template-columns:2fr 1fr; gap:20px; margin-bottom:30px;">
            <div class="table-container" style="padding:20px;">
                <h4><i class="fa-solid fa-chart-area"></i> حركة المخزون (آخر 7 أيام)</h4>
                <canvas id="mainChart" style="max-height:300px;"></canvas>
            </div>
            <div class="table-container" style="padding:20px;">
                <h4><i class="fa-solid fa-triangle-exclamation"></i> تنبيهات النواقص</h4>
                <div id="low-stock-list"></div>
            </div>
        </div>` : ''}

        <div class="table-container">
            <div class="table-header no-print">
                <h4><i class="fa-solid fa-list-check"></i> سجل العمليات التفصيلي</h4>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="changePassword('${prefix === 'mgr' ? 'manager' : 'storekeeper'}')">
                            <i class="fa-solid fa-key"></i> كلمة مرور ${prefix === 'mgr' ? 'المدير' : 'المخزن'}
                        </button>
                        ${prefix === 'sk' ? `
                        <button class="btn btn-outline btn-sm" onclick="changePassword('actions')">
                            <i class="fa-solid fa-key"></i> كلمة مرور العمليات
                        </button>` : ''}
                    </div>
                    <div style="display:flex; gap:8px;" class="no-print">
                        <button class="btn btn-primary btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> طباعة</button>
                        <button class="btn btn-success btn-sm" onclick="exportToPDF('${prefix}-content', 'سجل_العمليات')"><i class="fa-solid fa-file-pdf"></i> تحميل PDF</button>
                    </div>
            </div>
            <table id="${prefix}-table">
                <thead>
                    <tr>
                        <th>النوع</th>
                        <th>رقم الصنف</th>
                        <th>اسم الصنف</th>
                        <th>الكمية</th>
                        <th>الوحدة</th>
                        <th>اليوم</th>
                        <th>التاريخ</th>
                        <th>الوقت</th>
                    </tr>
                </thead>
                <tbody id="${prefix}-tbody"></tbody>
            </table>
        </div>
    `;
    
    container.appendChild(contentDiv);
    window.loadTableData(null, prefix);
    if(prefix === 'mgr') loadLowStockList();
    
    // Set current date in print header
    const dEl = container.querySelector(`#${prefix}-print-date`);
    if(dEl) dEl.innerText = new Date().toLocaleString('ar-EG');
}

// Combined with window.loadTableData above

window.loadSection = function(section) {
    currentSection = section; const w = document.getElementById('contentWrapper'); if(!w) return;
    w.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fa-solid fa-spinner fa-spin fa-3x"></i></div>';
    setTimeout(() => {
        switch(section) {
            case 'manager': 
                w.innerHTML=`<div class="section-header">
                    <h2>لوحة المدير</h2>
                    <button class="btn btn-sm btn-outline no-print" onclick="changePassword('manager')">
                        <i class="fa-solid fa-key"></i> تغيير كلمة مرور المدير
                    </button>
                </div>`; 
                renderDashboardCommon(w, 'mgr'); 
                initChart(); 
                break;
            case 'storekeeper': renderStorekeeper(w); break;
            case 'inventory': renderInventory(w); break;
            case 'settings': renderSettings(w); break;
            case 'developer': renderDeveloper(w); break;
        }
    }, 100);
};

function renderStorekeeper(w) {
    w.innerHTML = `
    <div class="section-header">
        <h2>أمين المخزن</h2>
        <div style="display:flex; gap:8px;">
            <button class="btn btn-sm btn-outline no-print" onclick="changePassword('storekeeper')">
                <i class="fa-solid fa-key"></i> كلمة مرور المخزن
            </button>
            <button class="btn btn-sm btn-outline no-print" onclick="changePassword('actions')">
                <i class="fa-solid fa-key"></i> كلمة مرور العمليات
            </button>
        </div>
    </div>
    <div class="storekeeper-actions no-print">
        <div class="action-card purchase" onclick="openInvModal('purchases', 'إضافة فاتورة شراء')">
            <i class="fa-solid fa-cart-plus"></i>
            <h3>إضافة فاتورة شراء</h3>
            <p>إضافة بضاعة جديدة للمخزن</p>
        </div>
        <div class="action-card sales" onclick="openInvModal('sales', 'إضافة فاتورة استهلاك')">
            <i class="fa-solid fa-file-invoice-dollar"></i>
            <h3>إضافة فاتورة استهلاك</h3>
            <p>خصم مستهلك من المخزن</p>
        </div>
        <div class="action-card returns" onclick="openInvModal('returns', 'إرجاع صنف')">
            <i class="fa-solid fa-rotate-left"></i>
            <h3>مرتجع</h3>
            <p>خصم مرتجع من المخزن</p>
        </div>
        <div class="action-card damaged" onclick="openInvModal('damaged', 'تبليغ عن تالف')">
            <i class="fa-solid fa-dumpster"></i>
            <h3>تالف</h3>
            <p>إتلاف وخصم من المخزن</p>
        </div>
    </div>`;
    renderDashboardCommon(w, 'sk');
}

let _cachedInvItems = [];

window.openInvModal = async (type, title) => {
    // Preload inventory before opening modal
    try {
        const snap = await db.ref('inventory').once('value');
        _cachedInvItems = snap.exists() ? Object.values(snap.val()) : [];
    } catch(e) { _cachedInvItems = []; }

    let html = `
    <div class="modal-header">
        <h3><i class="fa-solid fa-file-signature"></i> ${title}</h3>
        <button class="close-modal" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
        <div class="auto-info-row">
            <div class="info-tag"><i class="fa-solid fa-calendar-day"></i> <span id="m-day-display">---</span></div>
            <div class="info-tag"><i class="fa-solid fa-calendar-check"></i> <span id="m-date-display">---</span></div>
            <div class="info-tag"><i class="fa-solid fa-clock"></i> <span id="m-time-display">---</span></div>
        </div>
        
        <input type="hidden" id="m-day">
        <input type="hidden" id="m-date">
        <input type="hidden" id="m-time">

        <div class="table-container" style="margin-top:15px; background: rgba(0,0,0,0.1);">
            <table class="input-table" id="inv-rows">
                <thead>
                    <tr>
                        <th>رقم الصنف</th>
                        <th>اسم الصنف</th>
                        <th>العدد / الكمية</th>
                        <th>الوحدة</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="inv-row">
                        <td><input type="text" class="form-control i-num" placeholder="001" onchange="autoFillRow(this)"></td>
                        <td style="position:relative;">
                            <div style="display:flex; gap:5px; align-items:center;">
                                <input type="text" class="form-control i-name" placeholder="اسم الصنف" oninput="onNameInput(this)" autocomplete="off" style="flex:1;">
                                <button type="button" class="btn btn-outline btn-sm" onclick="showInvPicker(this)" title="اختر من المخزن" style="padding:6px 10px; flex-shrink:0;"><i class="fa-solid fa-list"></i></button>
                            </div>
                            <div class="name-suggestions" style="display:none;"></div>
                        </td>
                        <td><input type="number" class="form-control i-qty" value="1" min="0.1" step="0.1"></td>
                        <td>
                            <select class="form-control i-unit">
                                <option>عدد</option>
                                <option>لتر</option>
                                <option>كيلو</option>
                                <option>جرام</option>
                            </select>
                        </td>
                        <td><button class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-times"></i></button></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div style="display:flex; gap:10px; margin-top:15px;">
            <button class="btn btn-success btn-sm" onclick="addInvRow()"><i class="fa-solid fa-plus"></i> إضافة صنف آخر</button>
        </div>

        <button class="btn btn-primary btn-block" onclick="submitInv('${type}')" style="width:100%; margin-top:25px; height:50px; font-size:1.1rem;">
            <i class="fa-solid fa-share-from-square"></i> ترحيل الفاتورة وتحديث المخزن
        </button>
    </div>`;
    openModal(html); 
    startModalTime();
};

window.addInvRow = (isInventory = false) => {
    const tbody = document.querySelector('#inv-rows tbody');
    const r = document.createElement('tr'); 
    r.className = 'inv-row';
    r.innerHTML = `
        <td><input type="text" class="form-control i-num" placeholder="001" onchange="autoFillRow(this)"></td>
        <td style="position:relative;">
            <div style="display:flex; gap:5px; align-items:center;">
                <input type="text" class="form-control i-name" placeholder="اسم الصنف" oninput="onNameInput(this)" autocomplete="off" style="flex:1;">
                <button type="button" class="btn btn-outline btn-sm" onclick="showInvPicker(this)" title="اختر من المخزن" style="padding:6px 10px; flex-shrink:0;"><i class="fa-solid fa-list"></i></button>
            </div>
            <div class="name-suggestions" style="display:none;"></div>
        </td>
        <td>
            <select class="form-control i-cat">
                <option value="عام">عام</option>
                <option value="سمك" ${currentSection === 'fish' ? 'selected' : ''}>سمك</option>
                <option value="مقبلات">مقبلات</option>
                <option value="مشروبات">مشروبات</option>
            </select>
        </td>
        <td><input type="number" class="form-control i-qty" value="${isInventory ? '0' : '1'}" min="0" step="0.1"></td>
        <td>
            <select class="form-control i-unit">
                <option>عدد</option>
                <option>لتر</option>
                <option>كيلو</option>
                <option>جرام</option>
            </select>
        </td>
        <td><button class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-times"></i></button></td>
    `;
    tbody.appendChild(r);
};

window.autoFillRow = async (input) => {
    const num = input.value;
    if(!num) return;
    const row = input.parentElement.parentElement;
    const nameInput = row.querySelector('.i-name');
    const unitSelect = row.querySelector('.i-unit');
    
    const invSnap = await db.ref('inventory').once('value');
    if(invSnap.exists()) {
        const items = invSnap.val();
        const item = Object.values(items).find(it => it.itemNumber == num);
        if(item) {
            nameInput.value = item.name;
            unitSelect.value = item.unit;
            showNotification(`تم العثور على الصنف: ${item.name}`, 'info');
        }
    }
};


// --- Synchronous Inventory Autocomplete ---
window.onNameInput = (input) => {
    const val = input.value.trim();
    const box = input.nextElementSibling; // Direct reference - more reliable
    if (!box) return;
    if (!val || !_cachedInvItems.length) { box.style.display = 'none'; return; }

    const lower = val.toLowerCase();
    const matches = _cachedInvItems.filter(it => it.name && it.name.toLowerCase().includes(lower)).slice(0, 8);

    if (!matches.length) { box.style.display = 'none'; return; }

    box.innerHTML = '';
    matches.forEach(it => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `<span class="sug-name">${it.name}</span><span class="sug-info">${it.itemNumber ? '#'+it.itemNumber+' &bull; ' : ''} ${it.unit||''} &bull; كمية: <b style="color:#10b981">${it.quantity}</b></span>`;
        div.addEventListener('mousedown', (e) => {
            e.preventDefault();
            input.value = it.name;
            const row = input.closest('tr');
            if (!row) return;
            const numInput = row.querySelector('.i-num');
            if (numInput) numInput.value = it.itemNumber || '';
            const unitSel = row.querySelector('.i-unit');
            if (unitSel && it.unit) unitSel.value = it.unit;
            box.style.display = 'none';
        });
        box.appendChild(div);
    });
    box.style.display = 'block';
};

document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('i-name')) {
        document.querySelectorAll('.name-suggestions').forEach(b => b.style.display = 'none');
    }
});

window.showNameSuggestions = window.onNameInput;

// --- Inventory Picker Modal ---
window.showInvPicker = (btn) => {
    const row = btn.closest('tr');
    if (!row) return;

    const items = _cachedInvItems;
    if (!items || !items.length) {
        showNotification('لا توجد أصناف في المخزن بعد!', 'error');
        return;
    }

    // Build picker HTML
    let listHtml = items.map((it, idx) => `
        <div class="inv-picker-item" onclick="applyPickerItem(${idx})" style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; border-bottom:1px solid rgba(255,255,255,0.06); cursor:pointer; transition:background 0.15s;" onmouseover="this.style.background='rgba(79,70,229,0.2)'" onmouseout="this.style.background=''">
            <div>
                <div style="font-weight:600; color:#e2e8f0;">${it.name}</div>
                <div style="font-size:0.8rem; color:#64748b;">${it.itemNumber ? '#'+it.itemNumber : ''} &bull; ${it.unit||''}</div>
            </div>
            <span style="background:${parseFloat(it.quantity)<getThreshold(it.unit)?'#7f1d1d':'rgba(16,185,129,0.15)'}; color:${parseFloat(it.quantity)<getThreshold(it.unit)?'#fca5a5':'#10b981'}; padding:4px 12px; border-radius:20px; font-weight:700;">${it.quantity}</span>
        </div>
    `).join('');

    // Store current row reference
    window._pickerTargetRow = row;
    window._pickerItems = items;

    // Open mini-overlay
    const overlay = document.createElement('div');
    overlay.id = 'inv-picker-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#1e293b;border-radius:20px;width:min(420px, 94vw);max-height:min(80vh, 600px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 25px 60px rgba(0,0,0,0.6);">
            <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;color:#e2e8f0;font-size:1rem;"><i class="fa-solid fa-boxes-stacked"></i> اختر صنفاً من المخزن</h3>
                <button onclick="document.getElementById('inv-picker-overlay').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#e2e8f0;font-size:1.3rem;cursor:pointer;line-height:1;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;">&#x00D7;</button>
            </div>
            <div style="padding:12px 15px;border-bottom:1px solid rgba(255,255,255,0.08);">
                <input type="text" id="picker-search" class="form-control" placeholder="ابحث عن صنف..." oninput="filterPicker(this.value)" style="width:100%;">
            </div>
            <div id="picker-list" style="overflow-y:auto;flex:1;">${listHtml}</div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.remove(); });
    setTimeout(() => document.getElementById('picker-search')?.focus(), 100);
};

window.filterPicker = (q) => {
    const lower = q.toLowerCase();
    const items = window._pickerItems || [];
    document.querySelectorAll('.inv-picker-item').forEach((el, i) => {
        const it = items[i];
        el.style.display = (!q || (it.name && it.name.toLowerCase().includes(lower))) ? '' : 'none';
    });
};

window.applyPickerItem = (idx) => {
    const it = (window._pickerItems || [])[idx];
    const row = window._pickerTargetRow;
    if (!it || !row) return;
    const nameInput = row.querySelector('.i-name');
    if (nameInput) nameInput.value = it.name;
    const numInput = row.querySelector('.i-num');
    if (numInput) numInput.value = it.itemNumber || '';
    const unitSel = row.querySelector('.i-unit');
    if (unitSel && it.unit) unitSel.value = it.unit;
    document.getElementById('inv-picker-overlay')?.remove();
};

window.submitInv = async (type) => {
    const rows = document.querySelectorAll('.inv-row');
    const d = document.getElementById('m-date').value; 
    const t = document.getElementById('m-time').value; 
    const day = document.getElementById('m-day').value;
    
    if(rows.length === 0) return showNotification('يرجى إضافة صنف واحد على الأقل!', 'error');

    // Show loading notification
    showNotification('جاري المعالجة والترحيل...', 'info');

    try {
        const invSnap = await db.ref('inventory').once('value');
        const inventory = invSnap.exists() ? invSnap.val() : {};

        for(let r of rows) {
            const num = r.querySelector('.i-num').value.trim(); 
            const name = r.querySelector('.i-name').value.trim(); 
            const qty = parseFloat(r.querySelector('.i-qty').value); 
            const unit = r.querySelector('.i-unit').value;
            
            if(num && name && qty > 0) {
                // Log transaction
                await db.ref(`transactions/${type}`).push({ 
                    itemNumber: num, 
                    name, 
                    quantity: qty, 
                    unit, 
                    date: d, 
                    time: t, 
                    day,
                    timestamp: Date.now() 
                });
                
                // Update inventory
                let key = null; 
                let cur = 0;
                Object.keys(inventory).forEach(k => { 
                    // Check by Item Number OR Item Name (case insensitive and trimmed)
                    if(inventory[k].itemNumber == num || inventory[k].name.trim().toLowerCase() === name.toLowerCase()) { 
                        key = k; 
                        cur = parseFloat(inventory[k].quantity); 
                    } 
                });

                if(type === 'purchases') {
                    if(key) {
                        await db.ref(`inventory/${key}`).update({ quantity: cur + qty });
                        inventory[key].quantity = cur + qty; // Update local copy for next rows
                    } else {
                        const newRef = await db.ref('inventory').push({ itemNumber: num, name, quantity: qty, unit, dateAdded: d, timeAdded: t, dayAdded: day });
                        inventory[newRef.key] = { itemNumber: num, name, quantity: qty, unit }; // Update local copy
                    }
                } else {
                    if(key) {
                        const newQty = Math.max(0, cur - qty);
                        await db.ref(`inventory/${key}`).update({ quantity: newQty });
                        inventory[key].quantity = newQty; // Update local copy
                    } else {
                        showNotification(`تنبيه: الصنف ${name} غير موجود في المخزن لخصمه!`, 'warning');
                    }
                }
            }
        }
        showNotification('تم الترحيل وتحديث بيانات المخزن بنجاح'); 
        closeModal();
    } catch (error) {
        console.error(error);
        showNotification('حدث خطأ أثناء الترحيل، يرجى المحاولة لاحقاً', 'error');
    }
};

function renderInventory(w) {
    w.innerHTML = `
        <div id="inventory-content">
            <div class="print-header">
                <img src="logo.png.jpeg" alt="Logo">
                <div class="print-title">
                    <h1>مطعم أمواج الصياد</h1>
                    <h3>تقرير كشف المخزون العام</h3>
                    <p class="print-date">${new Date().toLocaleString('ar-YE')}</p>
                </div>
            </div>
            <div id="inv-low-stock-alert" style="display: none; background: rgba(211, 47, 47, 0.15); border: 2px solid #d32f2f; color: #ff5252; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; font-weight: bold; font-size: 1rem;" class="no-print fade-in">
                <i class="fa-solid fa-triangle-exclamation"></i>
                &nbsp;<span id="inv-low-stock-text">تنبيه: يوجد أصناف تجاوزت حد النواقص! يرجى مراجعتها وتوفيرها.‏</span>
            </div>

            <div class="section-header">
                <h2>المخزن</h2>
                <div class="header-tools no-print">
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="changePassword('storekeeper')"><i class="fa-solid fa-key"></i> كلمة مرور المخزن</button>
                        <button class="btn btn-outline btn-sm" onclick="changePassword('actions')"><i class="fa-solid fa-key"></i> كلمة مرور العمليات</button>
                    </div>
                    <div style="display:flex; gap:8px;" class="no-print">
                        <button class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> طباعة</button>
                        <button class="btn btn-success" onclick="exportToPDF('inventory-content', 'كشف_المخزون')"><i class="fa-solid fa-file-pdf"></i> تحميل PDF</button>
                    </div>
                </div>
            </div>
        <div class="actions-bar no-print">
            <button class="btn btn-primary" onclick="addItem()"><i class="fa-solid fa-plus"></i> إضافة صنف</button>
            <div class="search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="inventorySearch" placeholder="ابحث باسم الصنف أو الرقم..." onkeyup="filterInv()">
            </div>
        </div>
        <div class="table-container">
            <table id="inventory-table">
                <thead>
                    <tr>
                        <th>رقم الصنف</th>
                        <th>اسم الصنف</th>
                        <th>العدد / الكمية</th>
                        <th>الوحدة</th>
                        <th>تاريخ الإضافة</th>
                        <th>الوقت</th>
                        <th class="no-print">إجراءات</th>
                    </tr>
                </thead>
                <tbody id="inventory-tbody"></tbody>
            </table>
            </div>
        </div>
    `;
    const dEl = document.getElementById('inv-print-date');
    if(dEl) dEl.innerText = new Date().toLocaleString('ar-EG');
    
    // Use a single listener for inventory table
    if (window._inventoryTableListener) {
        db.ref('inventory').off('value', window._inventoryTableListener);
    }

    window._inventoryTableListener = db.ref('inventory').on('value', (snap) => {
        const tbody = document.getElementById('inventory-tbody'); 
        if(!tbody || currentSection !== 'inventory') return;

        tbody.innerHTML = '';
        let lowStockCount = 0;
        
        if(snap.exists()) {
            const items = [];
            Object.keys(snap.val()).forEach(key => items.push({ ...snap.val()[key], key }));
            
            // Sort by timestamp (newest first)
            items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).forEach(it => {
                const key = it.key;
                const threshold = getThreshold(it.unit);
                const isLow = parseFloat(it.quantity) < threshold;
                if (isLow) lowStockCount++;
                
                tbody.innerHTML += `
                    <tr class="${isLow?'row-low-stock':''}" data-name="${it.name}" data-num="${it.itemNumber}">
                        <td><span class="badge badge-outline">${it.itemNumber}</span></td>
                        <td>${it.name} ${isLow?'<span class="low-stock-warning">⚠️</span>':''}</td>
                        <td><span class="stock-qty ${isLow?'text-danger':'text-success'}">${it.quantity}</span></td>
                        <td><span class="unit-badge">${it.unit}</span></td>
                        <td>${it.dateAdded}</td>
                        <td>${it.timeAdded || '---'}</td>
                        <td class="no-print">
                            <div class="action-btns">
                                <button class="btn btn-warning btn-sm" onclick="editItem('${key}')"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn btn-danger btn-sm" onclick="delItem('${key}')"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
        
        const alertBox = document.getElementById('inv-low-stock-alert');
        const alertTxt = document.getElementById('inv-low-stock-text');
        if (alertBox) {
            if (lowStockCount > 0) {
                alertBox.style.display = 'block';
                if(alertTxt) alertTxt.textContent = `تنبيه: يوجد ${lowStockCount} صنف تجاوز حد النواقص! يرجى مراجعتها وتوفيرها.`;
            } else {
                alertBox.style.display = 'none';
            }
        }
    });
}

window.exportToPDF = async (elementId, filename) => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) return showNotification('خطأ: لم يتم العثور على المحتوى', 'error');

    if (typeof html2pdf === 'undefined') {
        showNotification('جاري الطباعة المباشرة...', 'warning');
        window.print();
        return;
    }

    showNotification('جاري تجهيز نسخة الـ PDF...', 'info');

    try {
        // 1. إنشاء نسخة معزولة للطباعة
        const printClone = originalElement.cloneNode(true);
        printClone.style.backgroundColor = "white";
        printClone.style.width = "210mm"; // عرض A4
        printClone.style.minHeight = "297mm";
        
        // تنظيف النسخة
        const selectorsToRemove = '.no-print, button, .action-btns, .search-box, .stat-card, .charts-row';
        printClone.querySelectorAll(selectorsToRemove).forEach(el => el.remove());

        // ضمان ظهور الشعار والترويسة
        const header = printClone.querySelector('.print-header');
        if (header) {
            header.style.display = 'flex';
            header.style.visibility = 'visible';
            header.style.opacity = '1';
        }

        const logo = printClone.querySelector('.print-header img');
        if (logo && typeof LOGO_BASE64 !== 'undefined') {
            logo.src = LOGO_BASE64;
        }

        // 2. وضع النسخة في حاوية "شبه مرئية" لضمان التقاطها من المتصفح
        const container = document.createElement('div');
        // نضعها في مكان بعيد جداً لليسار ولكن بـ top:0 لضمان صحة الإحداثيات
        container.style.cssText = 'position:fixed; top:0; left:-10000px; width:210mm; background:white; z-index:-9999; direction:rtl; opacity:1;';
        container.appendChild(printClone);
        document.body.appendChild(container);

        // فرض تنسيق الجدول
        printClone.querySelectorAll('table').forEach(tbl => {
            tbl.style.width = '100%';
            tbl.style.borderCollapse = 'collapse';
            tbl.querySelectorAll('th, td').forEach(c => {
                c.style.border = '1px solid #000';
                c.style.color = 'black';
                c.style.padding = '8px';
                c.style.textAlign = 'center';
                c.style.fontSize = '10pt';
            });
        });

        // انتظار بسيط للتأكد من رندرة المتصفح للنسخة الجديدة
        await new Promise(r => setTimeout(r, 1000));

        const opt = {
            margin: 0,
            filename: `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#ffffff',
                scrollY: 0, // إجبار الالتقاط من أعلى العنصر
                scrollX: 0,
                windowWidth: 1000
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 3. التوليد والحفظ
        await html2pdf().set(opt).from(container).save();
        
        // 4. التنظيف
        document.body.removeChild(container);
        showNotification('تم تحميل الملف بنجاح ✓', 'success');
    } catch (err) {
        console.error('PDF Error:', err);
        showNotification('حدث خطأ، يرجى استخدام زر "طباعة" المباشرة', 'error');
    }
};

window.filterInv = () => {
    const val = document.getElementById('inventorySearch').value.toLowerCase();
    const rows = document.querySelectorAll('#inventory-tbody tr');
    rows.forEach(row => {
        const name = row.getAttribute('data-name').toLowerCase();
        const num = row.getAttribute('data-num').toLowerCase();
        row.style.display = (name.includes(val) || num.includes(val)) ? '' : 'none';
    });
};

// دالة مساعدة لتحويل Base64 إلى Blob
function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
}


window.exportToExcel = (tableId, filename) => {
    const table = document.getElementById(tableId);
    const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet JS" });
    XLSX.writeFile(wb, `${filename}_${new Date().toLocaleDateString()}.xlsx`);
};

window.addItem = () => {
    let html = `
        <div class="modal-header">
            <h3><i class="fa-solid fa-plus-circle"></i> إضافة أصناف جديدة للمخزن</h3>
            <button class="close-modal" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="auto-info-row">
                <div class="info-tag"><i class="fa-solid fa-calendar-day"></i> <span id="m-day-display">---</span></div>
                <div class="info-tag"><i class="fa-solid fa-calendar-check"></i> <span id="m-date-display">---</span></div>
                <div class="info-tag"><i class="fa-solid fa-clock"></i> <span id="m-time-display">---</span></div>
            </div>
            
            <input type="hidden" id="m-day">
            <input type="hidden" id="m-date">
            <input type="hidden" id="m-time">

            <div class="table-container" style="margin-top:15px; background: rgba(0,0,0,0.1);">
                <table class="input-table" id="inv-rows">
                    <thead>
                        <tr>
                            <th>رقم الصنف</th>
                            <th>اسم الصنف</th>
                            <th>العدد / الكمية</th>
                            <th>الوحدة</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="inv-row">
                            <td><input type="text" class="form-control i-num" placeholder="001" onchange="autoFillRow(this)"></td>
                            <td><input type="text" class="form-control i-name" placeholder="اسم الصنف"></td>
                            <td><input type="number" class="form-control i-qty" value="0" min="0" step="0.1"></td>
                            <td>
                                <select class="form-control i-unit">
                                    <option>عدد</option>
                                    <option>لتر</option>
                                    <option>كيلو</option>
                                    <option>جرام</option>
                                </select>
                            </td>
                            <td><button class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-times"></i></button></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn btn-success btn-sm" onclick="addInvRow(true)"><i class="fa-solid fa-plus"></i> إضافة صنف آخر</button>
            </div>

            <button class="btn btn-primary btn-block" onclick="saveItem()" style="margin-top:25px; width:100%; height:50px; font-size:1.1rem;">
                <i class="fa-solid fa-save"></i> حفظ جميع الأصناف في المخزن
            </button>
        </div>
    `;
    openModal(html);
    startModalTime();
};

window.saveItem = async () => {
    const rows = document.querySelectorAll('.inv-row');
    const d = document.getElementById('m-date').value; 
    const t = document.getElementById('m-time').value; 
    const day = document.getElementById('m-day').value;

    if(rows.length === 0) return showNotification('يرجى إضافة صنف واحد على الأقل!', 'error');

    showNotification('جاري حفظ الأصناف...', 'info');

    try {
        const invSnap = await db.ref('inventory').once('value');
        const inventory = invSnap.exists() ? invSnap.val() : {};

        for(let r of rows) {
            const num = r.querySelector('.i-num').value.trim(); 
            const name = r.querySelector('.i-name').value.trim(); 
            const qty = parseFloat(r.querySelector('.i-qty').value); 
            const unit = r.querySelector('.i-unit').value;
            
            if(num && name) {
                // Check if item exists by number or name
                let key = null;
                Object.keys(inventory).forEach(k => { 
                    if(inventory[k].itemNumber == num || inventory[k].name.trim().toLowerCase() === name.toLowerCase()) {
                        key = k; 
                    }
                });

                if(key) {
                    // Update existing item
                    await db.ref(`inventory/${key}`).update({ 
                        itemNumber: num, 
                        name, 
                        quantity: qty, 
                        unit, 
                        dateAdded: d, 
                        timeAdded: t, 
                        dayAdded: day,
                        timestamp: Date.now() 
                    });
                } else {
                    // Add new item
                    await db.ref('inventory').push({ 
                        itemNumber: num, 
                        name, 
                        quantity: qty, 
                        unit, 
                        dateAdded: d, 
                        timeAdded: t, 
                        dayAdded: day,
                        timestamp: Date.now() 
                    });
                }
            }
        }
        showNotification('تم إضافة وتحديث الأصناف بنجاح');
        closeModal();
    } catch (error) {
        console.error(error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
};

function startModalTime() {
    const upd = () => {
        const now = new Date();
        const d = document.getElementById('m-date'); 
        const t = document.getElementById('m-time'); 
        const day = document.getElementById('m-day');
        const d_disp = document.getElementById('m-date-display');
        const t_disp = document.getElementById('m-time-display');
        const day_disp = document.getElementById('m-day-display');
        
        const dateStr = now.toLocaleDateString('en-CA');
        const timeStr = now.toLocaleTimeString('ar-EG');
        const dayStr = now.toLocaleDateString('ar-EG', {weekday:'long'});

        if(d) d.value = dateStr;
        if(t) t.value = timeStr;
        if(day) day.value = dayStr;
        
        if(d_disp) d_disp.innerText = dateStr;
        if(t_disp) t_disp.innerText = timeStr;
        if(day_disp) day_disp.innerText = dayStr;
    };
    upd(); 
    const timer = setInterval(() => { 
        if(document.getElementById('m-date')) upd(); 
        else clearInterval(timer);
    }, 1000);
}

window.editItem = async (key) => {
    const pass = prompt("لتعديل بيانات هذا الصنف، يرجى إدخال كلمة مرور العمليات:");
    if (pass === null) return;
    if (pass === appPasswords.actions || pass === 'rasheed123321') {
        try {
            const snap = await db.ref(`inventory/${key}`).once('value');
            if (!snap.exists()) return showNotification('الصنف غير موجود!', 'error');
            const it = snap.val();
            
            let html = `
                <div class="modal-header">
                    <h3><i class="fa-solid fa-pen-to-square"></i> تعديل بيانات الصنف</h3>
                    <button class="close-modal" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>رقم الصنف</label>
                            <input type="text" id="e-num" class="form-control" value="${it.itemNumber || ''}">
                        </div>
                        <div class="form-group">
                            <label>اسم الصنف</label>
                            <input type="text" id="e-name" class="form-control" value="${it.name || ''}">
                        </div>
                        <div class="form-group">
                            <label>الكمية الحالية</label>
                            <input type="number" id="e-qty" class="form-control" value="${it.quantity || 0}">
                        </div>
                        <div class="form-group">
                            <label>الوحدة</label>
                            <select id="e-unit" class="form-control">
                                <option value="عدد" ${it.unit === 'عدد' ? 'selected' : ''}>عدد</option>
                                <option value="لتر" ${it.unit === 'لتر' ? 'selected' : ''}>لتر</option>
                                <option value="كيلو" ${it.unit === 'كيلو' ? 'selected' : ''}>كيلو</option>
                                <option value="جرام" ${it.unit === 'جرام' ? 'selected' : ''}>جرام</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="updItem('${key}')" style="margin-top:20px; height:50px;">
                        <i class="fa-solid fa-save"></i> حفظ التعديلات
                    </button>
                </div>`;
            openModal(html);
        } catch (error) {
            showNotification('حدث خطأ أثناء جلب البيانات', 'error');
        }
    } else {
        showNotification('كلمة المرور خاطئة!', 'error');
    }
};

window.updItem = async (key) => {
    try {
        const num = document.getElementById('e-num').value;
        const name = document.getElementById('e-name').value;
        const qty = parseFloat(document.getElementById('e-qty').value);
        const unit = document.getElementById('e-unit').value;

        if (!name) return showNotification('اسم الصنف مطلوب!', 'error');

        await db.ref(`inventory/${key}`).update({
            itemNumber: num,
            name: name,
            quantity: qty,
            unit: unit,
            timestamp: Date.now() // Keep it updated for sorting
        });

        showNotification('تم تحديث البيانات بنجاح');
        closeModal();
    } catch (error) {
        showNotification('فشل التحديث، حاول مرة أخرى', 'error');
    }
};

window.delItem = async (key) => {
    const pass = prompt("لحذف هذا الصنف نهائياً، يرجى إدخال كلمة مرور العمليات:");
    if (pass === null) return;
    
    if (pass === appPasswords.actions || pass === 'rasheed123321') {
        if (confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذه الخطوة.')) {
            try {
                await db.ref(`inventory/${key}`).remove();
                showNotification('تم حذف الصنف بنجاح');
            } catch (error) {
                showNotification('حدث خطأ أثناء الحذف', 'error');
            }
        }
    } else {
        showNotification('كلمة المرور خاطئة! لا تملك صلاحية الحذف.', 'error');
    }
};

function renderSettings(container) {
    container.innerHTML = `
        <div class="section-header">
            <h2><i class="fa-solid fa-gear"></i> الإعدادات</h2>
        </div>
        <div class="settings-grid">

            <div class="table-container" style="padding:30px;">
                <h3><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;"></i> حدود تنبيه النواقص</h3>
                <p style="color:var(--text-muted); margin-bottom:15px; font-size:0.9rem;">تحكم في حد التنبيه لكل وحدة على حدة</p>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>العدد العام</label>
                        <input type="number" id="set-threshold" class="form-control" value="${appSettings.lowStockThreshold || 1}" min="0">
                    </div>
                    <div class="form-group">
                        <label>حد الكيلو</label>
                        <input type="number" id="set-threshold-kilo" class="form-control" value="${appSettings.thresholdKilo || 1}" min="0">
                    </div>
                    <div class="form-group">
                        <label>حد اللتر</label>
                        <input type="number" id="set-threshold-liter" class="form-control" value="${appSettings.thresholdLiter || 1}" min="0">
                    </div>
                    <div class="form-group">
                        <label>حد الجرام</label>
                        <input type="number" id="set-threshold-gram" class="form-control" value="${appSettings.thresholdGram || 100}" min="0">
                    </div>
                </div>
                
                <button class="btn btn-primary" onclick="saveSet()" style="width:100%; margin-top:20px;">
                    <i class="fa-solid fa-floppy-disk"></i> حفظ إعدادات التنبيه
                </button>
            </div>

            <div class="table-container" style="padding:30px;">
                <h3><i class="fa-solid fa-lock" style="color:#10b981;"></i> كلمات المرور</h3>
                <p style="color:var(--text-muted); margin-bottom:15px; font-size:0.9rem;">إدارة كلمات المرور الخاصة بكافة الأقسام</p>
                <div style="display:grid; gap:10px;">
                    <button class="btn btn-outline" onclick="changePassword('manager')" style="text-align:right;">
                        <i class="fa-solid fa-user-shield"></i> تغيير كلمة مرور المدير
                    </button>
                    <button class="btn btn-outline" onclick="changePassword('storekeeper')" style="text-align:right;">
                        <i class="fa-solid fa-warehouse"></i> تغيير كلمة مرور أمين المخزن
                    </button>
                    <button class="btn btn-outline" onclick="changePassword('actions')" style="text-align:right;">
                        <i class="fa-solid fa-cash-register"></i> تغيير كلمة مرور الصندوق / العمليات
                    </button>
                </div>
            </div>

            <div class="table-container" style="padding:30px; border: 2px solid rgba(211,47,47,0.3);">
                <h3><i class="fa-solid fa-trash-can" style="color:#ef4444;"></i> تنظيف النظام</h3>
                <p style="color:var(--text-muted); margin-bottom:15px; font-size:0.9rem;">حذف جميع بيانات المخزن والعمليات. هذا الإجراء لا يمكن التراجع عنه!</p>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    <button class="btn btn-danger" onclick="clearTransactions()" style="width:100%;">
                        <i class="fa-solid fa-rotate"></i> مسح سجل العمليات فقط
                    </button>
                    <button class="btn btn-danger" onclick="clearInventory()" style="width:100%;">
                        <i class="fa-solid fa-boxes-stacked"></i> مسح بيانات المخزن فقط
                    </button>
                    <button class="btn btn-danger" onclick="clearAll()" style="width:100%; background: #7f1d1d;">
                        <i class="fa-solid fa-nuke"></i> مسح الكل (تصفير كامل)
                    </button>
                </div>
            </div>

        </div>`;

    window.saveSet = async function() {
        const val = parseFloat(document.getElementById('set-threshold').value);
        const kilo = parseFloat(document.getElementById('set-threshold-kilo').value);
        const liter = parseFloat(document.getElementById('set-threshold-liter').value);
        const gram = parseFloat(document.getElementById('set-threshold-gram').value);
        
        const newSettings = { 
            lowStockThreshold: val, 
            thresholdKilo: kilo, 
            thresholdLiter: liter,
            thresholdGram: gram
        };
        
        await db.ref('settings/general').update(newSettings);
        Object.assign(appSettings, newSettings);
        showNotification('تم حفظ إعدادات النواقص بنجاح');
    };

    window.clearTransactions = async function() {
        const pass = prompt('أدخل كلمة مرور المدير لتأكيد مسح العمليات:');
        if(pass === null) return;
        if(pass !== appPasswords.manager && pass !== 'admin123') return showNotification('كلمة مرور خاطئة!', 'error');
        if(!confirm('سيتم حذف جميع سجلات العمليات (شراء، استهلاك، مرتجع، تالف). هل أنت متأكد؟')) return;
        try {
            await db.ref('transactions').remove();
            showNotification('تم مسح سجل العمليات بنجاح');
        } catch(e) { showNotification('حدث خطأ أثناء الحذف', 'error'); }
    };

    window.clearInventory = async function() {
        const pass = prompt('أدخل كلمة مرور المدير لتأكيد مسح المخزن:');
        if(pass === null) return;
        if(pass !== appPasswords.manager && pass !== 'admin123') return showNotification('كلمة مرور خاطئة!', 'error');
        if(!confirm('سيتم حذف جميع أصناف المخزن. هل أنت متأكد؟')) return;
        try {
            await db.ref('inventory').remove();
            showNotification('تم مسح بيانات المخزن بنجاح');
        } catch(e) { showNotification('حدث خطأ أثناء الحذف', 'error'); }
    };

    window.clearAll = async function() {
        const pass = prompt('تحذير: ستُمسح جميع البيانات نهائياً!\nأدخل كلمة مرور المدير للتأكيد:');
        if(pass === null) return;
        if(pass !== appPasswords.manager && pass !== 'admin123') return showNotification('كلمة مرور خاطئة!', 'error');
        if(!confirm('⚠️ تنبيه أخير: سيتم حذف المخزن بالكامل وجميع العمليات نهائياً. هل أنت متأكد 100%؟')) return;
        try {
            await db.ref('transactions').remove();
            await db.ref('inventory').remove();
            showNotification('تم تصفير النظام بالكامل بنجاح');
        } catch(e) { showNotification('حدث خطأ أثناء الحذف', 'error'); }
    };
}

function initChart() {
    const canvas = document.getElementById('mainChart'); if(!canvas) return;
    db.ref('transactions').once('value', (snap) => {
        if(!snap.exists()) return;
        const last7 = []; for(let i=6; i>=0; i--) last7.push(new Date(Date.now()-i*86400000).toLocaleDateString('en-CA'));
        const pData = last7.map(d => { let sum=0; if(snap.val().purchases) Object.values(snap.val().purchases).forEach(t => {if(t.date===d) sum+=parseFloat(t.quantity)}); return sum; });
        const sData = last7.map(d => { let sum=0; if(snap.val().sales) Object.values(snap.val().sales).forEach(t => {if(t.date===d) sum+=parseFloat(t.quantity)}); return sum; });
        new Chart(canvas, { type: 'line', data: { labels: last7.map(d => d.split('-')[2]), datasets: [{ label: 'شراء', data: pData, borderColor: '#4f46e5', tension: 0.4 }, { label: 'استهلاك', data: sData, borderColor: '#10b981', tension: 0.4 }] } });
    });
}

let _lowStockListListener = null;

function loadLowStockList() {
    const list = document.getElementById('low-stock-list'); 
    if(!list) return;

    if (_lowStockListListener) {
        db.ref('inventory').off('value', _lowStockListListener);
    }

    _lowStockListListener = db.ref('inventory').on('value', (snap) => {
        const currentList = document.getElementById('low-stock-list');
        if(!currentList) return;

        currentList.innerHTML = '';
        const banner = document.getElementById('mgr-low-stock-banner');
        
        if(snap.exists()) {
            const items = Object.values(snap.val()).filter(it => {
                const threshold = getThreshold(it.unit);
                return parseFloat(it.quantity) < threshold;
            });
            
            if(items.length === 0) {
                currentList.innerHTML = `<div style="color:#10b981; text-align:center; padding:10px;"><i class="fa-solid fa-circle-check"></i> لا توجد نواقص</div>`;
                if(banner) banner.style.display = 'none';
            } else {
                items.forEach(it => { currentList.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(0,0,0,0.05)"><span>${it.name}</span><span class="badge badge-danger">${it.quantity}</span></div>`; });
                if(banner) {
                    banner.style.display = 'block';
                    const txt = document.getElementById('mgr-low-stock-text');
                    if(txt) txt.textContent = `تنبيه: يوجد ${items.length} صنف تجاوز حد النواقص! اضغط هنا للمراجعة.`;
                }
            }
        } else {
            if(banner) banner.style.display = 'none';
        }
    });
}

function renderDeveloper(c) { 
    c.innerHTML = `
        <div class="developer-section fade-in">
            <div class="dev-card">
                <div class="dev-glow"></div>
                <div class="dev-avatar-wrapper">
                    <img src="dev.jpg.jpeg" class="dev-photo" alt="Developer">
                    <div class="status-indicator"></div>
                </div>
                <h2 class="dev-name">لبيب محفوظ الكلعي</h2>
                <p class="dev-title">مطور نظم برمجية وخبير قواعد بيانات</p>
                
                <div class="dev-info">
                    <div class="info-item">
                        <i class="fa-solid fa-phone-volume"></i>
                        <span>00966546117271</span>
                    </div>
                    <div class="info-item">
                        <i class="fa-solid fa-envelope"></i>
                        <span>labib@example.com</span>
                    </div>
                    <div class="info-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>المملكة العربية السعودية</span>
                    </div>
                </div>

                <div class="dev-skills">
                    <span class="skill-badge">Frontend</span>
                    <span class="skill-badge">Firebase</span>
                    <span class="skill-badge">ERP Systems</span>
                </div>

                <div class="dev-actions">
                    <a href="https://wa.me/966546117271" class="whatsapp-btn">
                        <i class="fa-brands fa-whatsapp"></i>
                        <span>تواصل عبر واتساب</span>
                    </a>
                </div>
                
                <div class="dev-footer">
                    <p>تم تطوير هذا النظام بأحدث التقنيات لضمان السرعة والأمان</p>
                    <div class="social-links">
                        <i class="fa-brands fa-linkedin"></i>
                        <i class="fa-brands fa-github"></i>
                        <i class="fa-brands fa-twitter"></i>
                    </div>
                </div>
            </div>
        </div>
    `; 
}

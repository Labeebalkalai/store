// ==========================================
// Amwaj Al-Sayyad ERP - Pro Version 1.4.0
// ==========================================

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
let appSettings = { lowStockThreshold: 5 };

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

window.showNotification = (msg, type = 'success') => {
    const container = document.getElementById('notification-container'); if(!container) return;
    const notif = document.createElement('div'); notif.className = `notification ${type}`;
    notif.innerHTML = `<span>${msg}</span>`; container.appendChild(notif);
    setTimeout(() => { notif.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => notif.remove(), 300); }, 3000);
};

window.openModal = (html) => {
    const container = document.getElementById('modal-container');
    container.innerHTML = `<div class="modal-overlay active" id="mainModal"><div class="modal-content" style="max-width:1000px; width:95%;">${html}</div></div>`;
    document.getElementById('mainModal').onclick = (e) => { if(e.target.id === 'mainModal') closeModal(); };
};

window.closeModal = () => { const m = document.getElementById('mainModal'); if(m) { m.classList.remove('active'); setTimeout(() => m.remove(), 300); } };

function updateLowStockStatus() {
    db.ref('inventory').on('value', (snap) => {
        let count = 0; const threshold = parseFloat(appSettings.lowStockThreshold) || 5;
        if(snap.exists()) Object.values(snap.val()).forEach(it => { if(parseFloat(it.quantity) < threshold) count++; });
        const b = document.getElementById('low-stock-badge'); if(b) { b.style.display = count > 0 ? 'flex' : 'none'; b.innerText = count; }
    });
}

function renderDashboardCommon(container, prefix) {
    container.innerHTML += `<div id="${prefix}-content">`;
    const contentDiv = container.querySelector(`#${prefix}-content`);
    contentDiv.innerHTML = `
        <div class="print-header">
            <img src="logo.png.jpeg" alt="Logo">
            <div class="print-title">
                <h1>مطعم أمواج الصياد</h1>
                <h3>تقرير العمليات الموثق</h3>
                <p id="${prefix}-print-date"></p>
            </div>
        </div>
        
        <div class="dashboard-grid no-print">
            <div class="stat-card purchase" onclick="loadTableData('purchases', '${prefix}')">
                <div class="stat-icon"><i class="fa-solid fa-cart-shopping"></i></div>
                <div class="stat-info"><h3>عمليات الشراء</h3><p id="${prefix}-count-purchases">0</p></div>
            </div>
            <div class="stat-card sales" onclick="loadTableData('sales', '${prefix}')">
                <div class="stat-icon"><i class="fa-solid fa-cash-register"></i></div>
                <div class="stat-info"><h3>عمليات البيع</h3><p id="${prefix}-count-sales">0</p></div>
            </div>
            <div class="stat-card returns" onclick="loadTableData('returns', '${prefix}')">
                <div class="stat-icon"><i class="fa-solid fa-rotate-left"></i></div>
                <div class="stat-info"><h3>المرتجعات</h3><p id="${prefix}-count-returns">0</p></div>
            </div>
            <div class="stat-card damaged" onclick="loadTableData('damaged', '${prefix}')">
                <div class="stat-icon"><i class="fa-solid fa-trash-can"></i></div>
                <div class="stat-info"><h3>التوالف</h3><p id="${prefix}-count-damaged">0</p></div>
            </div>
        </div>

        ${prefix === 'mgr' ? `
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
                <div class="header-tools">
                    <button class="btn btn-outline btn-sm" onclick="exportToPDF('${prefix}-content', 'سجل_العمليات')"><i class="fa-solid fa-file-pdf"></i> تحميل PDF</button>
                    <button class="btn btn-primary btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> طباعة</button>
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
    container.innerHTML += `</div>`; // Close prefix-content
    loadTableData(null, prefix);
    if(prefix === 'mgr') loadLowStockList();
    
    // Set current date in print header
    const dEl = container.querySelector(`#${prefix}-print-date`);
    if(dEl) dEl.innerText = new Date().toLocaleString('ar-EG');
}

function loadTableData(filter, p) {
    const tbody = document.getElementById(`${p}-tbody`); if(!tbody) return;
    db.ref('transactions').on('value', (snap) => {
        tbody.innerHTML = '';
        let counts = {purchases:0, sales:0, returns:0, damaged:0};
        if (snap.exists() && snap.val()) {
            let rows = []; 
            Object.keys(snap.val()).forEach(type => { 
                Object.keys(snap.val()[type]).forEach(id => {
                    const trans = snap.val()[type][id];
                    counts[type] += 1;
                    if (!filter || type === filter) rows.push({ ...trans, typeKey: type }); 
                });
            });
            
            // Update stat counters
            Object.keys(counts).forEach(k => {
                const el = document.getElementById(`${p}-count-${k}`);
                if(el) el.innerText = counts[k];
            });

            rows.sort((a,b) => new Date(b.date+' '+b.time)-new Date(a.date+' '+a.time)).forEach(r => {
                const map = {purchases:'شراء', sales:'مبيع', returns:'مرتجع', damaged:'تالف'};
                const badgeMap = {purchases:'primary', sales:'success', returns:'warning', damaged:'danger'};
                tbody.innerHTML += `
                    <tr>
                        <td><span class="badge badge-${badgeMap[r.typeKey]}">${map[r.typeKey]}</span></td>
                        <td>${r.itemNumber}</td>
                        <td>${r.name}</td>
                        <td style="font-weight:bold;">${r.quantity}</td>
                        <td>${r.unit}</td>
                        <td>${r.day||'---'}</td>
                        <td>${r.date}</td>
                        <td>${r.time}</td>
                    </tr>`;
            });
        }
    });
}

function loadSection(section) {
    currentSection = section; const w = document.getElementById('contentWrapper'); if(!w) return;
    w.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fa-solid fa-spinner fa-spin fa-3x"></i></div>';
    setTimeout(() => {
        switch(section) {
            case 'manager': w.innerHTML=`<div class="section-header"><h2>لوحة المدير</h2></div>`; renderDashboardCommon(w, 'mgr'); initChart(); break;
            case 'storekeeper': renderStorekeeper(w); break;
            case 'inventory': renderInventory(w); break;
            case 'settings': renderSettings(w); break;
            case 'developer': renderDeveloper(w); break;
        }
    }, 100);
}

function renderStorekeeper(w) {
    w.innerHTML = `
    <div class="section-header"><h2>أمين المخزن</h2></div>
    <div class="storekeeper-actions no-print">
        <div class="action-card purchase" onclick="openInvModal('purchases', 'إضافة فاتورة شراء')">
            <i class="fa-solid fa-cart-plus"></i>
            <h3>إضافة فاتورة شرا</h3>
            <p>إضافة بضاعة جديدة للمخزن</p>
        </div>
        <div class="action-card sales" onclick="openInvModal('sales', 'إضافة فاتورة مبيع')">
            <i class="fa-solid fa-file-invoice-dollar"></i>
            <h3>إضافة فاتورة مبيع</h3>
            <p>خصم بضاعة مباعة من المخزن</p>
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

window.openInvModal = (type, title) => {
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
                        <td><input type="text" class="form-control i-name" placeholder="اسم الصنف"></td>
                        <td><input type="number" class="form-control i-qty" value="1" min="0.1" step="0.1"></td>
                        <td>
                            <select class="form-control i-unit">
                                <option>عدد</option>
                                <option>لتر</option>
                                <option>كيلو</option>
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
        <td><input type="text" class="form-control i-name" placeholder="اسم الصنف"></td>
        <td><input type="number" class="form-control i-qty" value="${isInventory ? '0' : '1'}" min="0" step="0.1"></td>
        <td>
            <select class="form-control i-unit">
                <option>عدد</option>
                <option>لتر</option>
                <option>كيلو</option>
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
                await db.ref(`transactions/${type}`).push({ itemNumber: num, name, quantity: qty, unit, date: d, time: t, day });
                
                // Update inventory
                let key = null; 
                let cur = 0;
                Object.keys(inventory).forEach(k => { 
                    if(inventory[k].itemNumber == num) { 
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
    const threshold = parseFloat(appSettings.lowStockThreshold) || 5;
    w.innerHTML = `
        <div id="inventory-content">
            <div class="print-header">
                <img src="logo.png.jpeg" alt="Logo">
                <div class="print-title">
                    <h1>مطعم أمواج الصياد</h1>
                    <h3>تقرير كشف المخزون العام</h3>
                    <p id="inv-print-date"></p>
                </div>
            </div>
            
            <div class="section-header">
                <h2>المخزن</h2>
                <div class="header-tools no-print">
                    <button class="btn btn-outline" onclick="exportToPDF('inventory-content', 'تقرير_المخزون')"><i class="fa-solid fa-file-pdf"></i> تحميل PDF</button>
                    <button class="btn btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> طباعة</button>
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
    
    db.ref('inventory').on('value', (snap) => {
        if(currentSection !== 'inventory') return;
        const tbody = document.getElementById('inventory-tbody'); if(!tbody) return;
        tbody.innerHTML = '';
        if(snap.exists()) {
            Object.keys(snap.val()).reverse().forEach(key => {
                const it = snap.val()[key];
                const isLow = parseFloat(it.quantity) < threshold;
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
    });
}

window.filterInv = () => {
    const val = document.getElementById('inventorySearch').value.toLowerCase();
    const rows = document.querySelectorAll('#inventory-tbody tr');
    rows.forEach(row => {
        const name = row.getAttribute('data-name').toLowerCase();
        const num = row.getAttribute('data-num').toLowerCase();
        row.style.display = (name.includes(val) || num.includes(val)) ? '' : 'none';
    });
};

window.exportToPDF = (elementId, filename) => {
    const element = document.getElementById(elementId);
    const opt = {
        margin: 10,
        filename: `${filename}_${new Date().toLocaleDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            backgroundColor: '#ffffff',
            ignoreElements: (el) => el.classList.contains('no-print')
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    showNotification('جاري تجهيز ملف PDF...', 'info');
    
    // Temporarily show print header for capture
    const header = element.querySelector('.print-header');
    if(header) header.style.display = 'flex';

    html2pdf().set(opt).from(element).toPdf().get('pdf').then(function (pdf) {
        if(header) header.style.display = ''; // Reset
        showNotification('تم تحميل الملف بنجاح');
    }).save();
};

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
                // Check if item exists to update instead of push? 
                // Actually, addItem in inventory usually means creating or resetting.
                // But let's check by itemNumber for better consistency.
                let key = null;
                Object.keys(inventory).forEach(k => { if(inventory[k].itemNumber == num) key = k; });

                if(key) {
                    await db.ref(`inventory/${key}`).update({ name, quantity: qty, unit, dateAdded: d, timeAdded: t, dayAdded: day });
                } else {
                    await db.ref('inventory').push({ itemNumber: num, name, quantity: qty, unit, dateAdded: d, timeAdded: t, dayAdded: day });
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
    if(prompt("كلمة مرور الصلاحيات (rasheed...):") !== appPasswords.actions) return showNotification('خطأ','error');
    const snap = await db.ref(`inventory/${key}`).once('value'); const it = snap.val();
    let html = `<div class="modal-header"><h3>تعديل صنف</h3><button onclick="closeModal()">×</button></div>
    <input type="text" id="e-name" class="form-control" value="${it.name}"><input type="number" id="e-qty" class="form-control" value="${it.quantity}"><button class="btn btn-primary" onclick="updItem('${key}')" style="width:100%; margin-top:15px;">تحديث</button>`;
    openModal(html);
};

window.updItem = async (key) => { await db.ref(`inventory/${key}`).update({ name: document.getElementById('e-name').value, quantity: parseFloat(document.getElementById('e-qty').value) }); showNotification('تم التحديث'); closeModal(); };
window.delItem = async (key) => { if(prompt("كلمة مرور الصلاحيات (rasheed...):") === appPasswords.actions) { if(confirm('حذف نهائي؟')) { await db.ref(`inventory/${key}`).remove(); showNotification('تم الحذف'); } } };

function renderSettings(container) {
    container.innerHTML = `<div class="section-header"><h2>الإعدادات</h2></div><div class="table-container" style="padding:30px; max-width:500px; margin:0 auto;"><h3>ضبط حد النواقص</h3><input type="number" id="set-threshold" class="form-control" value="${appSettings.lowStockThreshold}"><button class="btn btn-primary" onclick="saveSet()" style="width:100%; margin-top:15px;">حفظ</button></div>`;
    window.saveSet = async function() { await db.ref('settings/general').update({ lowStockThreshold: document.getElementById('set-threshold').value }); showNotification('تم الحفظ'); };
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

function loadLowStockList() {
    const list = document.getElementById('low-stock-list'); if(!list) return;
    const threshold = parseFloat(appSettings.lowStockThreshold) || 5;
    db.ref('inventory').on('value', (snap) => {
        list.innerHTML = '';
        if(snap.exists()) {
            const items = Object.values(snap.val()).filter(it => parseFloat(it.quantity) < threshold);
            if(items.length === 0) list.innerHTML = `<div style="color:#10b981; text-align:center; padding:10px;">لا توجد نواقص</div>`;
            else items.forEach(it => { list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(0,0,0,0.05)"><span>${it.name}</span><span class="badge badge-danger">${it.quantity}</span></div>`; });
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

// بوليفيل مخصص ومتطور لعرض نافذة إدخال كلمة المرور بشكل جذاب ومتوافق تماماً مع Electron
const prompt = function(message, defaultValue = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(12px);
            z-index: 999999;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Cairo', 'Tajawal', sans-serif;
            direction: rtl;
        `;
        
        const card = document.createElement('div');
        card.style.cssText = `
            background: radial-gradient(circle at top right, #1e293b, #0f172a);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 30px;
            width: min(420px, 90%);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.1);
            transform: scale(0.9); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            text-align: center;
            color: white;
            box-sizing: border-box;
        `;
        
        card.innerHTML = `
            <div style="width: 60px; height: 60px; background: rgba(99, 102, 241, 0.1); border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #6366f1; margin: 0 auto 20px;">
                <i class="fas fa-lock"></i>
            </div>
            <h3 style="margin: 0 0 10px; font-size: 1.4rem; font-weight: 700; background: linear-gradient(to right, #6366f1, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">نظام الحماية والأمان</h3>
            <p style="color: #94a3b8; font-size: 0.95rem; margin: 0 0 20px; line-height: 1.6;">${message}</p>
            <input type="password" id="custom-prompt-input" value="${defaultValue}" style="
                width: 100%; padding: 14px; border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.3); color: white;
                font-size: 1.2rem; text-align: center; outline: none;
                margin-bottom: 20px; transition: all 0.3s;
                box-sizing: border-box;
                font-family: sans-serif;
                letter-spacing: 2px;
            " placeholder="••••••••">
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="custom-prompt-cancel" style="
                    flex: 1; padding: 12px; border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(255, 255, 255, 0.03); color: #94a3b8; font-weight: bold;
                    cursor: pointer; transition: 0.3s; font-size: 0.95rem;
                ">إلغاء</button>
                <button id="custom-prompt-ok" style="
                    flex: 1; padding: 12px; border-radius: 12px;
                    border: none; background: linear-gradient(135deg, #6366f1, #10b981);
                    color: white; font-weight: bold;
                    cursor: pointer; transition: 0.3s; font-size: 0.95rem;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                ">تأكيد الدخول</button>
            </div>
        `;
        
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        
        const input = card.querySelector('#custom-prompt-input');
        
        input.onfocus = () => {
            input.style.borderColor = '#6366f1';
            input.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.2)';
        };
        input.onblur = () => {
            input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            input.style.boxShadow = 'none';
        };
        
        setTimeout(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
            input.focus();
            input.select();
        }, 30);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                cleanup(input.value);
            }
        });
        
        card.querySelector('#custom-prompt-ok').onclick = () => cleanup(input.value);
        card.querySelector('#custom-prompt-cancel').onclick = () => cleanup(null);
        
        function cleanup(value) {
            overlay.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
                overlay.remove();
                resolve(value);
            }, 250);
        }
    });
};
try {
    window.prompt = prompt;
} catch (e) {
    console.warn("Could not override window.prompt globally:", e);
}

window.playSoundEffect = function() {
    if(localStorage.getItem('fs_enable_sound') !== 'false') {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch(e) {}
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize DB reference globally in main.js
    let db;
    if (typeof firebase !== 'undefined') {
        db = firebase.database();
    }

    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const sectionTitle = document.getElementById('current-section-title');
    const dateDisplay = document.getElementById('date-display');

    // --- Configuration & Types ---
    const transTypes = {
        purchase: { title: 'فاتورة شراء', btn: 'ترحيل المشتريات', color: '#10b981' },
        sales: { title: 'فاتورة مبيع', btn: 'ترحيل المبيعات', color: '#3b82f6' },
        return: { title: 'مرتجع', btn: 'ترحيل المرتجعات', color: '#f59e0b' },
        damaged: { title: 'تالف', btn: 'ترحيل التوالف', color: '#ef4444' },
        transfer: { title: 'تحويل', btn: 'تحويل', color: '#8b5cf6' }
    };

    // Load Settings
    let lowStockThreshold = parseFloat(localStorage.getItem('lowStockThreshold')) || 10;
    const thresholdInput = document.getElementById('threshold-input');
    if (thresholdInput) thresholdInput.value = lowStockThreshold;


    // --- Navigation Logic (Desktop & Mobile Sync) ---
    const allLinks = [...navLinks, ...document.querySelectorAll('.mobile-nav-link')];
    

    allLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            // Password Protection (Dynamic from localStorage)
            const mPass = localStorage.getItem('manager_password') || 'admin';
            const kPass = localStorage.getItem('keeper_password') || '1234';

            if (sectionId === 'manager') {
                const pass = await prompt('الرجاء إدخال كلمة مرور المدير:');
                if (pass !== mPass) { alert('كلمة مرور خاطئة!'); return; }
            } else if (sectionId === 'fridge-keeper') {
                const pass = await prompt('الرجاء إدخال كلمة مرور أمين الثلاجات:');
                if (pass !== kPass) { alert('كلمة مرور خاطئة!'); return; }
            }

            // Sync active state across both menus
            allLinks.forEach(l => {
                if (l.getAttribute('data-section') === sectionId) l.classList.add('active');
                else l.classList.remove('active');
            });

            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                sectionTitle.textContent = link.querySelector('span').textContent;
                if (sectionId === 'fiber-fridge') renderFridgeTable('fiber');
                else if (sectionId === 'shop-fridge') renderFridgeTable('shop');
                else if (sectionId === 'manager') renderLogs();
            }
        });
    });

    window.onbeforeprint = () => {
        const printDateSpan = document.querySelector('.print-date');
        if (printDateSpan) {
            printDateSpan.textContent = getCurrentDateTime();
        }
    };

    const updateDate = () => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', calendar: 'islamic-uma' };
        dateDisplay.textContent = now.toLocaleDateString('ar-SA', options);
    };
    updateDate();


    const getCurrentDateTime = () => new Date().toLocaleString('ar-SA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    });

    const getItems = (type) => {
        const key = type === 'fiber' ? 'fiber_fridge_items' : type === 'shop' ? 'shop_fridge_items' : 'transaction_logs';
        const items = localStorage.getItem(key);
        return items ? JSON.parse(items) : [];
    };

    const saveItems = (items, type) => {
        const path = type === 'fiber' ? 'fiber_fridge_items' : type === 'shop' ? 'shop_fridge_items' : 'transaction_logs';
        if (db) {
            db.ref(path).set(items)
                .then(() => console.log(`Successfully synced ${path} to Firebase.`))
                .catch(err => console.error(`Error syncing ${path} to Firebase:`, err));
        }
        localStorage.setItem(path, JSON.stringify(items));
        if (type === 'transaction_logs') renderLogs(); else renderFridgeTable(type);
    };

    const addLog = (log) => { 
        let logs = getItems('transaction_logs'); 
        logs.unshift(log); 
        if (logs.length > 1000) logs.pop(); 
        saveItems(logs, 'transaction_logs'); 
    };

    const renderLogs = () => {
        const body = document.getElementById('logs-table-body');
        const fType = document.getElementById('filter-type')?.value || 'all';
        const fFridge = document.getElementById('filter-fridge')?.value || 'all';
        const searchVal = document.getElementById('search-logs')?.value.toLowerCase().trim() || '';
        if (!body) return;
        
        let logs = getItems('transaction_logs');
        
        const filteredLogs = logs.filter(l => {
            const matchesType = (fType === 'all' || l.type === fType);
            const matchesFridge = (fFridge === 'all' || l.fridge === fFridge);
            const matchesSearch = !searchVal || 
                                 (l.name && l.name.toLowerCase().includes(searchVal)) || 
                                 (l.date && l.date.toLowerCase().includes(searchVal)) ||
                                 (l.type && l.type.toLowerCase().includes(searchVal));
            return matchesType && matchesFridge && matchesSearch;
        });

        body.innerHTML = '';
        // Render only the top 150 matching logs to keep UI incredibly fast
        const logsToShow = filteredLogs.slice(0, 150);
        logsToShow.forEach(log => {
            const row = document.createElement('tr');
            const typeInfo = transTypes[log.type] || transTypes.transfer;
            const dateParts = (log.date || '').split('،');
            const day = dateParts.length > 1 ? dateParts[0] : '-';
            const time = dateParts.length > 1 ? dateParts.slice(1).join('،') : (log.date || '-');
            
            row.innerHTML = `
                <td>${day}</td>
                <td>${time}</td>
                <td><span class="badge" style="background:${typeInfo.color}">${typeInfo.title}</span></td>
                <td>${log.name || '-'}</td>
                <td>${log.weight || '0'}</td>
                <td>${log.count || '0'}</td>
                <td>${log.price || '0'}</td>
                <td>${log.fridge === 'fiber' ? 'الفيبر' : (log.fridge === 'shop' ? 'المحل' : '-')}</td>
            `;
            body.appendChild(row);
        });

        renderManagerStats(logs);
    };

    const renderManagerStats = (logs) => {
        const stats = { purchase: 0, sales: 0, return: 0, damaged: 0 };
        logs.forEach(l => {
            if (stats[l.type] !== undefined) {
                stats[l.type] += parseFloat(l.price) || 0;
            }
        });

        document.getElementById('stats-total-purchase').textContent = `${stats.purchase.toLocaleString()} ر.س`;
        document.getElementById('stats-total-sales').textContent = `${stats.sales.toLocaleString()} ر.س`;
        document.getElementById('stats-total-return').textContent = `${stats.return.toLocaleString()} ر.س`;
        document.getElementById('stats-total-damaged').textContent = `${stats.damaged.toLocaleString()} ر.س`;
    };

    const renderFridgeTable = (type) => {
        const body = document.getElementById(type === 'fiber' ? 'fiber-fridge-table-body' : 'shop-fridge-table-body');
        const tI = document.getElementById(`${type}-total-items`);
        const tW = document.getElementById(`${type}-total-weight`);
        const tP = document.getElementById(`${type}-total-price`);
        const searchVal = document.getElementById(`search-${type}`)?.value.toLowerCase() || '';
        
        if (!body) return;
        let allItems = getItems(type);
        
        // حساب الإجماليات من كافة العناصر قبل تطبيق فلتر البحث
        let totalItems = allItems.length;
        let totalWeight = 0;
        let totalPrice = 0;
        allItems.forEach(item => {
            totalWeight += parseFloat(item.weight) || 0;
            totalPrice += parseFloat(item.price) || 0;
        });

        // Apply Search Filter (for display only - totals stay as full inventory)
        let items = allItems;
        if (searchVal) {
            items = allItems.filter(i => i.name.toLowerCase().includes(searchVal) || (i.id && i.id.toLowerCase().includes(searchVal)));
        }

        // Sort by ID (ascending)
        items.sort((a, b) => {
            const numA = parseFloat(a.id) || 0;
            const numB = parseFloat(b.id) || 0;
            return numA - numB;
        });

        body.innerHTML = ''; 
        
        items.forEach(item => {
            const row = document.createElement('tr');
            const w = parseFloat(item.weight) || 0;

            // Low Stock Check (Dynamic Threshold)
            if (w < lowStockThreshold) row.classList.add('low-stock');

            const dateParts = (item.date || '-').split('،');
            const day = dateParts.length > 1 ? dateParts[0] : '-';
            const time = dateParts.length > 1 ? dateParts.slice(1).join('،') : (item.date || '-');

            const healthPercent = Math.min((w / (lowStockThreshold * 3)) * 100, 100);
            const healthColor = w < lowStockThreshold ? '#ef4444' : (w < lowStockThreshold * 2 ? '#f59e0b' : '#10b981');

            row.innerHTML = `
                <td>${item.id}</td>
                <td>
                    ${item.name}
                    <div class="health-bar-container"><div class="health-bar-fill" style="width:${healthPercent}%; background:${healthColor}"></div></div>
                </td>
                <td>${day}</td>
                <td>${time}</td>
                <td>${item.weight}</td>
                <td>${item.price}</td>
                <td>${item.count}</td>
                <td class="no-print">
                    <button class="btn-primary" onclick="deleteFridgeItem('${type}', '${item.id}')" style="background:#ef4444; padding:5px 10px; font-size:0.8rem;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            body.appendChild(row);
        });

        if (tI) tI.textContent = totalItems; 
        if (tW) tW.textContent = `${totalWeight.toFixed(3)} كجم`;
        if (tP) tP.textContent = `${totalPrice.toLocaleString()} ر.س`;
    };


    window.deleteFridgeItem = async (type, id) => {
        const mPass = localStorage.getItem('manager_password') || 'admin';
        const pass = await prompt('الرجاء إدخال كلمة مرور المدير لحذف هذا الصنف:');
        if (pass !== mPass) { alert('كلمة مرور خاطئة!'); return; }
        
        if (confirm('هل أنت متأكد من حذف هذا الصنف من المخزن؟')) {
            let items = getItems(type);
            const filtered = items.filter(i => i.id !== id);
            saveItems(filtered, type);
            alert('تم الحذف بنجاح');
        }
    };

    window.exportFishBackup = () => {
        try {
            const backupData = {
                fiber_fridge: getItems('fiber'),
                shop_fridge: getItems('shop'),
                logs: getItems('transaction_logs'),
                settings: {
                    lowStockThreshold: localStorage.getItem('lowStockThreshold'),
                    manager_password: localStorage.getItem('manager_password'),
                    keeper_password: localStorage.getItem('keeper_password')
                },
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `amwaj_fish_store_backup_${new Date().toLocaleDateString('en-CA')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('تم تحميل النسخة الاحتياطية بنجاح ✓');
        } catch (e) {
            alert('فشل تصدير النسخة الاحتياطية');
        }
    };

    window.importFishBackup = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('تنبيه: استعادة النسخة ستمسح البيانات الحالية. هل تريد المتابعة؟')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.fiber_fridge) saveItems(data.fiber_fridge, 'fiber');
                if (data.shop_fridge) saveItems(data.shop_fridge, 'shop');
                if (data.logs) saveItems(data.logs, 'transaction_logs');
                if (data.settings) {
                    if (data.settings.lowStockThreshold) localStorage.setItem('lowStockThreshold', data.settings.lowStockThreshold);
                    if (data.settings.manager_password) localStorage.setItem('manager_password', data.settings.manager_password);
                    if (data.settings.keeper_password) localStorage.setItem('keeper_password', data.settings.keeper_password);
                }
                alert('تمت استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة.');
                location.reload();
            } catch (err) {
                alert('خطأ في الملف! تأكد من أنه ملف نسخة احتياطية صالح.');
            }
        };
        reader.readAsText(file);
    };

    window.setFishTheme = (p, s, g1, g2) => {
        document.documentElement.style.setProperty('--primary-color', p);
        document.documentElement.style.setProperty('--secondary-color', s);
        document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`);
        localStorage.setItem('fs_theme', JSON.stringify({p, s, g1, g2}));
        alert('تم تغيير المظهر!');
    };

    // Apply saved theme
    (function() {
        const saved = localStorage.getItem('fs_theme');
        if (saved) {
            const t = JSON.parse(saved);
            document.documentElement.style.setProperty('--primary-color', t.p);
            document.documentElement.style.setProperty('--secondary-color', t.s);
            document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${t.g1} 0%, ${t.g2} 100%)`);
        }
    })();

    // --- Scale Items Mapping ---
    const SCALE_ITEMS = {
        "1": "ناجل حر",
        "2": "شريفي",
        "3": "طرادي",
        "4": "هامور",
        "5": "حريد",
        "6": "قمر",
        "7": "شعور",
        "8": "فارس",
        "9": "بياض",
        "10": "ديرك",
        "11": "سلمون",
        "12": "جمبري كبير",
        "13": "جمبري وسط",
        "14": "جمبري مزارع",
        "15": "استكوزا",
        "16": "كابوريا",
        "17": "عربي",
        "18": "دنيس",
        "19": "بلطي",
        "20": "قارص",
        "21": "فيليه هامور",
        "22": "حبار",
        "23": "سي فود بالكاري خضار",
        "24": "سي فود بشاميل",
        "25": "سرمد ثوم ليمون",
        "26": "جمبري بشاميل",
        "27": "جمبري بالكاري",
        "28": "جمبري بالخضا",
        "29": "جمبري صوص لاند",
        "30": "سورية مكس بالكريمة"
    };

    function parseScaleBarcode(barcode) {
        if (!/^[2]\d{12}$/.test(barcode)) {
            return null;
        }
        
        // EAN-13 Scale Barcode Layout (GS1 Standard):
        //   [0]    = '2'  (GS1 prefix)
        //   [1]    = type digit:
        //       0,1  -> Weight in grams  (/1000 = kg)
        //       2,3,4 -> Price in halalas (/100 = SAR)  [DIGI / CAS price mode]
        //       8    -> Price in halalas                 [Mettler / BIZERBA]
        //       9    -> Price in halalas                 [custom scales]
        //   [2-6]  = Item PLU code (5 digits)
        //   [7-11] = Data field: weight (g) or price (halalas)
        //   [12]   = Check digit
        const typeDigit = parseInt(barcode[1], 10);
        const itemIdVal  = barcode.substring(2, 7);
        const itemId     = parseInt(itemIdVal, 10).toString();
        const dataVal    = barcode.substring(7, 12);
        const dataNum    = parseInt(dataVal, 10);

        let weight = null;
        let price  = null;
        let barcodeType = 'weight';

        // --- الكشف التلقائي من رقم النوع في الباركود نفسه (GS1) ---
        // typeDigit 0 أو 1 → يحتوي على وزن بالجرام (/1000)
        // typeDigit 2 أو 7 → يحتوي على وزن بالجرام (/1000)
        // typeDigit 3, 4, 8, 9 → يحتوي على سعر بالهللة (/100)
        const manualMode = localStorage.getItem('scale_barcode_mode'); // إعداد يدوي اختياري

        if (manualMode === 'price') {
            // إعداد يدوي: قراءة سعر
            price = dataNum / 100;
            barcodeType = 'price';
        } else if (manualMode === 'weight') {
            // إعداد يدوي: قراءة وزن
            weight = dataNum / 1000;
            barcodeType = 'weight';
        } else {
            // الكشف التلقائي حسب معيار GS1 والترميز المحلي المشهور في الموازين
            if (typeDigit === 0 || typeDigit === 1) {
                weight = dataNum / 1000; // جرام -> كيلو
                barcodeType = 'weight';
            } else if (typeDigit === 2 || typeDigit === 7) {
                weight = dataNum / 1000; // جرام -> كيلو (قراءة الوزن كما كان سابقاً)
                barcodeType = 'weight';
            } else {
                // typeDigit: 3, 4, 8, 9 -> سعر
                price = dataNum / 100;   // هللة -> ريال
                barcodeType = 'price';
            }
        }

        // Debug
        console.log('[Barcode] raw=' + barcode + ' | typeDigit=' + typeDigit +
                    ' | item=' + itemId + ' | data=' + dataNum +
                    ' | mode=' + barcodeType +
                    ' | weight=' + weight + 'kg | price=' + price + 'SAR');

        return { itemId, weight, price, barcodeType };
    }

    function getScalePrices() {
        try {
            const prices = localStorage.getItem('scale_item_prices');
            let parsed = prices ? JSON.parse(prices) : {};
            
            // التحقق من وجود أسعار فعلية أكبر من الصفر
            const hasPrices = Object.values(parsed).some(val => parseFloat(val) > 0);
            if (!hasPrices) {
                const backup = localStorage.getItem('scale_item_prices_local');
                if (backup) {
                    parsed = JSON.parse(backup);
                }
            }
            return parsed;
        } catch (e) {
            console.error("Error parsing scale prices:", e);
            return {};
        }
    }

    function loadScalePricesUI() {
        const container = document.getElementById('scale-prices-container');
        if (!container) return;
        
        const prices = getScalePrices();
        container.innerHTML = '';
        
        Object.keys(SCALE_ITEMS).forEach(itemId => {
            const name = SCALE_ITEMS[itemId];
            const price = prices[itemId] !== undefined ? prices[itemId] : 0;
            
            const div = document.createElement('div');
            div.className = 'scale-price-item';
            div.style.cssText = 'display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);';
            div.innerHTML = `
                <span style="font-size: 0.85rem; color: #fff; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name} (رقم ${itemId})</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="number" class="scale-price-input" data-id="${itemId}" value="${price}" step="0.5" min="0" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: #fff; text-align: center; font-size: 0.9rem;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">ر.س</span>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // Returns { name, unitPrice }
    // directPrice: if the barcode already embedded a price (SAR), pass it here so
    // we can still derive unitPrice for partial-transfer calculations.
    function getItemInfoFromBarcode(itemId, targetFridge, directPrice) {
        let name = SCALE_ITEMS[itemId] || "";
        let unitPrice = 0;
        
        // 1. Get unitPrice from the custom configured scale prices
        const scalePrices = getScalePrices();
        if (scalePrices[itemId] !== undefined) {
            unitPrice = parseFloat(scalePrices[itemId]) || 0;
        }
        
        // 2. Fallback: Search in targetFridge items
        const targetItems = getItems(targetFridge);
        const itemInTarget = targetItems.find(i => i.id === itemId || parseInt(i.id, 10) === parseInt(itemId, 10));
        if (itemInTarget) {
            if (!name) name = itemInTarget.name;
            if (unitPrice === 0) {
                const w = parseFloat(itemInTarget.weight) || 0;
                const p = parseFloat(itemInTarget.price) || 0;
                if (w > 0) unitPrice = p / w;
            }
        }
        
        // 3. Fallback: Search in otherFridge
        if (!name || unitPrice === 0) {
            const otherFridge = targetFridge === 'fiber' ? 'shop' : 'fiber';
            const otherItems = getItems(otherFridge);
            const itemInOther = otherItems.find(i => i.id === itemId || parseInt(i.id, 10) === parseInt(itemId, 10));
            if (itemInOther) {
                if (!name) name = itemInOther.name;
                if (unitPrice === 0) {
                    const w = parseFloat(itemInOther.weight) || 0;
                    const p = parseFloat(itemInOther.price) || 0;
                    if (w > 0) unitPrice = p / w;
                }
            }
        }
        
        // 4. Fallback: Search in transaction logs
        if (name && unitPrice === 0) {
            if (directPrice !== null && directPrice !== undefined && directPrice > 0) {
                // unitPrice will be filled later from the calling context
            } else {
                const logs = getItems('transaction_logs');
                const lastLog = logs.find(l => l.name === name);
                if (lastLog) {
                    const w = parseFloat(lastLog.weight) || 0;
                    const p = parseFloat(lastLog.price) || 0;
                    if (w > 0) unitPrice = p / w;
                }
            }
        }
        
        return { name, unitPrice };
    }

    /**
     * Resolves weight + price ready to fill a table row.
     * - Weight barcode: weight from barcode, price = weight x unitPrice
     * - Price barcode:  price from barcode directly; weight back-calculated if possible
     */
    function resolveRowValues(parsed, targetFridge) {
        const { name, unitPrice } = getItemInfoFromBarcode(parsed.itemId, targetFridge, parsed.price);
        let weight = (parsed.weight !== null) ? parsed.weight : 0;
        let price  = 0;

        if (parsed.barcodeType === 'price') {
            // Price read directly from barcode
            price = parsed.price || 0;
            // Back-calculate weight if we have a unit price
            if (unitPrice > 0 && price > 0) {
                weight = price / unitPrice;
            }
        } else {
            // Weight read from barcode, derive price
            price = weight * unitPrice;
        }

        return { itemId: parsed.itemId, name, weight, price };
    }

    // --- Fridge Keeper Logic ---
    const transButtons = document.querySelectorAll('.trans-type-btn'), activeCont = document.getElementById('active-transaction-container'), tTitle = document.getElementById('transaction-title'), sText = document.getElementById('save-btn-text'), targetF = document.getElementById('target-fridge'), addI = document.getElementById('add-item-btn'), tableB = document.getElementById('item-table-body');
    let currentMode = 'purchase';
    const ensureOneRow = () => { if (tableB && tableB.children.length === 0) addI.click(); };

    const barcodeScannerInput = document.getElementById('barcode-scanner-input');
    if (barcodeScannerInput) {
        const handleBarcodeScannerInput = () => {
            const val = barcodeScannerInput.value.trim();
            if (/^[2]\d{12}$/.test(val)) {
                const parsed = parseScaleBarcode(val);
                if (parsed) {
                    let target = targetF.value;
                    if (currentMode === 'purchase') target = 'fiber';
                    if (currentMode === 'sales') target = 'shop';
                    
                    const { itemId, name, weight, price } = resolveRowValues(parsed, target);
                    
                    const rows = tableB.querySelectorAll('.input-row');
                    let targetRow = null;
                    for (let i = 0; i < rows.length; i++) {
                        const r = rows[i];
                        const rId = r.querySelector('.item-id').value.trim();
                        const rName = r.querySelector('.item-name').value.trim();
                        const rWeight = r.querySelector('.item-weight').value.trim();
                        if (!rId && !rName && !rWeight) {
                            targetRow = r;
                            break;
                        }
                    }
                    
                    if (!targetRow) {
                        addI.click();
                        targetRow = tableB.lastElementChild;
                    }
                    
                    if (targetRow) {
                        targetRow.querySelector('.item-id').value = itemId;
                        targetRow.querySelector('.item-name').value = name;
                        targetRow.querySelector('.item-weight').value = weight.toFixed(3);
                        targetRow.querySelector('.item-price').value = price.toFixed(2);
                        targetRow.querySelector('.item-count').value = '1';
                        
                        if (price === 0) {
                            setTimeout(() => {
                                const priceInput = targetRow.querySelector('.item-price');
                                if (priceInput) {
                                    priceInput.focus();
                                    priceInput.select();
                                }
                            }, 100);
                        }
                    }
                    
                    barcodeScannerInput.value = '';
                    barcodeScannerInput.focus();
                    if(window.playSoundEffect) window.playSoundEffect();
                }
            }
        };
        barcodeScannerInput.addEventListener('input', handleBarcodeScannerInput);
        barcodeScannerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleBarcodeScannerInput();
            }
        });
    }

    transButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentMode = btn.getAttribute('data-type');
            activeCont.style.display = 'block';
            tTitle.textContent = transTypes[currentMode].title;
            tTitle.style.color = transTypes[currentMode].color;
            sText.textContent = transTypes[currentMode].btn;
            
            if (currentMode === 'sales') {
                targetF.value = 'shop';
                targetF.disabled = true;
            } else if (currentMode === 'purchase') {
                targetF.value = 'fiber';
                targetF.disabled = true;
            } else {
                targetF.disabled = false;
            }

            tableB.innerHTML = ''; ensureOneRow();
            transButtons.forEach(b => b.style.transform = 'scale(1)'); btn.style.transform = 'scale(1.05)';
            
            if (barcodeScannerInput) {
                setTimeout(() => barcodeScannerInput.focus(), 100);
            }
        });
    });



    if (addI) {
        addI.addEventListener('click', () => {
            const row = document.createElement('tr'), timeStr = getCurrentDateTime();
            const dateParts = timeStr.split('،'), day = dateParts[0], time = dateParts.slice(1).join('،');
            row.className = 'input-row';
            row.innerHTML = `<td><input type="text" class="input-cell item-id" placeholder="${(tableB.children.length + 1).toString().padStart(3,'0')}"></td><td><input type="text" class="input-cell item-name" placeholder="اسم السمك"></td><td class="item-day">${day}</td><td class="item-date">${time}</td><td><input type="number" class="input-cell item-weight" placeholder="0.00"></td><td><input type="number" class="input-cell item-price" placeholder="0.00"></td><td><input type="number" class="input-cell item-count" placeholder="1"></td><td><button class="duplicate-btn" title="تكرار" style="background:none;border:none;color:var(--primary-color);cursor:pointer;margin-left:10px;"><i class="fas fa-copy"></i></button><button class="delete-btn" style="background:none;border:none;color:#f87171;cursor:pointer;"><i class="fas fa-trash-alt"></i></button></td>`;
            row.querySelector('.duplicate-btn').addEventListener('click', () => {
                addI.click(); const last = tableB.lastElementChild, ins = row.querySelectorAll('input'), lIns = last.querySelectorAll('input');
                ins.forEach((i, idx) => lIns[idx].value = i.value);
            });
            row.querySelector('.delete-btn').addEventListener('click', () => { row.remove(); ensureOneRow(); });
            tableB.appendChild(row); 
            const nameInput = row.querySelector('.item-name');
            const idInput = row.querySelector('.item-id');
            attachAutocomplete(nameInput, idInput);
            
            const handleBarcode = (e) => {
                const val = e.target.value.trim();
                if (/^[2]\d{12}$/.test(val)) {
                    const parsed = parseScaleBarcode(val);
                    if (parsed) {
                        let target = targetF.value;
                        if (currentMode === 'purchase') target = 'fiber';
                        if (currentMode === 'sales') target = 'shop';
                        
                        const { itemId, name, weight, price } = resolveRowValues(parsed, target);
                        
                        row.querySelector('.item-id').value = itemId;
                        row.querySelector('.item-name').value = name;
                        row.querySelector('.item-weight').value = weight.toFixed(3);
                        row.querySelector('.item-price').value = price.toFixed(2);
                        row.querySelector('.item-count').value = '1';
                        
                        if(window.playSoundEffect) window.playSoundEffect();
                        
                        setTimeout(() => {
                            if (price === 0) {
                                const priceInput = row.querySelector('.item-price');
                                if (priceInput) {
                                    priceInput.focus();
                                    priceInput.select();
                                }
                            } else {
                                addI.click();
                                const nextRow = tableB.lastElementChild;
                                if (nextRow) {
                                    nextRow.querySelector('.item-id').focus();
                                }
                            }
                        }, 100);
                    }
                }
            };
            idInput.addEventListener('input', handleBarcode);
            nameInput.addEventListener('input', handleBarcode);
            
            nameInput.focus();
        });
    }

    // --- Autocomplete Logic ---
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'suggestions-list';
    document.body.appendChild(suggestionsList);

    function attachAutocomplete(input, idInput) {
        input.addEventListener('input', () => {
            const val = input.value.trim().toLowerCase();
            if (!val) { suggestionsList.style.display = 'none'; return; }
            
            // Search in both fridges
            const fiber = getItems('fiber'), shop = getItems('shop');
            const allItems = [...fiber, ...shop];
            const matches = allItems.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i) // unique by name
                                   .filter(item => item.name.toLowerCase().includes(val));

            if (matches.length > 0) {
                const rect = input.getBoundingClientRect();
                suggestionsList.style.top = `${rect.bottom + window.scrollY}px`;
                suggestionsList.style.left = `${rect.left + window.scrollX}px`;
                suggestionsList.style.width = `${rect.width}px`;
                suggestionsList.style.display = 'block';
                
                suggestionsList.innerHTML = '';
                matches.forEach(match => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.innerHTML = `<span>${match.name}</span><span class="item-code">#${match.id}</span>`;
                    div.addEventListener('click', () => {
                        input.value = match.name;
                        idInput.value = match.id;
                        suggestionsList.style.display = 'none';
                    });
                    suggestionsList.appendChild(div);
                });
            } else {
                suggestionsList.style.display = 'none';
            }
        });

        input.addEventListener('blur', () => setTimeout(() => suggestionsList.style.display = 'none', 200));
    }

    const saveB = document.getElementById('save-items-btn');
    if (saveB) {
        saveB.addEventListener('click', () => {
            const rows = document.querySelectorAll('.input-row');
            if (rows.length === 0) { alert('أضف أصنافاً أولاً'); return; }
            
            // Force target based on mode
            let target = targetF.value;
            if (currentMode === 'purchase') target = 'fiber';
            if (currentMode === 'sales') target = 'shop';
            
            let items = getItems(target), errors = [], time = getCurrentDateTime();
            rows.forEach(r => {
                const id = r.querySelector('.item-id').value.trim(), name = r.querySelector('.item-name').value.trim(), w = parseFloat(r.querySelector('.item-weight').value) || 0, p = parseFloat(r.querySelector('.item-price').value) || 0, c = parseInt(r.querySelector('.item-count').value) || 0;
                if (!name) return;
                
                // Check if ID is used by a different name
                const itemWithSameId = items.find(i => i.id === id);
                if (itemWithSameId && itemWithSameId.name !== name && id !== "") {
                    errors.push(`الرقم "${id}" مستخدم بالفعل لصنف آخر ("${itemWithSameId.name}")`);
                    return;
                }

                const idx = items.findIndex(i => i.id === id || i.name === name);
                if (currentMode === 'purchase') {
                    if (idx !== -1) { 
                        items[idx].weight = (parseFloat(items[idx].weight) + w).toFixed(3); 
                        items[idx].count = (parseInt(items[idx].count) + c).toString(); 
                        items[idx].price = (parseFloat(items[idx].price) + p).toFixed(2); 
                        items[idx].date = time; 
                    }
                    else items.push({ id: id || (Date.now() + Math.floor(Math.random()*1000)).toString().slice(-5), name, weight: w.toFixed(3), price: p.toFixed(2), count: c.toString(), date: time });
                } else {
                    if (idx === -1) errors.push(`الصنف "${name}" غير موجود`);
                    else {
                        const aW = parseFloat(items[idx].weight) || 0, aC = parseInt(items[idx].count) || 0, aP = parseFloat(items[idx].price) || 0;
                        if (aW < w) {
                            errors.push(`الكمية لـ "${name}" أكبر من المتوفر (${aW} كجم)`);
                        } else { 
                            items[idx].weight = (aW - w).toFixed(3); 
                            items[idx].count = Math.max(0, aC - c).toString(); 
                            items[idx].price = Math.max(0, aP - p).toFixed(2); 
                            items[idx].date = time; 
                        }
                    }
                }
            });
            if (errors.length > 0) {
                alert('عذراً، لم يتم الحفظ للأسباب التالية:\n' + errors.join('\n'));
            } else {
                rows.forEach(r => addLog({ 
                    date: time, 
                    type: currentMode, 
                    name: r.querySelector('.item-name').value, 
                    weight: r.querySelector('.item-weight').value, 
                    count: r.querySelector('.item-count').value, 
                    price: r.querySelector('.item-price').value, 
                    fridge: target
                }));
                saveItems(items, target); 
                tableB.innerHTML = ''; 
                ensureOneRow(); 
                if(window.playSoundEffect) window.playSoundEffect();
                alert(`تم تنفيذ "${transTypes[currentMode].title}" بنجاح في ${target === 'fiber' ? 'ثلاجة الفيبر' : 'ثلاجة المحل'}`);
            }
        });
    }

    const showTB = document.getElementById('show-transfer-btn'), transI = document.getElementById('transfer-interface'), transTB = document.getElementById('transfer-table-body'), addTI = document.getElementById('add-transfer-item-btn'), confT = document.getElementById('confirm-transfer-btn');
    
    // --- Transfer Barcode Scanner Logic ---
    const transferBarcodeInput = document.getElementById('transfer-barcode-input');
    
    function handleTransferBarcodeScan(val) {
        val = val.trim();
        if (!/^[2]\d{12}$/.test(val)) return;
        const parsed = parseScaleBarcode(val);
        if (!parsed) return;
        
        // Resolve weight + price from barcode (fiber fridge is always the source)
        const { itemId, name, weight, price } = resolveRowValues(parsed, 'fiber');
        
        // Check if an empty row already exists
        const rows = transTB.querySelectorAll('.transfer-row');
        let targetRow = null;
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const rId = r.querySelector('.item-id').value.trim();
            const rName = r.querySelector('.item-name').value.trim();
            const rWeight = r.querySelector('.item-weight').value.trim();
            if (!rId && !rName && !rWeight) {
                targetRow = r;
                break;
            }
        }
        
        if (!targetRow) {
            addTI.click();
            targetRow = transTB.lastElementChild;
        }
        
        if (targetRow) {
            targetRow.querySelector('.item-id').value = itemId;
            targetRow.querySelector('.item-name').value = name;
            targetRow.querySelector('.item-weight').value = weight.toFixed(3);
            targetRow.querySelector('.item-price').value = price.toFixed(2);
            targetRow.querySelector('.item-count').value = '1';
            
            if (price === 0) {
                setTimeout(() => {
                    const priceInput = targetRow.querySelector('.item-price');
                    if (priceInput) {
                        priceInput.focus();
                        priceInput.select();
                    }
                }, 100);
            }
        }
        
        if (transferBarcodeInput) {
            transferBarcodeInput.value = '';
            transferBarcodeInput.focus();
        }
        if (window.playSoundEffect) window.playSoundEffect();
    }
    
    if (transferBarcodeInput) {
        transferBarcodeInput.addEventListener('input', () => handleTransferBarcodeScan(transferBarcodeInput.value));
        transferBarcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleTransferBarcodeScan(transferBarcodeInput.value);
            }
        });
    }
    
    if (showTB) showTB.addEventListener('click', () => {
        transI.style.display = 'block';
        if (transTB.children.length === 0) addTI.click();
        // Auto-focus barcode input when transfer opens
        if (transferBarcodeInput) setTimeout(() => transferBarcodeInput.focus(), 150);
    });
    if (document.getElementById('cancel-transfer-btn')) document.getElementById('cancel-transfer-btn').addEventListener('click', () => { transI.style.display = 'none'; transTB.innerHTML = ''; });
    if (addTI) {
        addTI.addEventListener('click', () => {
            const r = document.createElement('tr'), timeStr = getCurrentDateTime();
            const dateParts = timeStr.split('،'), day = dateParts[0], time = dateParts.slice(1).join('،');
            r.className = 'transfer-row';
            r.innerHTML = `<td><input type="text" class="input-cell item-id" placeholder="001"></td><td><input type="text" class="input-cell item-name" placeholder="اسم السمك"></td><td class="item-day">${day}</td><td class="item-date">${time}</td><td><input type="number" class="input-cell item-weight" placeholder="0.00"></td><td><input type="number" class="input-cell item-price" placeholder="0.00"></td><td><input type="number" class="input-cell item-count" placeholder="1"></td><td><button class="delete-btn" style="background:none;border:none;color:#f87171;cursor:pointer;"><i class="fas fa-trash-alt"></i></button></td>`;
            r.querySelector('.delete-btn').addEventListener('click', () => r.remove());
            transTB.appendChild(r);
            
            // Wire barcode parsing to the item-id field of this row
            const idInput = r.querySelector('.item-id');
            const nameInput = r.querySelector('.item-name');
            
            const handleRowBarcode = (e) => {
                const val = e.target.value.trim();
                if (!/^[2]\d{12}$/.test(val)) return;
                const parsed = parseScaleBarcode(val);
                if (!parsed) return;
                const { itemId, name, weight, price } = resolveRowValues(parsed, 'fiber');
                r.querySelector('.item-id').value = itemId;
                r.querySelector('.item-name').value = name;
                r.querySelector('.item-weight').value = weight.toFixed(3);
                r.querySelector('.item-price').value = price.toFixed(2);
                r.querySelector('.item-count').value = '1';
                if (window.playSoundEffect) window.playSoundEffect();
                
                if (price === 0) {
                    setTimeout(() => {
                        const priceInput = r.querySelector('.item-price');
                        if (priceInput) {
                            priceInput.focus();
                            priceInput.select();
                        }
                    }, 100);
                } else {
                    // Auto-focus the transfer barcode input for the next scan
                    if (transferBarcodeInput) setTimeout(() => transferBarcodeInput.focus(), 100);
                }
            };
            idInput.addEventListener('input', handleRowBarcode);
            nameInput.addEventListener('input', handleRowBarcode);
            
            attachAutocomplete(nameInput, idInput);
        });
    }
    if (confT) {
        confT.addEventListener('click', async () => {
            const kPass = localStorage.getItem('keeper_password') || '1234';
            const pass = await prompt('الرجاء إدخال كلمة مرور التحويل (أمين الثلاجات):');
            if (pass !== kPass) { alert('كلمة مرور خاطئة!'); return; }
            
            const rs = document.querySelectorAll('.transfer-row'); if (rs.length === 0) return;
            let fI = getItems('fiber'), sI = getItems('shop'), es = [], time = getCurrentDateTime();
            rs.forEach(r => {
                const id = r.querySelector('.item-id').value.trim(), n = r.querySelector('.item-name').value.trim(), w = parseFloat(r.querySelector('.item-weight').value) || 0, p = parseFloat(r.querySelector('.item-price').value) || 0, c = parseInt(r.querySelector('.item-count').value) || 0;
                if (!n) return; const idx = fI.findIndex(i => i.id === id || i.name === n);
                if (idx === -1) es.push(`الصنف "${n}" غير موجود في الفيبر`);
                else {
                        const aW = parseFloat(fI[idx].weight) || 0, 
                              aC = parseInt(fI[idx].count) || 0,
                              aP = parseFloat(fI[idx].price) || 0;
                        
                        if (aW < w) {
                            es.push(`الكمية لـ "${n}" أكبر من المتوفر (${aW} كجم)`);
                        } else {
                            let priceToTransfer = p;
                            // Auto-calculate price if not provided
                            if (priceToTransfer === 0 && aP > 0) {
                                priceToTransfer = (aP / (aW || 1)) * w;
                            }
                            
                            fI[idx].weight = (aW - w).toFixed(3); 
                            fI[idx].count = Math.max(0, aC - c).toString(); 
                            fI[idx].price = Math.max(0, aP - priceToTransfer).toFixed(2);
                            fI[idx].date = time;
                            
                            const sIdx = sI.findIndex(i => i.id === id || i.name === n);
                            if (sIdx !== -1) { 
                                sI[sIdx].weight = (parseFloat(sI[sIdx].weight) + w).toFixed(3); 
                                sI[sIdx].count = (parseInt(sI[sIdx].count) + c).toString(); 
                                sI[sIdx].price = (parseFloat(sI[sIdx].price) + priceToTransfer).toFixed(2); 
                                sI[sIdx].date = time; 
                            } else {
                                sI.push({ id: id || fI[idx].id, name: n, weight: w.toFixed(3), price: priceToTransfer.toFixed(2), count: c.toString(), date: time });
                            }
                        }
                }
            });
            if (es.length > 0) alert('أخطاء:\n' + es.join('\n'));
            else {
                rs.forEach(r => addLog({ 
                    date: time, 
                    type: 'transfer', 
                    name: r.querySelector('.item-name').value, 
                    weight: r.querySelector('.item-weight').value, 
                    count: r.querySelector('.item-count').value, 
                    price: r.querySelector('.item-price').value, 
                    fridge: 'fiber'
                }));
                saveItems(fI, 'fiber'); saveItems(sI, 'shop'); transI.style.display = 'none'; transTB.innerHTML = ''; if(window.playSoundEffect) window.playSoundEffect(); alert('تم التحويل!');
            }
        });
    }

    const fT = document.getElementById('filter-type'), fF = document.getElementById('filter-fridge'), cL = document.getElementById('clear-logs-btn'), pL = document.getElementById('print-logs-btn');
    if (fT) fT.addEventListener('change', renderLogs); if (fF) fF.addEventListener('change', renderLogs);

    // Enhanced Print/PDF Logic for Android & Desktop
    const triggerPrint = (sectionId) => {
        const printDate = getCurrentDateTime();
        document.querySelectorAll('.print-date').forEach(el => el.textContent = printDate);

        // Dynamic Report Title
        const reportTitleEl = document.querySelector('.print-only-header h1 + p');
        if (reportTitleEl) {
            const titles = {
                'manager': 'تقرير العمليات والسجلات الإدارية الشامل',
                'fiber-fridge': 'تقرير جرد مخزون ثلاجة الفيبر',
                'shop-fridge': 'تقرير جرد مخزون ثلاجة المحل'
            };
            reportTitleEl.textContent = titles[sectionId] || 'تقرير إداري معتمد';
        }

        // Detect if the user is on Android
        const isAndroid = /Android/i.test(navigator.userAgent);
        
        if (isAndroid && typeof html2pdf !== 'undefined') {
            const btn = document.activeElement;
            const originalText = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تجهيز PDF...';
            }

            // Prepare elements for PDF capture
            document.body.classList.add('is-pdf-generating');
            
            const originalBodyWidth = document.body.style.width;
            document.body.style.width = '1100px';

            const storeNamePrint = localStorage.getItem('fs_store_name') || 'أمواج_الصياد';
            const sanitizedName = storeNamePrint.replace(/\s+/g, '_');
            const element = document.body; 
            const opt = {
                margin:       [10, 10, 10, 10], 
                filename:     `تقرير_${sanitizedName}_${sectionId}_${new Date().toLocaleDateString('ar-SA')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, // Slightly lower scale for better mobile performance/memory
                    useCORS: true,
                    letterRendering: true,
                    windowWidth: 1100,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' } // Changed to landscape to match CSS
            };

            // Small delay to ensure CSS is applied and layout is stable
            setTimeout(() => {
                html2pdf().set(opt).from(element).save().then(() => {
                    document.body.classList.remove('is-pdf-generating');
                    document.body.style.width = originalBodyWidth;
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                }).catch(err => {
                    console.error("PDF Error:", err);
                    document.body.classList.remove('is-pdf-generating');
                    document.body.style.width = originalBodyWidth;
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                    alert("عذراً، فشل تصدير PDF.");
                });
            }, 500); // 500ms delay for stability
        } else {
            // Standard print for Desktop/iOS
            window.print();
        }
    };

    if (pL) pL.addEventListener('click', () => triggerPrint('manager'));
    const pFiber = document.getElementById('print-fiber-btn'), pShop = document.getElementById('print-shop-btn');
    if (pFiber) pFiber.addEventListener('click', () => triggerPrint('fiber-fridge'));
    if (pShop) pShop.addEventListener('click', () => triggerPrint('shop-fridge'));

    // Improved Export CSV for Android
    const exportBtn = document.getElementById('export-logs-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const btn = exportBtn;
            btn.style.opacity = '0.5';
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التصدير...';

            setTimeout(() => {
                const logs = getItems('transaction_logs');
                if (logs.length === 0) { 
                    alert('لا توجد بيانات لتصديرها'); 
                    btn.style.opacity = '1';
                    btn.innerHTML = '<i class="fas fa-file-excel"></i> تصدير';
                    return; 
                }
                
                let csv = '\uFEFFاليوم,التاريخ,النوع,الصنف,الوحدة,الوزن,العدد,القيمة,الموقع\n';
                logs.forEach(l => {
                    const dateParts = l.date.split('،');
                    const d = dateParts[0], t = dateParts.length > 1 ? dateParts[1] : l.date;
                    csv += `${d},${t},${transTypes[l.type]?.title || 'تحويل'},${l.name},${l.unit || '-'},${l.weight},${l.count},${l.price},${l.fridge === 'fiber' ? 'الفيبر' : 'المحل'}\n`;
                });

                const storeNameCSV = localStorage.getItem('fs_store_name') || 'أمواج_الصياد';
                const sanitizedNameCSV = storeNameCSV.replace(/\s+/g, '_');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `تقرير_${sanitizedNameCSV}_${new Date().toLocaleDateString('ar-SA')}.csv`);
                
                // Android WebView Fix: Append to body
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                btn.style.opacity = '1';
                btn.innerHTML = '<i class="fas fa-file-excel"></i> تصدير';
                alert('تم تجهيز الملف للتحميل!');
            }, 500);
        });
    }
    
    // New Search Listeners
    document.getElementById('search-fiber')?.addEventListener('input', () => renderFridgeTable('fiber'));
    document.getElementById('search-shop')?.addEventListener('input', () => renderFridgeTable('shop'));
    document.getElementById('search-logs')?.addEventListener('input', renderLogs);

    if (cL) cL.addEventListener('click', async () => { 
        const mPass = localStorage.getItem('manager_password') || 'admin';
        const pass = await prompt('الرجاء إدخال كلمة مرور المدير لمسح السجلات:');
        if (pass !== mPass) { alert('كلمة مرور خاطئة!'); return; }
        
        if (confirm('هل أنت متأكد من مسح جميع السجلات؟ لا يمكن التراجع عن هذه الخطوة.')) { 
            saveItems([], 'transaction_logs'); 
            alert('تم مسح السجلات بنجاح'); 
        } 
    });

    // Settings Listeners
    const saveAllBtn = document.getElementById('save-all-settings-btn');
    const factoryResetBtn = document.getElementById('factory-reset-btn');
    const mPassInput = document.getElementById('manager-pass-input');
    const kPassInput = document.getElementById('keeper-pass-input');

    // Load initial values to settings UI
    if (thresholdInput) thresholdInput.value = localStorage.getItem('lowStockThreshold') || '10';
    if (mPassInput) mPassInput.value = localStorage.getItem('manager_password') || 'admin';
    if (kPassInput) kPassInput.value = localStorage.getItem('keeper_password') || '1234';




    if (factoryResetBtn) {
        factoryResetBtn.addEventListener('click', async () => {
            const mPass = localStorage.getItem('manager_password') || 'admin';
            const pass = await prompt('لإجراء تهيئة المصنع، الرجاء إدخال كلمة مرور المدير للتأكيد:');
            if (pass !== mPass) { alert('كلمة مرور خاطئة! لا يمكن التهيئة.'); return; }

            if (confirm('تحذير نهائي: سيتم حذف كافة البيانات (المخزون، السجلات، الإعدادات). هل أنت متأكد تماماً؟')) {
                localStorage.clear();
                alert('تمت تهيئة النظام بالكامل. سيتم إعادة تحميل الصفحة.');
                location.reload();
            }
        });
    }

    // --- Firebase Global Configuration & Sync Logic ---
    const config = window.firebaseConfig || {
        apiKey: "AIzaSyBRdzpGwxPTou6eJXd4xhtuzSid2n3pOyI",
        authDomain: "amwaj-inventory-b93e4.firebaseapp.com",
        databaseURL: "https://amwaj-inventory-b93e4-default-rtdb.firebaseio.com",
        projectId: "amwaj-inventory-b93e4",
        storageBucket: "amwaj-inventory-b93e4.firebasestorage.app",
        messagingSenderId: "592068936028",
        appId: "1:592068936028:web:912fdf8b08baac492b8199"
    };

    const statusDot = document.getElementById('firebase-status-dot');

    if (typeof firebase !== 'undefined') {
        try {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(config);
            }
            db = firebase.database();
            
            // Sign in anonymously to ensure session (optional but helps stability)
            firebase.auth().signInAnonymously().catch(e => console.error("Auth error:", e));

            // Connection Monitor
            db.ref(".info/connected").on("value", (snap) => {
                const isConnected = snap.val() === true;
                if (statusDot) {
                    statusDot.style.background = isConnected ? '#10b981' : '#f59e0b';
                    statusDot.title = isConnected ? "متصل بالسحابة" : "جاري الاتصال...";
                }
            });

            // Master Sync Function
            const startSync = (path, localKey, renderFn) => {
                const ref = db.ref(path);
                
                // 1. Initial Data check
                ref.once('value').then(snap => {
                    if (!snap.exists()) {
                        // Firebase is empty, upload local storage
                        const localData = localStorage.getItem(localKey);
                        if (localData && JSON.parse(localData).length > 0) {
                            console.log(`Seeding ${path} to Firebase...`);
                            ref.set(JSON.parse(localData));
                        }
                    }
                });

                // 2. Real-time Listening
                ref.on('value', (snap) => {
                    if (snap.exists()) {
                        const data = snap.val();
                        const items = Array.isArray(data) ? data : Object.values(data);
                        const newStr = JSON.stringify(items);
                        const oldStr = localStorage.getItem(localKey);
                        // Only update and re-render if the data actually changed
                        if (newStr !== oldStr) {
                            localStorage.setItem(localKey, newStr);
                            if (renderFn) renderFn();
                        }
                    } else {
                        // Handle empty/deleted database paths
                        const oldStr = localStorage.getItem(localKey);
                        if (oldStr && oldStr !== '[]' && oldStr !== '{}') {
                            localStorage.setItem(localKey, '[]');
                            if (renderFn) renderFn();
                        }
                    }
                }, (err) => {
                    console.error(`Firebase Error (${path}):`, err);
                    if (statusDot) statusDot.style.background = '#ef4444';
                });
            };

            // Start all syncs
            startSync('fiber_fridge_items', 'fiber_fridge_items', () => renderFridgeTable('fiber'));
            sync_shop = startSync('shop_fridge_items', 'shop_fridge_items', () => renderFridgeTable('shop'));
            sync_logs = startSync('transaction_logs', 'transaction_logs', renderLogs);

            // Sync scale item prices separately to preserve the key-value dictionary structure
            const scalePricesRef = db.ref('scale_item_prices');
            scalePricesRef.once('value').then(snap => {
                if (!snap.exists()) {
                    const localData = localStorage.getItem('scale_item_prices');
                    if (localData) {
                        scalePricesRef.set(JSON.parse(localData));
                    }
                }
            });
            scalePricesRef.on('value', (snap) => {
                if (snap.exists() && snap.val()) {
                    const data = snap.val();
                    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                        const newStr = JSON.stringify(data);
                        const oldStr = localStorage.getItem('scale_item_prices');
                        if (newStr !== oldStr) {
                            localStorage.setItem('scale_item_prices', newStr);
                            if (typeof loadScalePricesUI === 'function') {
                                loadScalePricesUI();
                            }
                        }
                    }
                }
            });

            // Sync settings
            const settingsRef = db.ref('fish_settings');
            settingsRef.once('value').then(snap => {
                if (!snap.exists()) {
                    const settingsData = {
                        lowStockThreshold: localStorage.getItem('lowStockThreshold') || '10',
                        manager_password: localStorage.getItem('manager_password') || 'admin',
                        keeper_password: localStorage.getItem('keeper_password') || '1234',
                        fs_store_name: localStorage.getItem('fs_store_name') || 'مطعم أمواج الصياد',
                        fs_enable_sound: localStorage.getItem('fs_enable_sound') || 'true',
                        fs_auto_backup: localStorage.getItem('fs_auto_backup') || 'false'
                    };
                    settingsRef.set(settingsData);
                }
            });
            settingsRef.on('value', (snap) => {
                if (snap.exists() && snap.val()) {
                    const data = snap.val();
                    if (data && typeof data === 'object') {
                        if (data.lowStockThreshold !== undefined) {
                            localStorage.setItem('lowStockThreshold', data.lowStockThreshold);
                            lowStockThreshold = parseFloat(data.lowStockThreshold);
                            const thresholdInput = document.getElementById('threshold-input');
                            if (thresholdInput) thresholdInput.value = data.lowStockThreshold;
                        }
                        if (data.manager_password !== undefined) {
                            localStorage.setItem('manager_password', data.manager_password);
                            const mPassInput = document.getElementById('manager-pass-input');
                            if (mPassInput) mPassInput.value = data.manager_password;
                        }
                        if (data.keeper_password !== undefined) {
                            localStorage.setItem('keeper_password', data.keeper_password);
                            const kPassInput = document.getElementById('keeper-pass-input');
                            if (kPassInput) kPassInput.value = data.keeper_password;
                        }
                        if (data.fs_store_name !== undefined) {
                            localStorage.setItem('fs_store_name', data.fs_store_name);
                            const fsName = document.getElementById('fs-store-name');
                            if (fsName) fsName.value = data.fs_store_name;
                        }
                        if (data.fs_enable_sound !== undefined) {
                            localStorage.setItem('fs_enable_sound', data.fs_enable_sound);
                            const fsSound = document.getElementById('fs-enable-sound');
                            if (fsSound) fsSound.checked = (data.fs_enable_sound === 'true' || data.fs_enable_sound === true);
                        }
                        if (data.fs_auto_backup !== undefined) {
                            localStorage.setItem('fs_auto_backup', data.fs_auto_backup);
                            const fsAutoBackup = document.getElementById('fs-auto-backup');
                            if (fsAutoBackup) fsAutoBackup.checked = (data.fs_auto_backup === 'true' || data.fs_auto_backup === true);
                        }
                        renderFridgeTable('fiber');
                        renderFridgeTable('shop');
                    }
                }
            });

        } catch (err) {
            console.error("Firebase Setup Error:", err);
            if (statusDot) statusDot.style.background = '#ef4444';
        }
    } else {
        console.warn("Firebase scripts not loaded.");
    }

    // --- PWA Installation Logic ---
    let deferredPrompt;
    const installCard = document.getElementById('install-card');
    const installBtn = document.getElementById('install-app-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can add to home screen
        if (installCard) installCard.style.display = 'block';
    });

    if (installBtn) {
        installBtn.addEventListener('click', (e) => {
            if (!deferredPrompt) return;



            // Show the prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
                if (installCard) installCard.style.display = 'none';
            });
        });
    }

    window.addEventListener('appinstalled', (evt) => {
        console.log('App was installed');
        if (installCard) installCard.style.display = 'none';
    });

    // --- Settings Logic ---
    const saveSettingsBtn = document.getElementById('save-all-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const currentMPass = localStorage.getItem('manager_password') || 'admin';
            const currentKPass = localStorage.getItem('keeper_password') || '1234';

            const oldMPassInput = document.getElementById('old-manager-pass').value;
            const oldKPassInput = document.getElementById('old-keeper-pass').value;
            const newMPass = document.getElementById('manager-pass-input').value.trim();
            const newKPass = document.getElementById('keeper-pass-input').value.trim();
            const thresh = parseFloat(document.getElementById('threshold-input')?.value || 10);
            const storeName = document.getElementById('fs-store-name')?.value.trim() || 'مطعم أمواج الصياد';
            const soundEnabled = document.getElementById('fs-enable-sound')?.checked;
            const autoBackup = document.getElementById('fs-auto-backup')?.checked;

            // Check Manager Password Change
            let finalMPass = currentMPass;
            if (newMPass !== currentMPass) {
                if (oldMPassInput !== currentMPass) { alert('كلمة مرور المدير الحالية غير صحيحة!'); return; }
                finalMPass = newMPass;
            }

            // Check Keeper Password Change
            let finalKPass = currentKPass;
            if (newKPass !== currentKPass) {
                if (oldKPassInput !== currentKPass) { alert('كلمة مرور الأمين الحالية غير صحيحة!'); return; }
                finalKPass = newKPass;
            }

            // Save locally
            localStorage.setItem('lowStockThreshold', thresh);
            localStorage.setItem('manager_password', finalMPass);
            localStorage.setItem('keeper_password', finalKPass);
            localStorage.setItem('fs_store_name', storeName);
            localStorage.setItem('fs_enable_sound', soundEnabled);
            localStorage.setItem('fs_auto_backup', autoBackup);

            // Save Scale Prices
            const prices = {};
            document.querySelectorAll('.scale-price-input').forEach(input => {
                const itemId = input.getAttribute('data-id');
                const val = parseFloat(input.value) || 0;
                prices[itemId] = val;
            });
            localStorage.setItem('scale_item_prices', JSON.stringify(prices));
            localStorage.setItem('scale_item_prices_local', JSON.stringify(prices)); // حفظ نسخة احتياطية محلية محمية من تصفير السحابة

            // Save Barcode Mode (empty string = auto-detect)
            const barcodeMode = document.getElementById('fs-barcode-mode')?.value;
            if (barcodeMode === '') {
                localStorage.removeItem('scale_barcode_mode'); // كشف تلقائي
            } else if (barcodeMode) {
                localStorage.setItem('scale_barcode_mode', barcodeMode);
            }
            
            // Clear old password fields for security
            document.getElementById('old-manager-pass').value = '';
            document.getElementById('old-keeper-pass').value = '';
            // Sync with Firebase if available
            if (db) {
                try {
                    const settingsData = {
                        lowStockThreshold: thresh.toString(),
                        manager_password: finalMPass,
                        keeper_password: finalKPass,
                        fs_store_name: storeName,
                        fs_enable_sound: soundEnabled.toString(),
                        fs_auto_backup: autoBackup.toString()
                    };
                    db.ref('fish_settings').set(settingsData);
                    db.ref('scale_item_prices').set(prices);
                } catch(e) { console.error("Firebase save error:", e); }
            }

            alert('تم حفظ جميع الإعدادات وتحديثها بنجاح!');
            renderFridgeTable('fiber');
            renderFridgeTable('shop');
        });
    }

    // Load Settings visually
    const fsName = localStorage.getItem('fs_store_name');
    if(fsName && document.getElementById('fs-store-name')) document.getElementById('fs-store-name').value = fsName;

    const fsSound = localStorage.getItem('fs_enable_sound');
    if(fsSound !== null && document.getElementById('fs-enable-sound')) document.getElementById('fs-enable-sound').checked = (fsSound === 'true');

    const fsAutoBackup = localStorage.getItem('fs_auto_backup');
    if(fsAutoBackup !== null && document.getElementById('fs-auto-backup')) document.getElementById('fs-auto-backup').checked = (fsAutoBackup === 'true');

    // Load barcode mode setting into UI
    const fsBarcodeMode = localStorage.getItem('scale_barcode_mode');
    const fsBarcodeModeEl = document.getElementById('fs-barcode-mode');
    if (fsBarcodeModeEl) {
        fsBarcodeModeEl.value = fsBarcodeMode || ''; // '' = auto-detect
    }


    // Initial load
    renderFridgeTable('fiber'); renderFridgeTable('shop'); renderLogs(); ensureOneRow();
    if (typeof loadScalePricesUI === 'function') {
        loadScalePricesUI();
    }
});

// --- PREMIUM TOUCHES ---
document.addEventListener('click', (e) => {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = Math.random() * 20 + 10;
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.left = (e.clientX - size/2) + 'px';
    bubble.style.top = (e.clientY - size/2) + 'px';
    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 600);
});

if (typeof firebase !== 'undefined') {
    firebase.database().ref(".info/connected").on("value", (snap) => {
        const dot = document.getElementById('firebase-status-dot');
        const text = document.getElementById('status-text');
        if (dot && text) {
            if (snap.val() === true) {
                dot.style.background = '#10b981';
                dot.style.boxShadow = '0 0 10px #10b981';
                dot.classList.add('status-dot-pulse');
                text.innerText = 'متصل بالسحابة';
                text.style.color = '#10b981';
            } else {
                dot.style.background = '#ef4444';
                dot.style.boxShadow = 'none';
                dot.classList.remove('status-dot-pulse');
                text.innerText = 'غير متصل - وضع الأوفلاين';
                text.style.color = '#ef4444';
            }
        }
    });
}
// --- Auto Backup ---
setInterval(() => {
    if(localStorage.getItem('fs_auto_backup') === 'true' && typeof firebase !== 'undefined') {
        firebase.database().ref('/').once('value').then(snap => {
            if(snap.exists()) {
                localStorage.setItem('fs_auto_backup_data', JSON.stringify(snap.val()));
                localStorage.setItem('fs_auto_backup_date', new Date().toISOString());
            }
        });
    }
}, 1000 * 60 * 60 * 6); // Every 6 hours

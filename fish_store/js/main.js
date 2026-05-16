document.addEventListener('DOMContentLoaded', () => {
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
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            // Password Protection (Dynamic from localStorage)
            const mPass = localStorage.getItem('manager_password') || 'admin';
            const kPass = localStorage.getItem('keeper_password') || '1234';

            if (sectionId === 'manager') {
                const pass = prompt('الرجاء إدخال كلمة مرور المدير:');
                if (pass !== mPass) { alert('كلمة مرور خاطئة!'); return; }
            } else if (sectionId === 'fridge-keeper') {
                const pass = prompt('الرجاء إدخال كلمة مرور أمين الثلاجات:');
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
        if (typeof firebase !== 'undefined') firebase.database().ref(path).set(items);
        localStorage.setItem(path, JSON.stringify(items));
        if (type === 'transaction_logs') renderLogs(); else renderFridgeTable(type);
    };

    const addLog = (log) => { 
        let logs = getItems('transaction_logs'); 
        logs.unshift(log); 
        if (logs.length > 500) logs.pop(); 
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
        filteredLogs.forEach(log => {
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
        let items = getItems(type);
        
        // Apply Search Filter
        if (searchVal) {
            items = items.filter(i => i.name.toLowerCase().includes(searchVal) || i.id.includes(searchVal));
        }

        body.innerHTML = ''; 
        let totalWeight = 0;
        let totalPrice = 0;
        
        items.forEach(item => {
            const row = document.createElement('tr');
            const w = parseFloat(item.weight) || 0;
            const p = parseFloat(item.price) || 0;
            totalWeight += w;
            totalPrice += p;

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
            `;
            body.appendChild(row);
        });

        if (tI) tI.textContent = items.length; 
        if (tW) tW.textContent = `${totalWeight.toFixed(2)} كجم`;
        if (tP) tP.textContent = `${totalPrice.toLocaleString()} ر.س`;
    };

    // --- Fridge Keeper Logic ---
    const transButtons = document.querySelectorAll('.trans-type-btn'), activeCont = document.getElementById('active-transaction-container'), tTitle = document.getElementById('transaction-title'), sText = document.getElementById('save-btn-text'), targetF = document.getElementById('target-fridge'), addI = document.getElementById('add-item-btn'), tableB = document.getElementById('item-table-body');
    let currentMode = 'purchase';
    const ensureOneRow = () => { if (tableB && tableB.children.length === 0) addI.click(); };

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
                const idx = items.findIndex(i => i.id === id || i.name === name);
                if (currentMode === 'purchase') {
                    if (idx !== -1) { items[idx].weight = (parseFloat(items[idx].weight) + w).toFixed(2); items[idx].count = (parseInt(items[idx].count) + c).toString(); items[idx].price = (parseFloat(items[idx].price) + p).toFixed(2); items[idx].date = time; }
                    else items.push({ id: id || (Date.now() + Math.floor(Math.random()*1000)).toString().slice(-5), name, weight: w.toFixed(2), price: p.toFixed(2), count: c.toString(), date: time });
                } else {
                    if (idx === -1) errors.push(`الصنف "${name}" غير موجود`);
                    else {
                        const aW = parseFloat(items[idx].weight), aC = parseInt(items[idx].count), aP = parseFloat(items[idx].price);
                        if (aW < w || aC < c) errors.push(`الكمية لـ "${name}" أكبر من المتوفر (${aW} كجم)`);
                        else { items[idx].weight = (aW - w).toFixed(2); items[idx].count = (aC - c).toString(); items[idx].price = (aP - p).toFixed(2); items[idx].date = time; }
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
                alert(`تم تنفيذ "${transTypes[currentMode].title}" بنجاح في ${target === 'fiber' ? 'ثلاجة الفيبر' : 'ثلاجة المحل'}`);
            }
        });
    }

    // --- Transfer Logic ---
    const showTB = document.getElementById('show-transfer-btn'), transI = document.getElementById('transfer-interface'), transTB = document.getElementById('transfer-table-body'), addTI = document.getElementById('add-transfer-item-btn'), confT = document.getElementById('confirm-transfer-btn');
    if (showTB) showTB.addEventListener('click', () => { transI.style.display = 'block'; if (transTB.children.length === 0) addTI.click(); });
    if (document.getElementById('cancel-transfer-btn')) document.getElementById('cancel-transfer-btn').addEventListener('click', () => { transI.style.display = 'none'; transTB.innerHTML = ''; });
    if (addTI) {
        addTI.addEventListener('click', () => {
            const r = document.createElement('tr'), timeStr = getCurrentDateTime();
            const dateParts = timeStr.split('،'), day = dateParts[0], time = dateParts.slice(1).join('،');
            r.className = 'transfer-row';
            r.innerHTML = `<td><input type="text" class="input-cell item-id" placeholder="001"></td><td><input type="text" class="input-cell item-name" placeholder="اسم السمك"></td><td class="item-day">${day}</td><td class="item-date">${time}</td><td><input type="number" class="input-cell item-weight" placeholder="0.00"></td><td><input type="number" class="input-cell item-price" placeholder="0.00"></td><td><input type="number" class="input-cell item-count" placeholder="1"></td><td><button class="delete-btn" style="background:none;border:none;color:#f87171;cursor:pointer;"><i class="fas fa-trash-alt"></i></button></td>`;
            r.querySelector('.delete-btn').addEventListener('click', () => r.remove()); 
            transTB.appendChild(r);
            attachAutocomplete(r.querySelector('.item-name'), r.querySelector('.item-id'));
        });
    }
    if (confT) {
        confT.addEventListener('click', () => {
            const kPass = localStorage.getItem('keeper_password') || '1234';
            const pass = prompt('الرجاء إدخال كلمة مرور التحويل (أمين الثلاجات):');
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
                        
                        if (aW < w || aC < c) {
                            es.push(`الكمية لـ "${n}" أكبر من المتوفر (${aW} كجم)`);
                        } else {
                            let priceToTransfer = p;
                            // Auto-calculate price if not provided
                            if (priceToTransfer === 0 && aP > 0) {
                                priceToTransfer = (aP / (aW || 1)) * w;
                            }
                            
                            fI[idx].weight = (aW - w).toFixed(2); 
                            fI[idx].count = (aC - c).toString(); 
                            fI[idx].price = (aP - priceToTransfer).toFixed(2);
                            fI[idx].date = time;
                            
                            const sIdx = sI.findIndex(i => i.id === id || i.name === n);
                            if (sIdx !== -1) { 
                                sI[sIdx].weight = (parseFloat(sI[sIdx].weight) + w).toFixed(2); 
                                sI[sIdx].count = (parseInt(sI[sIdx].count) + c).toString(); 
                                sI[sIdx].price = (parseFloat(sI[sIdx].price) + priceToTransfer).toFixed(2); 
                                sI[sIdx].date = time; 
                            } else {
                                sI.push({ id: id || fI[idx].id, name: n, weight: w.toFixed(2), price: priceToTransfer.toFixed(2), count: c.toString(), date: time });
                            }
                        }
                }
            });
            if (es.length > 0) alert('أخطاء:\n' + es.join('\n'));
            else {
                rs.forEach(r => addLog({ date: time, type: 'transfer', name: r.querySelector('.item-name').value, weight: r.querySelector('.item-weight').value, count: r.querySelector('.item-count').value, price: r.querySelector('.item-price').value, fridge: 'fiber' }));
                saveItems(fI, 'fiber'); saveItems(sI, 'shop'); transI.style.display = 'none'; transTB.innerHTML = ''; alert('تم التحويل!');
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

            const element = document.body; 
            const opt = {
                margin:       [10, 10, 10, 10], 
                filename:     `تقرير_أمواج_الصياد_${sectionId}_${new Date().toLocaleDateString('ar-SA')}.pdf`,
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

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `تقرير_أمواج_الصياد_${new Date().toLocaleDateString('ar-SA')}.csv`);
                
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

    if (cL) cL.addEventListener('click', () => { 
        const mPass = localStorage.getItem('manager_password') || 'admin';
        const pass = prompt('الرجاء إدخال كلمة مرور المدير لمسح السجلات:');
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

    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', () => {
            const currentMPass = localStorage.getItem('manager_password') || 'admin';
            const currentKPass = localStorage.getItem('keeper_password') || '1234';

            const oldMPassInput = document.getElementById('old-manager-pass').value;
            const oldKPassInput = document.getElementById('old-keeper-pass').value;
            const newMPass = mPassInput.value.trim();
            const newKPass = kPassInput.value.trim();
            const newThreshold = thresholdInput.value;

            // Check Manager Password Change
            if (newMPass !== currentMPass) {
                if (oldMPassInput !== currentMPass) { alert('كلمة مرور المدير الحالية غير صحيحة!'); return; }
                localStorage.setItem('manager_password', newMPass);
            }

            // Check Keeper Password Change
            if (newKPass !== currentKPass) {
                if (oldKPassInput !== currentKPass) { alert('كلمة مرور الأمين الحالية غير صحيحة!'); return; }
                localStorage.setItem('keeper_password', newKPass);
            }

            localStorage.setItem('lowStockThreshold', newThreshold);
            lowStockThreshold = parseFloat(newThreshold);

            // Clear password fields for security
            document.getElementById('old-manager-pass').value = '';
            document.getElementById('old-keeper-pass').value = '';
            
            alert('تم تحديث الإعدادات بنجاح!');
            renderFridgeTable('fiber');
            renderFridgeTable('shop');
        });
    }

    if (factoryResetBtn) {
        factoryResetBtn.addEventListener('click', () => {
            const mPass = localStorage.getItem('manager_password') || 'admin';
            const pass = prompt('لإجراء تهيئة المصنع، الرجاء إدخال كلمة مرور المدير للتأكيد:');
            if (pass !== mPass) { alert('كلمة مرور خاطئة! لا يمكن التهيئة.'); return; }

            if (confirm('تحذير نهائي: سيتم حذف كافة البيانات (المخزون، السجلات، الإعدادات). هل أنت متأكد تماماً؟')) {
                localStorage.clear();
                alert('تمت تهيئة النظام بالكامل. سيتم إعادة تحميل الصفحة.');
                location.reload();
            }
        });
    }

    // --- Firebase Global Configuration & Sync Logic ---
    const config = {
        apiKey: "AIzaSyAFlBpJY53TwsqvFsfgfoLeTTjzKDGB5Ms",
        authDomain: "amwaaa-c514a.firebaseapp.com",
        databaseURL: "https://amwaaa-c514a-default-rtdb.firebaseio.com",
        projectId: "amwaaa-c514a",
        storageBucket: "amwaaa-c514a.firebasestorage.app",
        messagingSenderId: "395157441882",
        appId: "1:395157441882:web:41d226cbbb2059439a7763"
    };

    const statusDot = document.getElementById('firebase-status');

    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(config);
            const db = firebase.database();
            
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
                        localStorage.setItem(localKey, JSON.stringify(items));
                        if (renderFn) renderFn();
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

    // Initial load
    renderFridgeTable('fiber'); renderFridgeTable('shop'); renderLogs(); ensureOneRow();
});

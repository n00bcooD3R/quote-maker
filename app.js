/**
 * STDA Project & Materials Quotation App Logic
 */

// Application State
const state = {
    mode: 'project', // 'project' | 'materials'
    items: [],
    clients: [],
    selectedClient: null
};

// Default Date helper
function getDefaultDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}th ${months[today.getMonth()]} ${today.getFullYear()}`;
}

// Currency Formatter
function formatINR(amount) {
    if (isNaN(amount)) return '0.00';
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Toast notification helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    loadClients();
    bindEvents();
    
    // Default to Project Sample or initial state
    loadProjectSample();
});

// Load Client List from clients.json or API
async function loadClients() {
    try {
        const resp = await fetch('../clients.json');
        if (resp.ok) {
            state.clients = await resp.json();
            document.getElementById('client-count-badge').textContent = `${state.clients.length} clients`;
        }
    } catch {
        state.clients = [];
    }
}

// Sort Items: All Project items first, followed by all Materials items
function sortItems() {
    state.items.sort((a, b) => {
        const typeA = a.type || 'project';
        const typeB = b.type || 'project';
        if (typeA === typeB) return 0;
        return typeA === 'project' ? -1 : 1;
    });
}

// Add Item Type Modal Handlers
function openAddItemModal() {
    const modal = document.getElementById('modal-add-item-type');
    if (modal) modal.classList.add('active');
}

function closeAddItemModal() {
    const modal = document.getElementById('modal-add-item-type');
    if (modal) modal.classList.remove('active');
}

// Bind Events
function bindEvents() {
    // Mode Switching
    document.getElementById('btn-mode-project').addEventListener('click', () => setMode('project'));
    document.getElementById('btn-mode-materials').addEventListener('click', () => setMode('materials'));

    // Sample Presets
    document.getElementById('btn-load-project-sample').addEventListener('click', loadProjectSample);
    document.getElementById('btn-load-materials-sample').addEventListener('click', loadMaterialsSample);

    // Form Controls & Add Item Modal
    document.getElementById('btn-reset-form').addEventListener('click', resetForm);
    document.getElementById('btn-add-item').addEventListener('click', openAddItemModal);
    document.getElementById('close-add-item-modal').addEventListener('click', closeAddItemModal);

    document.getElementById('btn-add-type-project').addEventListener('click', () => {
        closeAddItemModal();
        addItemRow({}, 'project');
        showToast('Added Project Quotation Item', 'info');
    });

    document.getElementById('btn-add-type-materials').addEventListener('click', () => {
        closeAddItemModal();
        addItemRow({}, 'materials');
        showToast('Added Materials List Item', 'info');
    });

    const addItemModal = document.getElementById('modal-add-item-type');
    if (addItemModal) {
        addItemModal.addEventListener('click', (e) => {
            if (e.target === addItemModal) closeAddItemModal();
        });
    }

    document.getElementById('gst-mode').addEventListener('change', calculateTotals);

    // Client Lookup Search
    const searchInput = document.getElementById('client-search');
    const searchDropdown = document.getElementById('search-dropdown');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
            searchDropdown.style.display = 'none';
            return;
        }
        const matches = state.clients.filter(c => 
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.gstin && c.gstin.toLowerCase().includes(query))
        );

        if (matches.length === 0) {
            searchDropdown.style.display = 'none';
            return;
        }

        searchDropdown.innerHTML = matches.map(c => `
            <div class="search-dropdown-item" data-id="${c.id}">
                <div class="client-title">${c.name}</div>
                <div class="client-sub">${c.address || ''} | GSTIN: ${c.gstin || 'N/A'}</div>
            </div>
        `).join('');

        searchDropdown.style.display = 'block';
    });

    searchDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.search-dropdown-item');
        if (item) {
            const id = item.getAttribute('data-id');
            const client = state.clients.find(c => c.id === id);
            if (client) {
                document.getElementById('customer-name').value = client.name || '';
                document.getElementById('customer-address').value = client.address || '';
                searchDropdown.style.display = 'none';
                searchInput.value = '';
                showToast(`Loaded client: ${client.name}`, 'success');
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.style.display = 'none';
        }
    });

    // PDF Actions
    document.getElementById('btn-preview-pdf').addEventListener('click', () => generatePDF(true));
    document.getElementById('btn-download-pdf').addEventListener('click', () => generatePDF(false));
    document.getElementById('close-pdf-modal').addEventListener('click', closePdfModal);

    const modal = document.getElementById('modal-pdf-preview');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePdfModal();
    });
}

// Mode Switcher Logic
function setMode(mode) {
    state.mode = mode;
    
    const btnProject = document.getElementById('btn-mode-project');
    const btnMaterials = document.getElementById('btn-mode-materials');
    const secTech = document.getElementById('section-technical-proposal');
    const secCompliance = document.getElementById('section-compliance');
    const costingTitle = document.getElementById('costing-section-title');

    if (mode === 'project') {
        btnProject.classList.add('active');
        btnMaterials.classList.remove('active');
        if (secTech) secTech.style.display = 'block';
        if (secCompliance) secCompliance.style.display = 'block';
        if (costingTitle) costingTitle.textContent = '2. Costing & Scope Breakdown';
    } else {
        btnMaterials.classList.add('active');
        btnProject.classList.remove('active');
        const hasProjectItems = state.items.some(i => (i.type || 'project') === 'project');
        if (secTech) secTech.style.display = hasProjectItems ? 'block' : 'none';
        if (secCompliance) secCompliance.style.display = hasProjectItems ? 'block' : 'none';
        if (costingTitle) costingTitle.textContent = 'Costing & Materials Breakdown';
    }

    renderItemRows();
    calculateTotals();
}

// Add Item Row
function addItemRow(item = {}, targetType = null) {
    const itemType = targetType || item.type || state.mode || 'project';
    const newItem = {
        id: Date.now() + Math.random().toString(36).substr(2, 4),
        type: itemType,
        partNo: item.partNo || '',
        description: item.description || '',
        qty: item.qty !== undefined ? item.qty : 1,
        unitPrice: item.unitPrice !== undefined ? item.unitPrice : 0
    };
    state.items.push(newItem);
    sortItems();
    renderItemRows();
    calculateTotals();
}

// Delete Item Row
function deleteItemRow(id) {
    if (state.items.length <= 1) {
        showToast('Quotation must have at least one line item', 'error');
        return;
    }
    state.items = state.items.filter(item => item.id !== id);
    renderItemRows();
    calculateTotals();
}

// Render Item Tables (Grouped & Sorted: Project Items 1st, Materials Items 2nd)
function renderItemRows() {
    const container = document.getElementById('costing-groups-container');
    if (!container) return;

    sortItems();

    const projectItems = state.items.filter(i => (i.type || 'project') === 'project');
    const materialsItems = state.items.filter(i => i.type === 'materials');

    if (state.items.length === 0) {
        container.innerHTML = `
            <div class="empty-items-state">
                <p>No items added yet to this quotation.</p>
                <button type="button" class="btn btn-secondary btn-sm" onclick="openAddItemModal()">➕ Add Your First Item</button>
            </div>
        `;
        return;
    }

    let html = '';

    // Group 1: Project Items Table
    if (projectItems.length > 0) {
        html += `
            <div class="item-group-wrapper">
                <div class="group-header group-header-project">
                    <span class="group-title">🏗️ Project Quotations / Scope Breakdown</span>
                    <span class="group-badge badge-project">${projectItems.length} item${projectItems.length > 1 ? 's' : ''}</span>
                </div>
                <div class="table-responsive">
                    <table class="items-table table-project">
                        <thead>
                            <tr>
                                <th class="col-sl">SL</th>
                                <th class="col-type">Type</th>
                                <th class="col-desc">Description / Scope</th>
                                <th class="col-qty">Qty</th>
                                <th class="col-price">Unit Price (₹)</th>
                                <th class="col-total">Total Price (₹)</th>
                                <th class="col-actions">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${projectItems.map((item, index) => renderSingleRowHtml(item, index + 1, 'project')).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Group 2: Materials Items Table
    if (materialsItems.length > 0) {
        html += `
            <div class="item-group-wrapper">
                <div class="group-header group-header-materials">
                    <span class="group-title">📦 Materials & Services Breakdown</span>
                    <span class="group-badge badge-materials">${materialsItems.length} item${materialsItems.length > 1 ? 's' : ''}</span>
                </div>
                <div class="table-responsive">
                    <table class="items-table table-materials">
                        <thead>
                            <tr>
                                <th class="col-sl">SL</th>
                                <th class="col-type">Type</th>
                                <th class="col-part">Part No</th>
                                <th class="col-desc">Description</th>
                                <th class="col-qty">Qty</th>
                                <th class="col-price">Unit Price (₹)</th>
                                <th class="col-total">Total Price (₹)</th>
                                <th class="col-actions">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${materialsItems.map((item, index) => renderSingleRowHtml(item, index + 1, 'materials')).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    // Attach Row Input & Type Selector Event Listeners
    container.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.getAttribute('data-id');
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const selectType = tr.querySelector('.select-item-type');
        const inputPart = tr.querySelector('.input-part-no');
        const inputDesc = tr.querySelector('.input-desc');
        const inputQty = tr.querySelector('.input-qty');
        const inputPrice = tr.querySelector('.input-price');
        const btnDelete = tr.querySelector('.btn-delete-row');

        if (selectType) {
            selectType.addEventListener('change', (e) => {
                item.type = e.target.value;
                sortItems();
                renderItemRows();
                calculateTotals();
                showToast(`Item type changed to ${item.type === 'project' ? 'Project' : 'Materials'}`, 'info');
            });
        }
        if (inputPart) {
            inputPart.addEventListener('input', (e) => {
                item.partNo = e.target.value;
            });
        }
        if (inputDesc) {
            inputDesc.addEventListener('input', (e) => {
                item.description = e.target.value;
            });
        }
        if (inputQty) {
            inputQty.addEventListener('input', (e) => {
                item.qty = parseFloat(e.target.value) || 0;
                updateRowTotal(tr, item);
                calculateTotals();
            });
        }
        if (inputPrice) {
            inputPrice.addEventListener('input', (e) => {
                item.unitPrice = parseFloat(e.target.value) || 0;
                updateRowTotal(tr, item);
                calculateTotals();
            });
        }
        if (btnDelete) {
            btnDelete.addEventListener('click', () => deleteItemRow(id));
        }
    });

    // Update visibility of Technical Proposal and Compliance sections based on Project items presence
    const hasProjectItems = state.items.some(i => (i.type || 'project') === 'project');
    const secTech = document.getElementById('section-technical-proposal');
    const secCompliance = document.getElementById('section-compliance');
    if (secTech) secTech.style.display = (hasProjectItems || state.mode === 'project') ? 'block' : 'none';
    if (secCompliance) secCompliance.style.display = (hasProjectItems || state.mode === 'project') ? 'block' : 'none';
}

function renderSingleRowHtml(item, slNo, itemType) {
    const total = (item.qty || 0) * (item.unitPrice || 0);
    const isProject = itemType === 'project';

    return `
        <tr data-id="${item.id}" class="row-item row-type-${itemType}">
            <td class="col-sl">${slNo}</td>
            <td class="col-type">
                <select class="select-item-type badge-select-${itemType}">
                    <option value="project" ${isProject ? 'selected' : ''}>🏗️ Project</option>
                    <option value="materials" ${!isProject ? 'selected' : ''}>📦 Material</option>
                </select>
            </td>
            ${!isProject ? `
                <td class="col-part">
                    <input type="text" class="input-part-no" value="${escapeHtml(item.partNo)}" placeholder="Part No / Ref">
                </td>
            ` : ''}
            <td class="col-desc">
                <textarea class="input-desc" rows="${isProject ? 3 : 2}" placeholder="${isProject ? 'Project Scope & Item description...' : 'Item description...'}">${escapeHtml(item.description)}</textarea>
            </td>
            <td class="col-qty">
                <input type="number" class="input-qty" value="${item.qty}" min="1" step="1">
            </td>
            <td class="col-price">
                <input type="number" class="input-price" value="${item.unitPrice}" min="0" step="any">
            </td>
            <td class="col-total">
                <span class="calculated-total">₹ ${formatINR(total)}</span>
            </td>
            <td class="col-actions">
                <button type="button" class="btn btn-danger btn-sm btn-delete-row" title="Delete Row">✕</button>
            </td>
        </tr>
    `;
}

function updateRowTotal(tr, item) {
    const totalSpan = tr.querySelector('.calculated-total');
    if (totalSpan) {
        const total = (item.qty || 0) * (item.unitPrice || 0);
        totalSpan.textContent = `₹ ${formatINR(total)}`;
    }
}

// Calculate Summary Totals
function calculateTotals() {
    const subtotal = state.items.reduce((sum, i) => sum + ((i.qty || 0) * (i.unitPrice || 0)), 0);
    const gstMode = document.getElementById('gst-mode').value;
    
    let gstAmount = 0;
    let grandTotal = subtotal;

    if (gstMode === 'extra_18') {
        gstAmount = subtotal * 0.18;
        grandTotal = subtotal + gstAmount;
        document.getElementById('summary-gst-row').style.display = 'flex';
    } else if (gstMode === 'included_18') {
        gstAmount = subtotal - (subtotal / 1.18);
        grandTotal = subtotal;
        document.getElementById('summary-gst-row').style.display = 'flex';
    } else {
        gstAmount = 0;
        grandTotal = subtotal;
        document.getElementById('summary-gst-row').style.display = 'none';
    }

    document.getElementById('summary-subtotal').textContent = `₹ ${formatINR(subtotal)}`;
    document.getElementById('summary-gst-amount').textContent = `₹ ${formatINR(gstAmount)}`;
    document.getElementById('summary-grand-total').textContent = `₹ ${formatINR(grandTotal)}`;
}

// Escape HTML utility
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

// Reset Form to Empty State
function resetForm() {
    state.items = [];
    document.getElementById('quotation-no').value = '';
    document.getElementById('quotation-date').value = getDefaultDate();
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('kind-attention').value = '';
    document.getElementById('quotation-subject').value = '';
    document.getElementById('opening-text').value = '';
    document.getElementById('technical-proposal-text').value = '';
    document.getElementById('compliance-text').value = '';
    document.getElementById('terms-payment').value = '';
    document.getElementById('terms-taxes').value = '';
    document.getElementById('terms-freight').value = '';
    document.getElementById('terms-delivery').value = '';
    document.getElementById('terms-validity').value = '';
    document.getElementById('terms-commissioning').value = '';
    addItemRow();
    showToast('Form cleared', 'info');
}

// ===================== SAMPLE PRESETS =====================

// Load Project Sample (Grindwell_STDA2526_0106R2.pdf)
function loadProjectSample() {
    setMode('project');
    
    document.getElementById('quotation-no').value = 'STDA/2526/0106R2';
    document.getElementById('quotation-date').value = '13th Feb 2026';
    document.getElementById('kind-attention').value = '';
    document.getElementById('customer-name').value = 'M/s Grindwell Norton Ltd';
    document.getElementById('customer-address').value = 'Devanahalli Road, Off Old Madras Road, Bengaluru-560049';
    document.getElementById('quotation-subject').value = 'Proposal for Online Floor Pad Weighing and Printing Setup';
    document.getElementById('quotation-salutation').value = 'Dear Sir,';
    document.getElementById('opening-text').value = `We thank you for considering us for this project. Based on the details received verbally & mail We hereby take pleasure in submitting our Techno- Commercial Proposal for your kind perusal.

We hope you will find our offer in line with your requirement. Should you need any additional information/clarification, do contact us.

Thanking you`;

    // Items
    state.items = [
        {
            id: 'proj_item_1',
            type: 'project',
            partNo: '',
            description: `Design Manufacturing and delivery and installation. (Parts machining, mechanical std parts procurement, parts assembly, and delivery of products and installation.) of Online Floor Pad Weighing and Printing Setup

1. Weighing Conveyor
2. Outfeed conveyor with Rejection Setup
3. Pad Stacking Setup
4. Thickness Measurement Setup`,
            qty: 1,
            unitPrice: 350000
        }
    ];

    document.getElementById('technical-proposal-text').value = 'PLEASE FIND THE ATTACHED ANNEXURE FOR TECHNICAL PROPOSAL';
    document.getElementById('compliance-text').value = `1) Scope of supply shall be limited to above furnished BOM and any change in BOM other than quoted would be subjected to price implication
2) Field Wiring Sensotech Scope`;

    document.getElementById('terms-payment').value = '50% Advance, 40% +GST Against Delivery , Remaining after installation';
    document.getElementById('terms-taxes').value = 'All Taxes and duties as applicable shall be charged extra.';
    document.getElementById('terms-freight').value = 'At Actual';
    document.getElementById('terms-delivery').value = '4 to 6 Weeks from Date of PO & Advance payment.';
    document.getElementById('terms-validity').value = 'Our offer shall be firm and remain valid up to 30 days from the date of this offer.';
    document.getElementById('terms-commissioning').value = `i. Lodging and boarding will be customer scope while installation and service period.
ii. Manpower transportation charges during installation customer scope`;

    document.getElementById('bank-name').value = 'HDFC BANK LTD';
    document.getElementById('bank-branch').value = 'Peenya Industrial Area Bengaluru- 560058';
    document.getElementById('bank-account').value = '50200034569702';
    document.getElementById('bank-ifsc').value = 'HDFC0001232';

    document.getElementById('signatory-name').value = 'Bapu Patil';
    document.getElementById('signatory-company').value = 'SensoTech Design and Automation';
    document.getElementById('signatory-mobile').value = '+91 8884676895 / 9901578263';
    document.getElementById('signatory-email-gst').value = 'bapusp@stda.in / sales@stda.in | GSTIN: 29CZBPP8121M1ZV';

    document.getElementById('gst-mode').value = 'none';

    renderItemRows();
    calculateTotals();
    showToast('Loaded Project Quotation sample (STDA/2526/0106R2)', 'success');
}

// Load Materials Sample (Service Quote - AnilKumar.pdf)
function loadMaterialsSample() {
    setMode('materials');

    document.getElementById('quotation-no').value = 'STDA/2526/95';
    document.getElementById('quotation-date').value = '16th Jan -2026';
    document.getElementById('kind-attention').value = 'Mr Anilkumar Sir';
    document.getElementById('customer-name').value = 'M/s Grindwell Norton Ltd';
    document.getElementById('customer-address').value = 'Devanahalli Road, Off Old Madras Road, Bengaluru-560049';
    document.getElementById('quotation-subject').value = 'Proposal for ASSM Cutting Machine PLC ,HMI and Servo Programming as per requirement(Tann-2)';
    document.getElementById('quotation-salutation').value = 'Dear Sir,';
    document.getElementById('opening-text').value = `First of all thanks for giving us the enquiry. We will like to assure you that, by dealing with us you will be getting best service and support. Our whole motto of working is customer work satisfaction and long-term relationship.`;

    // Items
    state.items = [
        {
            id: 'mat_item_1',
            type: 'materials',
            partNo: 'DVP32ES200T',
            description: '16DI/16DO , Transistor output',
            qty: 1,
            unitPrice: 14820
        },
        {
            id: 'mat_item_2',
            type: 'materials',
            partNo: 'DVP08XP211T',
            description: '4DI/4DO Tx output',
            qty: 1,
            unitPrice: 4440
        },
        {
            id: 'mat_item_3',
            type: 'materials',
            partNo: 'DOP-107BV',
            description: '7.0" Reso. 800x480 RS232/RS-422/RS-485 USB Client & Host Basic',
            qty: 1,
            unitPrice: 16520
        },
        {
            id: 'mat_item_4',
            type: 'materials',
            partNo: 'Programming',
            description: `1. PLC Programming
2. HMI Programming
3. Servo Interfacing
4. Installation and Commissioning`,
            qty: 1,
            unitPrice: 50000
        }
    ];

    document.getElementById('terms-payment').value = 'EXISTING';
    document.getElementById('terms-taxes').value = 'Extra 18% applicable.';
    document.getElementById('terms-freight').value = 'Our Scope';
    document.getElementById('terms-delivery').value = 'Work already done';
    document.getElementById('terms-validity').value = 'The Quotation is valid for 30 days only.';
    document.getElementById('terms-commissioning').value = 'Commissioning Engineers Transportation/Hotel/Food at customer scope';

    document.getElementById('bank-name').value = 'HDFC BANK LTD';
    document.getElementById('bank-branch').value = 'Peenya Industrial Area Bengaluru- 560058';
    document.getElementById('bank-account').value = '50200034569702';
    document.getElementById('bank-ifsc').value = 'HDFC0001232';

    document.getElementById('signatory-name').value = 'Bapu Patil';
    document.getElementById('signatory-company').value = 'SensoTech Design and Automation';
    document.getElementById('signatory-mobile').value = '+91-8884676895';
    document.getElementById('signatory-email-gst').value = 'bapusp@stda.in | GSTIN: 29CZBPP8121M1ZV';

    document.getElementById('gst-mode').value = 'none';

    renderItemRows();
    calculateTotals();
    showToast('Loaded Materials & Services Quote sample (STDA/2526/95)', 'success');
}

// Collect Form Data for PDF
function collectFormData() {
    return {
        mode: state.mode,
        quotationNo: document.getElementById('quotation-no').value.trim() || 'STDA/2526/001',
        date: document.getElementById('quotation-date').value.trim() || getDefaultDate(),
        kindAttention: document.getElementById('kind-attention').value.trim(),
        customerName: document.getElementById('customer-name').value.trim() || 'Valued Customer',
        customerAddress: document.getElementById('customer-address').value.trim(),
        subject: document.getElementById('quotation-subject').value.trim(),
        salutation: document.getElementById('quotation-salutation').value.trim() || 'Dear Sir,',
        openingText: document.getElementById('opening-text').value.trim(),
        items: state.items,
        gstMode: document.getElementById('gst-mode').value,
        technicalProposalText: document.getElementById('technical-proposal-text').value.trim(),
        complianceText: document.getElementById('compliance-text').value.trim(),
        termsPayment: document.getElementById('terms-payment').value.trim(),
        termsTaxes: document.getElementById('terms-taxes').value.trim(),
        termsFreight: document.getElementById('terms-freight').value.trim(),
        termsDelivery: document.getElementById('terms-delivery').value.trim(),
        termsValidity: document.getElementById('terms-validity').value.trim(),
        termsCommissioning: document.getElementById('terms-commissioning').value.trim(),
        bankName: document.getElementById('bank-name').value.trim(),
        bankBranch: document.getElementById('bank-branch').value.trim(),
        bankAccount: document.getElementById('bank-account').value.trim(),
        bankIfsc: document.getElementById('bank-ifsc').value.trim(),
        signatoryName: document.getElementById('signatory-name').value.trim() || 'Bapu Patil',
        signatoryCompany: document.getElementById('signatory-company').value.trim() || 'SensoTech Design and Automation',
        signatoryMobile: document.getElementById('signatory-mobile').value.trim(),
        signatoryEmailGst: document.getElementById('signatory-email-gst').value.trim()
    };
}

// PDF Modal Controls
async function generatePDF(preview = false) {
    const data = collectFormData();
    if (typeof window.generateQuotePDF !== 'function') {
        showToast('PDF Generator script not loaded', 'error');
        return;
    }
    
    try {
        if (typeof window.loadJsPDFScripts === 'function') {
            await window.loadJsPDFScripts();
        }
        const doc = window.generateQuotePDF(data);
        
        if (preview) {
            const blobUrl = doc.output('bloburl');
            const iframe = document.getElementById('pdf-preview-frame');
            iframe.src = blobUrl;
            document.getElementById('modal-pdf-preview').classList.add('active');
        } else {
            const filename = `${data.quotationNo.replace(/[\/\\?%*:|"<>]/g, '_')}_Quotation.pdf`;
            doc.save(filename);
            showToast(`Downloaded: ${filename}`, 'success');
        }
    } catch (err) {
        console.error('PDF generation error:', err);
        showToast('Failed to load PDF library. Please check your network.', 'error');
    }
}

function closePdfModal() {
    document.getElementById('modal-pdf-preview').classList.remove('active');
    document.getElementById('pdf-preview-frame').src = '';
}

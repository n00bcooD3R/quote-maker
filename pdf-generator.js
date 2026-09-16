/**
 * STDA Project & Materials Quote PDF Generator
 * Powered by jsPDF & jspdf-autotable
 */

let stda_logo_base64 = null;

// Pre-load the logo as base64
(function loadLogo() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        stda_logo_base64 = canvas.toDataURL('image/png');
    };
    img.src = 'header_img_0_0.png';
})();

/**
 * Main PDF Generation function
 * @param {Object} data - Collected form data
 * @returns {jsPDF} doc - Prepared jsPDF document
 */
function generateQuotePDF(data) {
    const jsPDFClass = window.jsPDF || (window.jspdf && window.jspdf.jsPDF) || window.jspdf;
    if (!jsPDFClass) {
        alert('jsPDF library is loading or unavailable. Please check your internet connection or reload.');
        throw new Error('jsPDF library is not defined on window object');
    }
    const doc = new jsPDFClass('p', 'mm', 'a4');
    
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    // Color definitions
    const navy = [31, 83, 121];       // #1F5379
    const darkGray = [40, 40, 40];
    const lightBg = [245, 247, 250];
    const borderGray = [200, 200, 200];
    const black = [0, 0, 0];

    let y = margin;

    // Helper functions
    function setFont(style = 'normal', size = 10) {
        doc.setFontSize(size);
        if (style === 'bold') doc.setFont('helvetica', 'bold');
        else if (style === 'italic') doc.setFont('helvetica', 'italic');
        else if (style === 'bolditalic') doc.setFont('helvetica', 'bolditalic');
        else doc.setFont('helvetica', 'normal');
    }

    function setColor(rgb) {
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    }

    function checkPageBreak(neededHeight = 20) {
        if (y + neededHeight > pageHeight - 20) {
            doc.addPage();
            y = margin + 15; // Space for header on new page
            drawHeader(false);
        }
    }

    function fmtMoney(amt) {
        if (isNaN(amt)) return '0.00';
        return amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ================= HEADER =================
    function drawHeader(isFirstPage = true) {
        let curY = isFirstPage ? margin : margin;

        // Logo
        if (stda_logo_base64) {
            try {
                doc.addImage(stda_logo_base64, 'PNG', margin, curY, 16, 14);
            } catch (e) {
                console.warn('Could not add logo image:', e);
            }
        }

        // Company Name & Subtitle
        setFont('bold', 14);
        setColor(navy);
        doc.text('SensoTech Design And Automation', margin + 18, curY + 5);

        setFont('italic', 9);
        setColor([100, 100, 100]);
        doc.text('Excellence in Automation solutions', margin + 18, curY + 10);

        // Address line
        setFont('normal', 8);
        setColor(darkGray);
        const addressLine = 'No 20 Suprabathnagara, Karihobanahalli, Thigalarapalya Main Road, Peenya Industrial Area Bengaluru, Karnataka 560058';
        doc.text(addressLine, margin, curY + 18);

        // Thin separator line
        doc.setDrawColor(navy[0], navy[1], navy[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, curY + 21, pageWidth - margin, curY + 21);

        if (isFirstPage) {
            y = curY + 28;
        }
    }

    drawHeader(true);

    // ================= DOCUMENT TITLE =================
    setFont('bold', 14);
    setColor(navy);
    doc.text('Quotation', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Date & Ref No row
    setFont('bold', 9.5);
    setColor(black);
    doc.text(`Date: ${data.date || ''}`, margin, y);
    doc.text(`Ref. No: ${data.quotationNo || ''}`, pageWidth - margin, y, { align: 'right' });
    y += 7;

    // Recipient Details ("To,")
    setFont('bold', 9.5);
    doc.text('To,', margin, y);
    y += 5;

    setFont('bold', 10);
    doc.text(data.customerName || '', margin, y);
    y += 5;

    if (data.customerAddress) {
        setFont('normal', 9);
        const splitAddr = doc.splitTextToSize(data.customerAddress, 120);
        doc.text(splitAddr, margin, y);
        y += (splitAddr.length * 4.5);
    }
    y += 3;

    // Kind Attention (if present)
    if (data.kindAttention) {
        setFont('bold', 9.5);
        setColor(navy);
        doc.text(`Kind Attention : ${data.kindAttention}`, margin, y);
        y += 6;
    }

    // Subject
    if (data.subject) {
        setFont('bold', 10);
        setColor(black);
        const subjText = `Subject: ${data.subject}`;
        const splitSubj = doc.splitTextToSize(subjText, contentWidth);
        doc.text(splitSubj, margin, y);
        y += (splitSubj.length * 5) + 3;
    }

    // Salutation & Opening Letter
    if (data.salutation) {
        setFont('normal', 9.5);
        doc.text(data.salutation, margin, y);
        y += 5;
    }

    if (data.openingText) {
        setFont('normal', 9);
        const splitOpen = doc.splitTextToSize(data.openingText, contentWidth);
        doc.text(splitOpen, margin, y);
        y += (splitOpen.length * 4.5) + 6;
    }

    // ================= PROJECT MODE TECHNICAL PROPOSAL =================
    if (data.mode === 'project' && data.technicalProposalText) {
        checkPageBreak(25);
        setFont('bold', 10.5);
        setColor(navy);
        doc.text('1. Technical Proposal', margin, y);
        y += 6;

        setFont('normal', 9);
        setColor(black);
        const splitTech = doc.splitTextToSize(data.technicalProposalText, contentWidth);
        doc.text(splitTech, margin, y);
        y += (splitTech.length * 4.5) + 8;
    }

    // ================= COSTING TABLE =================
    checkPageBreak(30);

    setFont('bold', 10.5);
    setColor(navy);
    const tableSectionTitle = data.mode === 'project' ? '2. Costing' : 'Costing :';
    doc.text(tableSectionTitle, margin, y);
    y += 5;

    // Build Table Columns & Rows
    const isProject = data.mode === 'project';
    const tableHead = isProject
        ? [['SL No', 'Description', 'Qty', 'Unit Price (₹)', 'Total Price (₹)']]
        : [['SL No', 'Part No', 'Description', 'Qty', 'Unit Price (₹)', 'Total Price (₹)']];

    const tableRows = data.items.map((item, idx) => {
        const total = (item.qty || 0) * (item.unitPrice || 0);
        if (isProject) {
            return [
                idx + 1,
                item.description || '',
                item.qty || 1,
                fmtMoney(item.unitPrice || 0),
                fmtMoney(total)
            ];
        } else {
            return [
                idx + 1,
                item.partNo || '',
                item.description || '',
                item.qty || 1,
                fmtMoney(item.unitPrice || 0),
                fmtMoney(total)
            ];
        }
    });

    const colWidths = isProject
        ? { 0: { cellWidth: 16 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 16, halign: 'center' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 34, halign: 'right' } }
        : { 0: { cellWidth: 14 }, 1: { cellWidth: 32 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 14, halign: 'center' }, 4: { cellWidth: 28, halign: 'right' }, 5: { cellWidth: 32, halign: 'right' } };

    doc.autoTable({
        startY: y,
        head: tableHead,
        body: tableRows,
        margin: { left: margin, right: margin },
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 3,
            lineColor: [180, 180, 180],
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: navy,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: colWidths,
        didDrawPage: function (data) {
            y = data.cursor.y;
        }
    });

    y = doc.previousAutoTable.finalY + 6;

    // Subtotal & GST Calculation Breakdown
    const subtotal = data.items.reduce((s, i) => s + ((i.qty || 0) * (i.unitPrice || 0)), 0);
    let gstAmt = 0;
    let totalAmt = subtotal;

    if (data.gstMode === 'extra_18') {
        gstAmt = subtotal * 0.18;
        totalAmt = subtotal + gstAmt;
    } else if (data.gstMode === 'included_18') {
        gstAmt = subtotal - (subtotal / 1.18);
        totalAmt = subtotal;
    }

    if (data.gstMode !== 'none') {
        checkPageBreak(25);
        const sumX = pageWidth - margin - 80;
        setFont('normal', 9);
        setColor(black);
        doc.text(`Subtotal:`, sumX, y);
        doc.text(`₹ ${fmtMoney(subtotal)}`, pageWidth - margin, y, { align: 'right' });
        y += 5;

        doc.text(`GST (18%):`, sumX, y);
        doc.text(`₹ ${fmtMoney(gstAmt)}`, pageWidth - margin, y, { align: 'right' });
        y += 5;

        setFont('bold', 10);
        setColor(navy);
        doc.text(`Total Amount:`, sumX, y);
        doc.text(`₹ ${fmtMoney(totalAmt)}`, pageWidth - margin, y, { align: 'right' });
        y += 8;
    }

    // ================= PROJECT MODE COMPLIANCE & DEVIATION =================
    if (data.mode === 'project' && data.complianceText) {
        checkPageBreak(25);
        setFont('bold', 10.5);
        setColor(navy);
        doc.text('3. Compliance & Deviation', margin, y);
        y += 6;

        setFont('normal', 9);
        setColor(black);
        const splitComp = doc.splitTextToSize(data.complianceText, contentWidth);
        doc.text(splitComp, margin, y);
        y += (splitComp.length * 4.5) + 8;
    }

    // ================= COMMERCIAL TERMS & CONDITIONS =================
    checkPageBreak(35);
    setFont('bold', 10.5);
    setColor(navy);
    const termsHeading = data.mode === 'project' ? '4. COMMERCIAL TERMS & CONDITIONS' : 'Commercial Terms & Conditions:';
    doc.text(termsHeading, margin, y);
    y += 6;

    setFont('normal', 9);
    setColor(black);

    const termsList = [];
    if (data.termsPayment) termsList.push(`1) TERMS OF PAYMENT: ${data.termsPayment}`);
    if (data.termsTaxes) termsList.push(`2) TAXES & DUTIES: ${data.termsTaxes}`);
    if (data.termsCommissioning) termsList.push(`3) COMMISSIONING: ${data.termsCommissioning}`);
    if (data.termsDelivery) termsList.push(`4) DELIVERY: ${data.termsDelivery}`);
    if (data.termsValidity) termsList.push(`5) VALIDITY: ${data.termsValidity}`);
    if (data.termsFreight) termsList.push(`6) FREIGHT / TRANSPORTATION: ${data.termsFreight}`);

    termsList.forEach(t => {
        checkPageBreak(10);
        const splitT = doc.splitTextToSize(t, contentWidth);
        doc.text(splitT, margin, y);
        y += (splitT.length * 4.5) + 1.5;
    });

    y += 4;

    // ================= BANK ACCOUNT DETAILS & PO ADDRESS =================
    if (data.bankName || data.bankAccount) {
        checkPageBreak(35);
        
        // Bank details box
        doc.setDrawColor(navy[0], navy[1], navy[2]);
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(margin, y, contentWidth, 24, 'FD');

        setFont('bold', 9.5);
        setColor(navy);
        doc.text('Account Details:', margin + 4, y + 5);

        setFont('normal', 8.5);
        setColor(black);
        doc.text(`Bank : ${data.bankName || ''}`, margin + 4, y + 10);
        doc.text(`Branch : ${data.bankBranch || ''}`, margin + 4, y + 14);
        doc.text(`Account Number : ${data.bankAccount || ''}`, margin + 4, y + 18);
        doc.text(`RTGS/NEFT IFSC : ${data.bankIfsc || ''}`, margin + 4, y + 22);

        y += 30;
    }

    // ================= SIGN-OFF & REGARDS =================
    checkPageBreak(30);

    setFont('bold', 9.5);
    setColor(black);
    doc.text('PO shall be address to:', margin, y);
    y += 5;

    setFont('normal', 9);
    doc.text(data.signatoryCompany || 'SensoTech Design and Automation', margin, y);
    y += 4.5;
    doc.text('No 20, Suprabath Nagar, Karihobanahalli, Thigalaraplya', margin, y);
    y += 4.5;
    doc.text('Peenya Industrial Area, Bengaluru - 560058', margin, y);
    y += 4.5;
    if (data.signatoryEmailGst) {
        doc.text(data.signatoryEmailGst, margin, y);
        y += 6;
    }

    y += 4;
    setFont('bold', 9.5);
    doc.text('Thank You.', margin, y);
    y += 5;

    setFont('normal', 9);
    doc.text('Best Regards,', margin, y);
    y += 4.5;
    setFont('bold', 9.5);
    doc.text(data.signatoryName || 'Bapu Patil', margin, y);
    y += 4.5;
    if (data.signatoryMobile) {
        setFont('normal', 9);
        doc.text(`Mob: ${data.signatoryMobile}`, margin, y);
        y += 5;
    }

    // ================= FOOTER ON ALL PAGES =================
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

        setFont('normal', 7.5);
        setColor([100, 100, 100]);
        const footerText = 'SENSOTECH DESIGN AND AUTOMATION | 20, Suprabhat Nagar, Thigalarapalya, Peenya Industrial Area, Bangalore - 560058 | Tel: +91 8884676895 Email: sales@stda.in';
        doc.text(footerText, margin, pageHeight - 9);

        const pageStr = `Page ${i} of ${totalPages}`;
        doc.text(pageStr, pageWidth - margin, pageHeight - 9, { align: 'right' });
    }

    return doc;
}

// Attach function to global window scope
window.generateQuotePDF = generateQuotePDF;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "")

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }

  return stringValue
}

function escapePdfText(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
}

function wrapPdfText(text, maxCharsPerLine) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean)

  if (!words.length) {
    return [""]
  }

  const lines = []
  let currentLine = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const candidateLine = `${currentLine} ${words[index]}`

    if (candidateLine.length <= maxCharsPerLine) {
      currentLine = candidateLine
    } else {
      lines.push(currentLine)
      currentLine = words[index]
    }
  }

  lines.push(currentLine)
  return lines
}

function formatPdfCurrency(value) {
  return `GHS ${Number(value ?? 0).toFixed(2)}`
}

function formatFilterLine(filters) {
  const parts = []

  if (filters?.startDate || filters?.endDate) {
    parts.push(`Date range: ${filters.startDate || "Any"} to ${filters.endDate || "Any"}`)
  }

  if (filters?.section) {
    parts.push(`Store section: ${filters.section}`)
  }

  if (filters?.search) {
    parts.push(`Search: ${filters.search}`)
  }

  return parts.length ? parts.join(" | ") : "Filters: None applied"
}

function downloadBlob(filename, blob) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = objectUrl
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 1000)
}

function buildPrintMarkup({
  title,
  subtitle,
  filters,
  statCards,
  paymentSummary,
  paymentSummaryTotal,
  tableRows,
}) {
  const filterLine = formatFilterLine(filters)
  const summaryCardsMarkup = statCards
    .map(
      (card) => `
        <article class="summary-card">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <em>${escapeHtml(card.delta)}</em>
        </article>
      `
    )
    .join("")

  const paymentMarkup = paymentSummary.length
    ? `
      <div class="payments-list">
        ${paymentSummary
          .map(
            (payment) => `
              <div class="payment-row">
                <div>
                  <strong>${escapeHtml(payment.method)}</strong>
                  <p>${escapeHtml(
                    `${payment.transactions} transactions, change ${payment.changeGiven}`
                  )}</p>
                </div>
                <span>${escapeHtml(payment.amountPaid)}</span>
              </div>
            `
          )
          .join("")}
        <div class="payment-total">Total Collected: ${escapeHtml(paymentSummaryTotal)}</div>
      </div>
    `
    : "<p class=\"empty-copy\">No successful payment summary data available yet.</p>"

  const tableBodyMarkup = tableRows.length
    ? tableRows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.productId)}</td>
              <td>${escapeHtml(row.product)}</td>
              <td>${escapeHtml(row.sku)}</td>
              <td>${escapeHtml(row.currentPrice)}</td>
              <td>${escapeHtml(row.quantitySold)}</td>
              <td>${escapeHtml(row.revenue)}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="6" class="empty-copy">No product performance data available yet.</td>
      </tr>
    `

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            font-family: Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
          }
          .report-sheet {
            display: grid;
            gap: 24px;
          }
          .report-header h1 {
            margin: 0 0 8px;
            font-size: 28px;
          }
          .report-header p {
            margin: 0;
            color: #5b6773;
            font-size: 14px;
            line-height: 1.5;
          }
          .filter-line {
            margin-top: 12px;
            font-size: 12px;
            color: #6b7280;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
          }
          .summary-card,
          .panel {
            border: 1px solid #dce3ea;
            border-radius: 16px;
            padding: 16px;
            background: #ffffff;
          }
          .summary-card span {
            display: block;
            color: #5b6773;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .summary-card strong {
            display: block;
            margin: 12px 0 8px;
            font-size: 24px;
          }
          .summary-card em {
            color: #15803d;
            font-style: normal;
            font-size: 12px;
            font-weight: 700;
          }
          .panel h2 {
            margin: 0 0 8px;
            font-size: 18px;
          }
          .panel-subtitle {
            margin: 0 0 16px;
            color: #5b6773;
            font-size: 13px;
          }
          .payments-list {
            display: grid;
            gap: 10px;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 12px 0;
            border-top: 1px solid #edf1f5;
          }
          .payment-row:first-child {
            border-top: none;
            padding-top: 0;
          }
          .payment-row strong,
          .payment-row span,
          .payment-total {
            font-size: 14px;
            font-weight: 700;
          }
          .payment-row p,
          .empty-copy {
            margin: 4px 0 0;
            color: #5b6773;
            font-size: 13px;
          }
          .payment-total {
            margin-top: 8px;
            padding-top: 12px;
            border-top: 1px solid #edf1f5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th,
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #edf1f5;
            text-align: left;
            vertical-align: top;
            font-size: 13px;
          }
          th {
            color: #4b5563;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <main class="report-sheet">
          <header class="report-header">
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(subtitle)}</p>
            <div class="filter-line">${escapeHtml(filterLine)}</div>
          </header>

          <section class="summary-grid">${summaryCardsMarkup}</section>

          <section class="panel">
            <h2>Payment Summary</h2>
            <p class="panel-subtitle">Successful payment summary data for the active filters.</p>
            ${paymentMarkup}
          </section>

          <section class="panel">
            <h2>Product Performance</h2>
            <p class="panel-subtitle">Top-selling products based on the currently filtered report data.</p>
            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Price</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>${tableBodyMarkup}</tbody>
            </table>
          </section>
        </main>
      </body>
    </html>
  `
}

export function printReport(reportData) {
  const markup = buildPrintMarkup(reportData)
  const iframe = document.createElement("iframe")

  iframe.setAttribute("aria-hidden", "true")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  iframe.style.visibility = "hidden"

  const cleanup = () => {
    iframe.remove()
  }

  iframe.onload = () => {
    const printWindow = iframe.contentWindow

    if (!printWindow) {
      cleanup()
      return
    }

    const afterPrintHandler = () => {
      printWindow.removeEventListener("afterprint", afterPrintHandler)
      cleanup()
    }

    printWindow.addEventListener("afterprint", afterPrintHandler)
    printWindow.focus()
    printWindow.print()

    window.setTimeout(() => {
      cleanup()
    }, 1000)
  }

  document.body.append(iframe)

  const printDocument = iframe.contentDocument

  if (!printDocument) {
    cleanup()
    return
  }

  printDocument.open()
  printDocument.write(markup)
  printDocument.close()
}

export function exportRowsToCsv({ filename, headers, rows }) {
  const csvContent = [headers.join(","), ...rows.map((row) => row.map(escapeCsvValue).join(","))].join("\n")

  downloadBlob(filename, new Blob([csvContent], { type: "text/csv;charset=utf-8;" }))
}

function createPdfDocument(pages) {
  const objects = []
  const encoder = new TextEncoder()

  const addObject = (content) => {
    objects.push(content)
    return objects.length
  }

  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

  const pageIds = pages.map((page) => {
    const stream = page.join("\n")
    const streamLength = encoder.encode(stream).length
    const contentId = addObject(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`)

    return addObject(
      `<< /Type /Page /Parent ${pages.length * 2 + 3} 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> >>`
    )
  })

  const pagesId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`)
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  let pdf = "%PDF-1.4\n"
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = encoder.encode(pdf).length

  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([encoder.encode(pdf)], { type: "application/pdf" })
}

export function exportReportToPdf({
  filename,
  title,
  subtitle,
  filters,
  statCards,
  paymentSummary,
  paymentSummaryTotal,
  pdfPaymentSummaryTotal,
  tableRows,
}) {
  const pageWidth = 595
  const pageHeight = 842
  const margin = 40
  const usableWidth = pageWidth - margin * 2
  const baseFontSize = 11
  const lineHeight = 16
  const maxCharsPerLine = Math.floor(usableWidth / (baseFontSize * 0.52))
  const pages = [[]]
  let currentPageIndex = 0
  let currentY = pageHeight - margin

  const ensureSpace = (requiredHeight) => {
    if (currentY - requiredHeight < margin) {
      pages.push([])
      currentPageIndex += 1
      currentY = pageHeight - margin
    }
  }

  const addTextLine = (text, options = {}) => {
    const { font = "F1", fontSize = baseFontSize } = options
    const safeText = escapePdfText(text)
    pages[currentPageIndex].push(`BT /${font} ${fontSize} Tf ${margin} ${currentY} Td (${safeText}) Tj ET`)
    currentY -= options.lineHeight ?? lineHeight
  }

  const addWrappedText = (text, options = {}) => {
    const fontSize = options.fontSize ?? baseFontSize
    const calculatedMaxChars = Math.floor(usableWidth / (fontSize * 0.52))
    const lines = wrapPdfText(text, calculatedMaxChars || maxCharsPerLine)
    ensureSpace(lines.length * (options.lineHeight ?? lineHeight))

    lines.forEach((line) => {
      addTextLine(line, options)
    })
  }

  addTextLine(title, { font: "F2", fontSize: 18, lineHeight: 24 })
  addWrappedText(subtitle, { fontSize: 11 })
  addWrappedText(formatFilterLine(filters), { fontSize: 10, lineHeight: 14 })
  currentY -= 10

  addTextLine("Summary", { font: "F2", fontSize: 14, lineHeight: 20 })

  statCards.forEach((card) => {
    addWrappedText(`${card.label}: ${card.value} (${card.delta})`, { fontSize: 11 })
  })

  currentY -= 8
  addTextLine("Payment Summary", { font: "F2", fontSize: 14, lineHeight: 20 })

  if (paymentSummary.length) {
    paymentSummary.forEach((payment) => {
      addWrappedText(
        `${payment.method}: ${payment.pdfAmountPaid ?? payment.amountPaid} | ${payment.transactions} transactions | Change ${payment.pdfChangeGiven ?? payment.changeGiven}`,
        { fontSize: 11 }
      )
    })
    addWrappedText(`Total Collected: ${pdfPaymentSummaryTotal ?? paymentSummaryTotal}`, {
      font: "F2",
      fontSize: 11,
    })
  } else {
    addWrappedText("No successful payment summary data available yet.", { fontSize: 11 })
  }

  currentY -= 8
  addTextLine("Product Performance", { font: "F2", fontSize: 14, lineHeight: 20 })
  addWrappedText("Product ID | Product | SKU | Current Price | Quantity Sold | Revenue", {
    font: "F2",
    fontSize: 10,
    lineHeight: 14,
  })

  if (tableRows.length) {
    tableRows.forEach((row) => {
      addWrappedText(
        `${row.productId} | ${row.product} | ${row.sku} | ${row.pdfCurrentPrice ?? row.currentPrice} | ${row.quantitySold} | ${row.pdfRevenue ?? row.revenue}`,
        { fontSize: 10, lineHeight: 14 }
      )
    })
  } else {
    addWrappedText("No product performance data available yet.", { fontSize: 11 })
  }

  const pdfBlob = createPdfDocument(pages)
  downloadBlob(filename, pdfBlob)
}

export function buildReportExportData({
  title,
  subtitle,
  filters,
  statCards,
  paymentSummary,
  paymentSummaryTotal,
  productPerformance,
  formatCurrency,
}) {
  return {
    title,
    subtitle,
    filters,
    statCards: statCards.map((card) => ({
      label: card.label,
      value: card.value,
      delta: card.delta,
    })),
    paymentSummary: paymentSummary.map((payment) => ({
      method: payment.method.replaceAll("_", " "),
      transactions: payment.transactions ?? 0,
      changeGiven: formatCurrency(payment.totalChangeGiven ?? 0),
      amountPaid: formatCurrency(payment.totalAmountPaid ?? 0),
      pdfChangeGiven: formatPdfCurrency(payment.totalChangeGiven ?? 0),
      pdfAmountPaid: formatPdfCurrency(payment.totalAmountPaid ?? 0),
    })),
    paymentSummaryTotal: formatCurrency(paymentSummaryTotal),
    pdfPaymentSummaryTotal: formatPdfCurrency(paymentSummaryTotal),
    tableRows: productPerformance.map((row) => ({
      productId: `#${row.productId}`,
      product: row.name ?? "Unknown Product",
      sku: row.sku ?? "N/A",
      currentPrice: formatCurrency(row.currentPrice ?? 0),
      quantitySold: String(row.quantitySold ?? 0),
      revenue: formatCurrency(row.revenue ?? 0),
      pdfCurrentPrice: formatPdfCurrency(row.currentPrice ?? 0),
      pdfRevenue: formatPdfCurrency(row.revenue ?? 0),
    })),
  }
}

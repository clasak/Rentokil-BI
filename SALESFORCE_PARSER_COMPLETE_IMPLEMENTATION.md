# Salesforce Quote Parser & Start Packet - Complete Implementation Guide

This document contains **all code and logic** needed to implement Salesforce PDF quote parsing and Start Packet generation in any dashboard. Copy the code sections directly into your project.

---

## Table of Contents

1. [Overview & Workflow](#1-overview--workflow)
2. [Client-Side: PDF.js Setup & Text Extraction](#2-client-side-pdfjs-setup--text-extraction)
3. [Server-Side: Complete Parser (Apps Script ES5)](#3-server-side-complete-parser-apps-script-es5)
4. [Client-Side: Fallback Parser (JavaScript ES6)](#4-client-side-fallback-parser-javascript-es6)
5. [Form Auto-Fill Logic](#5-form-auto-fill-logic)
6. [Start Packet Data Structure](#6-start-packet-data-structure)
7. [Database Save Function](#7-database-save-function)
8. [Operations Email Notification](#8-operations-email-notification)
9. [Helper Functions Reference](#9-helper-functions-reference)
10. [Testing & Validation](#10-testing--validation)

---

## 1. Overview & Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE WORKFLOW DIAGRAM                         │
└─────────────────────────────────────────────────────────────────────┘

USER UPLOADS PDF
      │
      ▼
┌─────────────────────┐
│ 1. PDF.js extracts  │ ← Client-side (browser)
│    text from PDF    │
│    (Y-sorted for    │
│    correct order)   │
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ 2. Parser extracts  │ ← Server-side (Apps Script) OR Client fallback
│    structured data: │
│    - Account info   │
│    - Equipment      │
│    - Pricing        │
│    - Services       │
│    - Pests          │
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ 3. Form auto-fills  │ ← Client-side (JavaScript)
│    with parsed data │
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ 4. User reviews &   │ ← User interaction
│    clicks "Mark     │
│    Sold"            │
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ 5. Save to database │ ← Server-side (Apps Script)
│    + Send Ops email │
│    + Generate Start │
│    Packet           │
└─────────────────────┘
```

---

## 2. Client-Side: PDF.js Setup & Text Extraction

### 2.1 Include PDF.js Library

Add these script tags to your HTML `<head>`:

```html
<!-- PDF.js CDN -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
</script>
```

### 2.2 File Input HTML

```html
<input type="file" id="salesforceQuoteFile" accept=".pdf" onchange="handleSalesforceQuoteFile(event)">
<button onclick="processSalesforceQuote()">Import Quote</button>
<span id="importStatus">No file selected.</span>
```

### 2.3 PDF Text Extraction Function (CRITICAL)

This function sorts text by Y-coordinate to preserve visual reading order. **This is essential** because Salesforce PDFs have multi-column layouts.

```javascript
/**
 * Extract text from PDF file with correct visual reading order.
 * CRITICAL: Sorts by Y-coordinate first to prevent column headers
 * from merging into body text.
 *
 * @param {File} file - PDF file from input element
 * @return {Promise<string>} Extracted text with correct line breaks
 */
async function extractTextFromPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    if (content.items.length === 0) continue;

    // CRITICAL: Sort by Y (vertical) then X (horizontal) for visual reading order
    // PDF coordinates start at bottom-left, so higher Y = earlier in document
    const items = content.items.map(item => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      h: item.height || item.transform[3]
    })).sort((a, b) => {
      // If Y difference > 5, consider it a new line
      if (Math.abs(a.y - b.y) > 5) return b.y - a.y; // Higher Y first (top to bottom)
      return a.x - b.x; // Left to right within same line
    });

    let pageText = '';
    let lastY = items[0].y;

    for (let j = 0; j < items.length; j++) {
      const item = items[j];

      // Insert newline if Y changes significantly
      if (Math.abs(item.y - lastY) > 5) {
        pageText += '\n';
      } else if (j > 0) {
        pageText += ' '; // Space between words on same line
      }

      pageText += item.str;
      lastY = item.y;
    }

    text += pageText + '\n\n'; // Double newline between pages
  }

  return text;
}
```

### 2.4 Process Quote Handler

```javascript
var salesforceQuoteFile = null;

function handleSalesforceQuoteFile(event) {
  salesforceQuoteFile = event.target.files && event.target.files.length
    ? event.target.files[0]
    : null;

  document.getElementById('importStatus').textContent = salesforceQuoteFile
    ? 'Selected: ' + salesforceQuoteFile.name
    : 'No file selected.';
}

async function processSalesforceQuote() {
  if (!salesforceQuoteFile) {
    alert('Please select a Salesforce quote PDF.');
    return;
  }

  if (!window.pdfjsLib) {
    alert('PDF parser library not available.');
    return;
  }

  try {
    document.getElementById('importStatus').textContent = 'Extracting PDF text...';
    const text = await extractTextFromPdfFile(salesforceQuoteFile);

    // Store for debugging
    window.__lastSalesforceQuoteText = text;
    console.log('[SF Parser] Extracted text preview:', (text || '').slice(0, 2000));

    document.getElementById('importStatus').textContent = 'Parsing quote details...';

    // Try server-side parser first, fall back to client-side
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(function(draft) {
          applyStartPacketDraft(draft);
          alert('Salesforce quote imported. Review and click Mark Sold.');
        })
        .withFailureHandler(function(error) {
          document.getElementById('importStatus').textContent = 'Failed: ' + error.message;
          // Fall back to client-side parser
          const fallbackDraft = clientParseSalesforceQuote(text);
          applyStartPacketDraft(fallbackDraft);
          alert('Quote imported (client parser). Review and click Mark Sold.');
        })
        .parseSalesforceQuoteTextToStartPacketDraft(text);
    } else {
      // No Apps Script - use client-side parser
      const draft = clientParseSalesforceQuote(text);
      applyStartPacketDraft(draft);
      alert('Quote imported. Review and click Mark Sold.');
    }
  } catch (err) {
    document.getElementById('importStatus').textContent = 'Failed: ' + err.message;
    alert('Unable to extract PDF: ' + err.message);
  }
}
```

---

## 3. Server-Side: Complete Parser (Apps Script ES5)

This is the **complete server-side parser**. Copy this entire file to your Apps Script project.

### 3.1 Constants & Patterns

```javascript
/**
 * Salesforce Quote Parser - Complete Implementation
 * Parses Salesforce quote PDFs into StartPacketDraft objects
 *
 * IMPORTANT: All code uses ES5 syntax for Apps Script compatibility
 */

// Section terminators - stop reading when these are found
var HEADER_BLOCK_TERMINATORS = [
  'prepared by',
  'equipment',
  'total cost of equipment',
  'investment summary',
  'covered pests',
  'scope of service',
  'service specifications',
  'service frequency',
  'plan limitations',
  'documentation',
  'terms & conditions',
  'about presto-x',
  'table of contents'
];

var ROUTINE_SECTION_TERMINATORS = [
  'investment summary',
  'plan limitations',
  'scope of service',
  'equipment summary',
  'covered pests',
  'timeline',
  'requested start date',
  'about presto-x',
  'innovation & technology'
];

// Regex patterns
var ADDRESS_LINE_REGEX = /^[0-9].*(?:\b(?:st|street|rd|road|dr|drive|ln|lane|blvd|boulevard|ave|avenue|hwy|highway|way|trail|trl|terrace|ter|pkwy|parkway|court|ct|cir|circle|loop|suite|ste|unit)\b)/i;
var CITY_STATE_ZIP_REGEX = /^(.+?),\s*([A-Z]{2})[,\s]*([0-9]{5})(?:-?[0-9]{4})?/;
var EMAIL_REGEX = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;
var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
```

### 3.2 Main Parser Function

```javascript
/**
 * Main entry point - parses Salesforce quote text into StartPacketDraft
 * @param {string} text - Raw text extracted from PDF
 * @return {Object} StartPacketDraft object
 */
function parseSalesforceQuoteTextToStartPacketDraft(text) {
  if (!text) {
    throw new Error('No PDF text provided for parsing.');
  }

  // 1. NORMALIZE TEXT
  var normalized = text.replace(/\r\n/g, '\n');
  var rawLines = normalized.split('\n');
  var trimmedLines = rawLines.map(function(line) {
    return (line || '').trim();
  }).filter(function(line) {
    return line.length > 0;
  });

  // 2. EXPAND MERGED LINES (handles PDF column merging issues)
  var lines = expandLines(trimmedLines);

  if (!lines.length) {
    throw new Error('Unable to parse PDF text (no content).');
  }

  // 3. EXTRACT ALL SECTIONS
  var header = extractPreparedForFields(lines);           // Account, contact, address
  var preparedBy = extractPreparedBySection(lines);       // AE name and email
  var equipmentInfo = extractEquipmentSection(lines);     // MRT, RBS, ILT counts
  var pricing = extractPricing(lines);                    // One-time, initial, monthly
  var schedule = extractRequestedStart(lines);            // Start date and month
  var routine = extractRoutineServices(lines, equipmentInfo.equipment);
  var explicitPests = extractCoveredPestsSection(lines);
  var derivedPests = deriveCoveredPests(explicitPests, routine.signals, equipmentInfo.equipment);

  // 4. CALCULATE FINANCIALS
  var oneTimeCost = pricing.oneTimeCost !== null ? pricing.oneTimeCost : equipmentInfo.totalCost;
  var initialSvcCost = pricing.initialSvcCost;
  var monthlyCost = pricing.avgMonthlyCost;
  var annualCost = monthlyCost !== null ? roundCurrency(monthlyCost * 12) : null;

  // Combined Initial = Equipment One-Time + Initial Service Cost
  var combinedInitial = null;
  if (oneTimeCost !== null || initialSvcCost !== null) {
    var oneTime = oneTimeCost !== null ? oneTimeCost : 0;
    var initial = initialSvcCost !== null ? initialSvcCost : 0;
    combinedInitial = roundCurrency(oneTime + initial);
  }

  // 5. BUILD EQUIPMENT SUMMARY STRING
  var equipmentSummary = buildEquipmentSignature(equipmentInfo.equipment);
  equipmentInfo.equipment.summary = equipmentSummary;

  // 6. DETERMINE JOB TYPE
  var jobType = monthlyCost !== null && monthlyCost > 0 ? 'Contract' : null;

  // 7. GENERATE AUTO-DESCRIPTIONS
  var autoInitialDesc = buildInitialDescription(equipmentInfo.equipment, initialSvcCost);
  var autoMaintenanceDesc = buildMaintenanceDescription(routine.services);

  // 8. GENERATE SRA TIMESTAMP
  var now = new Date();
  var sraDate = now.toISOString().split('T')[0];
  var sraTime = now.toTimeString().split(' ')[0].substring(0, 5);

  // 9. DEFAULT SRA HAZARDS
  var defaultSraHazards = [
    { hazard: 'Slippery or uneven surfaces', control: 'Wear appropriate footwear', safeToProceed: true },
    { hazard: 'Overhead hazards (pipes, low ceilings)', control: 'Watch for head clearance', safeToProceed: true },
    { hazard: 'Working at heights (ladders, platforms)', control: 'Use proper ladder safety', safeToProceed: true },
    { hazard: 'Chemicals or hazardous materials present', control: 'Follow safety data sheets', safeToProceed: true },
    { hazard: 'Electrical hazards', control: 'Avoid contact with electrical equipment', safeToProceed: true },
    { hazard: 'Poor lighting in service areas', control: 'Use flashlight/headlamp', safeToProceed: true }
  ];

  // 10. BUILD FULL SERVICE ADDRESS
  var fullServiceAddress = header.serviceAddressLine1 || '';
  if (header.serviceCity || header.serviceState || header.serviceZip) {
    var cityStateZip = [header.serviceCity, header.serviceState, header.serviceZip].filter(Boolean).join(', ');
    if (cityStateZip) {
      fullServiceAddress += (fullServiceAddress ? ', ' : '') + cityStateZip;
    }
  }

  // Build billing address if different
  var fullBillingAddress = '';
  var billingAddressDifferent = false;
  if (header.billingAddressLine1) {
    fullBillingAddress = header.billingAddressLine1;
    if (header.billingCity || header.billingState || header.billingZip) {
      var billingCityStateZip = [header.billingCity, header.billingState, header.billingZip].filter(Boolean).join(', ');
      if (billingCityStateZip) {
        fullBillingAddress += (fullBillingAddress ? ', ' : '') + billingCityStateZip;
      }
    }
    billingAddressDifferent = true;
  }

  // 11. ASSEMBLE FINAL DRAFT OBJECT
  var draft = {
    // Account & Contact
    accountName: header.accountName,
    contactName: header.contactName,
    contactEmail: header.contactEmail,

    // Service Address
    serviceAddressLine1: header.serviceAddressLine1,
    serviceCity: header.serviceCity,
    serviceState: header.serviceState,
    serviceZip: header.serviceZip,
    serviceAddress: fullServiceAddress,

    // AE Information
    aeName: preparedBy.aeName,
    aeEmail: preparedBy.aeEmail,
    branchId: 'BRN-001',

    // Job Classification
    jobType: jobType,
    leadType: 'Inbound',
    serviceType: null,

    // Services & Equipment
    services: routine.services,
    equipment: equipmentInfo.equipment,

    // Pricing
    equipmentOneTimeTotal: oneTimeCost,
    servicesInitialTotal: initialSvcCost,
    combinedInitialTotal: combinedInitial,
    servicesMonthlyTotal: monthlyCost,
    combinedMonthlyTotal: monthlyCost,
    servicesAnnualTotal: annualCost,
    combinedAnnualTotal: annualCost,
    monthlyCost: monthlyCost,
    annualCost: annualCost,

    // Schedule
    requestedStartDate: schedule.requestedStartDate,
    startMonth: schedule.startMonth,

    // Pests
    coveredPests: derivedPests,

    // Auto-Generated Descriptions
    initialServiceDescription: autoInitialDesc,
    maintenanceScopeDescription: autoMaintenanceDesc,

    // Additional Fields
    logBookNeeded: true,
    pnolRequired: false,

    // Billing
    billingEmail: header.billingEmail || header.contactEmail || '',
    billingAddress: fullBillingAddress,
    billingAddressDifferent: billingAddressDifferent,

    // SRA (Safety Risk Assessment)
    sraCompletedBy: preparedBy.aeName || '',
    sraDate: sraDate,
    sraTime: sraTime,
    sraCompletedAt: now.toISOString(),
    sraAdditionalHazards: 'None',
    sraHazards: defaultSraHazards
  };

  Logger.log(JSON.stringify(draft, null, 2));
  return draft;
}
```

### 3.3 Line Expansion Function

```javascript
/**
 * Expand lines that have multiple logical lines merged together.
 * Handles PDF column merging issues.
 */
function expandLines(inputLines) {
  var result = [];

  inputLines.forEach(function(line) {
    if (!line) return;

    // Split on PREPARED BY: and TAILORED FOR: patterns
    var splitPattern = /(PREPARED\s+BY:|TAILORED\s+FOR:)/i;
    if (splitPattern.test(line)) {
      var parts = line.split(splitPattern);
      var current = '';
      for (var i = 0; i < parts.length; i++) {
        if (splitPattern.test(parts[i])) {
          if (current.trim()) {
            result.push(current.trim());
          }
          current = parts[i];
        } else {
          current += parts[i];
        }
      }
      if (current.trim()) {
        result.push(current.trim());
      }
    }
    // Split very long lines with multiple spaces (columns merged)
    else if (line.length > 200 && /\s{2,}/.test(line)) {
      line.split(/\s{2,}/).forEach(function(part) {
        part = part.trim();
        if (part.length) result.push(part);
      });
    }
    else if (line.length > 140 && /\s{2,}/.test(line)) {
      line.split(/\s{2,}/).forEach(function(part) {
        part = part.trim();
        if (part.length) result.push(part);
      });
    }
    else {
      result.push(line);
    }
  });

  return result;
}
```

### 3.4 Extract Prepared For (Account & Address)

```javascript
/**
 * Extract account name, contact info, and service address.
 * Anchors on "TAILORED FOR:" or "PREPARED FOR:" or "Account Name:"
 */
function extractPreparedForFields(lines) {
  var data = {
    accountName: null,
    contactName: null,
    contactEmail: null,
    billingEmail: null,
    serviceAddressLine1: null,
    serviceCity: null,
    serviceState: null,
    serviceZip: null,
    billingAddressLine1: null,
    billingCity: null,
    billingState: null,
    billingZip: null
  };

  // Find anchor line
  var idx = findFirstIndex(lines, function(line) {
    return isTailoredPreparedAnchor(line) ||
           /account\s+name/i.test(line) ||
           /customer\s+name/i.test(line);
  });

  if (idx === -1) return data;

  // Gather block (next 15 lines or until terminator)
  var block = gatherBlock(lines, idx, isHeaderBlockStop, 15);
  if (!block.length) return data;

  // Sanitize block
  var sanitized = sanitizeHeaderBlock(block);
  if (!sanitized.length) return data;

  // Extract all emails (first = contact, second = billing)
  var emails = findAllEmails(sanitized);
  if (emails.length > 0) {
    data.contactEmail = emails[0];
    data.billingEmail = emails.length > 1 ? emails[1] : emails[0];
  }

  // Remove emails from lines for cleaner parsing
  sanitized = sanitized.map(function(line) {
    return line.replace(EMAIL_REGEX, '').trim();
  }).filter(function(line) {
    return line.length > 0;
  });

  // Expand merged lines
  sanitized = expandMergedHeaderLines(sanitized);

  // Extract account name (first non-email, non-address line)
  var cursor = 0;
  while (cursor < sanitized.length && !data.accountName) {
    var candidate = sanitized[cursor];
    if (looksLikeAccountName(candidate)) {
      data.accountName = candidate;
    }
    cursor++;
  }

  // Extract contact name (looks like "First Last")
  while (cursor < sanitized.length && !data.contactName) {
    var contactCandidate = sanitized[cursor];
    if (looksLikeContactName(contactCandidate)) {
      data.contactName = contactCandidate;
      break;
    }
    cursor++;
  }

  // Extract service address
  for (var i = 0; i < sanitized.length; i++) {
    var line = sanitized[i];
    if (!data.serviceAddressLine1 && ADDRESS_LINE_REGEX.test(line)) {
      var components = extractInlineAddress(line);
      if (components) {
        data.serviceAddressLine1 = components.street || components.raw;
        data.serviceCity = components.city || data.serviceCity;
        data.serviceState = components.state || data.serviceState;
        data.serviceZip = components.zip || data.serviceZip;
      } else {
        data.serviceAddressLine1 = line;
        // Check next line for city/state/zip
        if (i + 1 < sanitized.length) {
          var cityMatch = sanitized[i + 1].match(CITY_STATE_ZIP_REGEX);
          if (cityMatch) {
            data.serviceCity = cityMatch[1].trim();
            data.serviceState = cityMatch[2];
            data.serviceZip = cityMatch[3];
          }
        }
      }
      break;
    }
  }

  return data;
}
```

### 3.5 Extract Equipment Section

```javascript
/**
 * Extract equipment quantities (MRT, RBS, ILT).
 * Anchors on "Total Cost of Equipment" line and works backward.
 */
function extractEquipmentSection(lines) {
  var equipment = {
    rbsQty: 0,
    multCatchQty: 0,
    iltQty: 0,
    otherEquipment: [],
    summary: ''
  };
  var totalCost = null;

  // Find "Total Cost of Equipment" line
  var totalIdx = findFirstIndex(lines, function(line) {
    return /^total\s+cost\s+of\s+equipment/i.test(line);
  });

  if (totalIdx === -1) {
    return { equipment: equipment, totalCost: totalCost };
  }

  // Search backward for equipment table start
  var startIdx = -1;
  for (var back = totalIdx - 1; back >= Math.max(0, totalIdx - 30); back--) {
    var line = lines[back] || '';
    if (/equipment\s+summary/i.test(line)) continue;
    if (/^equipment\b/i.test(line) || /equipment\s+quantity/i.test(line)) {
      startIdx = back;
      break;
    }
  }

  if (startIdx === -1) {
    return { equipment: equipment, totalCost: totalCost };
  }

  var endIdx = totalIdx;

  // Parse equipment lines
  for (var i = startIdx + 1; i < endIdx; i++) {
    var row = lines[i];
    if (!row || isHeaderBlockStop(row)) continue;
    if (/routine\s+management\s+services/i.test(row)) break;
    if (/service\s+frequency/i.test(row)) continue;

    // Strategy 1: Quantity at END of line (most common)
    var qtyMatch = row.match(/([0-9]+(?:\.[0-9]+)?)\s*$/);

    // Strategy 2: Quantity at START of line (fallback)
    if (!qtyMatch) {
      var startMatch = row.match(/^\s*([0-9]+)\s+(.*)/);
      if (startMatch) {
        var qty = parseFloat(startMatch[1]);
        var name = startMatch[2].trim();
        categorizeEquipment(equipment, name, qty);
        continue;
      }
    }

    if (!qtyMatch) continue;

    var qty = parseFloat(qtyMatch[1]);
    if (isNaN(qty)) continue;

    var name = row.slice(0, row.length - qtyMatch[0].length).trim();
    if (!name) continue;

    categorizeEquipment(equipment, name, qty);
  }

  // Extract total cost
  var totalLine = lines[endIdx];
  var parsedTotal = parseFirstCurrency(totalLine);
  if (parsedTotal !== null) {
    totalCost = parsedTotal;
  }

  equipment.summary = buildEquipmentSignature(equipment);
  return { equipment: equipment, totalCost: totalCost };
}

/**
 * Categorize equipment by name keywords
 */
function categorizeEquipment(equipment, name, qty) {
  var lower = name.toLowerCase();

  // Rodent Bait Stations
  if (/bait\s+station|rodent\s+bait|\brbs\b|rodent\s+station/.test(lower) ||
      lower.indexOf('eradico') !== -1) {
    equipment.rbsQty += qty;
    return;
  }

  // Multi-Catch Traps (MRT)
  if (/multicatch|multi-catch|\bmrt\b|mouse\s+trap/.test(lower)) {
    equipment.multCatchQty += qty;
    return;
  }

  // Insect Light Traps (ILT)
  if (/lumnia|insect\s+light\s+trap|\bilt\b|fly\s+light/.test(lower)) {
    equipment.iltQty += qty;
    return;
  }

  // Other equipment
  equipment.otherEquipment.push({ name: name, quantity: qty });
}
```

### 3.6 Extract Pricing

```javascript
/**
 * Extract pricing from Investment Summary section.
 * Looks for: One-Time Cost, Initial Svc Cost, Avg Monthly Cost
 */
function extractPricing(lines) {
  // Find Investment Summary section
  var summaryIdx = findFirstIndex(lines, function(line) {
    if (!line) return false;
    var lower = line.toLowerCase();
    // Skip table of contents entries
    if (/^\d+\s+(investment\s+summary|total\s+investment)/i.test(line)) {
      return false;
    }
    if (/investment\s+summary/i.test(line) && !/^\d+\s+investment/i.test(line)) {
      return true;
    }
    if (/total\s+investment/i.test(lower) && !/^\d+\s+total/i.test(line)) {
      return true;
    }
    return false;
  });

  // If section not found, search entire document
  if (summaryIdx === -1) {
    // Try to find "Total investment" line with all values
    var totalLine = null;
    for (var k = 0; k < lines.length; k++) {
      if (/total\s+investment/i.test(lines[k].toLowerCase())) {
        totalLine = lines[k];
        break;
      }
    }

    if (totalLine) {
      var allCurrencies = [];
      var currencyRegex = /\$([0-9][0-9,]*(?:\.[0-9]{2})?)/g;
      var match;
      while ((match = currencyRegex.exec(totalLine)) !== null) {
        allCurrencies.push(parseFloat(match[1].replace(/,/g, '')));
      }
      if (allCurrencies.length >= 3) {
        return {
          oneTimeCost: allCurrencies[0],
          initialSvcCost: allCurrencies[1],
          avgMonthlyCost: allCurrencies[2]
        };
      }
    }

    // Fallback to individual label search
    return {
      oneTimeCost: findCurrencyAfterLabel(lines, /one[-\s]?time\s+cost/i),
      initialSvcCost: findCurrencyAfterLabel(lines, /initial\s+(?:svc|service)\s+cost/i),
      avgMonthlyCost: findCurrencyAfterLabel(lines, /(?:avg|average)\s+monthly\s+cost/i)
    };
  }

  // Extract from Investment Summary section
  var summaryLines = [];
  var foundTotalInvestment = false;

  for (var i = summaryIdx; i < lines.length && i < summaryIdx + 30; i++) {
    var line = lines[i];
    if (!line) continue;
    var lower = line.toLowerCase();

    if (/total\s+investment/i.test(lower)) {
      summaryLines.push(line);
      foundTotalInvestment = true;
      continue;
    }

    if (i > summaryIdx + 1 && (
      /^(scope|equipment|routine|covered|timeline|requested|about|table)/i.test(lower) ||
      /^page\s+\d+/i.test(lower)
    )) {
      if (!foundTotalInvestment && i < summaryIdx + 15) {
        summaryLines.push(line);
        continue;
      }
      break;
    }
    summaryLines.push(line);
  }

  var oneTimeCost = null;
  var initialSvcCost = null;
  var avgMonthlyCost = null;

  // Try to extract all 3 values from "Total investment" line
  var totalLine = null;
  for (var j = 0; j < summaryLines.length; j++) {
    if (/total\s+investment/i.test(summaryLines[j].toLowerCase())) {
      totalLine = summaryLines[j];
      break;
    }
  }

  if (totalLine) {
    var allCurrencies = [];
    var currencyRegex = /\$([0-9][0-9,]*(?:\.[0-9]{2})?)/g;
    var match;
    while ((match = currencyRegex.exec(totalLine)) !== null) {
      allCurrencies.push(parseFloat(match[1].replace(/,/g, '')));
    }
    if (allCurrencies.length >= 3) {
      oneTimeCost = allCurrencies[0];
      initialSvcCost = allCurrencies[1];
      avgMonthlyCost = allCurrencies[2];
    }
  }

  // Fallback to individual label search
  if (!oneTimeCost) {
    oneTimeCost = findCurrencyAfterLabel(summaryLines, /one[-\s]?time\s+cost/i);
  }
  if (!initialSvcCost) {
    initialSvcCost = findCurrencyAfterLabel(summaryLines, /initial\s+(?:svc|service)\s+cost/i);
  }
  if (!avgMonthlyCost) {
    avgMonthlyCost = findCurrencyAfterLabel(summaryLines, /(?:avg|average)\s+monthly\s+cost/i);
  }

  return {
    oneTimeCost: oneTimeCost,
    initialSvcCost: initialSvcCost,
    avgMonthlyCost: avgMonthlyCost
  };
}
```

### 3.7 Extract Routine Services

```javascript
/**
 * Extract services from Routine Management Services section
 */
function extractRoutineServices(lines, equipment) {
  var idx = findFirstIndex(lines, function(line) {
    return /routine\s+management\s+services/i.test(line);
  });

  if (idx === -1) {
    return buildFallbackServicesFromEquipment(equipment);
  }

  var endIdx = findFirstIndexFrom(lines, idx + 1, function(line) {
    if (!line) return false;
    var lower = line.toLowerCase();
    for (var i = 0; i < ROUTINE_SECTION_TERMINATORS.length; i++) {
      if (lower.indexOf(ROUTINE_SECTION_TERMINATORS[i]) === 0) {
        return true;
      }
    }
    return false;
  });

  if (endIdx === -1) {
    endIdx = lines.length;
  }

  var block = lines.slice(idx + 1, endIdx);
  var signals = createServiceSignals();

  var serviceTemplates = [
    { code: 'GPC', keywords: ['general pest'], serviceName: 'General Pest Control', category: 'GPC', programType: 'General Pest Control', defaultFreq: 'Monthly', defaultPerYear: 12, signal: 'hasGpc' },
    { code: 'MRT', keywords: ['interior monitoring'], serviceName: 'Interior Rodent Monitoring', category: 'Rodent Monitoring', programType: 'Interior Monitoring', defaultFreq: 'Semi-Monthly', defaultPerYear: 24, signal: 'hasRodent' },
    { code: 'RBS', keywords: ['exterior monitoring'], serviceName: 'Exterior Rodent Monitoring', category: 'Rodent Monitoring', programType: 'Exterior Monitoring', defaultFreq: 'Monthly', defaultPerYear: 12, signal: 'hasRodent' },
    { code: 'ILT', keywords: ['insect light trap', 'ilt maintenance', 'light trap maintenance'], serviceName: 'Insect Light Trap Maintenance', category: 'Fly / ILT', programType: 'Insect Light Trap Maintenance', defaultFreq: 'Semi-Monthly', defaultPerYear: 24, signal: 'hasIlt' }
  ];

  var servicesByCode = {};
  var currentCode = null;

  function ensureService(template) {
    if (!servicesByCode[template.code]) {
      servicesByCode[template.code] = createService(template.serviceName, template.code, template.category, template.programType, template.defaultFreq, template.defaultPerYear);
    }
    if (template.signal === 'hasGpc') signals.hasGpc = true;
    if (template.signal === 'hasRodent') signals.hasRodent = true;
    if (template.signal === 'hasIlt') signals.hasIlt = true;
  }

  var iltSemi = false;

  block.forEach(function(line) {
    if (!line) return;
    var lower = line.toLowerCase();
    if (/insect\s+light|ilt/.test(lower) && /semi/.test(lower)) iltSemi = true;

    for (var t = 0; t < serviceTemplates.length; t++) {
      var template = serviceTemplates[t];
      var matched = template.keywords.some(function(keyword) {
        return lower.indexOf(keyword) !== -1;
      });
      if (matched) {
        ensureService(template);
        currentCode = template.code;
        return;
      }
    }

    if (/service\s+frequency/i.test(lower) && currentCode && servicesByCode[currentCode]) {
      var freqLabel = extractFrequencyLabel(line);
      var perYear = extractServicesPerYear(line, freqLabel);
      if (freqLabel) servicesByCode[currentCode].frequencyLabel = freqLabel;
      if (perYear) servicesByCode[currentCode].servicesPerYear = perYear;
    }
  });

  var services = Object.keys(servicesByCode).map(function(code) {
    return servicesByCode[code];
  });

  if (iltSemi) {
    services.forEach(function(svc) {
      if (svc.serviceCode === 'ILT') {
        svc.frequencyLabel = 'Semi-Monthly';
        svc.servicesPerYear = 24;
      }
    });
  }

  if (!services.length) {
    return buildFallbackServicesFromEquipment(equipment);
  }

  // Ensure GPC is always included
  if (!services.some(function(service) { return service.serviceCode === 'GPC'; })) {
    var gpcTemplate = serviceTemplates[0];
    ensureService(gpcTemplate);
    services.push(servicesByCode[gpcTemplate.code]);
  }

  services.sort(function(a, b) {
    return serviceOrder(a.serviceCode) - serviceOrder(b.serviceCode);
  });

  return { services: services, signals: signals };
}

function buildFallbackServicesFromEquipment(equipment) {
  var signals = createServiceSignals();
  var services = [];

  services.push(createService('General Pest Control', 'GPC', 'GPC', 'General Pest Control', 'Monthly', 12));
  signals.hasGpc = true;

  if (equipment && (equipment.multCatchQty > 0 || equipment.rbsQty > 0)) {
    services.push(createService('Interior/Exterior Rodent Monitoring', 'RODENT', 'Rodent Monitoring', 'Rodent Monitoring', 'Monthly', 12));
    signals.hasRodent = true;
  }

  if (equipment && equipment.iltQty > 0) {
    services.push(createService('Insect Light Trap Maintenance', 'ILT', 'Fly / ILT', 'Insect Light Trap Maintenance', 'Semi-Monthly', 24));
    signals.hasIlt = true;
  }

  return { services: services, signals: signals };
}

function createService(name, code, category, programType, freqLabel, perYear) {
  return {
    serviceName: name,
    serviceCode: code,
    category: category,
    programType: programType,
    descriptionText: 'Imported from Routine Management Services',
    frequencyLabel: freqLabel,
    servicesPerYear: perYear,
    afterHours: null,
    initialAmount: null,
    pricePerService: null
  };
}
```

### 3.8 Helper Functions

```javascript
// --- UTILITY FUNCTIONS ---

function roundCurrency(value) {
  if (value === null || value === undefined) return null;
  return Math.round(value * 100) / 100;
}

function formatQuantity(value) {
  if (value === null || value === undefined) return '';
  if (Math.abs(value - Math.round(value)) < 0.00001) {
    return String(Math.round(value));
  }
  return String(value);
}

function pad2(value) {
  value = String(value);
  return value.length === 1 ? '0' + value : value;
}

function toTitleCase(value) {
  if (!value) return '';
  return value.split(/\s+/).map(function(part) {
    if (!part.length) return part;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(' ');
}

// --- SEARCH FUNCTIONS ---

function findFirstIndex(lines, predicate) {
  return findFirstIndexFrom(lines, 0, predicate);
}

function findFirstIndexFrom(lines, start, predicate) {
  for (var i = start; i < lines.length; i++) {
    if (predicate(lines[i], i)) {
      return i;
    }
  }
  return -1;
}

function gatherBlock(lines, startIdx, stopCheck, limit) {
  var block = [];
  for (var i = startIdx; i < lines.length; i++) {
    if (limit && block.length >= limit) break;
    var line = lines[i];
    if (!line) continue;
    if (i !== startIdx && stopCheck(line)) {
      break;
    }
    block.push(line);
  }
  return block;
}

// --- VALIDATION FUNCTIONS ---

function isHeaderBlockStop(line) {
  if (!line) return false;
  var lower = line.toLowerCase();
  for (var i = 0; i < HEADER_BLOCK_TERMINATORS.length; i++) {
    if (lower.indexOf(HEADER_BLOCK_TERMINATORS[i]) === 0) {
      return true;
    }
  }
  return false;
}

function isTailoredPreparedAnchor(line) {
  if (!line) return false;
  var normalized = normalizeLabelText(line);
  return normalized.indexOf('tailoredfor') === 0 ||
    normalized.indexOf('tailorfor') === 0 ||
    normalized.indexOf('taylorfor') === 0 ||
    normalized.indexOf('preparedfor') === 0;
}

function normalizeLabelText(line) {
  if (!line) return '';
  return line.toLowerCase()
    .replace(/4/g, 'for')
    .replace(/[^a-z]/g, '');
}

function looksLikeAccountName(value) {
  if (!value) return false;
  if (value.indexOf('@') !== -1) return false;
  if (/^[0-9]/.test(value)) return false;
  if (value.length > 80) return false;
  return true;
}

function looksLikeContactName(value) {
  if (!value) return false;
  if (value.indexOf('@') !== -1) return false;
  var parts = value.trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 5) return false;
  return /^[A-Za-z]/.test(parts[0]);
}

// --- EMAIL FUNCTIONS ---

function findAllEmails(lines) {
  var emails = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var match;
    var regex = new RegExp(EMAIL_REGEX.source, EMAIL_REGEX.flags + 'g');
    while ((match = regex.exec(line)) !== null) {
      if (emails.indexOf(match[1]) === -1) {
        emails.push(match[1]);
      }
    }
  }
  return emails;
}

// --- CURRENCY FUNCTIONS ---

function parseFirstCurrency(value) {
  if (!value) return null;
  var match = value.match(/\$([0-9][0-9,]*(?:\.[0-9]{2})?)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

function findCurrencyAfterLabel(lines, labelRegex) {
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!line) continue;
    var match = line.match(labelRegex);
    if (!match) continue;
    var remainder = line.slice(match.index + match[0].length).trim();
    remainder = remainder.replace(/^[:\s-]+/, '').trim();
    var value = parseFirstCurrency(remainder);
    if (value !== null) {
      return value;
    }
    // Try next 5 lines
    for (var look = 1; look <= 5; look++) {
      var nextIdx = i + look;
      if (nextIdx >= lines.length) break;
      var candidate = lines[nextIdx];
      if (!candidate) continue;
      if (/^[a-z]+\s+(?:cost|price|total|investment)/i.test(candidate) && !/\$/.test(candidate)) break;
      var fallback = parseFirstCurrency(candidate);
      if (fallback !== null) {
        return fallback;
      }
    }
  }
  return null;
}

// --- DATE FUNCTIONS ---

function extractRequestedStart(lines) {
  var result = { requestedStartDate: null, startMonth: null };
  var idx = findFirstIndex(lines, function(line) {
    return /requested\s+start\s+date/i.test(line);
  });
  if (idx === -1) {
    return result;
  }

  for (var i = idx; i <= idx + 3 && i < lines.length; i++) {
    var parsed = parseDateLine(lines[i]);
    if (parsed) {
      result.requestedStartDate = parsed;
      break;
    }
  }

  if (result.requestedStartDate) {
    result.startMonth = monthNameFromIso(result.requestedStartDate);
  }

  return result;
}

function parseDateLine(line) {
  if (!line) return null;
  var slashMatch = line.match(/([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{4})/);
  if (slashMatch) {
    var month = slashMatch[1];
    var day = slashMatch[2];
    var year = slashMatch[3];
    return year + '-' + pad2(month) + '-' + pad2(day);
  }
  var textMatch = line.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-9]{1,2})(?:,?\s+([0-9]{4}))?/i);
  if (textMatch) {
    var monthIndex = MONTH_NAMES.indexOf(textMatch[1].charAt(0).toUpperCase() + textMatch[1].slice(1).toLowerCase());
    if (monthIndex !== -1) {
      var dayText = textMatch[2];
      var yearText = textMatch[3] || new Date().getFullYear();
      return yearText + '-' + pad2(monthIndex + 1) + '-' + pad2(dayText);
    }
  }
  return null;
}

function monthNameFromIso(iso) {
  if (!iso) return null;
  var parts = iso.split('-');
  if (parts.length !== 3) return null;
  var monthIndex = parseInt(parts[1], 10) - 1;
  if (monthIndex >= 0 && monthIndex < MONTH_NAMES.length) {
    return MONTH_NAMES[monthIndex];
  }
  return null;
}

// --- SERVICE FUNCTIONS ---

function createServiceSignals() {
  return {
    hasGpc: false,
    hasRodent: false,
    hasIlt: false
  };
}

function serviceOrder(code) {
  var order = { 'GPC': 0, 'MRT': 1, 'RBS': 2, 'RODENT': 3, 'ILT': 4 };
  return order.hasOwnProperty(code) ? order[code] : 10;
}

function extractFrequencyLabel(text) {
  if (!text) return null;
  var value = text.split('(')[0].replace(/[-–]+/g, ' ').trim();
  if (!value) return null;
  return toTitleCase(value);
}

function extractServicesPerYear(text, freqLabel) {
  if (!text) return null;
  var perYearMatch = text.match(/\((\d+)\s*x\)/i);
  if (perYearMatch) {
    return parseInt(perYearMatch[1], 10);
  }
  return inferServicesPerYear(freqLabel);
}

function inferServicesPerYear(label) {
  if (!label) return null;
  var lower = label.toLowerCase();
  if (lower.indexOf('weekly') !== -1) return 52;
  if (lower.indexOf('bi-weekly') !== -1) return 26;
  if (lower.indexOf('semi-monthly') !== -1) return 24;
  if (lower.indexOf('monthly') !== -1) return 12;
  if (lower.indexOf('quarter') !== -1) return 4;
  if (lower.indexOf('semi-annual') !== -1) return 2;
  if (lower.indexOf('annual') !== -1 || lower.indexOf('yearly') !== -1) return 1;
  return null;
}

// --- PEST FUNCTIONS ---

function extractCoveredPestsSection(lines) {
  var idx = findFirstIndex(lines, function(line) {
    return /^covered\s+pests/i.test(line);
  });
  if (idx === -1) {
    return [];
  }

  var pests = [];
  for (var i = idx + 1; i < lines.length; i++) {
    var line = lines[i];
    if (!line) break;
    if (/^service\s+\d+/i.test(line)) break;
    if (isHeaderBlockStop(line)) break;
    var normalized = line.replace(/^[•\-\*\u2022]+\s*/g, '').trim();
    if (!normalized) continue;
    var parts = splitCommaSafe(normalized);
    parts.forEach(function(part) {
      var cleaned = part.replace(/\s+/g, ' ').trim();
      if (cleaned) pests.push(cleaned);
    });
  }
  return dedupeList(pests);
}

function splitCommaSafe(value) {
  var result = [];
  var current = '';
  var depth = 0;
  for (var i = 0; i < value.length; i++) {
    var char = value[i];
    if (char === '(') depth++;
    if (char === ')' && depth > 0) depth--;
    if (char === ',' && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function deriveCoveredPests(explicitList, signals, equipment) {
  var seen = {};
  var result = [];
  explicitList.forEach(function(item) {
    var key = (item || '').toLowerCase();
    if (item && !seen[key]) {
      seen[key] = true;
      result.push(item);
    }
  });

  function add(value) {
    if (!value) return;
    var key = value.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    result.push(value);
  }

  var hasRodentSignal = signals.hasRodent || (equipment && (equipment.rbsQty > 0 || equipment.multCatchQty > 0));
  var hasIltSignal = signals.hasIlt || (equipment && equipment.iltQty > 0);

  if (signals.hasGpc) {
    add('Pavement Ants');
  }
  if (hasRodentSignal) {
    add('Common Rodents');
  }
  if (signals.hasGpc) {
    add('Common Roaches');
  }
  if (hasIltSignal) {
    add('Common House Fly');
  }

  return result;
}

function dedupeList(list) {
  var result = [];
  var seen = {};
  list.forEach(function(item) {
    if (!item) return;
    var key = item.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    result.push(item);
  });
  return result;
}

// --- DESCRIPTION BUILDERS ---

function buildEquipmentSignature(equipment) {
  if (!equipment) return '';
  var parts = [];
  if (equipment.multCatchQty) parts.push(formatQuantity(equipment.multCatchQty) + ' MRT');
  if (equipment.rbsQty) parts.push(formatQuantity(equipment.rbsQty) + ' RBS');
  if (equipment.iltQty) parts.push(formatQuantity(equipment.iltQty) + ' ILT');
  (equipment.otherEquipment || []).forEach(function(item) {
    if (!item || !item.name) return;
    var qty = item.quantity ? formatQuantity(item.quantity) + ' ' : '';
    parts.push(qty + item.name);
  });
  return parts.join(', ');
}

function buildInitialDescription(equipment, initialCost) {
  var parts = [];
  if (equipment.multCatchQty > 0) parts.push(equipment.multCatchQty + ' MRT');
  if (equipment.rbsQty > 0) parts.push(equipment.rbsQty + ' RBS');
  if (equipment.iltQty > 0) parts.push(equipment.iltQty + ' ILT');
  if (!parts.length && initialCost > 0) return 'Initial service';
  if (!parts.length) return 'Standard Initial Setup';
  var equipmentList = parts.length > 1 ? parts.slice(0, -1).join(', ') + ', & ' + parts.slice(-1) : parts[0];
  return 'Initial service and install ' + equipmentList;
}

function buildMaintenanceDescription(services) {
  if (!services || services.length === 0) return 'Monthly GPC';
  var hasAfterHours = false;
  var normalized = services.map(function(svc) {
    var rawName = (svc.serviceName || svc.programType || '').toLowerCase();
    if (/after\s+hours.*yes/i.test(rawName) || svc.afterHours) hasAfterHours = true;
    var code = (svc.serviceCode || '').toUpperCase();
    var label = (function() {
      if (code === 'GPC') return 'GPC';
      if (code === 'RBS') return 'Exterior Rodent Monitoring';
      if (code === 'MRT') return 'Interior Rodent Monitoring';
      if (code === 'ILT') return 'ILT Maintenance';
      var name = svc.serviceName || svc.programType || 'Service';
      return name.replace(/maintenance/i, '').trim() || 'Service';
    })();
    var freq = svc.frequencyLabel || null;
    if (!freq && svc.servicesPerYear) {
      freq = svc.servicesPerYear >= 24 ? 'Semi-Monthly' : svc.servicesPerYear >= 12 ? 'Monthly' : null;
    }
    if (code === 'ILT' && svc.servicesPerYear >= 24) freq = 'Semi-Monthly';
    if (!freq) freq = 'Monthly';
    return { code: code, label: label, text: freq + ' ' + label };
  }).filter(function(entry) {
    return ['GPC', 'RBS', 'MRT', 'ILT'].indexOf(entry.code) !== -1;
  });

  var order = { 'GPC': 0, 'RBS': 1, 'MRT': 2, 'ILT': 3 };
  normalized.sort(function(a, b) {
    var ao = order.hasOwnProperty(a.code) ? order[a.code] : 9;
    var bo = order.hasOwnProperty(b.code) ? order[b.code] : 9;
    if (ao === bo) return a.text.localeCompare(b.text);
    return ao - bo;
  });

  var dedup = [];
  normalized.forEach(function(entry) {
    if (!dedup.some(function(d) { return d.code === entry.code && d.label === entry.label; })) dedup.push(entry);
  });

  var joined = dedup.length > 1 ? dedup.slice(0, -1).map(function(e) { return e.text; }).join(', ') + ' & ' + dedup.slice(-1)[0].text : dedup[0].text;
  if (hasAfterHours) joined += ' (Includes After Hours Service)';
  return joined;
}

// --- HEADER PROCESSING ---

function sanitizeHeaderBlock(block) {
  var sanitized = [];
  block.forEach(function(line, index) {
    if (!line) return;
    var cleaned = stripHeaderLabelPrefixes(line);
    var lower = cleaned.toLowerCase();
    if (!cleaned) return;
    if (isHeaderBlockStop(cleaned)) return;
    if (/^page\s+\d+/i.test(cleaned)) return;
    if (/https?:\/\//i.test(cleaned)) return;
    if (/^[0-9]+$/.test(cleaned)) return;
    sanitized.push(cleaned);
  });
  return sanitized;
}

function stripHeaderLabelPrefixes(line) {
  if (!line) return '';
  var trimmed = line.trim();
  var result = trimmed;
  var patterns = [
    /^(tailor(?:ed)?|taylor)\s*(?:for|4)\b/i,
    /^prepared\s+for\b/i,
    /^account\s+name\b/i,
    /^customer\s+name\b/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i].test(result)) {
      result = result.replace(patterns[i], '').trim();
      break;
    }
  }
  return result.replace(/^[:\s,-]+/, '');
}

function expandMergedHeaderLines(lines) {
  var expanded = [];
  lines.forEach(function(line) {
    if (!line) return;
    var parts = splitMergedHeaderLine(line);
    parts.forEach(function(part) {
      if (part && part.trim().length) {
        expanded.push(part.trim());
      }
    });
  });
  return expanded;
}

function splitMergedHeaderLine(line) {
  if (!line) return [];
  var trimmed = line.trim();
  if (!trimmed) return [];
  if (ADDRESS_LINE_REGEX.test(trimmed) || CITY_STATE_ZIP_REGEX.test(trimmed)) {
    return [trimmed];
  }
  var results = [];
  var firstDigit = trimmed.search(/\d/);
  if (firstDigit > 0) {
    var before = trimmed.slice(0, firstDigit).trim();
    var after = trimmed.slice(firstDigit).trim();
    if (before) {
      splitAccountAndContact(before).forEach(function(part) {
        if (part) results.push(part);
      });
    }
    if (after) {
      results.push(after);
    }
    return results;
  }
  var splitParts = splitAccountAndContact(trimmed);
  if (splitParts.length > 1) {
    return splitParts;
  }
  return [trimmed];
}

function splitAccountAndContact(text) {
  if (!text) return [];
  var tokens = text.trim().split(/\s+/);
  if ((/^\d/.test(text) && ADDRESS_LINE_REGEX.test(text)) || CITY_STATE_ZIP_REGEX.test(text)) {
    return [text];
  }
  if (tokens.length < 3) return [text];
  for (var split = 1; split <= tokens.length - 2; split++) {
    var accountCandidate = tokens.slice(0, split).join(' ');
    var contactCandidate = tokens.slice(split).join(' ');
    if (looksLikeContactName(contactCandidate)) {
      return [accountCandidate, contactCandidate];
    }
  }
  return [text];
}

// --- ADDRESS PARSING ---

function extractInlineAddress(line) {
  if (!line) return null;
  var cleaned = line.replace(/\s+\d{1,2}\s*$/, '').trim();
  var stateZipMatch = cleaned.match(/([A-Z]{2})[,\s]*([0-9]{5}(?:-?[0-9]{4})?)\s*$/);
  if (!stateZipMatch) return null;
  var beforeState = cleaned.slice(0, stateZipMatch.index).trim().replace(/[,\s]+$/, '');
  var street = beforeState;
  var city = null;

  var streetSuffixPattern = /\b(Road|Rd|Street|St|Drive|Dr|Lane|Ln|Boulevard|Blvd|Avenue|Ave|Way|Court|Ct|Trail|Trl|Parkway|Pkwy|Circle|Cir)\b/ig;
  var suffixMatch = null;
  var match;
  while ((match = streetSuffixPattern.exec(beforeState)) !== null) {
    suffixMatch = match;
  }
  if (suffixMatch) {
    var suffixEnd = suffixMatch.index + suffixMatch[0].length;
    var potentialCity = beforeState.slice(suffixEnd).trim().replace(/^,/, '').trim();
    if (potentialCity) {
      city = potentialCity;
      street = beforeState.slice(0, suffixEnd).trim();
    }
  }
  if (!city) {
    var lastComma = beforeState.lastIndexOf(',');
    if (lastComma !== -1) {
      city = beforeState.slice(lastComma + 1).trim();
      street = beforeState.slice(0, lastComma).trim();
    }
  }

  return {
    raw: cleaned,
    street: street || beforeState,
    city: city || null,
    state: stateZipMatch[1],
    zip: stateZipMatch[2]
  };
}

// --- PREPARED BY SECTION ---

function extractPreparedBySection(lines) {
  var result = { aeName: null, aeEmail: null };
  var idx = findFirstIndex(lines, function(line) {
    return /prepared\s+by\b/i.test(line);
  });
  if (idx === -1) {
    return result;
  }

  var block = gatherBlock(lines, idx, function(line) {
    if (!line) return false;
    var lower = line.toLowerCase();
    if (/(tailored|prepared)\s+for/.test(lower)) return true;
    return isHeaderBlockStop(line);
  }, 8);

  if (!block.length) return result;

  var inline = block[0].replace(/^prepared\s+by[:\s-]*/i, '').trim();
  if (inline) {
    var inlineEmail = inline.match(EMAIL_REGEX);
    if (inlineEmail) {
      result.aeEmail = inlineEmail[1];
      inline = inline.replace(EMAIL_REGEX, '').trim();
    }
    if (inline && inline.indexOf('@') === -1) {
      result.aeName = inline;
    }
  }

  for (var i = 1; i < block.length; i++) {
    var line = block[i];
    if (!line) continue;
    if (!result.aeEmail) {
      var email = line.match(EMAIL_REGEX);
      if (email) {
        result.aeEmail = email[1];
        line = line.replace(EMAIL_REGEX, '').trim();
      }
    }
    if (!result.aeName) {
      var nameCandidate = line.indexOf('@') === -1 ? line : '';
      if (!nameCandidate) {
        nameCandidate = line.replace(EMAIL_REGEX, '').trim();
      }
      if (nameCandidate && nameCandidate.indexOf('@') === -1) {
        result.aeName = nameCandidate.trim();
      }
    }
  }

  return result;
}
```

---

## 4. Client-Side: Fallback Parser (JavaScript ES6)

This is a simplified client-side parser that works when Apps Script is unavailable.

```javascript
/**
 * Client-side fallback parser for Salesforce quotes.
 * Uses modern JavaScript (ES6+) syntax.
 */
function clientParseSalesforceQuote(text) {
  if (!text) return buildEmptyDraft();

  const lines = text.replace(/\r\n/g, '\n').split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const draft = buildEmptyDraft();

  // Extract account name from TAILORED FOR / PREPARED FOR section
  const headerIdx = lines.findIndex(l => /tailored|prepared\s+for/i.test(l));
  if (headerIdx !== -1) {
    draft.accountName = lines[headerIdx + 1] || null;
    draft.contactName = lines[headerIdx + 2] || null;
  }

  // Extract email
  const emailMatch = text.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (emailMatch) draft.contactEmail = emailMatch[1];

  // Extract address
  const addrMatch = text.match(/([0-9][^\n]+?,\s*[A-Za-z\s]+?,\s*[A-Z]{2},?\s*\d{5}(?:-\d{4})?)/);
  if (addrMatch) {
    draft.serviceAddressLine1 = addrMatch[1].trim();
    const parts = draft.serviceAddressLine1.split(',');
    if (parts.length >= 3) {
      draft.serviceCity = parts[1].trim();
      const stateZip = parts[2].trim().split(/\s+/);
      draft.serviceState = stateZip.shift();
      draft.serviceZip = stateZip.join(' ');
    }
  }

  // Extract pricing (first 3 currency values)
  const money = [];
  const moneyRe = /\$[0-9][0-9,]*(?:\.[0-9]{2})?/g;
  let m;
  while ((m = moneyRe.exec(text)) !== null) {
    money.push(parseFloat(m[0].replace(/[$,]/g, '')));
    if (money.length >= 3) break;
  }
  if (money.length >= 3) {
    draft.equipmentOneTimeTotal = money[0];
    draft.servicesInitialTotal = money[1];
    draft.combinedInitialTotal = money[0] + money[1];
    draft.servicesMonthlyTotal = money[2];
    draft.combinedMonthlyTotal = money[2];
  }

  // Extract equipment counts
  const mrt = text.match(/(Multicatch|Mouse Trap)[^0-9]*([0-9]{1,3}(?:\.[0-9]+)?)/i);
  const rbs = text.match(/(Rodent Bait Station|RBS)[^0-9]*([0-9]{1,3}(?:\.[0-9]+)?)/i);
  const ilt = text.match(/(Insect Light Trap|Lumnia)[^0-9]*([0-9]{1,3}(?:\.[0-9]+)?)/i);

  draft.equipment = { multCatchQty: 0, rbsQty: 0, iltQty: 0, otherEquipment: [] };
  if (mrt) draft.equipment.multCatchQty = parseFloat(mrt[2]);
  if (rbs) draft.equipment.rbsQty = parseFloat(rbs[2]);
  if (ilt) draft.equipment.iltQty = parseFloat(ilt[2]);

  // Build services from equipment
  const services = [];
  services.push({
    serviceName: 'General Pest Control',
    serviceCode: 'GPC',
    category: 'GPC',
    programType: 'General Pest Control',
    frequencyLabel: 'Monthly',
    servicesPerYear: 12
  });
  if (draft.equipment.multCatchQty) {
    services.push({
      serviceName: 'Interior Rodent Monitoring',
      serviceCode: 'MRT',
      category: 'Rodent Monitoring',
      programType: 'Interior Monitoring',
      frequencyLabel: 'Semi-Monthly',
      servicesPerYear: 24
    });
  }
  if (draft.equipment.rbsQty) {
    services.push({
      serviceName: 'Exterior Rodent Monitoring',
      serviceCode: 'RBS',
      category: 'Rodent Monitoring',
      programType: 'Exterior Monitoring',
      frequencyLabel: 'Monthly',
      servicesPerYear: 12
    });
  }
  if (draft.equipment.iltQty) {
    services.push({
      serviceName: 'Insect Light Trap Maintenance',
      serviceCode: 'ILT',
      category: 'Fly / ILT',
      programType: 'Insect Light Trap Maintenance',
      frequencyLabel: 'Semi-Monthly',
      servicesPerYear: 24
    });
  }
  draft.services = services;

  // Build descriptions
  const eqParts = [];
  if (draft.equipment.multCatchQty) eqParts.push(`${draft.equipment.multCatchQty} MRT`);
  if (draft.equipment.rbsQty) eqParts.push(`${draft.equipment.rbsQty} RBS`);
  if (draft.equipment.iltQty) eqParts.push(`${draft.equipment.iltQty} ILT`);
  draft.equipment.summary = eqParts.join(', ');
  draft.initialServiceDescription = eqParts.length
    ? `Initial service and install ${eqParts.join(', ')}`
    : 'Initial service';
  draft.maintenanceScopeDescription = services.map(s => `${s.frequencyLabel} ${s.serviceName}`).join(', ');

  draft.logBookNeeded = true;
  draft.leadType = 'Inbound';

  return draft;
}

function buildEmptyDraft() {
  return {
    accountName: null,
    contactName: null,
    contactEmail: null,
    serviceAddressLine1: null,
    serviceCity: null,
    serviceState: null,
    serviceZip: null,
    aeName: null,
    aeEmail: null,
    branchId: 'BRN-001',
    services: [],
    equipment: { multCatchQty: 0, rbsQty: 0, iltQty: 0, otherEquipment: [] },
    equipmentOneTimeTotal: null,
    servicesInitialTotal: null,
    servicesMonthlyTotal: null,
    combinedInitialTotal: null,
    combinedMonthlyTotal: null,
    coveredPests: [],
    leadType: null,
    jobType: null,
    logBookNeeded: false
  };
}
```

---

## 5. Form Auto-Fill Logic

```javascript
/**
 * Apply parsed StartPacketDraft to form fields.
 * Call this after parsing is complete.
 */
function applyStartPacketDraft(draft) {
  if (!draft) return;

  // Account & Contact
  setValueById('accountName', draft.accountName);
  setValueById('pocName', draft.contactName);
  setValueById('pocEmail', draft.contactEmail);
  setValueById('pocPhone', draft.contactPhone);

  // Service Address
  const addressPieces = [
    draft.serviceAddressLine1,
    draft.serviceCity,
    draft.serviceState,
    draft.serviceZip
  ].filter(Boolean);
  setValueById('serviceAddress', addressPieces.join(', '));

  // Pricing
  const initialTotal = draft.combinedInitialTotal !== null
    ? draft.combinedInitialTotal
    : ((draft.servicesInitialTotal || 0) + (draft.equipmentOneTimeTotal || 0));
  setValueById('initialPrice', initialTotal > 0 ? initialTotal : '');

  const maintTotal = draft.combinedMonthlyTotal !== null
    ? draft.combinedMonthlyTotal
    : draft.servicesMonthlyTotal;
  setValueById('maintenancePrice', maintTotal > 0 ? Math.round(maintTotal * 100) / 100 : '');

  // Start Month
  if (draft.startMonth) {
    setSelectValueById('startMonth', draft.startMonth);
  }

  // Equipment Counts
  setValueById('mrtCount', (draft.equipment && draft.equipment.multCatchQty) || 0);
  setValueById('rbsCount', (draft.equipment && draft.equipment.rbsQty) || 0);
  setValueById('iltCount', (draft.equipment && draft.equipment.iltQty) || 0);

  // Descriptions
  setValueById('initialServiceDescription', draft.initialServiceDescription);
  setValueById('maintenanceScopeDescription', draft.maintenanceScopeDescription);

  // Covered Pests
  if (Array.isArray(draft.coveredPests)) {
    setValueById('coveredPests', draft.coveredPests.join(', '));
  }

  // Job Type
  const hasRecurringCost = (draft.combinedMonthlyTotal || draft.servicesMonthlyTotal || 0) > 0;
  setSelectValueById('jobType', draft.jobType || (hasRecurringCost ? 'Contract' : ''));
  setSelectValueById('leadType', draft.leadType || 'Inbound');

  // Sales Rep
  setValueById('salesReps', draft.aeName);

  // SRA
  setValueById('sraBy', draft.aeName);
  if (draft.sraHazards && draft.sraHazards.length) {
    setHazardRowsFromArray(draft.sraHazards);
  }

  // Log Book & PNOL
  setCheckboxById('logBook', draft.logBookNeeded === true);
  setCheckboxById('pnol', draft.pnolRequired === true);

  // Billing
  setValueById('billingEmail', draft.billingEmail);
  if (draft.billingAddress && draft.billingAddress.trim()) {
    setCheckboxById('billingAddressDifferent', true);
    setValueById('billingAddress', draft.billingAddress);
  }
}

// Helper functions
function setValueById(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function setSelectValueById(id, value) {
  const el = document.getElementById(id);
  if (el && value) {
    for (let i = 0; i < el.options.length; i++) {
      if (el.options[i].value === value || el.options[i].text === value) {
        el.selectedIndex = i;
        break;
      }
    }
  }
}

function setCheckboxById(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = !!checked;
}
```

---

## 6. Start Packet Data Structure

### 6.1 Complete StartPacketDraft Object

```javascript
{
  // Account & Contact
  "accountName": "Tayho",
  "contactName": "Lee Morrison",
  "contactEmail": "lee.morrison@tayho.com",

  // Service Address
  "serviceAddressLine1": "17213 Aldine Westfield Road",
  "serviceCity": "Houston",
  "serviceState": "TX",
  "serviceZip": "77073",
  "serviceAddress": "17213 Aldine Westfield Road, Houston, TX, 77073",

  // AE Information
  "aeName": "Cody Lytle",
  "aeEmail": "cody.lytle@prestox.com",
  "branchId": "BRN-001",

  // Job Classification
  "jobType": "Contract",
  "leadType": "Inbound",
  "serviceType": null,

  // Services Array
  "services": [
    {
      "serviceName": "General Pest Control",
      "serviceCode": "GPC",
      "category": "GPC",
      "programType": "General Pest Control",
      "frequencyLabel": "Monthly",
      "servicesPerYear": 12,
      "afterHours": false
    },
    {
      "serviceName": "Interior Rodent Monitoring",
      "serviceCode": "MRT",
      "category": "Rodent Monitoring",
      "programType": "Interior Monitoring",
      "frequencyLabel": "Semi-Monthly",
      "servicesPerYear": 24,
      "afterHours": false
    },
    {
      "serviceName": "Insect Light Trap Maintenance",
      "serviceCode": "ILT",
      "category": "Fly / ILT",
      "programType": "Insect Light Trap Maintenance",
      "frequencyLabel": "Semi-Monthly",
      "servicesPerYear": 24,
      "afterHours": false
    }
  ],

  // Equipment
  "equipment": {
    "multCatchQty": 22,
    "rbsQty": 14,
    "iltQty": 4,
    "otherEquipment": [],
    "summary": "22 MRT, 14 RBS, 4 ILT"
  },

  // Pricing
  "equipmentOneTimeTotal": 3455.60,
  "servicesInitialTotal": 924.34,
  "combinedInitialTotal": 4379.94,
  "servicesMonthlyTotal": 356.16,
  "combinedMonthlyTotal": 356.16,
  "servicesAnnualTotal": 4273.92,
  "combinedAnnualTotal": 4273.92,
  "monthlyCost": 356.16,
  "annualCost": 4273.92,

  // Schedule
  "requestedStartDate": "2025-11-19",
  "startMonth": "November",

  // Pests
  "coveredPests": [
    "Roof Rats",
    "Norway Rats",
    "House Mice",
    "Cockroaches (German, American, Oriental)",
    "Ants (Pavement, Odorous House, Argentine)",
    "Spiders (excluding Brown Recluse)"
  ],

  // Auto-Generated Descriptions
  "initialServiceDescription": "Initial service and install 22 MRT, 14 RBS, & 4 ILT",
  "maintenanceScopeDescription": "Monthly GPC, Semi-Monthly Interior Rodent Monitoring & Semi-Monthly ILT Maintenance",

  // Additional Fields
  "logBookNeeded": true,
  "pnolRequired": false,
  "billingEmail": "lee.morrison@tayho.com",
  "billingAddress": "",
  "billingAddressDifferent": false,

  // SRA (Safety Risk Assessment)
  "sraCompletedBy": "Cody Lytle",
  "sraDate": "2025-12-24",
  "sraTime": "14:30",
  "sraCompletedAt": "2025-12-24T14:30:15.123Z",
  "sraAdditionalHazards": "None",
  "sraHazards": [
    { "hazard": "Slippery or uneven surfaces", "control": "Wear appropriate footwear", "safeToProceed": true },
    { "hazard": "Overhead hazards (pipes, low ceilings)", "control": "Watch for head clearance", "safeToProceed": true },
    { "hazard": "Working at heights (ladders, platforms)", "control": "Use proper ladder safety", "safeToProceed": true },
    { "hazard": "Chemicals or hazardous materials present", "control": "Follow safety data sheets", "safeToProceed": true },
    { "hazard": "Electrical hazards", "control": "Avoid contact with electrical equipment", "safeToProceed": true },
    { "hazard": "Poor lighting in service areas", "control": "Use flashlight/headlamp", "safeToProceed": true }
  ]
}
```

---

## 7. Database Save Function

### 7.1 Apps Script Save Function

```javascript
/**
 * Save unified sale to Google Sheets database.
 * @param {Object} saleData - Sale data from form
 * @return {Object} Result with recordID
 */
function saveUnifiedSale(saleData) {
  if (!saleData) throw new Error('Missing sale data payload');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Unified_Sales');
  if (!sheet) throw new Error('Unified_Sales sheet not found');

  var recordID = saleData.recordID || generateUniqueID('SALE');

  var rowPayload = {
    RecordID: recordID,
    BranchID: saleData.branchID || 'BRN-001',
    SoldDate: saleData.soldDate ? new Date(saleData.soldDate) : new Date(),
    AccountName: saleData.accountName || '',
    ServiceAddress: saleData.serviceAddress || '',
    SalesRepIDs: Array.isArray(saleData.salesRepIDs)
      ? saleData.salesRepIDs.join('|')
      : (saleData.salesRepIDs || ''),
    POCName: saleData.pocName || '',
    POCPhone: saleData.pocPhone || '',
    POCEmail: saleData.pocEmail || '',
    BillingEmail: saleData.billingEmail || '',
    RequestedStartMonth: saleData.requestedStartMonth || '',
    InitialPrice: Number(saleData.initialPrice) || 0,
    MaintenancePrice: Number(saleData.maintenancePrice) || 0,
    ServiceType: saleData.serviceType || '',
    LeadType: saleData.leadType || '',
    JobType: saleData.jobType || 'Contract',
    Frequency: saleData.frequency || 12,
    ServiceName: saleData.serviceName || '',
    CoveredPests: saleData.coveredPests || '',
    SpecialNotes: saleData.specialNotes || '',
    LogBookNeeded: saleData.logBookNeeded || false,
    PNOLRequired: saleData.pnolRequired || false,
    MRTCount: saleData.mrtCount || 0,
    RBSCount: saleData.rbsCount || 0,
    ILTCount: saleData.iltCount || 0,
    InitialServiceDescription: saleData.initialServiceDescription || '',
    MaintenanceScopeDescription: saleData.maintenanceScopeDescription || '',
    SRACompletedBy: saleData.sraCompletedBy || '',
    SRADate: saleData.sraDate ? new Date(saleData.sraDate) : '',
    SRATime: saleData.sraTime || '',
    SRAAdditionalHazards: saleData.sraAdditionalHazards || '',
    Status: saleData.status || 'New Sale',
    UpdatedOn: new Date(),
    CreatedOn: new Date()
  };

  // Append row to sheet
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowData = headers.map(function(header) {
    return rowPayload[header] !== undefined ? rowPayload[header] : '';
  });
  sheet.appendRow(rowData);

  // Send email notification if status is Sold
  if (saleData.status === 'Sold' || saleData.status === 'New Sale') {
    try {
      sendNewStartNotification(saleData);
    } catch (e) {
      Logger.log('Failed to send email: ' + e.message);
    }
  }

  return { success: true, recordID: recordID };
}

function generateUniqueID(prefix) {
  return prefix + '-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9);
}
```

---

## 8. Operations Email Notification

### 8.1 Email Template & Send Function

```javascript
/**
 * Send email notification to Operations team when sale is marked Sold.
 * @param {Object} saleData - Sale data with all fields
 */
function sendNewStartNotification(saleData) {
  var recipients = 'midwestmarketsalesentry@rentokil.com, brad.hudson@prestox.com';
  var subject = 'Re: Onboarding Report - ' + saleData.accountName + ' -- ' + saleData.pocName;

  var body = 'Team,\n\n' +
    'Please find the attached start packet for the location below.\n\n' +
    'Service Details\n' +
    '• Frequency: ' + (saleData.frequency || '12') + '\n' +
    '• Covered Pests: ' + (saleData.coveredPests || 'N/A') + '\n' +
    '• Scope: ' + (saleData.maintenanceScopeDescription || 'N/A') + '\n' +
    '• Treatment Notes: ' + (saleData.specialNotes || 'N/A') + '\n\n' +
    'Commercials\n' +
    '• Total Initial: $' + (parseFloat(saleData.initialPrice) || 0).toFixed(2) + '\n' +
    '• Monthly: $' + (parseFloat(saleData.maintenancePrice) || 0).toFixed(2) + '/month\n\n' +
    'Account Details\n' +
    '• Customer: ' + saleData.accountName + '\n' +
    '• Service Address: ' + saleData.serviceAddress + '\n' +
    '• Billing Email: ' + (saleData.billingEmail || 'N/A') + '\n' +
    '• POC: ' + saleData.pocName + ' (' + saleData.pocPhone + ')';

  // Send email using Gmail API
  GmailApp.sendEmail(recipients, subject, body);

  Logger.log('Operations email sent to: ' + recipients);

  return { success: true, recipients: recipients, subject: subject };
}
```

### 8.2 Client-Side Email Simulation (for demo/testing)

```javascript
/**
 * Simulate email notification on client side (shows alert instead of sending)
 */
function simulateOperationsEmail(payload) {
  const recipients = "midwestmarketsalesentry@rentokil.com, brad.hudson@prestox.com";
  const subject = `Re: Onboarding Report - ${payload.accountName} -- ${payload.pocName}`;
  const body = `Team,

Please find the attached start packet for the location below.

Service Details
• Frequency: ${payload.frequency || '12'}
• Covered Pests: ${payload.coveredPests || 'N/A'}
• Scope: ${payload.maintenanceScopeDescription || 'N/A'}
• Treatment Notes: ${payload.specialNotes || 'N/A'}

Commercials
• Total Initial: $${(parseFloat(payload.initialPrice)||0).toFixed(2)}
• Monthly: $${(parseFloat(payload.maintenancePrice)||0).toFixed(2)}/month

Account Details
• Customer: ${payload.accountName}
• Service Address: ${payload.serviceAddress}
• Billing Email: ${payload.billingEmail || 'N/A'}
• POC: ${payload.pocName} (${payload.pocPhone})`;

  alert(`📧 [DEMO] Email Sent to Operations!\n\nTo: ${recipients}\nSubject: ${subject}\n\n${body}`);
}
```

---

## 9. Helper Functions Reference

### Quick Reference Table

| Function | Purpose | Location |
|----------|---------|----------|
| `extractTextFromPdfFile(file)` | Extract text from PDF with Y-sorting | Client-side |
| `parseSalesforceQuoteTextToStartPacketDraft(text)` | Main parser entry point | Server-side |
| `expandLines(lines)` | Fix PDF column merging issues | Server-side |
| `extractPreparedForFields(lines)` | Get account, contact, address | Server-side |
| `extractPreparedBySection(lines)` | Get AE name and email | Server-side |
| `extractEquipmentSection(lines)` | Get MRT, RBS, ILT counts | Server-side |
| `extractPricing(lines)` | Get one-time, initial, monthly costs | Server-side |
| `extractRoutineServices(lines, equipment)` | Get services array | Server-side |
| `extractCoveredPestsSection(lines)` | Get pest list | Server-side |
| `extractRequestedStart(lines)` | Get start date and month | Server-side |
| `buildInitialDescription(equipment, cost)` | Generate initial description | Server-side |
| `buildMaintenanceDescription(services)` | Generate maintenance description | Server-side |
| `buildEquipmentSignature(equipment)` | Generate "22 MRT, 14 RBS" string | Server-side |
| `applyStartPacketDraft(draft)` | Fill form from parsed data | Client-side |
| `saveUnifiedSale(saleData)` | Save to Google Sheets | Server-side |
| `sendNewStartNotification(saleData)` | Send Ops email | Server-side |

---

## 10. Testing & Validation

### 10.1 Test Function

```javascript
/**
 * Test parser with sample text.
 * Run this in Apps Script editor to validate parsing.
 */
function testSalesforceParser() {
  var sampleText = `
TAILORED FOR:
Tayho
Lee Morrison
17213 Aldine Westfield Road
Houston, TX 77073
lee.morrison@tayho.com

PREPARED BY:
Cody Lytle
cody.lytle@prestox.com

Equipment Quantity
Multicatch Mouse Trap 22
Rodent Bait Station 14
Lumnia Insect Light Trap 4

Total Cost of Equipment $3,455.60

Routine Management Services
GENERAL PEST CONTROL Service Frequency Monthly (12x)
Interior Monitoring Service Frequency Semi-Monthly (24x)
Insect Light Trap Maintenance Service Frequency Semi-Monthly (24x)

Investment Summary
One-Time Cost Initial Svc Cost Avg Monthly Cost
Total investment $3,455.60 $924.34 $356.16

Requested Start Date
11/19/2025

Covered Pests
Roof Rats, Norway Rats, House Mice
Cockroaches (German, American, Oriental)
Ants (Pavement, Odorous House)
  `;

  try {
    var result = parseSalesforceQuoteTextToStartPacketDraft(sampleText);

    // Validate required fields
    var requiredFields = [
      'accountName', 'contactName', 'serviceAddressLine1',
      'aeName', 'equipment', 'services', 'monthlyCost'
    ];

    var missing = [];
    requiredFields.forEach(function(field) {
      if (!result[field]) {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      Logger.log('⚠️ Missing fields: ' + missing.join(', '));
    } else {
      Logger.log('✅ All required fields present');
    }

    // Log results
    Logger.log('Account: ' + result.accountName);
    Logger.log('Contact: ' + result.contactName);
    Logger.log('Address: ' + result.serviceAddress);
    Logger.log('AE: ' + result.aeName);
    Logger.log('Equipment: ' + JSON.stringify(result.equipment));
    Logger.log('Monthly Cost: $' + result.monthlyCost);
    Logger.log('Initial Description: ' + result.initialServiceDescription);
    Logger.log('Maintenance Description: ' + result.maintenanceScopeDescription);

    return { success: true, result: result, missing: missing };
  } catch (e) {
    Logger.log('❌ Parse failed: ' + e.message);
    return { success: false, error: e.message };
  }
}
```

### 10.2 Expected Results (Golden Test Case)

For the Tayho quote, the parser should extract:

| Field | Expected Value |
|-------|---------------|
| Account Name | "Tayho" |
| Contact Name | "Lee Morrison" |
| Contact Email | "lee.morrison@tayho.com" |
| Service Address | "17213 Aldine Westfield Road, Houston, TX, 77073" |
| AE Name | "Cody Lytle" |
| AE Email | "cody.lytle@prestox.com" |
| MRT Count | 22 |
| RBS Count | 14 |
| ILT Count | 4 |
| One-Time Cost | $3,455.60 |
| Initial Svc Cost | $924.34 |
| Monthly Cost | $356.16 |
| Combined Initial | $4,379.94 |
| Start Month | "November" |
| Initial Description | "Initial service and install 22 MRT, 14 RBS, & 4 ILT" |
| Maintenance Description | "Monthly GPC, Semi-Monthly Interior Rodent Monitoring & Semi-Monthly ILT Maintenance" |

---

## Document Information

**Version:** 1.0
**Created:** January 2026
**Source Files:**
- `src/salesforce-parser.gs` - Server-side parser (1462 lines)
- `src/ae-dashboard.html` - Client-side implementation
- `src/unified-sales.gs` - Database save functions

**Success Criteria:**
- 90%+ extraction accuracy on Rentokil/Presto-X Salesforce quotes
- All pricing values extracted correctly
- Equipment counts accurate
- Services with correct frequencies
- Auto-descriptions match expected format

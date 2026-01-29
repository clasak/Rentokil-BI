const fs = require('fs');
const path = require('path');

console.log('BigQuery Data Discovery Analysis');
console.log('=================================\n');

// Read all discovery outputs
const discoveryDir = __dirname;

const tables = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'complete-tables.json'), 'utf8'));
const columns = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'complete-columns.json'), 'utf8'));
const metadata = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'table-metadata.json'), 'utf8'));
const views = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'views.json'), 'utf8'));
const routines = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'routines.json'), 'utf8'));
const partitioning = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'partitioning-clustering.json'), 'utf8'));

console.log('Loaded discovery data:');
console.log(`  - Tables: ${tables.length}`);
console.log(`  - Columns: ${columns.length}`);
console.log(`  - Storage entries: ${metadata.length}`);
console.log(`  - Views: ${views.length}`);
console.log(`  - Routines: ${routines.length}`);
console.log(`  - Partitioned/Clustered: ${partitioning.length}\n`);

// 1. Discover all datasets
const datasets = [...new Set(tables.map(t => t.table_schema))].sort();
console.log(`\n1. DATASETS DISCOVERED: ${datasets.length}`);
console.log('-'.repeat(40));

// 2. Discover naming patterns
console.log('\n2. NAMING PATTERNS DISCOVERED');
console.log('-'.repeat(40));

const namingPatterns = {
  prefixes: {},
  suffixes: {},
  keywords: {}
};

tables.forEach(t => {
  const name = t.table_name;

  // Extract prefix patterns (before first _)
  const prefix = name.split('_')[0];
  if (prefix && prefix.length >= 2) {
    namingPatterns.prefixes[prefix] = (namingPatterns.prefixes[prefix] || 0) + 1;
  }

  // Extract suffix patterns (after last _)
  const parts = name.split('_');
  if (parts.length > 1) {
    const suffix = parts[parts.length - 1];
    if (suffix && suffix.length >= 2) {
      namingPatterns.suffixes[suffix] = (namingPatterns.suffixes[suffix] || 0) + 1;
    }
  }

  // Extract all words/segments
  parts.forEach(part => {
    if (part.length >= 3) {
      const lower = part.toLowerCase();
      namingPatterns.keywords[lower] = (namingPatterns.keywords[lower] || 0) + 1;
    }
  });
});

// Sort and display top patterns
const topPrefixes = Object.entries(namingPatterns.prefixes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);
console.log('\nTop Prefixes:');
topPrefixes.forEach(([prefix, count]) => console.log(`  ${prefix}: ${count} tables`));

const topSuffixes = Object.entries(namingPatterns.suffixes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);
console.log('\nTop Suffixes:');
topSuffixes.forEach(([suffix, count]) => console.log(`  ${suffix}: ${count} tables`));

// 3. Auto-categorize tables
console.log('\n3. TABLE CATEGORIES (Auto-detected)');
console.log('-'.repeat(40));

const tableCategories = {
  'Facts': [],
  'Dimensions': [],
  'Views': [],
  'Snapshots': [],
  'Staging': [],
  'Reference': [],
  'Reports': [],
  'Aggregates': [],
  'Raw/Extract': [],
  'Temporary': [],
  'Archive': [],
  'Other': []
};

tables.forEach(t => {
  const name = t.table_name.toLowerCase();
  const schema = t.table_schema.toLowerCase();

  if (name.startsWith('fact_') || name.includes('_fact_')) {
    tableCategories['Facts'].push(t);
  } else if (name.startsWith('dim_') || name.includes('dimension')) {
    tableCategories['Dimensions'].push(t);
  } else if (name.endsWith('_vw') || name.includes('_view') || t.table_type === 'VIEW') {
    tableCategories['Views'].push(t);
  } else if (name.includes('_snp') || name.includes('snapshot')) {
    tableCategories['Snapshots'].push(t);
  } else if (name.includes('stg_') || name.includes('staging') || schema.includes('stg')) {
    tableCategories['Staging'].push(t);
  } else if (name.startsWith('ref_') || name.includes('reference') || schema.includes('reference')) {
    tableCategories['Reference'].push(t);
  } else if (name.includes('report') || schema.includes('report')) {
    tableCategories['Reports'].push(t);
  } else if (name.includes('_agg') || name.includes('aggregate') || name.includes('summary')) {
    tableCategories['Aggregates'].push(t);
  } else if (name.startsWith('ext') || name.includes('raw') || name.includes('extract')) {
    tableCategories['Raw/Extract'].push(t);
  } else if (name.includes('tmp_') || name.includes('temp')) {
    tableCategories['Temporary'].push(t);
  } else if (schema.includes('archive') || name.includes('archive')) {
    tableCategories['Archive'].push(t);
  } else {
    tableCategories['Other'].push(t);
  }
});

Object.entries(tableCategories)
  .filter(([_, tables]) => tables.length > 0)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([category, tables]) => {
    console.log(`  ${category}: ${tables.length} tables`);
  });

// 4. Detect business domains from column names
console.log('\n4. BUSINESS DOMAINS DISCOVERED');
console.log('-'.repeat(40));

const businessDomains = {
  'Leads': new Set(),
  'Sales/Contracts': new Set(),
  'Customers/Accounts': new Set(),
  'Employees/HR': new Set(),
  'Service/Work Orders': new Set(),
  'Finance/AR': new Set(),
  'Geography/Branch': new Set(),
  'Termite/PNI': new Set(),
  'Proposals': new Set(),
  'Inspections': new Set(),
  'Products/Services': new Set(),
  'Scheduling': new Set()
};

columns.forEach(col => {
  const name = col.column_name.toLowerCase();
  const table = `${col.table_schema}.${col.table_name}`;

  if (name.includes('lead') && !name.includes('leader')) {
    businessDomains['Leads'].add(table);
  }
  if (name.includes('sale') || name.includes('contract') || name.includes('agreement')) {
    businessDomains['Sales/Contracts'].add(table);
  }
  if (name.includes('customer') || name.includes('account') || name.includes('client')) {
    businessDomains['Customers/Accounts'].add(table);
  }
  if (name.includes('employee') || name.includes('tech') || name.includes('rep_') || name.includes('worker')) {
    businessDomains['Employees/HR'].add(table);
  }
  if (name.includes('work_order') || name.includes('workorder') || name.includes('wo_') || name.includes('service_')) {
    businessDomains['Service/Work Orders'].add(table);
  }
  if (name.includes('revenue') || name.includes('ar_') || name.includes('invoice') || name.includes('payment') || name.includes('receivable')) {
    businessDomains['Finance/AR'].add(table);
  }
  if (name.includes('branch') || name.includes('region') || name.includes('market') || name.includes('territory')) {
    businessDomains['Geography/Branch'].add(table);
  }
  if (name.includes('termite') || name.includes('pni') || name.includes('renewal')) {
    businessDomains['Termite/PNI'].add(table);
  }
  if (name.includes('proposal')) {
    businessDomains['Proposals'].add(table);
  }
  if (name.includes('inspect')) {
    businessDomains['Inspections'].add(table);
  }
  if (name.includes('product') || name.includes('service_type') || name.includes('pest_')) {
    businessDomains['Products/Services'].add(table);
  }
  if (name.includes('schedule') || name.includes('appointment') || name.includes('slot')) {
    businessDomains['Scheduling'].add(table);
  }
});

Object.entries(businessDomains)
  .map(([domain, tables]) => [domain, tables.size])
  .sort((a, b) => b[1] - a[1])
  .forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count} tables`);
  });

// 5. Analyze data freshness
console.log('\n5. DATA FRESHNESS ANALYSIS');
console.log('-'.repeat(40));

const freshnessAnalysis = metadata.map(m => ({
  dataset: m.dataset_id,
  table: m.table_id,
  days_since_modified: parseInt(m.days_since_modified) || 0,
  row_count: parseInt(m.row_count) || 0,
  size_gb: parseFloat(m.size_gb) || 0
}));

const activeCount = freshnessAnalysis.filter(t => t.days_since_modified <= 7).length;
const recentCount = freshnessAnalysis.filter(t => t.days_since_modified > 7 && t.days_since_modified <= 30).length;
const staleCount = freshnessAnalysis.filter(t => t.days_since_modified > 90).length;

console.log(`  Active (modified in 7 days): ${activeCount} tables`);
console.log(`  Recent (8-30 days): ${recentCount} tables`);
console.log(`  Stale (90+ days): ${staleCount} tables`);

// 6. Find largest tables
console.log('\n6. LARGEST TABLES');
console.log('-'.repeat(40));

const largestTables = freshnessAnalysis
  .filter(t => t.row_count > 0)
  .sort((a, b) => b.row_count - a.row_count)
  .slice(0, 20);

console.log('\nBy Row Count:');
largestTables.forEach((t, i) => {
  console.log(`  ${i + 1}. ${t.dataset}.${t.table}: ${t.row_count.toLocaleString()} rows (${t.size_gb.toFixed(2)} GB)`);
});

const largestBySize = freshnessAnalysis
  .filter(t => t.size_gb > 0)
  .sort((a, b) => b.size_gb - a.size_gb)
  .slice(0, 20);

console.log('\nBy Storage Size:');
largestBySize.forEach((t, i) => {
  console.log(`  ${i + 1}. ${t.dataset}.${t.table}: ${t.size_gb.toFixed(2)} GB (${t.row_count.toLocaleString()} rows)`);
});

// 7. Discover relationships (FK patterns)
console.log('\n7. POTENTIAL RELATIONSHIPS DISCOVERED');
console.log('-'.repeat(40));

const relationships = [];
const fkPatterns = ['_id', '_key', '_code', '_number', '_num'];

columns.forEach(col => {
  const name = col.column_name.toLowerCase();

  for (const pattern of fkPatterns) {
    if (name.endsWith(pattern)) {
      const potentialEntity = name.replace(new RegExp(`${pattern}$`), '');

      // Find matching tables
      const matches = tables.filter(t =>
        t.table_name.toLowerCase().includes(potentialEntity) ||
        t.table_name.toLowerCase().includes(potentialEntity.replace(/_/g, ''))
      );

      if (matches.length > 0 && matches.length <= 5) {
        relationships.push({
          from_table: `${col.table_schema}.${col.table_name}`,
          column: col.column_name,
          potential_targets: matches.map(m => `${m.table_schema}.${m.table_name}`).slice(0, 3)
        });
      }
    }
  }
});

// Deduplicate and limit
const uniqueRelationships = [];
const seenKeys = new Set();
relationships.forEach(r => {
  const key = `${r.from_table}.${r.column}`;
  if (!seenKeys.has(key)) {
    seenKeys.add(key);
    uniqueRelationships.push(r);
  }
});

console.log(`  Found ${uniqueRelationships.length} potential relationships`);
console.log('\nSample relationships:');
uniqueRelationships.slice(0, 10).forEach(r => {
  console.log(`  ${r.from_table}.${r.column} -> ${r.potential_targets.join(', ')}`);
});

// 8. Dataset summary
console.log('\n8. DATASET SUMMARY');
console.log('-'.repeat(40));

const datasetSummary = {};
tables.forEach(t => {
  if (!datasetSummary[t.table_schema]) {
    datasetSummary[t.table_schema] = {
      table_count: 0,
      view_count: 0,
      total_rows: 0,
      total_size_gb: 0
    };
  }
  datasetSummary[t.table_schema].table_count++;
  if (t.table_type === 'VIEW') {
    datasetSummary[t.table_schema].view_count++;
  }
});

// Add row counts and sizes from metadata
metadata.forEach(m => {
  if (datasetSummary[m.dataset_id]) {
    datasetSummary[m.dataset_id].total_rows += parseInt(m.row_count) || 0;
    datasetSummary[m.dataset_id].total_size_gb += parseFloat(m.size_gb) || 0;
  }
});

const sortedDatasets = Object.entries(datasetSummary)
  .sort((a, b) => b[1].table_count - a[1].table_count)
  .slice(0, 30);

console.log('\nTop 30 Datasets by Table Count:');
sortedDatasets.forEach(([ds, stats]) => {
  console.log(`  ${ds}: ${stats.table_count} tables, ${stats.total_rows.toLocaleString()} rows, ${stats.total_size_gb.toFixed(2)} GB`);
});

// 9. Generate comprehensive analysis JSON
const analysisOutput = {
  summary: {
    total_datasets: datasets.length,
    total_tables: tables.length,
    total_columns: columns.length,
    total_views: views.length,
    total_routines: routines.length,
    total_rows: freshnessAnalysis.reduce((sum, t) => sum + t.row_count, 0),
    total_size_gb: freshnessAnalysis.reduce((sum, t) => sum + t.size_gb, 0),
    data_freshness: {
      active_7_days: activeCount,
      recent_8_30_days: recentCount,
      stale_90_plus: staleCount
    }
  },
  naming_patterns: {
    top_prefixes: topPrefixes.slice(0, 30),
    top_suffixes: topSuffixes.slice(0, 30)
  },
  table_categories: Object.fromEntries(
    Object.entries(tableCategories)
      .filter(([_, t]) => t.length > 0)
      .map(([cat, t]) => [cat, { count: t.length, tables: t.map(x => `${x.table_schema}.${x.table_name}`).slice(0, 50) }])
  ),
  business_domains: Object.fromEntries(
    Object.entries(businessDomains)
      .map(([domain, tables]) => [domain, { count: tables.size, tables: Array.from(tables).slice(0, 100) }])
  ),
  datasets: sortedDatasets.map(([name, stats]) => ({
    name,
    ...stats,
    tables: tables.filter(t => t.table_schema === name).map(t => t.table_name)
  })),
  largest_tables: {
    by_rows: largestTables,
    by_size: largestBySize
  },
  relationships: uniqueRelationships.slice(0, 500),
  views_list: views.map(v => ({
    schema: v.table_schema,
    name: v.table_name,
    definition_preview: (v.view_definition || '').substring(0, 500)
  })),
  routines_list: routines.map(r => ({
    schema: r.routine_schema,
    name: r.routine_name,
    type: r.routine_type
  }))
};

// Save comprehensive analysis
fs.writeFileSync(
  path.join(discoveryDir, 'complete-analysis.json'),
  JSON.stringify(analysisOutput, null, 2)
);

console.log('\n\n✅ Complete analysis saved to complete-analysis.json');

// Generate human-readable markdown
const markdown = `# Complete BigQuery Data Discovery

**Generated:** ${new Date().toISOString()}
**Project:** bidata-sharedus-production

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Datasets | ${analysisOutput.summary.total_datasets} |
| Total Tables | ${analysisOutput.summary.total_tables} |
| Total Columns | ${analysisOutput.summary.total_columns} |
| Total Views | ${analysisOutput.summary.total_views} |
| Total Routines | ${analysisOutput.summary.total_routines} |
| Total Rows | ${analysisOutput.summary.total_rows.toLocaleString()} |
| Total Storage | ${analysisOutput.summary.total_size_gb.toFixed(2)} GB |

---

## Data Freshness

| Category | Tables |
|----------|--------|
| Active (modified in 7 days) | ${analysisOutput.summary.data_freshness.active_7_days} |
| Recent (8-30 days) | ${analysisOutput.summary.data_freshness.recent_8_30_days} |
| Stale (90+ days) | ${analysisOutput.summary.data_freshness.stale_90_plus} |

---

## Table Categories

${Object.entries(analysisOutput.table_categories)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([cat, data]) => `### ${cat}: ${data.count} tables
${data.tables.slice(0, 10).map(t => `- \`${t}\``).join('\n')}
${data.count > 10 ? `- ... and ${data.count - 10} more` : ''}
`).join('\n')}

---

## Business Domains

${Object.entries(analysisOutput.business_domains)
  .filter(([_, data]) => data.count > 0)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([domain, data]) => `### ${domain}: ${data.count} tables
${data.tables.slice(0, 10).map(t => `- \`${t}\``).join('\n')}
${data.count > 10 ? `- ... and ${data.count - 10} more` : ''}
`).join('\n')}

---

## Top Datasets

| Dataset | Tables | Rows | Size (GB) |
|---------|--------|------|-----------|
${sortedDatasets.map(([name, stats]) =>
  `| ${name} | ${stats.table_count} | ${stats.total_rows.toLocaleString()} | ${stats.total_size_gb.toFixed(2)} |`
).join('\n')}

---

## Largest Tables by Row Count

| Rank | Table | Rows | Size (GB) |
|------|-------|------|-----------|
${largestTables.map((t, i) =>
  `| ${i + 1} | ${t.dataset}.${t.table} | ${t.row_count.toLocaleString()} | ${t.size_gb.toFixed(2)} |`
).join('\n')}

---

## Naming Patterns

### Common Prefixes
${topPrefixes.slice(0, 15).map(([prefix, count]) => `- **${prefix}**: ${count} tables`).join('\n')}

### Common Suffixes
${topSuffixes.slice(0, 15).map(([suffix, count]) => `- **${suffix}**: ${count} tables`).join('\n')}

---

## Views (${views.length} total)

${views.slice(0, 20).map(v => `- \`${v.table_schema}.${v.table_name}\``).join('\n')}
${views.length > 20 ? `\n... and ${views.length - 20} more views` : ''}

---

## Routines (${routines.length} total)

${routines.map(r => `- \`${r.routine_schema}.${r.routine_name}\` (${r.routine_type})`).join('\n')}

---

## Potential Relationships

${uniqueRelationships.slice(0, 30).map(r =>
  `- \`${r.from_table}.${r.column}\` -> ${r.potential_targets.join(', ')}`
).join('\n')}

---

*Discovery complete. See \`complete-analysis.json\` for full machine-readable data.*
`;

fs.writeFileSync(
  path.join(discoveryDir, 'COMPLETE-DISCOVERY.md'),
  markdown
);

console.log('✅ Human-readable documentation saved to COMPLETE-DISCOVERY.md\n');

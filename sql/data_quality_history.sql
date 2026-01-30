-- Data Quality Historical Tracking Table
-- Stores daily snapshots of data quality scores for trend analysis
--
-- Run this script in BigQuery Console to create the table:
-- https://console.cloud.google.com/bigquery
--
-- Project: bidata-sharedus-production
-- Dataset: governance (create if doesn't exist)
-- Table: data_quality_history

-- Create dataset if it doesn't exist
CREATE SCHEMA IF NOT EXISTS `bidata-sharedus-production.governance`
OPTIONS (
  description = 'Data governance and quality tracking',
  location = 'US'
);

-- Create historical tracking table
CREATE TABLE IF NOT EXISTS `bidata-sharedus-production.governance.data_quality_history` (
  -- Snapshot metadata
  snapshot_date DATE NOT NULL,
  snapshot_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),

  -- Dimension details
  dimension STRING NOT NULL,
  current_score FLOAT64 NOT NULL,
  target FLOAT64 NOT NULL,

  -- Issue tracking
  top_issue STRING,
  affected_records INT64,

  -- Trend indicators
  score_change_1d FLOAT64,    -- Change from previous day
  score_change_7d FLOAT64,    -- Change from 7 days ago
  score_change_30d FLOAT64,   -- Change from 30 days ago

  -- Status flags
  target_met BOOL NOT NULL,
  alert_triggered BOOL DEFAULT FALSE,
  alert_reason STRING,

  -- Metadata
  data_source STRING DEFAULT 'bigquery',
  calculation_duration_ms INT64,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY snapshot_date
CLUSTER BY dimension, snapshot_date
OPTIONS (
  description = 'Daily snapshots of data quality scores across all dimensions',
  partition_expiration_days = 1095  -- Keep 3 years of history
);

-- Create index on snapshot_date for faster queries
-- BigQuery automatically optimizes queries on partitioned/clustered columns

-- Sample query to retrieve 90-day trends
/*
SELECT
  snapshot_date,
  dimension,
  current_score,
  target,
  score_change_7d,
  target_met
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  AND dimension = 'Completeness'
ORDER BY snapshot_date ASC;
*/

-- Sample query for all dimensions comparison
/*
SELECT
  dimension,
  AVG(current_score) as avg_score_90d,
  MIN(current_score) as min_score_90d,
  MAX(current_score) as max_score_90d,
  COUNTIF(target_met) / COUNT(*) * 100 as target_met_pct
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY dimension
ORDER BY avg_score_90d DESC;
*/

-- Sample query to detect quality regressions
/*
SELECT
  snapshot_date,
  dimension,
  current_score,
  score_change_7d,
  top_issue
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  AND score_change_7d < -5  -- Alert if score dropped more than 5% in a week
ORDER BY score_change_7d ASC;
*/

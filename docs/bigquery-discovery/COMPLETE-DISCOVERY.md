# Complete BigQuery Data Discovery

**Generated:** 2026-01-22T17:35:13.495Z
**Project:** bidata-sharedus-production

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Datasets | 66 |
| Total Tables | 1873 |
| Total Columns | 61101 |
| Total Views | 657 |
| Total Routines | 62 |
| Total Rows | 37,281,027,751 |
| Total Storage | 9913.63 GB |

---

## Data Freshness

| Category | Tables |
|----------|--------|
| Active (modified in 7 days) | 2778 |
| Recent (8-30 days) | 3347 |
| Stale (90+ days) | 595 |

---

## Table Categories

### Other: 813 tables
- `BCG_RTD_DB.250908_1900 CC_TMX_WorkOrder_Export`
- `BCG_RTD_DB.250910_salesteamask`
- `BCG_RTD_DB.250911_cc_techrouting`
- `BCG_RTD_DB.250911_cc_techrouting_helper`
- `BCG_RTD_DB.250911_cc_techrouting_helper_tmx`
- `BCG_RTD_DB.BCG_EmployeePayData_NT`
- `BCG_RTD_DB.CC_test1`
- `BCG_RTD_DB.DR_BranchWOCompleted`
- `BCG_RTD_DB.DR_CCM_Test`
- `BCG_RTD_DB.DR_Cancels`
- ... and 803 more

### Views: 552 tables
- `Bundle_Analysis.InitialBundleMapping`
- `CommercialExport.unf_WorkOrder_MappedWithCustomer_RowNumberNew`
- `CommercialWorkOrderDate.Joined_Customers_Clean`
- `CommercialWorkOrderDate.Joined_Iris_Mission_PP_Customers`
- `CommercialWorkOrderDate.Joined_Iris_Mission_PP_Customers_ID_3`
- `CommercialWorkOrderDate.MappingOfCustomersV1`
- `CommercialWorkOrderDate.Vw_tdw_Contract_V2_InactiveIncluded`
- `CommercialWorkOrderDate.vw_rpp_Contract_V2_InactiveIncluded`
- `CommercialWorkOrderDate.vw_unf_ContractWithInactive`
- `CommercialWorkOrderDate.vw_unf_ContractWithInactive_TimeFrame_YearlyCost`
- ... and 542 more

### Facts: 185 tables
- `Archive.Fact_Leads_Acc_Daily_Agg_Vw_2025`
- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025`
- `Deprecated.Fact_Leads_Acc_Daily_Agg_Snp_Backup_20251001`
- `Deprecated.Fact_Leads_Acc_Daily_Agg_Vw_Backup_20250925`
- `Deprecated.Fact_Leads_Acc_Daily_Agg_Vw_Backup_20251001`
- `Deprecated.Fact_Leads_Acc_Daily_Dtls_Snp_Backup_20250925`
- `Deprecated.Fact_Leads_Acc_Daily_Dtls_Snp_Backup_20251001`
- `Deprecated.Fact_Leads_Acc_Daily_Dtls_Snp_copy_20251027`
- `Deprecated.Fact_Leads_Acc_Daily_Dtls_Vw_Backup_20250925`
- `Deprecated.Fact_Leads_Acc_Daily_Dtls_Vw_Backup_20251001`
- ... and 175 more

### Raw/Extract: 150 tables
- `S0.ExtRaw_Azuga_Trips`
- `S0.ExtRaw_RTX_BranchHierarchy`
- `S0.ExtRaw_RTX_BranchHierarchy_ChangeLog`
- `S0.ExtRaw_RTX_BranchHierarchy_backup`
- `S0.ExtRaw_RTX_BranchHierarchy_iConnect`
- `S0.ExtRaw_RTX_SVCCode_Mapping`
- `S0.ExtRaw_wrkday_Employee_extended`
- `S0.ExtRaw_wrkday_payrollbyperiod_extended`
- `S0.ExtRaw_wrkday_payrollbyperiod_extended_history`
- `S0.ExtRaw_wrkday_prepayrollbyday_extended`
- ... and 140 more

### Staging: 65 tables
- `S1.Stg_RTX_BranchHierarchy_daily`
- `S1.Stg_RTX_BranchHierarchy_daily_backup`
- `S1.Stg_RTX_SVCCode_Mapping_Daily`
- `S1.stg_MSN_AppointmentDetail_Hourly`
- `S1.stg_MSN_Appointment_Daily`
- `S1.stg_RPM_AppointmentDetail_Hourly`
- `S1.stg_RPM_Appointment_Daily`
- `S1.stg_RPM_WorkOrderItem_Hourly`
- `S1.stg_RPM_WorkOrderItem_Hourly_bkup`
- `S1.stg_gl_selection_detail`
- ... and 55 more

### Reference: 44 tables
- `CX_Retention_ReferenceTbls.Mission_TC_Collections`
- `CX_Retention_ReferenceTbls.October_Special_PI`
- `CX_Retention_ReferenceTbls.TC_Forecast_Branch_Reassignment_Metadata`
- `CX_Retention_ReferenceTbls.summer_sales_RPP`
- `CX_Retention_ReferenceTbls.summer_sales_TDW`
- `CX_Retention_ReferenceTbls.tdw_detractors`
- `Reference.GS_Ref_BranchHierarchy`
- `Reference.GS_Ref_BranchHierarchy_ChangeLog`
- `Reference.GS_Ref_BranchHierarchy_SatelliteOffices`
- `Reference.GS_Ref_Lead_Business`
- ... and 34 more

### Snapshots: 20 tables
- `Custom_Data_Tables.vw_snp_RPP_Portfolio_Activity_Monthly_v3_CT`
- `Custom_Data_Tables.vw_snp_RPP_Portfolio_Activity_Monthly_vAMSvcCodeNoOutlierAddDates`
- `Custom_Data_Tables.vw_snp_RPP_Portfolio_Activity_Monthly_vAMUpdated`
- `Custom_Data_Tables.vw_snp_RPP_Portfolio_Activity_Monthly_vAMnoGapsServiceLine`
- `Custom_Data_Tables.vw_snp_vAMTEST`
- `Playground.RouteProgress_SnapShot_of_April2023_Data`
- `Playground.RouteProgress_SnapShot_of_April2024_Data`
- `S2.snp_TDW_Portfolio_Monthly_bak_snpdate20250401`
- `S2.snp_TDW_Portfolio_Monthly_snpdate20241101`
- `S2.snp_TDW_Portfolio_Monthly_snpdate20241201`
- ... and 10 more

### Dimensions: 15 tables
- `S4.Dim_Branch_BranchID_NA_T1_Vw`
- `S4.Dim_Employee`
- `S4.Dim_Employee_t2`
- `S4.Dim_Product_Mission_PestPac_Service_Map`
- `S4.Dim_RIR_Branch_Ext`
- `S4.Dim_RTX_AC_Month`
- `S4.Dim_RTX_Time`
- `S4.Dim_ServiceCode_Hierarchy`
- `S4.dim_branch`
- `S4.dim_branch_nps_test`
- ... and 5 more

### Aggregates: 14 tables
- `BCG_RTD_DB.MRLTVSummary`
- `BCG_RTD_DB.MRLTVSummaryTable_V2`
- `BCG_RTD_DB.MRLTVSummaryTable_V2_BrandGrouping`
- `BCG_RTD_DB.MRLTVSummaryTable_V3`
- `BCG_RTD_DB.MRLTVSummaryTable_V4`
- `BCG_RTD_DB.MRLTVSummaryTable_V4_HHIConsolidated`
- `BCG_RTD_DB.MRLTVSummary_2021plus`
- `BCG_RTD_DB.MRLTVSummary_2021plusBranchExcl`
- `BCG_RTD_DB.MRLTVSummary_2021plusBranchExcl_CohortMonth`
- `BCG_RTD_DB.MRLTVSummary_2021plusBranchExcl_CohortMonth_FullYearEligible`
- ... and 4 more

### Temporary: 9 tables
- `Custom_Data_Tables.Vw_TDW_Portfolio_Monthly_v2_ActiveResOnly_TemplateCode_Deduped_vAM`
- `Custom_Data_Tables.snp_TDW_Portfolio_Monthly_ActiveRESOnly_withTemplateCode_vAM`
- `S0.ProspectPipelineNA9_temp_copy`
- `S0.pestpac_AccessTemplates`
- `S0_TMX.temp_tmx_customer`
- `Test.tmp_tmxGLIncomeStatementFact_src`
- `Test.tmp_tmxGLIncomeStatementFact_src_hash`
- `Test.tmp_tmxGLIncomeStatementFact_tgt`
- `Test.tmp_tmxGLIncomeStatementFact_tgt_hash`


### Reports: 6 tables
- `Custom_Data_Tables.savesreport2025YTD_vAM`
- `S0.nade_report_refresh_config`
- `S0.nade_report_refresh_log`
- `S0_RNA.cash_report`
- `S0_TMX.Cnt_Table_Rows_Report`
- `S0_TMX.Cnt_Table_Rows_Report_Target`



---

## Business Domains

### Geography/Branch: 1070 tables
- `Archive.Fact_Leads_Acc_Daily_Agg_Vw_2025`
- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025`
- `BCG_RTD_DB.250910_salesteamask`
- `BCG_RTD_DB.250911_cc_techrouting`
- `BCG_RTD_DB.250911_cc_techrouting_helper`
- `BCG_RTD_DB.BCG_EmployeePayData_NT`
- `BCG_RTD_DB.DR_BranchWOCompleted`
- `BCG_RTD_DB.DR_CCM_Test`
- `BCG_RTD_DB.DR_Cancels`
- `BCG_RTD_DB.DR_Cancels_Test`
- ... and 1060 more

### Sales/Contracts: 931 tables
- `Archive.Fact_Leads_Acc_Daily_Agg_Vw_2025`
- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025`
- `BCG_RTD_DB.250908_1900 CC_TMX_WorkOrder_Export`
- `BCG_RTD_DB.250910_salesteamask`
- `BCG_RTD_DB.250911_cc_techrouting`
- `BCG_RTD_DB.250911_cc_techrouting_helper`
- `BCG_RTD_DB.250911_cc_techrouting_helper_tmx`
- `BCG_RTD_DB.CC_test1`
- `BCG_RTD_DB.DR_Cancels`
- `BCG_RTD_DB.DR_Cancels_Test`
- ... and 921 more

### Customers/Accounts: 863 tables
- `BCG_RTD_DB.250908_1900 CC_TMX_WorkOrder_Export`
- `BCG_RTD_DB.250911_cc_techrouting_helper_tmx`
- `BCG_RTD_DB.DR_CCM_Test`
- `BCG_RTD_DB.DR_Cancels`
- `BCG_RTD_DB.DR_Cancels_Test`
- `BCG_RTD_DB.DR_ContractSales`
- `BCG_RTD_DB.DR_GLActivity`
- `BCG_RTD_DB.DR_LeadsQuery20250825`
- `BCG_RTD_DB.DR_Leads_test`
- `BCG_RTD_DB.DR_PNI`
- ... and 853 more

### Service/Work Orders: 837 tables
- `BCG_RTD_DB.250908_1900 CC_TMX_WorkOrder_Export`
- `BCG_RTD_DB.250911_cc_techrouting`
- `BCG_RTD_DB.250911_cc_techrouting_helper`
- `BCG_RTD_DB.250911_cc_techrouting_helper_tmx`
- `BCG_RTD_DB.DR_ContractSales`
- `BCG_RTD_DB.DR_PNI`
- `BCG_RTD_DB.DR_RevProjection`
- `BCG_RTD_DB.DR_TechWorkOrders`
- `BCG_RTD_DB.DR_WOSupervisor`
- `BCG_RTD_DB.DR_WOTest`
- ... and 827 more

### Employees/HR: 687 tables
- `Archive.Fact_Leads_Acc_Daily_Agg_Vw_2025`
- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025`
- `BCG_RTD_DB.250908_1900 CC_TMX_WorkOrder_Export`
- `BCG_RTD_DB.250910_salesteamask`
- `BCG_RTD_DB.250911_cc_techrouting`
- `BCG_RTD_DB.250911_cc_techrouting_helper`
- `BCG_RTD_DB.250911_cc_techrouting_helper_tmx`
- `BCG_RTD_DB.BCG_EmployeePayData_NT`
- `BCG_RTD_DB.DR_BranchWOCompleted`
- `BCG_RTD_DB.DR_CCM_Test`
- ... and 677 more

### Products/Services: 655 tables
- `Archive.Fact_Leads_Acc_Daily_Agg_Vw_2025`
- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025`
- `BCG_RTD_DB.250908_1900 CC_TMX_WorkOrder_Export`
- `BCG_RTD_DB.250910_salesteamask`
- `BCG_RTD_DB.250911_cc_techrouting`
- `BCG_RTD_DB.250911_cc_techrouting_helper`
- `BCG_RTD_DB.250911_cc_techrouting_helper_tmx`
- `BCG_RTD_DB.DR_ContractSales`
- `BCG_RTD_DB.DR_Leads`
- `BCG_RTD_DB.DR_LeadsWO`
- ... and 645 more

### Finance/AR: 488 tables
- `BCG_RTD_DB.250908_1900 CC_TMX_WorkOrder_Export`
- `BCG_RTD_DB.250911_cc_techrouting`
- `BCG_RTD_DB.250911_cc_techrouting_helper`
- `BCG_RTD_DB.250911_cc_techrouting_helper_tmx`
- `BCG_RTD_DB.BCG_EmployeePayData_NT`
- `BCG_RTD_DB.DR_ContractSales`
- `BCG_RTD_DB.DR_GLActivity`
- `BCG_RTD_DB.DR_LeadsQuery20250825`
- `BCG_RTD_DB.DR_PNI`
- `BCG_RTD_DB.DR_Sales20250826`
- ... and 478 more

### Leads: 442 tables
- `Archive.Fact_Leads_Acc_Daily_Agg_Vw_2025`
- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025`
- `BCG_RTD_DB.250910_salesteamask`
- `BCG_RTD_DB.DR_Leads`
- `BCG_RTD_DB.DR_LeadsQuery20250825`
- `BCG_RTD_DB.DR_LeadsWO`
- `BCG_RTD_DB.DR_Leads_SM_20251120`
- `BCG_RTD_DB.DR_Leads_copy`
- `BCG_RTD_DB.DR_Leads_test`
- `BCG_RTD_DB.MRLTVConversion`
- ... and 432 more

### Scheduling: 397 tables
- `Archive.Fact_Leads_Acc_Daily_Agg_Vw_2025`
- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025`
- `BCG_RTD_DB.250908_1900 CC_TMX_WorkOrder_Export`
- `BCG_RTD_DB.250910_salesteamask`
- `BCG_RTD_DB.250911_cc_techrouting`
- `BCG_RTD_DB.250911_cc_techrouting_helper`
- `BCG_RTD_DB.250911_cc_techrouting_helper_tmx`
- `BCG_RTD_DB.DR_ContractSales`
- `BCG_RTD_DB.DR_Leads`
- `BCG_RTD_DB.DR_LeadsQuery20250825`
- ... and 387 more

### Termite/PNI: 174 tables
- `BCG_RTD_DB.DR_ContractSales`
- `BCG_RTD_DB.DR_PNI`
- `CommercialExport.unf_Contract_TimeFrame_v1`
- `CommercialWorkOrderDate.Vw_tdw_Contract_V2_InactiveIncluded`
- `CommercialWorkOrderDate.vw_rpp_Contract_V2_InactiveIncluded`
- `CommercialWorkOrderDate.vw_unf_ContractWithInactive`
- `CommercialWorkOrderDate.vw_unf_ContractWithInactive_TimeFrame_YearlyCost`
- `CommercialWorkOrderDate.vw_unf_Contract_V2_InactiveIncluded_TimeFrame`
- `CustomARTables.vw_rpp_daily_ar_vHB`
- `Custom_Data_Tables.Prorated_Per_Year_HY`
- ... and 164 more

### Inspections: 121 tables
- `Archive.Fact_Leads_Acc_Daily_Agg_Vw_2025`
- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025`
- `BCG_RTD_DB.250910_salesteamask`
- `BCG_RTD_DB.DR_Leads`
- `BCG_RTD_DB.DR_LeadsQuery20250825`
- `BCG_RTD_DB.DR_LeadsWO`
- `BCG_RTD_DB.DR_Leads_SM_20251120`
- `BCG_RTD_DB.DR_Leads_copy`
- `BCG_RTD_DB.DR_Leads_test`
- `BCG_RTD_DB.MRLTVConversion`
- ... and 111 more

### Proposals: 48 tables
- `S0.ProspectPipelineNA9_temp_copy`
- `S0.Raw_RTXSF_Opportunity_Daily`
- `S0.Raw_RTXSF_QuoteLineItem_Daily`
- `S0.SalesExecAPIExtract_PNS`
- `S0.SalesExecAPIExtract_PNS_RN`
- `S0.SalesExecAPIExtract_copy`
- `S0.ext_InspectionProductQuestions`
- `S0.ext_InspectionProducts`
- `S0.ext_tmx_lead`
- `S0.ext_tmx_lead_activity_fact`
- ... and 38 more


---

## Top Datasets

| Dataset | Tables | Rows | Size (GB) |
|---------|--------|------|-----------|
| S0 | 280 | 5,666,590,434 | 2619.94 |
| S0_TMX | 255 | 9,300,350,004 | 3396.96 |
| S1 | 169 | 267,540,903 | 162.99 |
| S4 | 163 | 177,355,899 | 18.61 |
| S2 | 125 | 2,203,417,030 | 257.35 |
| S3 | 102 | 4,409,668,548 | 634.04 |
| Custom_Data_Tables | 97 | 737,660,711 | 250.79 |
| Test | 71 | 185,274,921 | 54.54 |
| BCG_RTD_DB | 70 | 596,402,860 | 180.56 |
| stg_tmx | 54 | 14,523,752 | 4.33 |
| WorkOrderCustomerPulls | 39 | 89,902,580 | 26.63 |
| Reference | 38 | 40,984 | 0.00 |
| Reference_User_Managed | 38 | 227,072 | 0.05 |
| Reports | 34 | 0 | 0.00 |
| Validation | 22 | 1,878,077 | 1.74 |
| Custom_Portfolio_Pull_COM | 19 | 76,655,096 | 41.44 |
| New_W3_WorkOrderTaxonomy | 19 | 28,829,072 | 9.44 |
| HandoverFirstRoundCleaninginAlteryx | 16 | 22,312,766 | 7.35 |
| HandoverCustomerBranchlevelWOs | 14 | 212,971 | 0.04 |
| S0_RNA | 14 | 1,856,278,168 | 698.70 |
| Deprecated | 12 | 62,857,362 | 25.34 |
| HandoverBaseCleaningMarkettagging | 11 | 0 | 0.00 |
| HandoverPriceIncreaseChecker | 11 | 129,324,460 | 33.82 |
| Playground | 11 | 136,961,589 | 144.38 |
| CommercialWorkOrderDate | 10 | 0 | 0.00 |
| ForDimitriTeam_09_10 | 9 | 29,465,662 | 11.03 |
| ResidentialDataTables | 9 | 2,953 | 0.00 |
| W4_WO_Downalods | 9 | 0 | 0.00 |
| Week7_TenureAnalysis_NG | 9 | 126,765,129 | 35.29 |
| rspiperepos | 9 | 202,331 | 0.03 |

---

## Largest Tables by Row Count

| Rank | Table | Rows | Size (GB) |
|------|-------|------|-----------|
| 1 | S3.rtx_lead_uid_association_11_05_2024 | 3,343,174,030 | 510.37 |
| 2 | Procedures.scheduled_query_logs | 1,489,428,894 | 171.31 |
| 3 | S2.snp_TDW_Portfolio_Current | 1,428,013,889 | 144.77 |
| 4 | _script086101d632111dc3f1ba556411388c5906e899ac.episode_segments | 1,127,208,448 | 78.33 |
| 5 | _script10b36dd26e2d872d6dd6b90331148d829e78c4ef.episode_segments | 1,127,208,448 | 78.33 |
| 6 | _script84bb5b935630cf193f463bae8050596005237362.episode_segments | 1,127,208,448 | 78.33 |
| 7 | S0_RNA.aged_debt | 1,035,752,076 | 385.52 |
| 8 | _script086101d632111dc3f1ba556411388c5906e899ac.reg_episode_year_capped | 1,012,124,860 | 264.44 |
| 9 | _script8503901c4636a5c71ddb62c0087acfda40bc0986.reg_episode_year_capped | 932,907,808 | 239.45 |
| 10 | S0_TMX.tmx_wo_item | 779,429,848 | 371.13 |
| 11 | S0.tmx_wo_item | 779,100,040 | 372.15 |
| 12 | S0_TMX.tmx_dor_bkp_20251217 | 679,072,470 | 60.08 |
| 13 | S0.tmx_wo_item_bkp_20241204 | 624,775,119 | 298.24 |
| 14 | S0_TMX.tmx_wo_item_bkp_20241204 | 624,775,119 | 293.69 |
| 15 | S0_TMX.tmx_collections | 597,399,844 | 128.67 |
| 16 | _script8503901c4636a5c71ddb62c0087acfda40bc0986.episode_segments | 563,604,224 | 36.02 |
| 17 | S0_TMX.tmx_sa_item | 533,479,606 | 428.86 |
| 18 | S0.tmx_sa_item | 533,396,642 | 429.79 |
| 19 | Procedures.tmx_portfolio_activity_detail_deletions | 528,046,336 | 61.45 |
| 20 | S0_TMX.ValidateSalesResultInspectionQuestions | 468,275,430 | 66.30 |

---

## Naming Patterns

### Common Prefixes
- **vw**: 249 tables
- **tmx**: 240 tables
- **Fact**: 119 tables
- **rtx**: 65 tables
- **stg**: 64 tables
- **ext**: 61 tables
- **snp**: 43 tables
- **Raw**: 43 tables
- **pestpac**: 39 tables
- **unf**: 33 tables
- **Vw**: 29 tables
- **ztmx**: 28 tables
- **DR**: 27 tables
- **raw**: 27 tables
- **Tap**: 24 tables

### Common Suffixes
- **Daily**: 63 tables
- **Vw**: 55 tables
- **vAM**: 45 tables
- **attributes**: 43 tables
- **2025**: 36 tables
- **20250120**: 32 tables
- **ext**: 28 tables
- **20241204**: 26 tables
- **V2**: 24 tables
- **2024**: 20 tables
- **v2**: 20 tables
- **Monthly**: 19 tables
- **Dtl**: 18 tables
- **fact**: 17 tables
- **copy**: 16 tables

---

## Views (657 total)

- `Bundle_Analysis.InitialBundleMapping`
- `CommercialExport.unf_WorkOrder_MappedWithCustomer_RowNumberNew`
- `CommercialWorkOrderDate.Joined_Customers_Clean`
- `CommercialWorkOrderDate.Joined_Iris_Mission_PP_Customers`
- `CommercialWorkOrderDate.Joined_Iris_Mission_PP_Customers_ID_3`
- `CommercialWorkOrderDate.MappingOfCustomersV1`
- `CommercialWorkOrderDate.Vw_tdw_Contract_V2_InactiveIncluded`
- `CommercialWorkOrderDate.vw_rpp_Contract_V2_InactiveIncluded`
- `CommercialWorkOrderDate.vw_unf_ContractWithInactive`
- `CommercialWorkOrderDate.vw_unf_ContractWithInactive_TimeFrame_YearlyCost`
- `CommercialWorkOrderDate.vw_unf_Contract_V2_InactiveIncluded_TimeFrame`
- `CommercialWorkOrderDate.vw_unf_WorkOrder_MappedWithCustomer`
- `CustomARTables.VwUnf_ar_detail_vHB`
- `CustomARTables.vw_rpp_daily_ar_vHB`
- `CustomARTables.vw_tmx_ar_detail_vHB`
- `Custom_Data_Tables.Portfolio_TDW_HY`
- `Custom_Data_Tables.Prorated_Per_Year_HY`
- `Custom_Data_Tables.Prorated_Per_Year_HY_v3_2024`
- `Custom_Data_Tables.TDW_MasterContract_Customer_vHB`
- `Custom_Data_Tables.Test_Combined`

... and 637 more views

---

## Routines (62 total)

- `Functions.convertStringToHashkey` (FUNCTION)
- `Functions.timestampToMillisec` (FUNCTION)
- `Procedures.RNA_Employee_Data` (PROCEDURE)
- `Procedures.leads_ProspectPipeline_replication` (PROCEDURE)
- `Procedures.leads_ProspectPipeline_replication_v1` (PROCEDURE)
- `Procedures.leads_S2_to_S3_Sync` (PROCEDURE)
- `Procedures.leads_S2_to_S3_cleanup` (PROCEDURE)
- `Procedures.leads_copy_s0_to_s1` (PROCEDURE)
- `Procedures.leads_copy_s0_to_s1_history` (PROCEDURE)
- `Procedures.leads_copy_s0_to_s1_history_v2` (PROCEDURE)
- `Procedures.leads_copy_s0_to_s1_v2` (PROCEDURE)
- `Procedures.leads_copy_s0_to_s1_v3` (PROCEDURE)
- `Procedures.leads_copy_s0_to_s1_v4` (PROCEDURE)
- `Procedures.leads_copy_s0_to_s1_v5` (PROCEDURE)
- `Procedures.leads_full_truncate_reload_history` (PROCEDURE)
- `Procedures.leads_s2_to_s3_history_sync` (PROCEDURE)
- `Procedures.leads_s2_to_s3_sync` (PROCEDURE)
- `Procedures.leads_s3_rebuild_materialized_views` (PROCEDURE)
- `Procedures.leads_s4_snapshot` (PROCEDURE)
- `Procedures.leads_tmx_history` (PROCEDURE)
- `Procedures.leads_tmx_history_backup` (PROCEDURE)
- `Procedures.leads_tmx_incremental` (PROCEDURE)
- `Procedures.leads_tmx_incremental_LE_v5` (PROCEDURE)
- `Procedures.leads_tmx_incremental_LPP_v5` (PROCEDURE)
- `Procedures.leads_tmx_incremental_PNS` (PROCEDURE)
- `Procedures.leads_tmx_incremental_PNS_v1` (PROCEDURE)
- `Procedures.leads_tmx_incremental_SE_v5` (PROCEDURE)
- `Procedures.leads_tmx_incremental_SFRTX_OPP_v3` (PROCEDURE)
- `Procedures.leads_tmx_incremental_SFRTX_v3` (PROCEDURE)
- `Procedures.leads_tmx_incremental_TDW_v5` (PROCEDURE)
- `Procedures.leads_tmx_incremental_TMLE` (PROCEDURE)
- `Procedures.leads_tmx_incremental_v1` (PROCEDURE)
- `Procedures.leads_tmx_incremental_v2` (PROCEDURE)
- `Procedures.leads_tmx_incremental_v3` (PROCEDURE)
- `Procedures.leads_tmx_incremental_v4` (PROCEDURE)
- `Procedures.p_RNA_BasePortfolio_Snap_Monthly` (PROCEDURE)
- `Procedures.p_RNA_Portfolio_Activity_Daily` (PROCEDURE)
- `Procedures.p_TMX_BasePortfolio_Snap_Monthly` (PROCEDURE)
- `Procedures.p_TMX_BasePortfolio_Snap_Monthly_Rerun` (PROCEDURE)
- `Procedures.p_TMX_Portfolio_Activity_Daily` (PROCEDURE)
- `Procedures.p_TMX_Sales_KPI_Daily` (PROCEDURE)
- `Procedures.p_TMX_Sales_KPI_Daily_backup` (PROCEDURE)
- `Procedures.p_snp_RAP_Portfolio_History_refresh` (PROCEDURE)
- `Procedures.p_unf_ref_Activity_Map_refresh` (PROCEDURE)
- `Procedures.p_unf_ref_Lead_Dim_Mappings_refresh` (PROCEDURE)
- `Procedures.snp_Jedox_Portfolio_Snp_Na_Daily` (PROCEDURE)
- `Procedures.snp_RIR_Portfolio_Monthly` (PROCEDURE)
- `Procedures.snp_RPP_Portfolio_Activity_Daily` (PROCEDURE)
- `Procedures.snp_RPP_Portfolio_Monthly` (PROCEDURE)
- `Procedures.snp_TDW_Portfolio_Activity_Daily` (PROCEDURE)
- `Procedures.snp_TDW_Portfolio_Activity_Daily_Fix` (PROCEDURE)
- `Procedures.snp_TDW_Portfolio_Activity_StartedNewBus_Daily` (PROCEDURE)
- `Procedures.snp_TDW_Portfolio_Current` (PROCEDURE)
- `Procedures.snp_TDW_Portfolio_Monthly` (PROCEDURE)
- `Procedures.snp_TDW_Portfolio_Monthly_Rerun` (PROCEDURE)
- `Procedures.sp_AppointmentDetail_Hourly_S0Layer_To_S1Layer` (PROCEDURE)
- `Procedures.sp_Appointment_S0Layer_To_S1Layer` (PROCEDURE)
- `Procedures.sp_RouteAssignedTech` (PROCEDURE)
- `S0.sp_ndp_ingest` (PROCEDURE)
- `S0_TMX.UpdateTableCounts` (PROCEDURE)
- `S0_TMX.sp_rspr_dataload` (PROCEDURE)
- `S0_TMX.sp_rtx_s0_s1` (PROCEDURE)

---

## Potential Relationships

- `Archive.Fact_Leads_Acc_Daily_Dtls_Vw_2025.sales_employee_id` -> S1.TA_Mission_LeadSales_Employee, S1.vw_tdw_tap_sales_LeadSales_Employee
- `BCG_RTD_DB.250910_salesteamask.sales_employee_id` -> S1.TA_Mission_LeadSales_Employee, S1.vw_tdw_tap_sales_LeadSales_Employee
- `BCG_RTD_DB.BCG_EmployeePayData_NT.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `BCG_RTD_DB.DR_Cancels_Test.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `BCG_RTD_DB.DR_ContractSales.cancel_reason_code` -> Reference.GS_Ref_Lead_Cancel_Reason, Reference.GS_Ref_SA_Cancel_Reason, Reference.unf_ref_SA_Cancel_Reason
- `BCG_RTD_DB.DR_ContractSales.assigned_branch_code` -> Test.AssignedBranchVsServicedBranch
- `BCG_RTD_DB.DR_ContractSales.bill_to_code` -> ResidentialDataTables.Misclassified_BilltoIDs, S0.pestpac_BillTos, S0_TMX.BillTos_bkp20250130_BeforeRebranch
- `BCG_RTD_DB.DR_ContractSales.bill_to_id` -> ResidentialDataTables.Misclassified_BilltoIDs, S0.pestpac_BillTos, S0_TMX.BillTos_bkp20250130_BeforeRebranch
- `BCG_RTD_DB.DR_ContractSales.freq_code` -> Reference.GS_Ref_SA_Billing_Frequency, Reference.GS_Ref_SA_Service_Frequency, Reference.unf_ref_SA_Billing_Frequency
- `BCG_RTD_DB.DR_Leads.sales_employee_id` -> S1.TA_Mission_LeadSales_Employee, S1.vw_tdw_tap_sales_LeadSales_Employee
- `BCG_RTD_DB.DR_Leads.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `BCG_RTD_DB.DR_LeadsQuery20250825.sales_employee_id` -> S1.TA_Mission_LeadSales_Employee, S1.vw_tdw_tap_sales_LeadSales_Employee
- `BCG_RTD_DB.DR_LeadsWO.sales_employee_id` -> S1.TA_Mission_LeadSales_Employee, S1.vw_tdw_tap_sales_LeadSales_Employee
- `BCG_RTD_DB.DR_LeadsWO.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `BCG_RTD_DB.DR_Leads_SM_20251120.sales_employee_id` -> S1.TA_Mission_LeadSales_Employee, S1.vw_tdw_tap_sales_LeadSales_Employee
- `BCG_RTD_DB.DR_Leads_copy.sales_employee_id` -> S1.TA_Mission_LeadSales_Employee, S1.vw_tdw_tap_sales_LeadSales_Employee
- `BCG_RTD_DB.DR_Leads_copy.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `BCG_RTD_DB.DR_Leads_test.sales_employee_id` -> S1.TA_Mission_LeadSales_Employee, S1.vw_tdw_tap_sales_LeadSales_Employee
- `BCG_RTD_DB.DR_Sales20250826.assigned_branch_code` -> Test.AssignedBranchVsServicedBranch
- `BCG_RTD_DB.DR_SalesQuery20250825.assigned_branch_code` -> Test.AssignedBranchVsServicedBranch
- `BCG_RTD_DB.DR_WOSupervisor.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `BCG_RTD_DB.DR_WOTest.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `BCG_RTD_DB.DR_WorkOrders.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `BCG_RTD_DB.EmployeePayData_NT_weekdaysonly.Supervisor_ID` -> BCG_RTD_DB.DR_WOSupervisor
- `CommercialExport.unf_Contract_TimeFrame_v1.cancel_reason_code` -> Reference.GS_Ref_Lead_Cancel_Reason, Reference.GS_Ref_SA_Cancel_Reason, Reference.unf_ref_SA_Cancel_Reason
- `CommercialWorkOrderDate.Vw_tdw_Contract_V2_InactiveIncluded.cancel_reason_code` -> Reference.GS_Ref_Lead_Cancel_Reason, Reference.GS_Ref_SA_Cancel_Reason, Reference.unf_ref_SA_Cancel_Reason
- `CommercialWorkOrderDate.vw_rpp_Contract_V2_InactiveIncluded.freq_code` -> Reference.GS_Ref_SA_Billing_Frequency, Reference.GS_Ref_SA_Service_Frequency, Reference.unf_ref_SA_Billing_Frequency
- `CommercialWorkOrderDate.vw_unf_ContractWithInactive.freq_code` -> Reference.GS_Ref_SA_Billing_Frequency, Reference.GS_Ref_SA_Service_Frequency, Reference.unf_ref_SA_Billing_Frequency
- `CommercialWorkOrderDate.vw_unf_ContractWithInactive_TimeFrame_YearlyCost.freq_code` -> Reference.GS_Ref_SA_Billing_Frequency, Reference.GS_Ref_SA_Service_Frequency, Reference.unf_ref_SA_Billing_Frequency
- `CommercialWorkOrderDate.vw_unf_Contract_V2_InactiveIncluded_TimeFrame.freq_code` -> Reference.GS_Ref_SA_Billing_Frequency, Reference.GS_Ref_SA_Service_Frequency, Reference.unf_ref_SA_Billing_Frequency

---

*Discovery complete. See `complete-analysis.json` for full machine-readable data.*

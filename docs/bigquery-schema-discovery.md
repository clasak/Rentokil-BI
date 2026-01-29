# BigQuery Schema Discovery - bidata-sharedus-dev

**Generated:** 2026-01-22
**Project:** bidata-sharedus-dev
**Total Datasets:** 60

**Total Tables/Views:** 1872

---

## Priority Datasets for Dashboard

### AR
**Location:** US
**Last Modified:** 2026-01-14
**Tables:** 0 | **Views:** 2

#### DailyAR_vw
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| RTX_Branch_Codes | INTEGER | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| CUSTNUM | STRING | NULLABLE |
| Customer_Name | STRING | NULLABLE |
| date | STRING | NULLABLE |
| ARSBAL | FLOAT | NULLABLE |
| SA | STRING | NULLABLE |
| PASTDUE | FLOAT | NULLABLE |
| FUTURE | FLOAT | NULLABLE |
| PDBUCKET | STRING | NULLABLE |
| LOB | STRING | NULLABLE |
| source_code | STRING | NULLABLE |
| newco_code | STRING | NULLABLE |
| source_system | STRING | NULLABLE |

#### TopTenCustomers_ARBalance
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| custnum | STRING | NULLABLE |
| CustomeName | STRING | NULLABLE |
| AR_Balance | FLOAT | NULLABLE |

---

### Branch_S0
**Location:** US
**Last Modified:** 2024-01-02
**Tables:** 2 | **Views:** 0

#### Exraw_RTX_Branch_Daily
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| CurrentState_MarketCode | STRING | NULLABLE |
| RTX_MarketCode | STRING | NULLABLE |
| RTX_MarketName | STRING | NULLABLE |
| CurrentState_RegionCode | STRING | NULLABLE |
| RTX_RegionCode | STRING | NULLABLE |
| RTX_RegionName | STRING | NULLABLE |
| CurrentState_BranchCode | STRING | NULLABLE |
| RTX_BranchCodes | STRING | NULLABLE |
| RTX_BranchName | STRING | NULLABLE |
| Heritage_Org | STRING | NULLABLE |
| FieldPest_Operations | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| FinancialSystem_of_Record | STRING | NULLABLE |
| Operating_System | STRING | NULLABLE |
| Branch_Status | STRING | NULLABLE |
| BranchStatus_RNA_from_Anaplan | STRING | NULLABLE |
| BranchStatus_TMX_from_Carol_T | STRING | NULLABLE |
| edox_PnL_Activity_2023_YN | STRING | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| ... | (19 more columns) | ... |

#### Exraw_rtx_branch_daily_gcs
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| CurrentState_MarketCode | STRING | NULLABLE |
| RTX_MarketCode | STRING | NULLABLE |
| RTX_MarketName | STRING | NULLABLE |
| CurrentState_RegionCode | STRING | NULLABLE |
| RTX_RegionCode | STRING | NULLABLE |
| RTX_RegionName | STRING | NULLABLE |
| CurrentState_BranchCode | STRING | NULLABLE |
| RTX_BranchCodes | STRING | NULLABLE |
| RTX_BranchName | STRING | NULLABLE |
| Heritage_Org | STRING | NULLABLE |
| FieldPest_Operations | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| FinancialSystem_of_Record | STRING | NULLABLE |
| Operating_System | STRING | NULLABLE |
| Branch_Status | STRING | NULLABLE |
| BranchStatus_RNA_from_Anaplan | STRING | NULLABLE |
| BranchStatus_TMX_from_Carol_T | STRING | NULLABLE |
| edox_PnL_Activity_2023_YN | STRING | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| ... | (19 more columns) | ... |

#### New_table_S0
Type: `TABLE` | Rows: 43956

| Column | Type | Mode |
|--------|------|------|
| A | STRING | NULLABLE |
| B | STRING | NULLABLE |
| C | STRING | NULLABLE |
| D | STRING | NULLABLE |
| E | STRING | NULLABLE |
| F | STRING | NULLABLE |
| G | STRING | NULLABLE |
| H | STRING | NULLABLE |
| I | STRING | NULLABLE |
| J | STRING | NULLABLE |
| K | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| M | STRING | NULLABLE |
| N | STRING | NULLABLE |
| O | STRING | NULLABLE |
| P | STRING | NULLABLE |
| Q | STRING | NULLABLE |
| R | STRING | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| ... | (1 more columns) | ... |

#### New_table_S1
Type: `TABLE` | Rows: 21978

| Column | Type | Mode |
|--------|------|------|
| Service | STRING | NULLABLE |
| Description | STRING | NULLABLE |
| C | STRING | NULLABLE |
| D | STRING | NULLABLE |
| E | STRING | NULLABLE |
| F | STRING | NULLABLE |
| G | STRING | NULLABLE |
| H | STRING | NULLABLE |
| I | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| GROUPING | STRING | NULLABLE |
| Product | STRING | NULLABLE |
| Fin_Product | STRING | NULLABLE |
| service_line1_short | STRING | NULLABLE |
| contract_group1 | STRING | NULLABLE |
| product_group_level_1 | STRING | NULLABLE |
| product_group_level_2 | STRING | NULLABLE |
| SA_description | STRING | NULLABLE |
| template | STRING | NULLABLE |

---

### Leads_S1
**Location:** US
**Last Modified:** 2025-08-07
**Tables:** 8 | **Views:** 0

#### tmx_business_unit
Type: `TABLE` | Rows: 13747

| Column | Type | Mode |
|--------|------|------|
| tmx_business_unit_sid | INTEGER | NULLABLE |
| buncod_id | STRING | NULLABLE |
| bu_description | STRING | NULLABLE |
| bu_type | STRING | NULLABLE |
| bu_level | STRING | NULLABLE |
| corp_code | STRING | NULLABLE |
| corp_name | STRING | NULLABLE |
| comp_code | STRING | NULLABLE |
| comp_name | STRING | NULLABLE |
| division_code | STRING | NULLABLE |
| division_name | STRING | NULLABLE |
| region_code | STRING | NULLABLE |
| region_name | STRING | NULLABLE |
| branch_code | STRING | NULLABLE |
| branch_name | STRING | NULLABLE |
| stl_code | STRING | NULLABLE |
| stl_name | STRING | NULLABLE |
| acquisition_yn | STRING | NULLABLE |
| acquisition_date | TIMESTAMP | NULLABLE |
| curr_division_code | STRING | NULLABLE |
| curr_division_name | STRING | NULLABLE |
| curr_region_code | STRING | NULLABLE |
| curr_region_name | STRING | NULLABLE |
| status | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| ... | (27 more columns) | ... |

#### tmx_employee
Type: `TABLE` | Rows: 1288849

| Column | Type | Mode |
|--------|------|------|
| tmx_employee_sid | INTEGER | NULLABLE |
| employee_id | STRING | NULLABLE |
| employee_party_id | INTEGER | NULLABLE |
| home_bunit | STRING | NULLABLE |
| home_bunit_description | STRING | NULLABLE |
| last_name | STRING | NULLABLE |
| first_name | STRING | NULLABLE |
| common_name | STRING | NULLABLE |
| job_code | STRING | NULLABLE |
| job_code_description | STRING | NULLABLE |
| employee_status | STRING | NULLABLE |
| in_job_date | TIMESTAMP | NULLABLE |
| hire_date | TIMESTAMP | NULLABLE |
| termination_date | TIMESTAMP | NULLABLE |
| employment_type_code | STRING | NULLABLE |
| employment_type_description | STRING | NULLABLE |
| employee_primary_designation_code | STRING | NULLABLE |
| employee_primary_designation_desc | STRING | NULLABLE |
| employee_jde_number | NUMERIC | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| end_date | TIMESTAMP | NULLABLE |
| xxdate | INTEGER | NULLABLE |
| udt_date | TIMESTAMP | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |
| curr_ind | STRING | NULLABLE |
| ... | (13 more columns) | ... |

#### tmx_lead
Type: `TABLE` | Rows: 2209619

| Column | Type | Mode |
|--------|------|------|
| tmx_lead_sid | INTEGER | NULLABLE |
| curr_assigned_employee_sid | INTEGER | NULLABLE |
| tmx_lead_attribute_sid | INTEGER | NULLABLE |
| assigned_bunit_sid | INTEGER | NULLABLE |
| originating_bunit_sid | INTEGER | NULLABLE |
| tmx_lead_prospect_sid | INTEGER | NULLABLE |
| tmx_sa_item_service_line_sid | INTEGER | NULLABLE |
| tmx_lead_activity_sid | INTEGER | NULLABLE |
| actid | INTEGER | NULLABLE |
| created_by_user_profile | STRING | NULLABLE |
| received_date | TIMESTAMP | NULLABLE |
| assigned_date | TIMESTAMP | NULLABLE |
| scheduled_date | TIMESTAMP | NULLABLE |
| inspected_date | TIMESTAMP | NULLABLE |
| proposed_date | TIMESTAMP | NULLABLE |
| sold_date | TIMESTAMP | NULLABLE |
| cancel_date | TIMESTAMP | NULLABLE |
| uncancel_date | TIMESTAMP | NULLABLE |
| call_back_date | TIMESTAMP | NULLABLE |
| call_back_rqs_date | TIMESTAMP | NULLABLE |
| rescheduled_date | TIMESTAMP | NULLABLE |
| skipped_date | TIMESTAMP | NULLABLE |
| transfer_date | TIMESTAMP | NULLABLE |
| unassigned_date | TIMESTAMP | NULLABLE |
| unscheduled_date | TIMESTAMP | NULLABLE |
| ... | (63 more columns) | ... |

#### tmx_lead_activity
Type: `TABLE` | Rows: 45

| Column | Type | Mode |
|--------|------|------|
| tmx_lead_activity_sid | INTEGER | NULLABLE |
| lead_step | STRING | NULLABLE |
| lead_status_description | STRING | NULLABLE |
| lead_status_code | STRING | NULLABLE |
| lead_activity_description | STRING | NULLABLE |
| lead_step_order | INTEGER | NULLABLE |
| tmx_lead_activity_bid | STRING | NULLABLE |
| udt_date | TIMESTAMP | NULLABLE |
| report_multiplier | INTEGER | NULLABLE |
| dor_reduce_yn | STRING | NULLABLE |
| etl_load_date | TIMESTAMP | NULLABLE |

#### tmx_lead_activity_fact
Type: `TABLE` | Rows: 7765469

| Column | Type | Mode |
|--------|------|------|
| activity_date_sid | INTEGER | NULLABLE |
| tmx_sa_item_service_line_sid | INTEGER | NULLABLE |
| tmx_lead_sid | INTEGER | NULLABLE |
| tmx_lead_prospect_sid | INTEGER | NULLABLE |
| tmx_lead_attribute_sid | INTEGER | NULLABLE |
| tmx_lead_activity_sid | INTEGER | NULLABLE |
| assigned_bunit_sid | INTEGER | NULLABLE |
| originating_bunit_sid | INTEGER | NULLABLE |
| operation_employee_sid | INTEGER | NULLABLE |
| curr_assigned_employee_sid | INTEGER | NULLABLE |
| proposal_sa_attributes_sid | INTEGER | NULLABLE |
| activity_date | TIMESTAMP | NULLABLE |
| activity_quantity | INTEGER | NULLABLE |
| raw_sales_amt | NUMERIC | NULLABLE |
| sales_agreement_number | STRING | NULLABLE |
| proposed_quantity | INTEGER | NULLABLE |
| local_currency_sid | INTEGER | NULLABLE |
| proposal_service_line_sid | INTEGER | NULLABLE |
| local_currency_raw_sales_amt | NUMERIC | NULLABLE |
| currency_conversion_rate_to_standard | NUMERIC | NULLABLE |
| assigned_quantity | INTEGER | NULLABLE |
| proposal_contract_amount | NUMERIC | NULLABLE |
| proposal_initial_amount | NUMERIC | NULLABLE |
| proposal_regular_amount | NUMERIC | NULLABLE |
| proposal_renewal_amount | NUMERIC | NULLABLE |
| ... | (13 more columns) | ... |

#### tmx_lead_attributes
Type: `TABLE` | Rows: 213661

| Column | Type | Mode |
|--------|------|------|
| tmx_lead_attribute_sid | INTEGER | NULLABLE |
| lead_source_code | STRING | NULLABLE |
| lead_source_description | STRING | NULLABLE |
| item_code | STRING | NULLABLE |
| item_code_description | STRING | NULLABLE |
| lead_capture_source_code | STRING | NULLABLE |
| lead_capture_source_description | STRING | NULLABLE |
| lead_capture_sub_source | STRING | NULLABLE |
| lead_type_code | STRING | NULLABLE |
| lead_type_description | STRING | NULLABLE |
| lead_attribute_bid | STRING | NULLABLE |
| proposals_yn | STRING | NULLABLE |
| valid_proposals_yn | STRING | NULLABLE |
| cancel_reason_code | STRING | NULLABLE |
| cancel_reason_description | STRING | NULLABLE |
| report_lead_capture_source_description | STRING | NULLABLE |
| media_source_code | STRING | NULLABLE |
| media_source_description | STRING | NULLABLE |
| campaign_code | STRING | NULLABLE |
| udt_date | TIMESTAMP | NULLABLE |
| product_group_service_line1_short | STRING | NULLABLE |
| product_group_level_1 | STRING | NULLABLE |
| product_group_level_2 | STRING | NULLABLE |
| etl_load_date | TIMESTAMP | NULLABLE |

#### tmx_lead_prospect
Type: `TABLE` | Rows: 870756

| Column | Type | Mode |
|--------|------|------|
| tmx_lead_prospect_sid | INTEGER | NULLABLE |
| lead_prospect_bid | INTEGER | NULLABLE |
| lead_party_id | INTEGER | NULLABLE |
| paasid | INTEGER | NULLABLE |
| first_name | STRING | NULLABLE |
| last_name | STRING | NULLABLE |
| address_1 | STRING | NULLABLE |
| address_2 | STRING | NULLABLE |
| city | STRING | NULLABLE |
| state_code | STRING | NULLABLE |
| postal_code | STRING | NULLABLE |
| home_phone | STRING | NULLABLE |
| work_phone | STRING | NULLABLE |
| mobile_phone | STRING | NULLABLE |
| home_fax_number | STRING | NULLABLE |
| office_fax_number | STRING | NULLABLE |
| email_1 | STRING | NULLABLE |
| email_2 | STRING | NULLABLE |
| email_3 | STRING | NULLABLE |
| xxdate | INTEGER | NULLABLE |
| udt_date | TIMESTAMP | NULLABLE |
| classification_code | STRING | NULLABLE |
| classification_description | STRING | NULLABLE |
| market_type | STRING | NULLABLE |
| market_description | STRING | NULLABLE |
| ... | (1 more columns) | ... |

#### tmx_sa_item
Type: `TABLE` | Rows: 66109511

| Column | Type | Mode |
|--------|------|------|
| tmx_sa_item_sid | INTEGER | NULLABLE |
| actid | INTEGER | NULLABLE |
| sales_agreement_number | INTEGER | NULLABLE |
| effective_date | TIMESTAMP | NULLABLE |
| inactive_date | TIMESTAMP | NULLABLE |
| cancel_date | TIMESTAMP | NULLABLE |
| accounting_date | TIMESTAMP | NULLABLE |
| conversion_date | TIMESTAMP | NULLABLE |
| transfer_date | TIMESTAMP | NULLABLE |
| inspection_start_date | TIMESTAMP | NULLABLE |
| backlog_scheduled_date | TIMESTAMP | NULLABLE |
| last_inspection_date | TIMESTAMP | NULLABLE |
| renewal_monthshort | STRING | NULLABLE |
| renewal_monthnum | INTEGER | NULLABLE |
| next_service_date | TIMESTAMP | NULLABLE |
| next_service_monthshort | STRING | NULLABLE |
| next_service_monthnum | INTEGER | NULLABLE |
| raw_sale_yn | STRING | NULLABLE |
| billable_yn | STRING | NULLABLE |
| suspend_yn | STRING | NULLABLE |
| tc_uninspected_curr_year_yn | STRING | NULLABLE |
| tc_uninspected_next_year_yn | STRING | NULLABLE |
| acquired_yn | STRING | NULLABLE |
| financed_yn | STRING | NULLABLE |
| financed_date | TIMESTAMP | NULLABLE |
| ... | (76 more columns) | ... |

---

### Leads_S2
**Location:** US
**Last Modified:** 2025-08-07
**Tables:** 11 | **Views:** 0

#### rtx_lead
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_attributes
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| market_type | STRING | NULLABLE |
| lead_type | STRING | NULLABLE |
| lead_source | STRING | NULLABLE |
| primary_pest | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_contact
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| name | STRING | NULLABLE |
| address | STRING | NULLABLE |
| city | STRING | NULLABLE |
| state | STRING | NULLABLE |
| postal_code | STRING | NULLABLE |
| phone | STRING | NULLABLE |
| email | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |
| company | STRING | NULLABLE |
| country | STRING | NULLABLE |

#### rtx_lead_field_assignment
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| assignment_type | STRING | NULLABLE |
| assignment_value | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_inspections
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| activity_type | STRING | NULLABLE |
| activity_date | TIMESTAMP | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_sale_link
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| sale_system | STRING | NULLABLE |
| sale_system_attr_id | STRING | NULLABLE |
| sale_system_attr_id_value | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_sales
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| quantity | INTEGER | NULLABLE |
| total_amount | NUMERIC | NULLABLE |
| job_amount | NUMERIC | NULLABLE |
| contract_amount | NUMERIC | NULLABLE |
| product_amount | NUMERIC | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_source_system_tracker
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_sid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| src_system | STRING | NULLABLE |
| src_system_attr_id | STRING | NULLABLE |
| src_system_attr_id_value | STRING | NULLABLE |
| upstream_src_system | STRING | NULLABLE |
| upstream_src_system_attr_id | STRING | NULLABLE |
| upstream_src_system_attr_id_value | STRING | NULLABLE |
| src_system_cre_date | TIMESTAMP | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_stage
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| stage | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_status
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| status | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_uid_association
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_sid | STRING | NULLABLE |
| src_system_attr_id_value | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| rtx_lead_uid | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

---

### Leads_S3
**Location:** US
**Last Modified:** 2025-08-07
**Tables:** 12 | **Views:** 0

#### rtx_lead
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_attributes
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| market_type | STRING | NULLABLE |
| lead_type | STRING | NULLABLE |
| lead_source | STRING | NULLABLE |
| primary_pest | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_contact
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| name | STRING | NULLABLE |
| address | STRING | NULLABLE |
| city | STRING | NULLABLE |
| state | STRING | NULLABLE |
| postal_code | STRING | NULLABLE |
| phone | STRING | NULLABLE |
| email | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |
| company | STRING | NULLABLE |
| country | STRING | NULLABLE |

#### rtx_lead_field_assignment
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| assignment_type | STRING | NULLABLE |
| assignment_value | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_inspections
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| activity_type | STRING | NULLABLE |
| activity_date | TIMESTAMP | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_sale_link
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| sale_system | STRING | NULLABLE |
| sale_system_attr_id | STRING | NULLABLE |
| sale_system_attr_id_value | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_sales
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| quantity | INTEGER | NULLABLE |
| total_amount | NUMERIC | NULLABLE |
| job_amount | NUMERIC | NULLABLE |
| contract_amount | NUMERIC | NULLABLE |
| product_amount | NUMERIC | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_source_system_tracker
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_sid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| src_system | STRING | NULLABLE |
| src_system_attr_id | STRING | NULLABLE |
| src_system_attr_id_value | STRING | NULLABLE |
| upstream_src_system | STRING | NULLABLE |
| upstream_src_system_attr_id | STRING | NULLABLE |
| upstream_src_system_attr_id_value | STRING | NULLABLE |
| src_system_cre_date | TIMESTAMP | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_stage
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| stage | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_status
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| eff_date | TIMESTAMP | NULLABLE |
| status | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_lead_uid_association
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_sid | STRING | NULLABLE |
| src_system_attr_id_value | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| rtx_lead_uid | STRING | NULLABLE |
| cre_date | TIMESTAMP | NULLABLE |

#### rtx_sid_uid_mapping
Type: `TABLE` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| rtx_lead_uid | STRING | NULLABLE |
| rtx_lead_sid | STRING | NULLABLE |
| hashdiff | STRING | NULLABLE |
| final_rtx_lead_uid | STRING | NULLABLE |
| final_rtx_lead_sid | STRING | NULLABLE |

---

### Reference
**Location:** US
**Last Modified:** 2023-05-18
**Tables:** 16 | **Views:** 3

#### GS_EmployeeExceptions
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Colleague_Number | STRING | NULLABLE |
| Email_Address | STRING | NULLABLE |
| Branch | STRING | NULLABLE |

#### GS_Lead_Source_Test
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Key | STRING | NULLABLE |
| Lead_System | STRING | NULLABLE |
| Lead_Type | STRING | NULLABLE |
| Lead_Source | STRING | NULLABLE |
| Lead_Type_Mapped | STRING | NULLABLE |
| Lead_Channel_1_Mapped | STRING | NULLABLE |
| Lead_Channel_2_Mapped | STRING | NULLABLE |
| Lead_Source_Mapped | STRING | NULLABLE |

#### GS_ProductMap_Rentokil
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| LOB | STRING | NULLABLE |
| Service_Code_PP_Code | STRING | NULLABLE |
| Recommended_New_Code | STRING | NULLABLE |
| Current_Service_Description_6_29_23 | STRING | NULLABLE |
| Class | STRING | NULLABLE |
| Needed_for_Migration | BOOLEAN | NULLABLE |
| Taxable | STRING | NULLABLE |
| Duration | STRING | NULLABLE |
| GL_Code | INTEGER | NULLABLE |
| Type | STRING | NULLABLE |
| Skills | STRING | NULLABLE |
| Res | INTEGER | NULLABLE |
| Res_Available_to_be_Sold | BOOLEAN | NULLABLE |
| Comm | INTEGER | NULLABLE |
| Comm_Available_to_be_Sold | BOOLEAN | NULLABLE |
| PRODUCT_OWNER | STRING | NULLABLE |
| PRICE_MODEL_PRIOTRITY | STRING | NULLABLE |
| DESCRIPTION_OF_SERVICE_RESI_PRICE_COMPONENTS | STRING | NULLABLE |
| Minimum_Price_Floor_Wanted | STRING | NULLABLE |
| Subcontract_Option | BOOLEAN | NULLABLE |
| Related_Maintenance_AndOr_Merch_CodesResi_bundled_always_with_Corrective | STRING | NULLABLE |
| Related_Maitenance_code_under_separate_service_line | STRING | NULLABLE |
| DESCRIPTION_OF_SERVICE_COMM_PRICE_COMPONENTS | STRING | NULLABLE |
| Related_Maintenance_AndOr_Merch_Codes_Comm | STRING | NULLABLE |
| Deferred_Revenue_Y_N | BOOLEAN | NULLABLE |
| ... | (1 more columns) | ... |

#### GS_ProductMap_Terminix
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Category | STRING | NULLABLE |
| GROUPING | STRING | NULLABLE |
| Product | STRING | NULLABLE |
| Fin_Product | STRING | NULLABLE |
| service_line1_short | STRING | NULLABLE |
| contract_group1 | STRING | NULLABLE |
| product_group_level_1 | STRING | NULLABLE |
| product_group_level_2 | STRING | NULLABLE |
| SA_description | STRING | NULLABLE |
| template | STRING | NULLABLE |
| Item_Code | STRING | NULLABLE |
| mission_template | STRING | NULLABLE |
| SA_description2 | STRING | NULLABLE |
| PP_Code | STRING | NULLABLE |
| PP_SVC_DESC | STRING | NULLABLE |
| PP_SVC_CLASS | STRING | NULLABLE |
| Note | STRING | NULLABLE |
| New_code_description | STRING | NULLABLE |
| num_starts_since_2020 | INTEGER | NULLABLE |
| report_market_type | STRING | NULLABLE |
| active_ind | STRING | NULLABLE |
| expiration_date | DATE | NULLABLE |

#### GS_Ref_BranchHierarchy_ChangeLog
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| id | INTEGER | NULLABLE |
| district_number | INTEGER | NULLABLE |
| field | STRING | NULLABLE |
| friendly_field | STRING | NULLABLE |
| old_value | STRING | NULLABLE |
| new_value | STRING | NULLABLE |
| modified_timestamp | TIMESTAMP | NULLABLE |
| modified_user | STRING | NULLABLE |
| source_table | STRING | NULLABLE |

#### GS_unf_ref_Activity_Map
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| TMX_SA_activity_SID | INTEGER | NULLABLE |
| SA_item_activity_name1 | STRING | NULLABLE |
| SA_item_activity_name2 | STRING | NULLABLE |
| report_classification | STRING | NULLABLE |
| SA_item_activity_name3 | STRING | NULLABLE |
| Phase1_RNA_portfolio_classification | STRING | NULLABLE |
| Phase2_RNA_portfolio_classification | STRING | NULLABLE |
| report_multiplier | INTEGER | NULLABLE |

#### Ref_Map_BranchHeirarchy_GCS
Type: `TABLE` | Rows: 1773

| Column | Type | Mode |
|--------|------|------|
| Current_State_Market_Code | STRING | NULLABLE |
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| Current_State_Region_Code | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| Current_State_Branch_Code | STRING | NULLABLE |
| RTX_Branch_Codes | STRING | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| Heritage_Org | STRING | NULLABLE |
| Field_Pest_Operations | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| Financial_System_of_Record | STRING | NULLABLE |
| Operating_System | STRING | NULLABLE |
| Branch_Status | STRING | NULLABLE |
| BranchStatus_RNA_from_Anaplan | STRING | NULLABLE |
| BranchStatus_TMX_from_Carol_T | STRING | NULLABLE |
| _2023_Jedox_PnL_Activity__Y_N_ | STRING | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| ... | (19 more columns) | ... |

#### Ref_Map_BranchHeirarchy_GCS_old
Type: `TABLE` | Rows: 1468

| Column | Type | Mode |
|--------|------|------|
| Current_State_Market_Code | STRING | NULLABLE |
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| Current_State_Region_Code | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| Current_State_Branch_Code | STRING | NULLABLE |
| RTX_Branch_Codes | INTEGER | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| Heritage_Org | STRING | NULLABLE |
| Field_Pest_Operations | BOOLEAN | NULLABLE |
| Brand | STRING | NULLABLE |
| Financial_System_of_Record | STRING | NULLABLE |
| Operating_System | STRING | NULLABLE |
| Branch_Status | STRING | NULLABLE |
| BranchStatus_RNA_from_Anaplan | STRING | NULLABLE |
| BranchStatus_TMX_from_Carol_T | STRING | NULLABLE |
| _2023_Jedox_PnL_Activity__Y_N_ | BOOLEAN | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| ... | (19 more columns) | ... |

#### Ref_Map_Branch_GS
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Continent | STRING | NULLABLE |
| Country | STRING | NULLABLE |
| Country_Name | STRING | NULLABLE |
| Legal_entity | STRING | NULLABLE |
| Legal_entity_Name | STRING | NULLABLE |
| Market | STRING | NULLABLE |
| Market_Display | STRING | NULLABLE |
| Market_Name | STRING | NULLABLE |
| Region | STRING | NULLABLE |
| Region_Display | STRING | NULLABLE |
| Region_Name | STRING | NULLABLE |
| Branch | STRING | NULLABLE |
| Branch_Display | STRING | NULLABLE |
| Branch_Name | STRING | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| EmailAddress | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| BranchManager | STRING | NULLABLE |
| BranchManagerEmail | STRING | NULLABLE |
| ... | (17 more columns) | ... |

#### Test
Type: `TABLE` | Rows: 2047

| Column | Type | Mode |
|--------|------|------|
| Continent | STRING | NULLABLE |
| Country | STRING | NULLABLE |
| Country_Name | STRING | NULLABLE |
| Legal_entity | STRING | NULLABLE |
| Legal_entity_Name | STRING | NULLABLE |
| Market | STRING | NULLABLE |
| Market_Display | STRING | NULLABLE |
| Market_Name | STRING | NULLABLE |
| Region | STRING | NULLABLE |
| Region_Display | STRING | NULLABLE |
| Region_Name | STRING | NULLABLE |
| Branch | STRING | NULLABLE |
| Branch_Display | STRING | NULLABLE |
| Branch_Name | STRING | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| EmailAddress | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| BranchManager | STRING | NULLABLE |
| BranchManagerEmail | STRING | NULLABLE |
| ... | (17 more columns) | ... |

#### hTMX_finance_mapping
Type: `TABLE` | Rows: 686

| Column | Type | Mode |
|--------|------|------|
| legacy_account_name | STRING | NULLABLE |
| legacy_object_account | INTEGER | NULLABLE |
| legacy_subsidiary | INTEGER | NULLABLE |
| account_to_be | INTEGER | NULLABLE |
| lob | INTEGER | NULLABLE |
| svc | INTEGER | NULLABLE |
| rnl | INTEGER | NULLABLE |

#### ref_ProductMap_Rentokil
Type: `TABLE` | Rows: 1069

| Column | Type | Mode |
|--------|------|------|
| LOB | STRING | NULLABLE |
| Service_Code_PP_Code | STRING | NULLABLE |
| Recommended_New_Code | STRING | NULLABLE |
| Current_Service_Description_6_29_23 | STRING | NULLABLE |
| Class | STRING | NULLABLE |
| Needed_for_Migration | BOOLEAN | NULLABLE |
| Taxable | STRING | NULLABLE |
| Duration | STRING | NULLABLE |
| GL_Code | INTEGER | NULLABLE |
| Type | STRING | NULLABLE |
| Skills | STRING | NULLABLE |
| Res | INTEGER | NULLABLE |
| Res_Available_to_be_Sold | BOOLEAN | NULLABLE |
| Comm | INTEGER | NULLABLE |
| Comm_Available_to_be_Sold | BOOLEAN | NULLABLE |
| PRODUCT_OWNER | STRING | NULLABLE |
| PRICE_MODEL_PRIOTRITY | STRING | NULLABLE |
| DESCRIPTION_OF_SERVICE_RESI_PRICE_COMPONENTS | STRING | NULLABLE |
| Minimum_Price_Floor_Wanted | STRING | NULLABLE |
| Subcontract_Option | BOOLEAN | NULLABLE |
| Related_Maintenance_AndOr_Merch_CodesResi_bundled_always_with_Corrective | STRING | NULLABLE |
| Related_Maitenance_code_under_separate_service_line | STRING | NULLABLE |
| DESCRIPTION_OF_SERVICE_COMM_PRICE_COMPONENTS | STRING | NULLABLE |
| Related_Maintenance_AndOr_Merch_Codes_Comm | STRING | NULLABLE |
| Deferred_Revenue_Y_N | BOOLEAN | NULLABLE |
| ... | (1 more columns) | ... |

#### ref_ProductMap_Terminix
Type: `TABLE` | Rows: 930

| Column | Type | Mode |
|--------|------|------|
| Category | STRING | NULLABLE |
| GROUPING | STRING | NULLABLE |
| Product | STRING | NULLABLE |
| Fin_Product | STRING | NULLABLE |
| service_line1_short | STRING | NULLABLE |
| contract_group1 | STRING | NULLABLE |
| product_group_level_1 | STRING | NULLABLE |
| product_group_level_2 | STRING | NULLABLE |
| SA_description | STRING | NULLABLE |
| template | STRING | NULLABLE |
| Item_Code | STRING | NULLABLE |
| mission_template | STRING | NULLABLE |
| SA_description2 | STRING | NULLABLE |
| PP_Code | STRING | NULLABLE |
| PP_SVC_DESC | STRING | NULLABLE |
| PP_SVC_CLASS | STRING | NULLABLE |
| Note | STRING | NULLABLE |
| New_code_description | STRING | NULLABLE |
| num_starts_since_2020 | INTEGER | NULLABLE |
| report_market_type | STRING | NULLABLE |
| active_ind | STRING | NULLABLE |
| expiration_date | DATE | NULLABLE |

#### ref_noaa_Branch_zip
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| branch_code | STRING | NULLABLE |
| zip5 | STRING | NULLABLE |
| customer_cnt | INTEGER | NULLABLE |
| system_source | STRING | NULLABLE |

#### ref_noaa_stations
Type: `TABLE` | Rows: 29590

| Column | Type | Mode |
|--------|------|------|
| usaf | STRING | NULLABLE |
| wban | STRING | NULLABLE |
| name | STRING | NULLABLE |
| country | STRING | NULLABLE |
| state | STRING | NULLABLE |
| call | STRING | NULLABLE |
| lat | FLOAT | NULLABLE |
| lon | FLOAT | NULLABLE |
| elev | STRING | NULLABLE |
| begin | STRING | NULLABLE |
| end | STRING | NULLABLE |

*... and 11 more tables/views*

---

### S0_TMX
**Location:** US
**Last Modified:** 2023-12-19
**Tables:** 143 | **Views:** 14

#### BQSHEET_TEST_V1
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Continent | STRING | NULLABLE |
| Country | STRING | NULLABLE |
| Country_Name | STRING | NULLABLE |
| Legal_entity | STRING | NULLABLE |
| Legal_entity_Name | STRING | NULLABLE |
| Market | STRING | NULLABLE |
| Market_Display | STRING | NULLABLE |
| Market_Name | STRING | NULLABLE |
| Region | STRING | NULLABLE |
| Region_Display | STRING | NULLABLE |
| Region_Name | STRING | NULLABLE |
| Branch | STRING | NULLABLE |
| Branch_Display | STRING | NULLABLE |
| Branch_Name | STRING | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| EmailAddress | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| BranchManager | STRING | NULLABLE |
| BranchManagerEmail | STRING | NULLABLE |
| ... | (17 more columns) | ... |

#### Bqsheet_test_v3
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| BranchID | STRING | NULLABLE |
| BranchName | STRING | NULLABLE |
| BranchManger | STRING | NULLABLE |

#### Employees_Main
Type: `TABLE` | Rows: 29477

| Column | Type | Mode |
|--------|------|------|
| Employee_Number | INTEGER | NULLABLE |
| Last_Name | STRING | NULLABLE |
| First_Name | STRING | NULLABLE |
| Middle_Name | STRING | NULLABLE |
| Suffix | STRING | NULLABLE |
| Company_Hierarchy | STRING | NULLABLE |
| Company_ID | STRING | NULLABLE |
| Company | STRING | NULLABLE |
| Company_Brand_as_of_Term_PreLM | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| Division_ID | STRING | NULLABLE |
| Division_Description | STRING | NULLABLE |
| Region_ID | STRING | NULLABLE |
| Region_Description | STRING | NULLABLE |
| Branch | STRING | NULLABLE |
| Home_Business_Unit | STRING | NULLABLE |
| Business_Unit_Description | STRING | NULLABLE |
| Job_Code | STRING | NULLABLE |
| Job_Title | STRING | NULLABLE |
| TMX_Job_Grouping | STRING | NULLABLE |
| Supervisor_Eff_Date | DATE | NULLABLE |
| Supervisor_ID | INTEGER | NULLABLE |
| Supervisor_Name | STRING | NULLABLE |
| Location | STRING | NULLABLE |
| Location_Address___Street_1 | STRING | NULLABLE |
| ... | (70 more columns) | ... |

#### ExtRaw_TDW_TMX_AC_Month
Type: `TABLE` | Rows: 864

| Column | Type | Mode |
|--------|------|------|
| TMX_AC_month_SID | STRING | NULLABLE |
| AC_Year | STRING | NULLABLE |
| AC_MonthNum | STRING | NULLABLE |
| AC_MonthShort | STRING | NULLABLE |
| AC_MonthLong | STRING | NULLABLE |
| AC_MonthYear | STRING | NULLABLE |
| AC_NUMWORKING | STRING | NULLABLE |
| AC_month_start_date | STRING | NULLABLE |
| AC_month_end_date | STRING | NULLABLE |
| AC_YearMonth_prev | STRING | NULLABLE |
| AC_MonthYear_prev | STRING | NULLABLE |
| AC_DaysNum | STRING | NULLABLE |
| udt_date | STRING | NULLABLE |

#### ExtRaw_TDW_Time
Type: `TABLE` | Rows: 49308

| Column | Type | Mode |
|--------|------|------|
| TIME_SID | STRING | NULLABLE |
| Date | STRING | NULLABLE |
| DateText | STRING | NULLABLE |
| Year | STRING | NULLABLE |
| WeekEndingDate | STRING | NULLABLE |
| YearWeek | STRING | NULLABLE |
| MonthNum | STRING | NULLABLE |
| MonthShort | STRING | NULLABLE |
| MonthLong | STRING | NULLABLE |
| MonthPart | STRING | NULLABLE |
| MonthWeek | STRING | NULLABLE |
| YearMonth | STRING | NULLABLE |
| MonthYear | STRING | NULLABLE |
| EndOfMonth_yn | STRING | NULLABLE |
| FirstOfMonth | STRING | NULLABLE |
| LastOfMonth | STRING | NULLABLE |
| Quarter | STRING | NULLABLE |
| Day | STRING | NULLABLE |
| DayInYear | STRING | NULLABLE |
| DOWNum | STRING | NULLABLE |
| DOWShort | STRING | NULLABLE |
| DOWLong | STRING | NULLABLE |
| Holiday | STRING | NULLABLE |
| Weekend | STRING | NULLABLE |
| AC_YearMonth | STRING | NULLABLE |
| ... | (15 more columns) | ... |

#### ExtRaw_wrkday_Employee_extended
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Employee_Number | STRING | NULLABLE |
| Last_Name | STRING | NULLABLE |
| First_Name | STRING | NULLABLE |
| Middle_Name | STRING | NULLABLE |
| Suffix | STRING | NULLABLE |
| Company_Hierarchy | STRING | NULLABLE |
| Company_ID | STRING | NULLABLE |
| Company | STRING | NULLABLE |
| Company_Brand_as_of_Term_PreLM | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| Worker | STRING | NULLABLE |
| Division_ID | STRING | NULLABLE |
| Division_Description | STRING | NULLABLE |
| Region_ID | STRING | NULLABLE |
| Region_Description | STRING | NULLABLE |
| Branch | STRING | NULLABLE |
| Home_Business_Unit | STRING | NULLABLE |
| Business_Unit_Description | STRING | NULLABLE |
| Job_Code | STRING | NULLABLE |
| Job_Profile_Change_Start_Date | STRING | NULLABLE |
| Job_Code_ | STRING | NULLABLE |
| Job_Title | STRING | NULLABLE |
| TMX_Job_Grouping | STRING | NULLABLE |
| Supervisor_Eff_Date | STRING | NULLABLE |
| Supervisor_ID | STRING | NULLABLE |
| ... | (63 more columns) | ... |

#### ExtRaw_wrkday_Termination_Details
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Term_Reason | STRING | NULLABLE |
| Term_Date | STRING | NULLABLE |
| Employee_ID | STRING | NULLABLE |
| Worker | STRING | NULLABLE |
| Term_Category | STRING | NULLABLE |

#### InspectionProductQuestions
Type: `TABLE` | Rows: 14530

| Column | Type | Mode |
|--------|------|------|
| InspectionId | INTEGER | NULLABLE |
| AppGenUniqueProposalId | STRING | NULLABLE |
| CustomerProductCode | STRING | NULLABLE |
| QuestionId | STRING | NULLABLE |
| QuestionResponseCode | STRING | NULLABLE |
| QuestionResponseValue | STRING | NULLABLE |
| CreatedDate | TIMESTAMP | NULLABLE |
| LastModifiedDate | TIMESTAMP | NULLABLE |
| hashkey | STRING | NULLABLE |
| etl_load_date | TIMESTAMP | NULLABLE |

#### InspectionProducts
Type: `TABLE` | Rows: 1820

| Column | Type | Mode |
|--------|------|------|
| InspectionId | INTEGER | NULLABLE |
| CustomerProductCode | STRING | NULLABLE |
| AppGenUniqueProposalId | STRING | NULLABLE |
| TemplateCode | STRING | NULLABLE |
| EmployeeNumber | STRING | NULLABLE |
| BillingFrequency | STRING | NULLABLE |
| ServiceFrequency | STRING | NULLABLE |
| ServiceLine | STRING | NULLABLE |
| InitialAmount | NUMERIC | NULLABLE |
| RegularAmount | NUMERIC | NULLABLE |
| RenewalAmount | NUMERIC | NULLABLE |
| SpecialAmount | NUMERIC | NULLABLE |
| TargetPest | STRING | NULLABLE |
| CouponCode | STRING | NULLABLE |
| Note | STRING | NULLABLE |
| ProposalId | STRING | NULLABLE |
| AppGenUniqueSAId | STRING | NULLABLE |
| SalesAgrementId | STRING | NULLABLE |
| AdvanceRenewalYears | STRING | NULLABLE |
| AdvanceRenewalAmount | NUMERIC | NULLABLE |
| DiscountAmount | NUMERIC | NULLABLE |
| DiscountName | STRING | NULLABLE |
| TaxExempt | STRING | NULLABLE |
| TaxAmount | NUMERIC | NULLABLE |
| TaxRate | NUMERIC | NULLABLE |
| ... | (28 more columns) | ... |

#### Inspections
Type: `TABLE` | Rows: 3364053

| Column | Type | Mode |
|--------|------|------|
| InspectionId | INTEGER | NULLABLE |
| AppointmentId | STRING | NULLABLE |
| AppGenInspectionId | STRING | NULLABLE |
| BUCode | STRING | NULLABLE |
| EmployeeNumber | STRING | NULLABLE |
| DateInspected | TIMESTAMP | NULLABLE |
| DateLastInspected | TIMESTAMP | NULLABLE |
| PartyId | STRING | NULLABLE |
| CustomerNumber | STRING | NULLABLE |
| DocRepositoryFolderId | STRING | NULLABLE |
| FrontViewPhotoDocId | STRING | NULLABLE |
| MergedDocId | STRING | NULLABLE |
| Status | STRING | NULLABLE |
| EsignDate | TIMESTAMP | NULLABLE |
| EsignIPAddress | STRING | NULLABLE |
| DateOfSale | TIMESTAMP | NULLABLE |
| SaleExpiryDate | TIMESTAMP | NULLABLE |
| OSPSignatureDocId | STRING | NULLABLE |
| PartySignatureDocId | STRING | NULLABLE |
| CreatedDate | TIMESTAMP | NULLABLE |
| LastModifedDate | TIMESTAMP | NULLABLE |
| BillingStreet | STRING | NULLABLE |
| BillingCity | STRING | NULLABLE |
| BillingState | STRING | NULLABLE |
| BillingPostalCode | STRING | NULLABLE |
| ... | (16 more columns) | ... |

#### Legacy_Source_table_info
Type: `TABLE` | Rows: 34

| Column | Type | Mode |
|--------|------|------|
| sourcetablename | STRING | NULLABLE |
| incrementalkey | STRING | NULLABLE |

#### MV_tmx_sa_item_copy_08_07_2023_day_100mil_num
Type: `MATERIALIZED_VIEW` | Rows: 151671412

| Column | Type | Mode |
|--------|------|------|
| tmx_sa_item_sid | INTEGER | NULLABLE |
| actid | INTEGER | NULLABLE |
| sales_agreement_number | INTEGER | NULLABLE |
| effective_date | TIMESTAMP | NULLABLE |
| inactive_date | TIMESTAMP | NULLABLE |
| cancel_date | TIMESTAMP | NULLABLE |
| accounting_date | TIMESTAMP | NULLABLE |
| conversion_date | TIMESTAMP | NULLABLE |
| transfer_date | TIMESTAMP | NULLABLE |
| inspection_start_date | TIMESTAMP | NULLABLE |
| backlog_scheduled_date | TIMESTAMP | NULLABLE |
| last_inspection_date | TIMESTAMP | NULLABLE |
| renewal_monthshort | STRING | NULLABLE |
| renewal_monthnum | INTEGER | NULLABLE |
| next_service_date | TIMESTAMP | NULLABLE |
| next_service_monthshort | STRING | NULLABLE |
| next_service_monthnum | INTEGER | NULLABLE |
| raw_sale_yn | STRING | NULLABLE |
| billable_yn | STRING | NULLABLE |
| suspend_yn | STRING | NULLABLE |
| tc_uninspected_curr_year_yn | STRING | NULLABLE |
| tc_uninspected_next_year_yn | STRING | NULLABLE |
| acquired_yn | STRING | NULLABLE |
| financed_yn | STRING | NULLABLE |
| financed_date | TIMESTAMP | NULLABLE |
| ... | (75 more columns) | ... |

#### Questions
Type: `TABLE` | Rows: 857

| Column | Type | Mode |
|--------|------|------|
| QuestionId | STRING | NULLABLE |
| Description | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| QuestionResponseTypeId | STRING | NULLABLE |
| Standard | STRING | NULLABLE |
| SubCategory | STRING | NULLABLE |
| Status | STRING | NULLABLE |
| SortOrder | INTEGER | NULLABLE |
| ResponseUniqueToProduct | STRING | NULLABLE |
| DefaultResponse | STRING | NULLABLE |
| Required | STRING | NULLABLE |
| CreatedDate | TIMESTAMP | NULLABLE |
| CreatedBy | STRING | NULLABLE |
| LastModifiedDate | TIMESTAMP | NULLABLE |
| LastModifiedBy | STRING | NULLABLE |
| PromptComments | STRING | NULLABLE |
| Hint | STRING | NULLABLE |
| LastSystemUpdated | TIMESTAMP | NULLABLE |
| ValidationRegEx | STRING | NULLABLE |
| RelatedDocumentUrl | STRING | NULLABLE |
| RelatedDocumentId | STRING | NULLABLE |
| etl_load_date | TIMESTAMP | NULLABLE |

#### RTX_JobCatalog
Type: `TABLE` | Rows: 2843

| Column | Type | Mode |
|--------|------|------|
| Job_Title | STRING | NULLABLE |
| Job_Code | STRING | NULLABLE |
| Reporting_Job_Type | STRING | NULLABLE |
| Reporting_Job_Group | STRING | NULLABLE |
| Reporting_Job_Sub_group | STRING | NULLABLE |
| Management_Level | STRING | NULLABLE |
| Work_Level | STRING | NULLABLE |
| Pay_Rate_Type | STRING | NULLABLE |
| Job_Exempt | BOOLEAN | NULLABLE |
| Driving_Position | STRING | NULLABLE |
| Trainee_Job | BOOLEAN | NULLABLE |
| Job_Family_Group | STRING | NULLABLE |
| Job_Family | STRING | NULLABLE |
| Active | BOOLEAN | NULLABLE |
| Sales_Org | STRING | NULLABLE |
| Harmonized_Sales_Role | STRING | NULLABLE |

#### Raw_MSN_WorkOrderItem_Hourly
Type: `TABLE` | Rows: 34216

| Column | Type | Mode |
|--------|------|------|
| ACTBUNCDO | STRING | NULLABLE |
| ACTTACTID | STRING | NULLABLE |
| ACTEMPNUC | STRING | NULLABLE |
| ACTFDTE | STRING | NULLABLE |
| ACTFTIM | STRING | NULLABLE |
| ACTTDTE | STRING | NULLABLE |
| ACTTTIM | STRING | NULLABLE |
| ACTDUR | STRING | NULLABLE |

*... and 215 more tables/views*

---

### S4
**Location:** US
**Last Modified:** 2023-05-18
**Tables:** 21 | **Views:** 67

#### Azuga_Customer_Classification
Type: `TABLE` | Rows: 39377

| Column | Type | Mode |
|--------|------|------|
| activity_date | DATE | NULLABLE |
| Source_System | STRING | NULLABLE |
| employeeId | STRING | NULLABLE |
| First_Name | STRING | NULLABLE |
| last_name | STRING | NULLABLE |
| Reporting_Job_Group | STRING | NULLABLE |
| market_nm | STRING | NULLABLE |
| region_nm | STRING | NULLABLE |
| branch_nm | STRING | NULLABLE |
| commute_miles | FLOAT | NULLABLE |
| in_market_miles | FLOAT | NULLABLE |
| customer_stops_count | INTEGER | NULLABLE |
| non_customer_stops_count | INTEGER | NULLABLE |
| ActualCompletedWorkorders | INTEGER | NULLABLE |

#### Branch_Hierarchy
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| Current_State_Branch_Code | STRING | NULLABLE |
| RTX_Branch_Codes | STRING | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| Heritage_Org | STRING | NULLABLE |
| Field_Pest_Operations | STRING | NULLABLE |
| Brand | STRING | NULLABLE |
| Operating_System | STRING | NULLABLE |
| Branch_Status | STRING | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | INTEGER | NULLABLE |
| EmailAddress | STRING | NULLABLE |
| BranchManager | STRING | NULLABLE |
| RegionalManager | STRING | NULLABLE |

#### DDL_backups
Type: `TABLE` | Rows: 3

| Column | Type | Mode |
|--------|------|------|
| table_name | STRING | NULLABLE |
| ddl | STRING | NULLABLE |

#### Dim_Branch_BranchID_NA_T1_Vw
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Current_State_Market_Code | STRING | NULLABLE |
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| Current_State_Region_Code | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| Current_State_Branch_Code | STRING | NULLABLE |
| RTX_Branch_Codes | INTEGER | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| Heritage_Org | STRING | NULLABLE |
| Field_Pest_Operations | BOOLEAN | NULLABLE |
| Brand | STRING | NULLABLE |
| Financial_System_of_Record | STRING | NULLABLE |
| Operating_System | STRING | NULLABLE |
| Branch_Status | STRING | NULLABLE |
| BranchStatus_RNA_from_Anaplan | STRING | NULLABLE |
| BranchStatus_TMX_from_Carol_T | STRING | NULLABLE |
| _2023_Jedox_PnL_Activity__Y_N_ | BOOLEAN | NULLABLE |
| Address1 | STRING | NULLABLE |
| Address2 | STRING | NULLABLE |
| City | STRING | NULLABLE |
| State | STRING | NULLABLE |
| ZipCode | STRING | NULLABLE |
| PhoneNumber | STRING | NULLABLE |
| FaxNumber | STRING | NULLABLE |
| ... | (19 more columns) | ... |

#### Dim_RTX_AC_Month
Type: `TABLE` | Rows: 864

| Column | Type | Mode |
|--------|------|------|
| TMX_AC_month_SID | INTEGER | NULLABLE |
| AC_Year | INTEGER | NULLABLE |
| AC_MonthNum | INTEGER | NULLABLE |
| AC_MonthShort | STRING | NULLABLE |
| AC_MonthLong | STRING | NULLABLE |
| AC_MonthYear | STRING | NULLABLE |
| AC_NUMWORKING | INTEGER | NULLABLE |
| AC_month_start_date | DATETIME | NULLABLE |
| AC_month_end_date | DATETIME | NULLABLE |
| AC_YearMonth_prev | INTEGER | NULLABLE |
| AC_MonthYear_prev | STRING | NULLABLE |
| AC_DaysNum | INTEGER | NULLABLE |
| udt_date | DATETIME | NULLABLE |

#### Dim_RTX_Time
Type: `TABLE` | Rows: 49308

| Column | Type | Mode |
|--------|------|------|
| TIME_SID | INTEGER | REQUIRED |
| Date | DATETIME | NULLABLE |
| DateText | STRING | NULLABLE |
| Year | INTEGER | NULLABLE |
| WeekEndingDate | DATETIME | NULLABLE |
| YearWeek | INTEGER | NULLABLE |
| MonthNum | INTEGER | NULLABLE |
| MonthShort | STRING | NULLABLE |
| MonthLong | STRING | NULLABLE |
| MonthPart | INTEGER | NULLABLE |
| MonthWeek | INTEGER | NULLABLE |
| YearMonth | INTEGER | NULLABLE |
| MonthYear | STRING | NULLABLE |
| EndOfMonth_yn | STRING | NULLABLE |
| FirstOfMonth | DATETIME | NULLABLE |
| LastOfMonth | DATETIME | NULLABLE |
| Quarter | INTEGER | NULLABLE |
| Day | INTEGER | NULLABLE |
| DayInYear | INTEGER | NULLABLE |
| DOWNum | INTEGER | NULLABLE |
| DOWShort | STRING | NULLABLE |
| DOWLong | STRING | NULLABLE |
| Holiday | STRING | NULLABLE |
| Weekend | STRING | NULLABLE |
| AC_YearMonth | INTEGER | NULLABLE |
| ... | (15 more columns) | ... |

#### Dim_employee
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| employee_num | STRING | NULLABLE |
| branch_num | STRING | NULLABLE |
| branch_transfer_dt | DATE | NULLABLE |
| business_mobile_num | STRING | NULLABLE |
| business_phone_num | STRING | NULLABLE |
| employee_type | STRING | NULLABLE |
| first_nm | STRING | NULLABLE |
| function_cd | INTEGER | NULLABLE |
| function_nm | STRING | NULLABLE |
| harmonized_sales_role_nm | STRING | NULLABLE |
| hire_dt | TIMESTAMP | NULLABLE |
| home_branch_num | STRING | NULLABLE |
| job_cd | STRING | NULLABLE |
| job_family_group_nm | STRING | NULLABLE |
| job_family_nm | STRING | NULLABLE |
| job_profile_effective_start_dt | DATE | NULLABLE |
| job_title_nm | STRING | NULLABLE |
| last_nm | STRING | NULLABLE |
| manager_job_title_nm | STRING | NULLABLE |
| management_level | STRING | NULLABLE |
| middle_nm | STRING | NULLABLE |
| pay_frequency_cd | STRING | NULLABLE |
| pay_rate_type | STRING | NULLABLE |
| pay_status_cd | STRING | NULLABLE |
| position_type_nm | STRING | NULLABLE |
| ... | (9 more columns) | ... |

#### Extract_Surveys_Detractors_Ops_Daily
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Survey_Num | INTEGER | NULLABLE |
| Submitted_Date | TIMESTAMP | NULLABLE |
| Work_Order_Num | INTEGER | NULLABLE |
| Contract_Num | INTEGER | NULLABLE |
| NPS_Score | STRING | NULLABLE |
| Customer_Comment_txt | STRING | NULLABLE |
| Service_Type_Cd | STRING | NULLABLE |
| SericeLine_Cd | STRING | NULLABLE |
| Market_Type_Cd | STRING | NULLABLE |
| Customer_Email | STRING | NULLABLE |
| Branch_Num | STRING | NULLABLE |
| Branch_Name | STRING | NULLABLE |
| Market_Name | STRING | NULLABLE |
| Region_Name | STRING | NULLABLE |
| Operating_System | STRING | NULLABLE |
| Heritage_Org | STRING | NULLABLE |
| Employee_Num | INTEGER | NULLABLE |
| Suffix | STRING | NULLABLE |
| Customer_First_Name | STRING | NULLABLE |
| Customer_Last_Name | STRING | NULLABLE |

#### Fact_Audit_FutureDated_ContractRawCancel
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SOURCE | STRING | NULLABLE |
| Contract | STRING | NULLABLE |
| salesID | STRING | NULLABLE |
| CustomerType | STRING | NULLABLE |
| ServiceType | STRING | NULLABLE |
| ServiceType_Description | STRING | NULLABLE |
| ProductCode | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| ServiceLine | STRING | NULLABLE |
| Service_Code_Description | STRING | NULLABLE |
| ProductGroup | STRING | NULLABLE |
| LOB | STRING | NULLABLE |
| LOB_Description | STRING | NULLABLE |
| SellDate | DATE | NULLABLE |
| SellDateYearMonth | INTEGER | NULLABLE |
| SellDateYear | INTEGER | NULLABLE |
| StartDate | DATE | NULLABLE |
| StartDateYearMonth | INTEGER | NULLABLE |
| StartDateYear | INTEGER | NULLABLE |
| CancelDate | DATE | NULLABLE |
| CancelDateYearMonth | INTEGER | NULLABLE |
| CancelDateYear | INTEGER | NULLABLE |
| CancelReasonCode | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| ... | (46 more columns) | ... |

#### Fact_Audit_FutureDated_ContractStarted_Txn_Na_Daily_Dtl_Vw
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SOURCE | STRING | NULLABLE |
| Contract | STRING | NULLABLE |
| salesID | STRING | NULLABLE |
| CustomerType | STRING | NULLABLE |
| ServiceType | STRING | NULLABLE |
| ServiceType_Description | STRING | NULLABLE |
| ProductCode | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| ServiceLine | STRING | NULLABLE |
| Service_Code_Description | STRING | NULLABLE |
| ProductGroup | STRING | NULLABLE |
| LOB | STRING | NULLABLE |
| LOB_Description | STRING | NULLABLE |
| SellDate | DATE | NULLABLE |
| SellDateYearMonth | INTEGER | NULLABLE |
| SellDateYear | INTEGER | NULLABLE |
| StartDate | DATE | NULLABLE |
| StartDateYearMonth | INTEGER | NULLABLE |
| StartDateYear | INTEGER | NULLABLE |
| CancelDate | DATE | NULLABLE |
| CancelDateYearMonth | INTEGER | NULLABLE |
| CancelDateYear | INTEGER | NULLABLE |
| CancelReasonCode | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| ... | (46 more columns) | ... |

#### Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SOURCE | STRING | NULLABLE |
| Contract | STRING | NULLABLE |
| salesID | STRING | NULLABLE |
| CustomerType | STRING | NULLABLE |
| ServiceType | STRING | NULLABLE |
| ServiceType_Description | STRING | NULLABLE |
| ProductCode | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| ServiceLine | STRING | NULLABLE |
| Service_Code_Description | STRING | NULLABLE |
| ProductGroup | STRING | NULLABLE |
| LOB | STRING | NULLABLE |
| LOB_Description | STRING | NULLABLE |
| SellDate | DATE | NULLABLE |
| SellDateYearMonth | INTEGER | NULLABLE |
| SellDateYear | INTEGER | NULLABLE |
| StartDate | DATE | NULLABLE |
| StartDateYearMonth | INTEGER | NULLABLE |
| StartDateYear | INTEGER | NULLABLE |
| CancelDate | DATE | NULLABLE |
| CancelDateYearMonth | INTEGER | NULLABLE |
| CancelDateYear | INTEGER | NULLABLE |
| CancelReasonCode | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| ... | (56 more columns) | ... |

#### Fact_ContractSales_Txn_Na_Daily_Dtl_Vw
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| sales_source | STRING | NULLABLE |
| sales_id | STRING | NULLABLE |
| setup_invoice_order_id | STRING | NULLABLE |
| sell_date | DATE | NULLABLE |
| sell_date_year_month | INTEGER | NULLABLE |
| sell_date_year | INTEGER | NULLABLE |
| start_date | DATE | NULLABLE |
| start_date_year | INTEGER | NULLABLE |
| cancel_date | DATE | NULLABLE |
| cancel_reason_code | STRING | NULLABLE |
| next_scheduled_date | TIMESTAMP | NULLABLE |
| start_date_year_month | INTEGER | NULLABLE |
| product_code | STRING | NULLABLE |
| product_group | STRING | NULLABLE |
| product_category | STRING | NULLABLE |
| product_service_code | STRING | NULLABLE |
| product_service_desc | STRING | NULLABLE |
| product_category_nm | STRING | NULLABLE |
| product_group_nm | STRING | NULLABLE |
| product_service_line_nm | STRING | NULLABLE |
| service_type_desc | STRING | NULLABLE |
| lob_desc | STRING | NULLABLE |
| started_ind | STRING | NULLABLE |
| raw_cancel_ind | STRING | NULLABLE |
| limit_mtd_ly_ind | STRING | NULLABLE |
| ... | (47 more columns) | ... |

#### Fact_ContractSales_Txn_Na_Daily_Dtl_Vw_CLEANED
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| sales_source | STRING | NULLABLE |
| sales_id | STRING | NULLABLE |
| sell_date | DATE | NULLABLE |
| sell_date_year_month | INTEGER | NULLABLE |
| sell_date_year | INTEGER | NULLABLE |
| start_date | DATE | NULLABLE |
| start_date_year | INTEGER | NULLABLE |
| cancel_date | DATE | NULLABLE |
| cancel_reason_code | STRING | NULLABLE |
| start_date_year_month | INTEGER | NULLABLE |
| product_code | STRING | NULLABLE |
| product_group | STRING | NULLABLE |
| product_category | STRING | NULLABLE |
| product_service_code | STRING | NULLABLE |
| product_service_desc | STRING | NULLABLE |
| product_category_nm | STRING | NULLABLE |
| product_group_nm | STRING | NULLABLE |
| product_service_line_nm | STRING | NULLABLE |
| service_type_desc | STRING | NULLABLE |
| lob_desc | STRING | NULLABLE |
| started_ind | STRING | NULLABLE |
| raw_cancel_ind | STRING | NULLABLE |
| limit_mtd_ly_ind | STRING | NULLABLE |
| limit_mtd_ly_start_date_ind | STRING | NULLABLE |
| termite_renewal_status | STRING | NULLABLE |
| ... | (34 more columns) | ... |

#### Fact_ContractTotalSales_Txn_Na_Daily_Dtl_Vw
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SOURCE | STRING | NULLABLE |
| Contract | STRING | NULLABLE |
| salesID | STRING | NULLABLE |
| CustomerType | STRING | NULLABLE |
| ServiceType | STRING | NULLABLE |
| ServiceType_Description | STRING | NULLABLE |
| ProductCode | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| ServiceLine | STRING | NULLABLE |
| Service_Code_Description | STRING | NULLABLE |
| ProductGroup | STRING | NULLABLE |
| LOB | STRING | NULLABLE |
| LOB_Description | STRING | NULLABLE |
| SellDate | DATE | NULLABLE |
| SellDateYearMonth | INTEGER | NULLABLE |
| SellDateYear | INTEGER | NULLABLE |
| StartDate | DATE | NULLABLE |
| StartDateYearMonth | INTEGER | NULLABLE |
| StartDateYear | INTEGER | NULLABLE |
| CancelDate | DATE | NULLABLE |
| CancelDateYearMonth | INTEGER | NULLABLE |
| CancelDateYear | INTEGER | NULLABLE |
| CancelReasonCode | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| ... | (65 more columns) | ... |

#### Fact_ContractTotalSales_Txn_Na_Daily_Dtl_Vw_CLEANED
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SOURCE | STRING | NULLABLE |
| Contract | STRING | NULLABLE |
| salesID | STRING | NULLABLE |
| CustomerType | STRING | NULLABLE |
| ServiceType | STRING | NULLABLE |
| ServiceType_Description | STRING | NULLABLE |
| ProductCode | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| ServiceLine | STRING | NULLABLE |
| Service_Code_Description | STRING | NULLABLE |
| ProductGroup | STRING | NULLABLE |
| LOB | STRING | NULLABLE |
| LOB_Description | STRING | NULLABLE |
| SellDate | DATE | NULLABLE |
| SellDateYearMonth | INTEGER | NULLABLE |
| SellDateYear | INTEGER | NULLABLE |
| StartDate | DATE | NULLABLE |
| StartDateYearMonth | INTEGER | NULLABLE |
| StartDateYear | INTEGER | NULLABLE |
| CancelDate | DATE | NULLABLE |
| CancelDateYearMonth | INTEGER | NULLABLE |
| CancelDateYear | INTEGER | NULLABLE |
| CancelReasonCode | STRING | NULLABLE |
| AssignedBranchCode | STRING | NULLABLE |
| AssignedServiceBranch | STRING | NULLABLE |
| ... | (31 more columns) | ... |

*... and 74 more tables/views*

---

### S4_CusFP
**Location:** US
**Last Modified:** 2023-12-07
**Tables:** 3 | **Views:** 1

#### CustomerFP
Type: `TABLE` | Rows: 25659955

| Column | Type | Mode |
|--------|------|------|
| MasterRegion | STRING | NULLABLE |
| MasterCountryDesc | STRING | NULLABLE |
| MasterCountryCode | STRING | NULLABLE |
| MasterBusinessDesc | INTEGER | NULLABLE |
| BusinessKey | INTEGER | NULLABLE |
| Source_BusinessCode | INTEGER | NULLABLE |
| Source_CountryCode | STRING | NULLABLE |
| BranchName | STRING | NULLABLE |
| BranchAddressLine1 | STRING | NULLABLE |
| BranchAddressLine2 | STRING | NULLABLE |
| BranchAddressLine3 | INTEGER | NULLABLE |
| BranchAddressLine4 | STRING | NULLABLE |
| BranchAddressLine5 | STRING | NULLABLE |
| BranchPostcode | STRING | NULLABLE |
| BranchEmail | STRING | NULLABLE |
| BranchTelephone | STRING | NULLABLE |
| NegBranchNumber | INTEGER | NULLABLE |
| NegBranchName | INTEGER | NULLABLE |
| AccountNumber | INTEGER | NULLABLE |
| AccountName | INTEGER | NULLABLE |
| GroupAccountInd | INTEGER | NULLABLE |
| GroupAccountNumber | INTEGER | NULLABLE |
| GroupAccountName | INTEGER | NULLABLE |
| AccountTierCode | INTEGER | NULLABLE |
| AccountTierName | INTEGER | NULLABLE |
| ... | (89 more columns) | ... |

#### US_CustomerFootPrint
Type: `TABLE` | Rows: 27265886

| Column | Type | Mode |
|--------|------|------|
| MasterRegion | STRING | NULLABLE |
| MasterCountryDesc | STRING | NULLABLE |
| MasterCountryCode | STRING | NULLABLE |
| MasterBusinessDesc | STRING | NULLABLE |
| BusinessKey | STRING | NULLABLE |
| Source_BusinessCode | STRING | NULLABLE |
| Source_CountryCode | STRING | NULLABLE |
| BranchNumber | STRING | NULLABLE |
| BranchName | STRING | NULLABLE |
| BranchAddressLine1 | STRING | NULLABLE |
| BranchAddressLine2 | STRING | NULLABLE |
| BranchAddressLine3 | STRING | NULLABLE |
| BranchAddressLine4 | STRING | NULLABLE |
| BranchAddressLine5 | STRING | NULLABLE |
| BranchPostcode | STRING | NULLABLE |
| BranchEmail | STRING | NULLABLE |
| BranchTelephone | STRING | NULLABLE |
| NegBranchNumber | INTEGER | NULLABLE |
| NegBranchName | STRING | NULLABLE |
| BranchKey | STRING | NULLABLE |
| AccountNumber | INTEGER | NULLABLE |
| AccountName | STRING | NULLABLE |
| GroupAccountInd | STRING | NULLABLE |
| GroupAccountNumber | INTEGER | NULLABLE |
| GroupAccountName | STRING | NULLABLE |
| ... | (93 more columns) | ... |

#### US_CustomerFootPrint_0001
Type: `TABLE` | Rows: 27265949

| Column | Type | Mode |
|--------|------|------|
| MasterRegion | STRING | NULLABLE |
| MasterCountryDesc | STRING | NULLABLE |
| MasterCountryCode | STRING | NULLABLE |
| MasterBusinessDesc | STRING | NULLABLE |
| BusinessKey | STRING | NULLABLE |
| Source_BusinessCode | STRING | NULLABLE |
| Source_CountryCode | STRING | NULLABLE |
| BranchNumber | STRING | NULLABLE |
| BranchName | STRING | NULLABLE |
| BranchAddressLine1 | STRING | NULLABLE |
| BranchAddressLine2 | STRING | NULLABLE |
| BranchAddressLine3 | STRING | NULLABLE |
| BranchAddressLine4 | STRING | NULLABLE |
| BranchAddressLine5 | STRING | NULLABLE |
| BranchPostcode | STRING | NULLABLE |
| BranchEmail | STRING | NULLABLE |
| BranchTelephone | STRING | NULLABLE |
| NegBranchNumber | INTEGER | NULLABLE |
| NegBranchName | STRING | NULLABLE |
| BranchKey | STRING | NULLABLE |
| AccountNumber | INTEGER | NULLABLE |
| AccountName | STRING | NULLABLE |
| GroupAccountInd | STRING | NULLABLE |
| GroupAccountNumber | INTEGER | NULLABLE |
| GroupAccountName | STRING | NULLABLE |
| ... | (93 more columns) | ... |

#### vw_CustomerFootPrint_0001
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| MasterRegion | STRING | NULLABLE |
| MasterCountryDesc | STRING | NULLABLE |
| MasterCountryCode | STRING | NULLABLE |
| MasterBusinessDesc | STRING | NULLABLE |
| BusinessKey | STRING | NULLABLE |
| Source_BusinessCode | STRING | NULLABLE |
| Source_CountryCode | STRING | NULLABLE |
| BranchNumber | STRING | NULLABLE |
| BranchName | STRING | NULLABLE |
| BranchAddressLine1 | STRING | NULLABLE |
| BranchAddressLine2 | STRING | NULLABLE |
| BranchAddressLine3 | STRING | NULLABLE |
| BranchAddressLine4 | STRING | NULLABLE |
| BranchAddressLine5 | STRING | NULLABLE |
| BranchPostcode | STRING | NULLABLE |
| BranchEmail | STRING | NULLABLE |
| BranchTelephone | STRING | NULLABLE |
| NegBranchNumber | INTEGER | NULLABLE |
| NegBranchName | STRING | NULLABLE |
| BranchKey | STRING | NULLABLE |
| AccountNumber | INTEGER | NULLABLE |
| AccountName | STRING | NULLABLE |
| GroupAccountInd | STRING | NULLABLE |
| GroupAccountNumber | INTEGER | NULLABLE |
| GroupAccountName | STRING | NULLABLE |
| ... | (93 more columns) | ... |

---

### S4_Reports
**Location:** US
**Last Modified:** 2024-03-26
**Tables:** 10 | **Views:** 1

#### AR_DETAIL_REPORTS
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| RTX_Branch_Codes | INTEGER | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| BranchNameCode | STRING | NULLABLE |
| RevenueAmount | FLOAT | NULLABLE |
| PaidAmount | FLOAT | NULLABLE |
| OutStandingAmount | FLOAT | NULLABLE |
| Customer_Type | STRING | NULLABLE |
| CUSTNUM | STRING | NULLABLE |
| InvoiceCount | INTEGER | NULLABLE |
| invoice_date | DATE | NULLABLE |
| Year | INTEGER | NULLABLE |
| Month | INTEGER | NULLABLE |
| PeriodMonthYear | STRING | NULLABLE |
| source_system | STRING | NULLABLE |

#### AgingCategory
Type: `EXTERNAL` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| AgingCategory | STRING | NULLABLE |
| SortOrder | NUMERIC | NULLABLE |

#### Current_AR
Type: `TABLE` | Rows: 917451

| Column | Type | Mode |
|--------|------|------|
| accountNum_SA | STRING | NULLABLE |
| CUSTNUM | STRING | NULLABLE |
| PastDue_AR | NUMERIC | NULLABLE |
| Current_AR | FLOAT | NULLABLE |
| PastDueBUCKET | STRING | NULLABLE |

#### MOM
Type: `TABLE` | Rows: 156749

| Column | Type | Mode |
|--------|------|------|
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| RTX_Branch_Codes | INTEGER | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| Aging | STRING | NULLABLE |
| date | DATE | NULLABLE |
| year | INTEGER | NULLABLE |
| Month | INTEGER | NULLABLE |
| MonthName | STRING | NULLABLE |
| total | FLOAT | NULLABLE |

#### Mission_MaxDate
Type: `TABLE` | Rows: 1

| Column | Type | Mode |
|--------|------|------|
| Mission_UpdateDate | DATE | NULLABLE |

#### RPP_MaxDate
Type: `TABLE` | Rows: 1

| Column | Type | Mode |
|--------|------|------|
| RPP | STRING | NULLABLE |
| RPP_UpdateDate | DATE | NULLABLE |

#### YOY
Type: `TABLE` | Rows: 111057

| Column | Type | Mode |
|--------|------|------|
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| RTX_Branch_Codes | INTEGER | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| year | INTEGER | NULLABLE |
| TotalPastDue | FLOAT | NULLABLE |
| AR_Amount | FLOAT | NULLABLE |

#### ar_FactTable
Type: `TABLE` | Rows: 4268572

| Column | Type | Mode |
|--------|------|------|
| RTX_Market_Code | STRING | NULLABLE |
| RTX_Market_Name | STRING | NULLABLE |
| RTX_Region_Code | STRING | NULLABLE |
| RTX_Region_Name | STRING | NULLABLE |
| RTX_Branch_Codes | INTEGER | NULLABLE |
| RTX_Branch_Name | STRING | NULLABLE |
| Branch | STRING | NULLABLE |
| CUSTNUM | STRING | NULLABLE |
| CustomerName | STRING | NULLABLE |
| Amount | FLOAT | NULLABLE |
| accountNum_SA | STRING | NULLABLE |
| PASTDUE | FLOAT | NULLABLE |
| FUTUREDUE | FLOAT | NULLABLE |
| PastDueBUCKET | STRING | NULLABLE |
| product_grouping | STRING | NULLABLE |
| Customer_Type | STRING | NULLABLE |
| source_system | STRING | NULLABLE |
| Status | STRING | NULLABLE |

#### ar_balances
Type: `TABLE` | Rows: 72139

| Column | Type | Mode |
|--------|------|------|
| CUSTNUM | STRING | NULLABLE |
| CustomerName | STRING | NULLABLE |
| Customer_Type | STRING | NULLABLE |
| AR_BALANCE | FLOAT | NULLABLE |

#### ar_balances_TopTen
Type: `TABLE` | Rows: 10

| Column | Type | Mode |
|--------|------|------|
| CUSTNUM | STRING | NULLABLE |
| CustomerName | STRING | NULLABLE |
| Customer_Type | STRING | NULLABLE |
| AR_BALANCE | FLOAT | NULLABLE |

#### ar_balances_summary
Type: `TABLE` | Rows: 1

| Column | Type | Mode |
|--------|------|------|
| PastDueAR | FLOAT | NULLABLE |
| CurrentAR | FLOAT | NULLABLE |
| TotalAR | FLOAT | NULLABLE |

#### customers_ar
Type: `TABLE` | Rows: 3016872

| Column | Type | Mode |
|--------|------|------|
| CustomerNumber | STRING | NULLABLE |
| CustomerName | STRING | NULLABLE |

---

### SalesReporting_RNA_PPNW
**Location:** US
**Last Modified:** 2025-05-09
**Tables:** 0 | **Views:** 7

#### Fact_ContractSales_Txn_Na_Daily_Dtl_PPNW
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| sales_source | STRING | NULLABLE |
| sales_id | STRING | NULLABLE |
| sell_date | DATE | NULLABLE |
| sell_date_year_month | INTEGER | NULLABLE |
| sell_date_year | INTEGER | NULLABLE |
| start_date | DATE | NULLABLE |
| start_date_year | INTEGER | NULLABLE |
| cancel_date | DATE | NULLABLE |
| cancel_reason_code | STRING | NULLABLE |
| next_scheduled_date | TIMESTAMP | NULLABLE |
| start_date_year_month | INTEGER | NULLABLE |
| product_code | STRING | NULLABLE |
| product_group | STRING | NULLABLE |
| product_category | STRING | NULLABLE |
| product_service_code | STRING | NULLABLE |
| product_service_desc | STRING | NULLABLE |
| product_category_nm | STRING | NULLABLE |
| product_group_nm | STRING | NULLABLE |
| product_service_line_nm | STRING | NULLABLE |
| service_type_desc | STRING | NULLABLE |
| lob_desc | STRING | NULLABLE |
| started_ind | STRING | NULLABLE |
| raw_cancel_ind | STRING | NULLABLE |
| limit_mtd_ly_ind | STRING | NULLABLE |
| limit_mtd_ly_start_date_ind | STRING | NULLABLE |
| ... | (38 more columns) | ... |

#### Fact_ContractTotalSales_Txn_Na_Daily_Dtl_PPNW
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SOURCE | STRING | NULLABLE |
| Contract | STRING | NULLABLE |
| salesID | STRING | NULLABLE |
| CustomerType | STRING | NULLABLE |
| ServiceType | STRING | NULLABLE |
| ServiceType_Description | STRING | NULLABLE |
| ProductCode | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| ServiceLine | STRING | NULLABLE |
| Service_Code_Description | STRING | NULLABLE |
| ProductGroup | STRING | NULLABLE |
| LOB | STRING | NULLABLE |
| LOB_Description | STRING | NULLABLE |
| SellDate | DATE | NULLABLE |
| SellDateYearMonth | INTEGER | NULLABLE |
| SellDateYear | INTEGER | NULLABLE |
| StartDate | DATE | NULLABLE |
| StartDateYearMonth | INTEGER | NULLABLE |
| StartDateYear | INTEGER | NULLABLE |
| CancelDate | DATE | NULLABLE |
| CancelDateYearMonth | INTEGER | NULLABLE |
| CancelDateYear | INTEGER | NULLABLE |
| CancelReasonCode | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| ... | (64 more columns) | ... |

#### vw_rpp_Contract_PPNW
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| Source | STRING | NULLABLE |
| SalesCategory | STRING | NULLABLE |
| locationID | INTEGER | NULLABLE |
| locationCode | INTEGER | NULLABLE |
| BillToID | INTEGER | NULLABLE |
| BillToCode | INTEGER | NULLABLE |
| Contract | INTEGER | NULLABLE |
| salesID | INTEGER | NULLABLE |
| setupID | INTEGER | NULLABLE |
| orderNum | INTEGER | NULLABLE |
| invoiceNum | INTEGER | NULLABLE |
| division | STRING | NULLABLE |
| MarketType | STRING | NULLABLE |
| ServiceType | STRING | NULLABLE |
| ProductCode | STRING | NULLABLE |
| ProductGroup | STRING | NULLABLE |
| serviceDesc | STRING | NULLABLE |
| SellDate | DATE | NULLABLE |
| StartDate | DATE | NULLABLE |
| CancelDate | DATE | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| AssignedBranch | STRING | NULLABLE |
| AssignedServiceBranch | STRING | NULLABLE |
| Geography | STRING | NULLABLE |
| ... | (46 more columns) | ... |

#### vw_rpp_stage1_Contract_PPNW
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| sTbl | STRING | NULLABLE |
| source | STRING | NULLABLE |
| contract_Job_or_Product | STRING | NULLABLE |
| type | STRING | NULLABLE |
| ServiceClass | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| branchID | STRING | NULLABLE |
| ServiceBranchID | STRING | NULLABLE |
| postalCode | STRING | NULLABLE |
| state | STRING | NULLABLE |
| startDate | DATE | NULLABLE |
| addDate | DATE | NULLABLE |
| adduserID | INTEGER | NULLABLE |
| orderDate | DATE | NULLABLE |
| workDate | DATE | NULLABLE |
| serviceCode | STRING | NULLABLE |
| productGroup | STRING | NULLABLE |
| serviceDesc | STRING | NULLABLE |
| jobContract | STRING | NULLABLE |
| employee_ID | INTEGER | NULLABLE |
| employeeNum | INTEGER | NULLABLE |
| employeeJobTitle | STRING | NULLABLE |
| username | STRING | NULLABLE |
| salesPerson | STRING | NULLABLE |
| ... | (58 more columns) | ... |

#### vw_rpp_stage2_Contract_PPNW
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SalesCategory | STRING | NULLABLE |
| sTbl | STRING | NULLABLE |
| source | STRING | NULLABLE |
| contract_Job_or_Product | STRING | NULLABLE |
| type | STRING | NULLABLE |
| ServiceClass | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| branchID | STRING | NULLABLE |
| ServiceBranchID | STRING | NULLABLE |
| postalCode | STRING | NULLABLE |
| state | STRING | NULLABLE |
| startDate | DATE | NULLABLE |
| addDate | DATE | NULLABLE |
| adduserID | INTEGER | NULLABLE |
| orderDate | DATE | NULLABLE |
| workDate | DATE | NULLABLE |
| serviceCode | STRING | NULLABLE |
| productGroup | STRING | NULLABLE |
| serviceDesc | STRING | NULLABLE |
| jobContract | STRING | NULLABLE |
| employee_ID | INTEGER | NULLABLE |
| employeeNum | INTEGER | NULLABLE |
| employeeJobTitle | STRING | NULLABLE |
| username | STRING | NULLABLE |
| ... | (61 more columns) | ... |

#### vw_rpp_stage3_Contract_PPNW
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SalesCategory | STRING | NULLABLE |
| sTbl | STRING | NULLABLE |
| source | STRING | NULLABLE |
| contract_Job_or_Product | STRING | NULLABLE |
| type | STRING | NULLABLE |
| ServiceClass | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| branchID | STRING | NULLABLE |
| ServiceBranchID | STRING | NULLABLE |
| postalCode | STRING | NULLABLE |
| state | STRING | NULLABLE |
| startDate | DATE | NULLABLE |
| addDate | DATE | NULLABLE |
| adduserID | INTEGER | NULLABLE |
| orderDate | DATE | NULLABLE |
| workDate | DATE | NULLABLE |
| serviceCode | STRING | NULLABLE |
| productGroup | STRING | NULLABLE |
| serviceDesc | STRING | NULLABLE |
| jobContract | STRING | NULLABLE |
| employee_ID | INTEGER | NULLABLE |
| employeeNum | INTEGER | NULLABLE |
| employeeJobTitle | STRING | NULLABLE |
| username | STRING | NULLABLE |
| ... | (62 more columns) | ... |

#### vw_unf_Contract_PPNW
Type: `VIEW` | Rows: 0

| Column | Type | Mode |
|--------|------|------|
| SOURCE | STRING | NULLABLE |
| Contract | STRING | NULLABLE |
| salesID | STRING | NULLABLE |
| CustomerType | STRING | NULLABLE |
| ServiceType | STRING | NULLABLE |
| ServiceType_Description | STRING | NULLABLE |
| ProductCode | STRING | NULLABLE |
| Category | STRING | NULLABLE |
| ServiceLine | STRING | NULLABLE |
| Service_Code_Description | STRING | NULLABLE |
| ProductGroup | STRING | NULLABLE |
| LOB | STRING | NULLABLE |
| LOB_Description | STRING | NULLABLE |
| SellDate | DATE | NULLABLE |
| SellDateYearMonth | INTEGER | NULLABLE |
| SellDateYear | INTEGER | NULLABLE |
| StartDate | DATE | NULLABLE |
| StartDateYearMonth | INTEGER | NULLABLE |
| StartDateYear | INTEGER | NULLABLE |
| CancelDate | DATE | NULLABLE |
| CancelDateYearMonth | INTEGER | NULLABLE |
| CancelDateYear | INTEGER | NULLABLE |
| CancelReasonCode | STRING | NULLABLE |
| MarketCode | STRING | NULLABLE |
| RegionCode | STRING | NULLABLE |
| ... | (63 more columns) | ... |

---

### WorkDayTerm
**Location:** US
**Last Modified:** 2024-06-19
**Tables:** 1 | **Views:** 0

#### WorkDayTermDtls
Type: `TABLE` | Rows: 1

| Column | Type | Mode |
|--------|------|------|
| Report_Entry | RECORD | REPEATED |

---

## All Datasets Overview

| Dataset | Tables | Views | Last Modified |
|---------|--------|-------|---------------|
| AR ⭐ | 0 | 2 | 2026-01-14 |
| Branch_S0 ⭐ | 2 | 2 | 2024-01-02 |
| Branch_S1 | 2 | 0 | 2024-01-02 |
| BusinessRulesGateway | 1 | 0 | 2024-08-21 |
| Functions | 0 | 0 | 2023-05-18 |
| HealthCheck | 0 | 3 | 2023-05-18 |
| Innovation | 0 | 0 | 2023-05-18 |
| Leads_S1 ⭐ | 8 | 0 | 2025-08-07 |
| Leads_S2 ⭐ | 11 | 0 | 2025-08-07 |
| Leads_S3 ⭐ | 12 | 0 | 2025-08-07 |
| MktAnalytics_import | 95 | 1 | 2025-06-19 |
| Procedures | 1 | 1 | 2023-05-18 |
| ProjectResources | 0 | 0 | 2023-05-18 |
| Reference ⭐ | 16 | 10 | 2023-05-18 |
| Reference_EXT | 0 | 1 | 2023-05-18 |
| Reports | 1 | 0 | 2024-05-10 |
| RouteOne | 0 | 14 | 2025-06-12 |
| S0 | 224 | 142 | 2023-09-20 |
| S0_RNA | 9 | 15 | 2023-06-14 |
| S0_RNA_Cleaned | 0 | 3 | 2026-01-15 |
| S0_TMX ⭐ | 143 | 86 | 2023-12-19 |
| S0_TMX_Cleaned | 0 | 2 | 2026-01-17 |
| S0_standalone | 36 | 0 | 2026-01-14 |
| S0_standalones | 57 | 0 | 2026-01-12 |
| S1 | 135 | 57 | 2023-05-17 |
| S1_Cleaned | 0 | 2 | 2026-01-15 |
| S1_TMX | 46 | 0 | 2023-07-14 |
| S2 | 56 | 34 | 2025-04-22 |
| S2_Cleaned | 0 | 1 | 2026-01-16 |
| S2_TMX | 2 | 0 | 2024-07-22 |
| S3 | 63 | 20 | 2023-05-17 |
| S3_TMX | 3 | 0 | 2024-07-26 |
| S3_UNF | 0 | 0 | 2023-07-17 |
| S4 ⭐ | 21 | 68 | 2023-05-18 |
| S4_CF | 59 | 1 | 2023-12-06 |
| S4_Cleaned | 0 | 3 | 2026-01-12 |
| S4_CusFP ⭐ | 3 | 1 | 2023-12-07 |
| S4_Reports ⭐ | 10 | 2 | 2024-03-26 |
| SalesReporting_RNA_PPNW ⭐ | 0 | 7 | 2025-05-09 |
| Sales_Test | 0 | 14 | 2025-05-20 |
| Sales_View_Cleanup | 0 | 1 | 2025-07-18 |
| ScheduleFirming | 2 | 0 | 2024-09-12 |
| So_TMX | 0 | 0 | 2024-10-10 |
| TAP | 0 | 12 | 2023-12-20 |
| Test | 142 | 20 | 2024-05-08 |
| Test2 | 1 | 6 | 2024-05-13 |
| Test_SalesReporting | 3 | 18 | 2025-06-05 |
| WorkDayTerm ⭐ | 1 | 0 | 2024-06-19 |
| dpipeconfig | 4 | 0 | 2024-03-20 |
| dq_repo | 4 | 0 | 2026-01-21 |
| ndp_repo | 10 | 0 | 2024-09-23 |
| ppnw_dbo | 36 | 0 | 2025-08-11 |
| replicate_pestpac_bishared_conf | 3 | 0 | 2025-09-08 |
| rpp_finance_copy | 4 | 4 | 2024-02-06 |
| rpp_finance_copy_us | 0 | 8 | 2024-02-13 |
| rspiperepos | 14 | 0 | 2023-07-26 |
| s0_tmx | 1 | 0 | 2024-01-17 |
| stg_tmx | 54 | 0 | 2023-07-17 |
| test | 11 | 3 | 2024-05-08 |
| wocomp | 1 | 0 | 2025-05-05 |

---

# PRODUCTION Schema - bidata-sharedus-production

**Generated:** 2026-01-22
**Project:** bidata-sharedus-production
**Total Datasets:** 74

## Key Production Datasets for Dashboard Integration

Production has different/additional datasets compared to dev. Key datasets:

| Dataset | Description |
|---------|-------------|
| S4 | **Primary data warehouse** - 163 tables/views with leads, sales, cancels, backlog, AR, work orders |
| S5 | Empty in production |
| Reports | TAP reports, AR rankings - 34 tables |
| Reference | Branch hierarchy, lead reference tables - 38 tables |
| ResidentialDataTables | Residential customer data - 9 tables |
| CommercialExport | Commercial data exports |
| CX_Retention_ReferenceTbls | Customer retention reference tables |

---

## S4 Dataset (Primary Data Warehouse)

### Fact_Leads_Acc_Daily_Dtls_Vw

**Type:** VIEW | **Primary use:** Lead tracking and funnel analysis

| Column | Type | Description |
|--------|------|-------------|
| rtx_lead_uid | STRING | Unique lead identifier |
| lead_ID | STRING | Lead ID |
| business | STRING | Business unit |
| received_date | TIMESTAMP | Lead received date |
| source_system | STRING | Source system (RNA/TMX) |
| market_type | STRING | Residential/Commercial |
| lead_type | STRING | Lead type |
| lead_source | STRING | Lead source |
| lead_channel_1 | STRING | Primary channel |
| lead_channel_2 | STRING | Secondary channel |
| lead_form_type | STRING | Form type |
| lead_form_affiliate | STRING | Affiliate info |
| primary_pest | STRING | Primary pest type |
| primary_pest_report_group | STRING | Pest grouping |
| primary_pest_type_1 | STRING | Pest type level 1 |
| primary_pest_solution | STRING | Recommended solution |
| contact_name | STRING | Contact name |
| contact_phone | STRING | Contact phone |
| contact_email | STRING | Contact email |
| contact_address | STRING | Address |
| contact_city | STRING | City |
| contact_state | STRING | State |
| contact_zip_code | STRING | ZIP code |
| brand | STRING | Brand (Rentokil/Terminix) |
| originating_branch | STRING | Originating branch |
| assigned_branch | STRING | Assigned branch |
| report_branch | STRING | Report branch |
| assigned_employee_id | STRING | Assigned rep |
| cancel_reason | STRING | Cancel reason if canceled |
| sales_employee | STRING | Sales employee |
| *...and 40 more columns* | | Stage dates, amounts, flags |

---

### Fact_ContractSales_Txn_Na_Daily_Dtl_Vw

**Type:** VIEW | **Primary use:** Contract sales tracking

| Column | Type | Description |
|--------|------|-------------|
| sales_source | STRING | Source system |
| sales_id | STRING | Sales ID |
| sell_date | DATE | Date sold |
| sell_date_year_month | INTEGER | YYYYMM |
| start_date | DATE | Service start date |
| cancel_date | DATE | Cancel date if canceled |
| cancel_reason_code | STRING | Cancel reason code |
| product_code | STRING | Product code |
| product_group | STRING | Product grouping |
| product_category | STRING | Category |
| product_service_line_nm | STRING | Service line |
| service_type_desc | STRING | Service type |
| lob_desc | STRING | Line of business |
| started_ind | STRING | Y/N started |
| raw_cancel_ind | STRING | Y/N raw cancel |
| started_within_two_days_ind | INTEGER | 1/0 started fast |
| *...and 42 more columns* | | Branch, employee, amounts |

---

### Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw

**Type:** VIEW | **Primary use:** Contract cancellation analysis

| Column | Type | Description |
|--------|------|-------------|
| SOURCE | STRING | Source system |
| Contract | STRING | Contract number |
| salesID | STRING | Sales ID |
| CustomerType | STRING | Customer type |
| ServiceType | STRING | Service type |
| ProductCode | STRING | Product code |
| ProductGroup | STRING | Product group |
| SellDate | DATE | Sell date |
| StartDate | DATE | Start date |
| CancelDate | DATE | Cancel date |
| CancelDateYearMonth | INTEGER | YYYYMM |
| CancelReasonCode | STRING | Cancel reason |
| MarketCode | STRING | Market code |
| RegionCode | STRING | Region code |
| AssignedBranchCode | STRING | Branch code |
| customer_name | STRING | Customer name |
| *...and 51 more columns* | | Amounts, employee info |

---

### Fact_ContractBacklog_Txn_Na_Daily_Dtl_Vw

**Type:** VIEW | **Primary use:** Sales backlog tracking

| Column | Type | Description |
|--------|------|-------------|
| SOURCE | STRING | Source system |
| Contract | STRING | Contract number |
| salesID | STRING | Sales ID |
| CustomerType | STRING | Customer type |
| ProductCode | STRING | Product code |
| ProductGroup | STRING | Product group |
| SellDate | DATE | Sell date |
| StartDate | DATE | Start date (null if backlog) |
| CancelDate | DATE | Cancel date |
| MarketCode | STRING | Market code |
| RegionCode | STRING | Region code |
| AssignedBranchCode | STRING | Branch code |
| customer_name | STRING | Customer name |
| SalesPerson | STRING | Sales person |
| *...and 32 more columns* | | Amounts, status flags |

---

### Fact_ContractStartRateByDuration_Txn_Na_Daily_Agg_Vw

**Type:** VIEW | **Primary use:** Start rate analysis

| Column | Type | Description |
|--------|------|-------------|
| SOURCE | STRING | Source system |
| MarketCode | STRING | Market code |
| CustomerType | STRING | Customer type |
| RegionCode | STRING | Region code |
| AssignedBranchCode | STRING | Branch code |
| SellDateYear | INTEGER | Sell year |
| SellDateYearMonth | INTEGER | YYYYMM |
| SellDate | DATE | Sell date |
| DaysToStartBucket | INTEGER | Days to start bucket |
| ContractValue | NUMERIC | Contract value |
| InitialValue | NUMERIC | Initial value |
| ContractCount | INTEGER | Contract count |
| ContractStartedValue | NUMERIC | Started value |
| ContractStartedCount | INTEGER | Started count |
| *...and 11 more columns* | | Job values, counts |

---

### VwUnf_daily_ar

**Type:** VIEW | **Primary use:** AR aging analysis

| Column | Type | Description |
|--------|------|-------------|
| market_cd | STRING | Market code |
| market_nm | STRING | Market name |
| region_cd | STRING | Region code |
| region_nm | STRING | Region name |
| branch_cd | INTEGER | Branch code |
| branch_nm | STRING | Branch name |
| CUSTNUM | STRING | Customer number |
| Amount | FLOAT | AR amount |
| PASTDUE | FLOAT | Past due amount |
| FUTUREDUE | FLOAT | Future due amount |
| PastDueBUCKET | STRING | Aging bucket |
| product_grouping | STRING | Product group |
| invoice_type | STRING | Invoice type |
| Invoice_Status | STRING | Status |
| Invoice_Due_date | DATE | Due date |
| snapshot_date | DATE | Snapshot date |
| source_system | STRING | Source system |

---

### Fact_PNI_Details_Txn_Na_Daily_Dtl_vw

**Type:** VIEW | **Primary use:** Termite PNI inspections

| Column | Type | Description |
|--------|------|-------------|
| Branch_Number | STRING | Branch number |
| Business_Unit_Class | STRING | Business unit class |
| RNA_Brand | STRING | Brand |
| Customer_Number | STRING | Customer number |
| SalesAgreement_Number | STRING | SA number |
| SalesAgreement_Effective_Date | DATE | SA effective date |
| Full_Name | STRING | Customer name |
| Street | STRING | Address |
| City | STRING | City |
| State | STRING | State |
| Zip | STRING | ZIP |
| Customer_Phone_Number | STRING | Phone |
| Customer_Email | STRING | Email |
| Invoice_Service_Line | STRING | Service line |
| AR_Collections_Amt | NUMERIC | AR amount |
| Invoice_Month | STRING | Invoice month |
| Renewal_Month | INTEGER | Renewal month |
| Service_Begin_Date | DATE | Service begin |
| Service_End_Date | DATE | Service end |
| *...and 18 more columns* | | Inspection details |

---

### Fact_TermiteRenewals_Snp_Na_Daily_Agg_Vw

**Type:** VIEW | **Primary use:** Termite renewal tracking

| Column | Type | Description |
|--------|------|-------------|
| SalesAgreement_Number | INTEGER | SA number |
| Oldest_Invoice | TIMESTAMP | Oldest invoice date |
| Invoice_Count | INTEGER | Invoice count |
| Customer_Number | STRING | Customer number |
| Full_Name | STRING | Customer name |
| Phone_Number | STRING | Phone |
| Customer_Email | STRING | Email |
| Address | STRING | Address |
| Branch_Number | STRING | Branch |
| Branch_Name | STRING | Branch name |
| Region_Number | STRING | Region |
| Service_Frequency | STRING | Service frequency |
| Billing_Frequency_Code | STRING | Billing frequency |
| AutoPay_Flag | STRING | Autopay flag |
| PP_Service_Code | STRING | Service code |
| *...and 30 more columns* | | Renewal details, amounts |

---

### Fact_WorkOrderCompleted_Txn_Na_Daily_Dtl_Vw

**Type:** VIEW | **Primary use:** Work order completion tracking

| Column | Type | Description |
|--------|------|-------------|
| Source | STRING | Source system |
| BranchID | STRING | Branch ID |
| Contract | INTEGER | Contract number |
| WorkOrder | INTEGER | Work order number |
| MarketType | STRING | Market type |
| DueDate | TIMESTAMP | Due date |
| ScheduledDate | TIMESTAMP | Scheduled date |
| AssignedTech | INTEGER | Assigned technician |
| TechName | STRING | Technician name |
| EndDate | TIMESTAMP | Completion date |
| Status | STRING | Status |
| WorkOrderAmount | NUMERIC | Amount |
| ProductGrouping | STRING | Product group |
| ServiceLine2 | STRING | Service line |
| ServiceType | STRING | Service type |
| *...and 10 more columns* | | Details |

---

### Fact_RTX_Employees_Latest

**Type:** TABLE | **Rows:** 28,180 | **Primary use:** Employee master

| Column | Type | Description |
|--------|------|-------------|
| Employee_Number | STRING | Employee number |
| First_Name | STRING | First name |
| Last_Name | STRING | Last name |
| Primary_Work_Email | STRING | Email |
| Business_Phone | STRING | Phone |
| Branch | STRING | Branch code |
| Branch_Description | STRING | Branch name |
| Region_ID | STRING | Region ID |
| Region_Description | STRING | Region name |
| Division_ID | STRING | Division ID |
| RTX_Line_of_Business_Code | STRING | LOB code |
| Brand | STRING | Brand |
| Job_Family | STRING | Job family |
| Job_Title | STRING | Job title |
| Management_Level | STRING | Management level |
| Active | STRING | Active flag |
| Hire_Date | DATE | Hire date |
| Termination_Date | DATE | Term date if applicable |
| *...and 56 more columns* | | Full employee details |

---

### dim_branch

**Type:** VIEW | **Primary use:** Branch hierarchy

| Column | Type | Description |
|--------|------|-------------|
| market_cd | STRING | Market code |
| market_nm | STRING | Market name |
| region_cd | STRING | Region code |
| region_nm | STRING | Region name |
| branch_num | STRING | Branch number |
| branch_nm | STRING | Branch name |
| branch_type | STRING | Branch type |
| heritage_org_cd | STRING | Heritage org |
| brand_nm | STRING | Brand |
| operating_system_nm | STRING | Operating system |
| branch_status_cd | STRING | Status |
| branch_address_st1 | STRING | Address |
| branch_city_nm | STRING | City |
| branch_state_cd | STRING | State |
| branch_zip_cd | STRING | ZIP |
| branch_manager_nm | STRING | Branch manager |
| regional_manager_nm | STRING | Regional manager |

---

## Reference Dataset

### GS_Ref_BranchHierarchy

**Type:** EXTERNAL (Google Sheets) | **Primary use:** Branch hierarchy master

| Column | Type | Description |
|--------|------|-------------|
| BranchNumber | STRING | Branch number |
| BranchName | STRING | Branch name |
| BranchAddress1 | STRING | Address line 1 |
| BranchCity | STRING | City |
| BranchJurisdiction | STRING | State |
| BranchPostalCode | STRING | ZIP |
| BranchPhone | STRING | Phone |
| BranchEmail | STRING | Email |
| BranchRegion | STRING | Region |
| BranchMarketCode | STRING | Market code |
| BranchMarket | STRING | Market name |
| BranchBrand | STRING | Brand |
| BranchLOB | STRING | Line of business |
| BranchStatus | STRING | Status |
| BranchManager | STRING | Manager name |
| RegionalDirector | STRING | RD name |
| HeritageOrg | STRING | Heritage org |
| OperatingSystem | STRING | Operating system |
| *...and 13 more columns* | | Additional details |

---

## Reports Dataset

34 tables/views including:

| Table | Purpose |
|-------|---------|
| BranchRankByARValue | AR ranking by branch |
| BranchReports | General branch reports |
| TAP_* | TAP (Technician Activity Program) reports |
| ar_rank_by_amount | AR rankings |
| ar_rank_by_days | AR aging rankings |
| vw_ContractStarted | Contract start tracking |

---

## Production vs Dev Comparison

| Feature | Production | Dev |
|---------|------------|-----|
| Total Datasets | 74 | 60 |
| S4 Tables | 163 | 88+ |
| Employee Data | 28K rows (Latest table) | Varies |
| Lead Data | Full daily views | Similar |
| Real-time Views | Yes (Daily/Hourly) | Yes |
| Historical Data | Full production data | Test data |

---

## Data Freshness

| Table | Update Frequency |
|-------|------------------|
| Fact_Leads_Acc_Daily_Dtls_Vw | Daily |
| Fact_ContractSales_* | Daily |
| VwUnf_daily_ar | Daily |
| Fact_WorkOrderCompleted_* | Daily |
| Fact_RTX_Employees_Latest | Near real-time |
| dim_branch | Infrequent (master data) |
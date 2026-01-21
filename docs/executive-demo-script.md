# Executive Demo Script

**Duration:** 10-12 Minutes
**Audience:** BI Leadership (Susan/Jason)
**Version:** 1.0
**Date:** January 11, 2026

---

## Pre-Demo Checklist

- [ ] Clear browser cache/cookies
- [ ] Login as exec role (cody.lytle@rentokil.com)
- [ ] Verify synthetic data is fresh (check last refresh timestamp)
- [ ] Close unnecessary browser tabs
- [ ] Enable presenter mode from Admin page (optional)
- [ ] Pop-out speaker notes to second screen (if available)
- [ ] Test screen share before meeting

---

## Demo Flow

### [0:00-1:00] Opening & Context

**Route:** `/` (Command Center)

**Script:**

> "Good morning. What you're seeing is a working prototype of our unified BI command center. This pulls data from SAP, PestPac, Salesforce, and Workday into a single view.
>
> [Point to top KPI cards]
>
> These top-line metrics update every 15 minutes in production. Right now we're using synthetic data that mirrors our actual volume--1,500 accounts, 2,500 opportunities, 12,000 service events."

**Objection Preempt:**

> "This is synthetic data, but the calculations and structure are production-ready. When we connect to real sources, these numbers become live."

---

### [1:00-3:00] Revenue & Variance Deep Dive

**Action:** Click on Revenue MTD card

**Route:** `/kpi/revenue_mtd`

**Script:**

> "Let's drill into Revenue MTD. This is the KPI detail view every metric has.
>
> [Click through tabs: Overview -> Drivers -> Actions -> Reconcile -> Definition]
>
> The 'Reconcile' tab is key--it shows our calculated value versus the source system. We're within 0.1% tolerance, which is our data contract.
>
> The 'Definition' tab is our single source of truth. Every KPI has a documented formula, owner, and threshold."

**Objection Preempt:**

> "Yes, we can export this entire dictionary to CSV for governance review."

---

### [3:00-4:30] Sales Pipeline Health

**Route:** `/sales`

**Script:**

> "The Sales dashboard shows pipeline by stage, win rate trends, and--critically--stalled opportunities.
>
> [Point to stalled opps section]
>
> These are deals with no activity in 14+ days. Each has an assigned owner and suggested next action. This is generated automatically from CRM data."

**Key Talking Point:**

> "We're not just showing data, we're surfacing actions. Every red card has a recommendation."

---

### [4:30-6:00] Operations & Service Quality

**Route:** `/ops`

**Script:**

> "Operations gets the Service Risk Index--a composite score of callbacks, missed services, and complaints.
>
> [Point to the index score]
>
> Higher is better here. Below 75, we need intervention. The capacity utilization shows us scheduling pressure by branch."

**Objection Preempt:**

> "This maps directly to the service KPIs we track in PestPac. The index just makes it executive-readable."

---

### [6:00-7:30] Forecasting & Scenarios

**Route:** `/forecast`

**Script:**

> "The 8-week forecast uses pipeline, recurring revenue, and seasonality.
>
> [Switch between Base, Upside, Downside scenarios]
>
> Three scenarios: base case, upside (+15%), and downside (-20%). The backtest shows our last 12 weeks of accuracy--we're targeting under 8% MAE."

**Key Talking Point:**

> "We're not asking you to trust a black box. The backtest proves the model against actual results."

---

### [7:30-9:00] Governance & Trust

**Route:** `/governance`

**Script:**

> "This is where we build trust.
>
> [Click through tabs: KPI Dictionary -> Data Quality -> Permissions]
>
> **KPI Dictionary**: Every metric defined, with calculation, owner, and threshold.
>
> **Data Quality**: Real-time view of source freshness. SAP updates every 4 hours, PestPac every 15 minutes.
>
> **Permissions**: Who can see and edit what by role. Reps only see their own data. Execs see everything."

**Objection Preempt:**

> "This isn't just a dashboard--it's a governed data product. Changes go through approval. We have version history."

---

### [9:00-10:30] Role-Based Experience

**Action:** Navigate to Admin, switch to "rep" role

**Route:** `/ae` (as rep role)

**Script:**

> "Let me show you what an Account Executive sees.
>
> [Navigate around AE routes]
>
> Completely different navigation. They see their tracker, their proposals, their new starts. They don't see the executive dashboards or governance."

**Action:** Switch to "technician" role

**Script:**

> "And technicians see their schedule, tickets, and route. Nothing else."

**Key Talking Point:**

> "Role-based access isn't just security--it's reducing noise. Everyone sees exactly what they need."

---

### [10:30-12:00] Closing & Next Steps

**Action:** Return to `/` as exec

**Script:**

> "To summarize: single source of truth, automated alerting, governed KPIs, and role-appropriate views.
>
> **For alpha**, we're running automated health checks every 5 minutes. Three agents--Timmy, Tommy, and Tina--monitor reliability, data quality, and governance changes.
>
> **For pilot**, we'll connect real data sources and onboard a small user group.
>
> What questions do you have?"

---

## Objection Handling Cheat Sheet

| Objection | Response |
|-----------|----------|
| "Is this real data?" | "Synthetic but production-structured. Same volume, same edge cases. Connection to real sources is a configuration change." |
| "Can we trust the numbers?" | "Every KPI has a reconciliation check. We publish tolerances. The Reconcile tab proves it." |
| "Who governs changes?" | "KPI Dictionary is versioned. Changes require approval. Tina agent monitors for unauthorized changes." |
| "What if it goes down?" | "Timmy agent checks health every 5 minutes. Incidents are logged and notified within seconds." |
| "How do we scale this?" | "The architecture is production-ready. Vercel scales horizontally. Real backend is Supabase with connection pooling." |
| "What about security?" | "Supabase email/password auth. Role-based access. Admin features require email whitelist." |
| "How long to connect real data?" | "Core integration is configuration. Full data validation and testing adds 2-4 weeks depending on source complexity." |

---

## Backup Talking Points

### If Asked About Data Sources

> "We currently simulate four source systems:
> - **SAP/Billing**: Invoices, AR, revenue
> - **Salesforce CRM**: Opportunities, accounts, activities
> - **PestPac**: Service events, routes, callbacks
> - **Workday**: Technician capacity, scheduling
>
> The service abstraction layer means adding a new source is a configuration change, not a rewrite."

### If Asked About Mobile

> "The app is responsive and works on mobile browsers. A dedicated mobile app is on the roadmap but not required for alpha/pilot."

### If Asked About Integrations

> "We can push alerts to Teams, Slack, or email. The n8n workflow engine handles all notification routing."

### If Asked About Cost

> "Current hosting on Vercel and Supabase is effectively free for this scale. Production would be ~$200/month for generous limits."

---

## Demo Recovery Scenarios

| Scenario | Recovery |
|----------|----------|
| Page doesn't load | Refresh browser, check internet. Have backup screenshots ready. |
| Hydration error | Refresh page. Note: this is being fixed in alpha. |
| Wrong role showing | Use Admin page to switch role. |
| KPI shows unexpected value | "The synthetic data refreshes periodically. Let me show you the definition instead." |
| Can't find a route | Use command palette (Cmd+K) to search. |

---

## Technical Requirements

- **Browser:** Chrome or Edge (latest)
- **Screen Resolution:** 1920x1080 minimum for full experience
- **Internet:** Stable connection (no offline mode)
- **Login:** Admin email required for full demo capabilities

---

## Post-Demo Follow-Up

- [ ] Send recording link (if recorded)
- [ ] Share KPI Dictionary CSV export
- [ ] Provide access credentials for self-exploration
- [ ] Schedule follow-up for questions
- [ ] Document feedback received

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-11 | Initial demo script for alpha |

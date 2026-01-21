# App Store Submission Information

This document contains all the metadata and checklists needed for submitting Rentokil BI to the Apple App Store and Google Play Store.

---

## iOS App Store

### App Information

| Field | Value |
|-------|-------|
| **App Name** | Rentokil Business Intelligence |
| **Bundle ID** | com.rentokil.bi |
| **Primary Category** | Business |
| **Secondary Category** | Productivity |
| **Age Rating** | 4+ |
| **Price** | Free (Enterprise Distribution) |

### Description (4000 chars max)

```
Rentokil Business Intelligence provides real-time KPI monitoring, sales tracking, and operations management for pest control professionals. Access your command center, track proposals, manage service routes, and stay connected with your team.

KEY FEATURES:

Executive Command Center
- View top 10 KPIs at a glance
- Real-time performance metrics
- Variance analysis with explanations
- Drill-down to detailed insights

Sales Pipeline Management
- Track proposals from lead to close
- Monitor win rates and deal values
- 8-week revenue forecasting
- Scenario planning (base/upside/downside)

Operations Dashboard
- Service completion tracking
- Route efficiency metrics
- Technician performance
- First-time fix rates

Field Operations
- Daily service schedules
- Route optimization
- Service ticket management
- Real-time status updates

Role-Based Access
- Executive overview
- Manager dashboards
- Sales rep tracking
- Technician schedules

Offline Capabilities
- View cached KPIs without connection
- Queue actions for sync
- Automatic background sync

Push Notifications
- Critical KPI alerts
- Task assignments
- Approval requests
- Daily summaries

Built for the pest control industry by Rentokil, leveraging decades of operational excellence and data-driven decision making.
```

### Keywords (100 chars max)

```
pest control,business intelligence,KPI,dashboard,sales,operations,field service,analytics,CRM
```

### URLs

| Type | URL |
|------|-----|
| **Support URL** | https://rentokil.com/support |
| **Privacy Policy URL** | https://rentokil.com/privacy |
| **Marketing URL** | https://rentokil.com/bi |
| **Terms of Service** | https://rentokil.com/terms |

### Screenshots Required

| Device | Dimensions | Count |
|--------|------------|-------|
| 6.7" iPhone (14 Pro Max, 15 Pro Max) | 1290 x 2796 | 3-10 |
| 6.5" iPhone (11 Pro Max, XS Max) | 1284 x 2778 | 3-10 |
| 5.5" iPhone (8 Plus, 7 Plus, 6s Plus) | 1242 x 2208 | 3-10 |
| 12.9" iPad Pro (6th gen) | 2048 x 2732 | 3-10 |
| 12.9" iPad Pro (2nd gen) | 2048 x 2732 | 3-10 |

**Recommended Screenshots:**
1. Command Center overview
2. KPI detail with drill-down
3. Sales pipeline view
4. Operations dashboard
5. Mobile technician schedule
6. Offline mode indicator

### App Review Notes

```
This is an enterprise application for Rentokil employees and authorized partners.

Test Account:
Email: demo@rentokil.com
Password: [Provided separately for security]

The app requires authentication. Use the demo account above to access all features.

Key flows to test:
1. Login and view Command Center
2. Tap any KPI card to see detail view
3. Navigate between Sales, Ops, and Finance tabs
4. Switch roles in Settings to see role-specific views
5. Enable offline mode (airplane mode) to see cached data
```

---

## Google Play Store

### App Information

| Field | Value |
|-------|-------|
| **App Name** | Rentokil Business Intelligence |
| **Package Name** | com.rentokil.bi |
| **Category** | Business |
| **Content Rating** | Everyone |
| **Price** | Free |

### Short Description (80 chars)

```
Real-time KPI monitoring and sales tracking for pest control professionals.
```

### Full Description (4000 chars)

```
[Same as iOS description above]
```

### Screenshots Required

| Device Type | Dimensions | Count |
|-------------|------------|-------|
| Phone | 1080 x 1920 (min) | 2-8 |
| 7" Tablet | 1200 x 1920 | 1-8 |
| 10" Tablet | 1800 x 2560 | 1-8 |

### Feature Graphic

- Dimensions: 1024 x 500
- Format: PNG or JPEG

### App Icon

- Dimensions: 512 x 512
- Format: 32-bit PNG (with alpha)

---

## Pre-Submission Checklist

### Developer Accounts

- [ ] **Apple Developer Program** enrolled ($99/year)
  - Organization account (not individual)
  - D-U-N-S number verified
  - Legal agreements accepted
- [ ] **Google Play Console** enrolled ($25 one-time)
  - Developer account created
  - Payment profile set up
  - App signing key generated

### Assets Prepared

- [ ] App icon (1024x1024 source PNG)
- [ ] Splash screen (2732x2732 source PNG)
- [ ] All screenshot sizes captured
- [ ] Feature graphic for Play Store
- [ ] App preview video (optional)

### Legal & Compliance

- [ ] Privacy policy published and accessible
- [ ] Terms of service published
- [ ] GDPR compliance verified
- [ ] Data collection disclosures accurate
- [ ] Export compliance documentation (if applicable)

### Technical Preparation

- [ ] Capacitor dependencies installed
- [ ] iOS project generated (`npx cap add ios`)
- [ ] Android project generated (`npx cap add android`)
- [ ] Native icons generated (`cordova-res`)
- [ ] Splash screens generated
- [ ] Push notification certificates configured

### iOS Specific

- [ ] Xcode installed (latest version)
- [ ] Apple Distribution certificate created
- [ ] App Store provisioning profile created
- [ ] App ID registered in Apple Developer Portal
- [ ] Push notification capability enabled
- [ ] App Store Connect app record created
- [ ] TestFlight build uploaded
- [ ] Internal testing completed
- [ ] Beta testing completed

### Android Specific

- [ ] Android Studio installed
- [ ] Keystore generated and securely stored
- [ ] Keystore password documented securely
- [ ] Play App Signing enrolled
- [ ] Play Console app record created
- [ ] Internal testing track configured
- [ ] Closed testing completed
- [ ] Open testing completed (optional)

### Final Verification

- [ ] All roles tested on physical devices
- [ ] Offline mode tested (airplane mode)
- [ ] Push notifications tested
- [ ] Deep linking tested
- [ ] Performance benchmarked (< 3s cold start)
- [ ] Memory usage acceptable (< 200MB)
- [ ] Battery usage acceptable
- [ ] No crashes in crash reporting

---

## Deployment Commands

When ready to deploy, run these commands in order:

### Step 1: Install Dependencies

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android \
  @capacitor/app @capacitor/splash-screen @capacitor/status-bar \
  @capacitor/push-notifications @capacitor/keyboard
```

### Step 2: Initialize Native Projects

```bash
npx cap add ios
npx cap add android
```

### Step 3: Generate Icons & Splash Screens

```bash
# Install cordova-res globally if not installed
npm install -g cordova-res

# Place source images in resources/ folder:
# - resources/icon.png (1024x1024)
# - resources/splash.png (2732x2732)

# Generate all sizes
cordova-res ios --skip-config --copy
cordova-res android --skip-config --copy
```

### Step 4: Build Web Assets

```bash
npm run build
```

### Step 5: Sync to Native Projects

```bash
npx cap sync
```

### Step 6: Open in IDE

```bash
# For iOS
npx cap open ios

# For Android
npx cap open android
```

### Step 7: Configure Signing (in IDE)

**iOS (Xcode):**
1. Select the project in navigator
2. Go to Signing & Capabilities
3. Select your team
4. Ensure provisioning profile is correct

**Android (Android Studio):**
1. Build > Generate Signed Bundle/APK
2. Create or select keystore
3. Fill in key details
4. Build release APK/AAB

### Step 8: Submit

**iOS:**
1. Product > Archive in Xcode
2. Distribute App > App Store Connect
3. Upload and submit for review

**Android:**
1. Upload AAB to Play Console
2. Create release in desired track
3. Submit for review

---

## Support Contacts

| Role | Contact |
|------|---------|
| **App Store Manager** | appstore@rentokil.com |
| **Technical Support** | tech-support@rentokil.com |
| **Legal/Privacy** | legal@rentokil.com |
| **Marketing** | marketing@rentokil.com |

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | TBD | Initial release |

---

*Last updated: January 2026*

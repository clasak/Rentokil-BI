/**
 * Record dashboard walkthrough using Puppeteer
 * Captures screen as it navigates through the app following the presenter script
 */

import type { Page } from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

const DASHBOARD_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(process.cwd(), 'remotion', 'assets', 'recordings');

interface RecordingStep {
  timestamp: number; // seconds from start
  action: string;
  description: string;
  execute: (page: Page) => Promise<void>;
}

const DEMO_STEPS: RecordingStep[] = [
  {
    timestamp: 0,
    action: 'load-homepage',
    description: 'Load Executive Command Center',
    execute: async (page) => {
      await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2' });
      await page.waitForSelector('[data-testid="kpi-card"], .text-2xl', { timeout: 10000 });
    },
  },
  {
    timestamp: 8,
    action: 'hover-revenue-card',
    description: 'Highlight revenue KPI card',
    execute: async (page) => {
      const revenueCard = await page.$('text/Revenue MTD');
      if (revenueCard) {
        await page.hover('text/Revenue MTD');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    },
  },
  {
    timestamp: 12,
    action: 'hover-leads-card',
    description: 'Highlight new leads card',
    execute: async (page) => {
      await page.hover('text/New Leads').catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
  },
  {
    timestamp: 17,
    action: 'click-refresh',
    description: 'Click refresh button',
    execute: async (page) => {
      const refreshButton = await page.$('[aria-label*="Refresh"]');
      if (refreshButton) {
        await refreshButton.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    },
  },
  {
    timestamp: 25,
    action: 'navigate-sales-today',
    description: 'Navigate to Sales Today',
    execute: async (page) => {
      await page.goto(`${DASHBOARD_URL}/sales/today`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('text/Sales Today, text/Revenue', { timeout: 5000 });
    },
  },
  {
    timestamp: 30,
    action: 'interact-chart',
    description: 'Hover over chart to show interactivity',
    execute: async (page) => {
      const chart = await page.$('.recharts-wrapper');
      if (chart) {
        const box = await chart.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    },
  },
  {
    timestamp: 35,
    action: 'show-backlog',
    description: 'Navigate to backlog',
    execute: async (page) => {
      await page.goto(`${DASHBOARD_URL}/sales/backlog`, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
  },
  {
    timestamp: 42,
    action: 'navigate-salti',
    description: 'Navigate to SALTI Dashboard',
    execute: async (page) => {
      await page.goto(`${DASHBOARD_URL}/salti/daily-check-in`, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
  },
  {
    timestamp: 48,
    action: 'salti-proposal-pipeline',
    description: 'Show proposal pipeline',
    execute: async (page) => {
      const pipelineTab = await page.$('text/Proposal Pipeline, [role="tab"]');
      if (pipelineTab) {
        await pipelineTab.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    },
  },
  {
    timestamp: 58,
    action: 'show-role-navigation',
    description: 'Open user menu to show roles',
    execute: async (page) => {
      const userMenu = await page.$('[aria-label*="profile"], [aria-label*="menu"]');
      if (userMenu) {
        await userMenu.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    },
  },
  {
    timestamp: 68,
    action: 'show-admin-roles',
    description: 'Navigate to admin to show role preview',
    execute: async (page) => {
      await page.goto(`${DASHBOARD_URL}/admin`, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Click on Role Preview tab if available
      const roleTab = await page.$('text/Role');
      if (roleTab) {
        await roleTab.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    },
  },
  {
    timestamp: 75,
    action: 'show-mobile-responsive',
    description: 'Resize to mobile view',
    execute: async (page) => {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Restore desktop size
      await page.setViewport({ width: 1920, height: 1080 });
    },
  },
  {
    timestamp: 85,
    action: 'return-home',
    description: 'Return to Executive Command Center',
    execute: async (page) => {
      await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
  },
];

async function recordDashboardDemo() {
  console.log('🎥 Starting dashboard demo recording...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: false, // Show browser for recording
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();

  console.log('📝 Executing demo steps...\n');

  for (const step of DEMO_STEPS) {
    console.log(`[${step.timestamp}s] ${step.description}`);
    try {
      await step.execute(page);
      console.log(`   ✅ Complete\n`);
    } catch (error) {
      console.log(`   ⚠️  Error: ${error}\n`);
    }
  }

  console.log('\n✨ Demo recording complete!');
  console.log('\n📹 Next steps:');
  console.log('1. Use screen recording software (OBS, QuickTime) to capture the browser');
  console.log('2. Run this script again while recording');
  console.log('3. Or use Puppeteer Screen Recorder plugin for automated capture\n');

  await browser.close();
}

// Alternative: Use puppeteer-screen-recorder
async function recordWithScreenRecorder() {
  console.log('🎥 Recording with puppeteer-screen-recorder...\n');

  try {
    const puppeteer = await import('puppeteer');
    const { PuppeteerScreenRecorder } = await import('puppeteer-screen-recorder');

    const browser = await puppeteer.default.launch({
      headless: true,
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });

    const page = await browser.newPage();
    const recorder = new PuppeteerScreenRecorder(page, {
      followNewTab: false,
      fps: 30,
      videoFrame: {
        width: 1920,
        height: 1080,
      },
      aspectRatio: '16:9',
    });

    const outputPath = path.join(OUTPUT_DIR, 'dashboard-demo.mp4');
    await recorder.start(outputPath);

    console.log('📹 Recording started...\n');

    for (const step of DEMO_STEPS) {
      console.log(`[${step.timestamp}s] ${step.description}`);
      await step.execute(page);
    }

    await recorder.stop();
    console.log(`\n✅ Recording saved: ${outputPath}`);

    await browser.close();
  } catch (error) {
    console.error('\n❌ Screen recording failed:', error);
    console.log('\n💡 Install puppeteer-screen-recorder:');
    console.log('   npm install puppeteer-screen-recorder\n');
  }
}

// Run if called directly
if (require.main === module) {
  const useScreenRecorder = process.argv.includes('--record');

  if (useScreenRecorder) {
    recordWithScreenRecorder().catch(console.error);
  } else {
    recordDashboardDemo().catch(console.error);
  }
}

export { recordDashboardDemo, DEMO_STEPS };

/**
 * Generate TTS narration audio for the leadership demo
 * Uses Google Cloud Text-to-Speech API
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as fs from 'fs';
import * as path from 'path';

const client = new TextToSpeechClient();

const NARRATION_SEGMENTS = [
  {
    text: "Welcome to the Rentokil BI Dashboard - your centralized platform for sales and operations intelligence. Let me walk you through the key features that are transforming how our leadership makes data-driven decisions.",
    filename: '01-intro.mp3',
  },
  {
    text: "The Executive Command Center provides real-time KPIs powered by BigQuery. As you can see, we're tracking revenue month-to-date at 24.8 million - that's 12.3% above target. New leads are up 8.5% with 1,847 leads this month, and our pipeline value sits at 12.4 million. All of this data updates in real-time from our production database.",
    filename: '02-command-center.mp3',
  },
  {
    text: "Moving to sales analytics, we can drill down into daily performance. Here's today's sales at 847 thousand dollars. The interactive charts let you filter by market, region, or branch. Notice the speed-to-install metric - we've reduced this to 8.3 days, a significant improvement. And our backlog dashboard shows 324 pending installations with clear prioritization.",
    filename: '03-sales-analytics.mp3',
  },
  {
    text: "The SALTI system tracks our sales activity, leads, and team initiatives. Managers can see real-time activity from their teams - daily check-ins, proposal pipelines, and productivity metrics. Everything is automatically aggregated from our CRM and operations systems.",
    filename: '04-salti.mp3',
  },
  {
    text: "One of our most powerful features is role-based navigation. Each user sees exactly what they need - nothing more, nothing less. Executives get the command center and market-level analytics. Market VPs see their regional performance. Branch managers focus on their team metrics. And account executives have their personal sales tracker with proposal management tools.",
    filename: '05-roles.mp3',
  },
  {
    text: "The dashboard is fully mobile-responsive, so leadership can access these insights from anywhere. And with our BigQuery integration, every metric you see is live production data - no stale reports, no manual updates.",
    filename: '06-mobile.mp3',
  },
  {
    text: "The Rentokil BI Dashboard - empowering data-driven decisions across every level of our organization. Thank you.",
    filename: '07-closing.mp3',
  },
];

async function generateNarration() {
  const outputDir = path.join(process.cwd(), 'remotion', 'assets', 'audio');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎙️  Generating narration audio...\n');

  for (const segment of NARRATION_SEGMENTS) {
    try {
      const request = {
        input: { text: segment.text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-D', // Male professional voice
          ssmlGender: 'MALE' as const,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 0.95, // Slightly slower for clarity
          pitch: 0.0,
          effectsProfileId: ['telephony-class-application'],
        },
      };

      console.log(`Generating: ${segment.filename}...`);
      const [response] = await client.synthesizeSpeech(request);

      if (response.audioContent) {
        const outputPath = path.join(outputDir, segment.filename);
        fs.writeFileSync(outputPath, response.audioContent, 'binary');
        console.log(`✅ Saved: ${outputPath}`);
      }
    } catch (error) {
      console.error(`❌ Error generating ${segment.filename}:`, error);
      console.log('\n💡 Note: Google Cloud TTS requires authentication.');
      console.log('Alternative: Use web-based TTS or record voiceover manually.\n');

      // Create placeholder file
      const outputPath = path.join(outputDir, segment.filename);
      fs.writeFileSync(outputPath, '');
      console.log(`⚠️  Created placeholder: ${outputPath}\n`);
    }
  }

  console.log('\n✨ Narration generation complete!');
  console.log(`\nOutput directory: ${outputDir}`);
}

// Run if called directly
if (require.main === module) {
  generateNarration().catch(console.error);
}

export { generateNarration, NARRATION_SEGMENTS };

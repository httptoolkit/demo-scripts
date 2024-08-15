import * as fs from 'fs/promises';
import { Page } from 'playwright';

import { recordScreen, trimVideoParts } from './video.js';
import { CHROME_TOP_HEIGHT, launchChrome } from './browser.js';
import { setDarkMode } from './dark-mode.js';

export interface DemoResult {
    clipsToCut: Array<[start: number, end: number]>;
}

export async function runDemo(
    name: string,
    demo: (page: Page) => Promise<DemoResult>,
    options: {
        setup?: () => Promise<void>,
        cleanup?: () => Promise<void>
    } = {}
) {
    const TOP = 200;
    const LEFT = 50;
    const WIDTH = 1440;
    const HEIGHT = 810;

    const URL = process.env.HTK_URL || 'http://localhost:8080';

    const tokens = await fs.readFile('.tokens.json', 'utf-8')
        .then((data) => JSON.parse(data))
        .catch((e) => {
            console.error(e);
            return false;
        });
    if (!tokens || !(tokens.refreshToken && tokens.accessToken)) {
        throw new Error(
            `No usable tokens were found in .tokens.json`
        );
    }

    const RECORD_VIDEO = process.env.RECORD_VIDEO === 'true';
    setDarkMode();

    const { browser, page } = await launchChrome(
        URL,
        {
            position: { x: LEFT, y: TOP - CHROME_TOP_HEIGHT },
            size: { width: WIDTH, height: HEIGHT + CHROME_TOP_HEIGHT },
            tokens
        }
    );

    await options.setup?.();

    const recordingName = `${name}-demo-${new Date().toISOString().replace(/:/g, '-')}`;

    const recording = RECORD_VIDEO
        ? await recordScreen(
            { top: TOP, left: LEFT, width: WIDTH, height: HEIGHT },
            `${recordingName}.mkv`
        )
        : { stop: async () => {} };

    console.log("Starting demo");

    let demoResults: DemoResult;
    try {
        const startTime = Date.now();
        demoResults = await demo(page);
        // Not sure why but we seem to consistently end up with a leftover 2 seconds at the end
        demoResults.clipsToCut.push([Date.now() - 2000 - startTime, Infinity]);
        console.log(demoResults);
        if (RECORD_VIDEO) {
            await fs.writeFile(`${recordingName}.json`, JSON.stringify(demoResults, null, 2));
        }
    } finally {
        console.log("Demo completed");
        if (RECORD_VIDEO) await recording.stop();
        await options.cleanup?.().catch(() => {});
    }

    await browser.close();

    if (RECORD_VIDEO && demoResults.clipsToCut?.length) {
        await trimVideoParts(`${recordingName}.mkv`, demoResults.clipsToCut);
        console.log('Trimming complete');
    }
}
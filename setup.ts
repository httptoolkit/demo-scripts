import * as fs from 'fs/promises';
import { delay } from '@httptoolkit/util';
import { chromium, Page } from 'playwright';
import * as zx from 'zx';

zx.$.verbose = true; // Log all commands

export async function launchChrome(
    url: string,
    { position, size, tokens }: {
        position?: { x: number, y: number },
        size?: { width: number, height: number },
        tokens?: { refreshToken: string, accessToken: string }
    } = {}
) {
    const browser = await chromium.launch({
        headless: false,
        args: [
            position && `--window-position=${position.x},${position.y}`,
            size && `--window-size=${size.width},${size.height}`
        ].filter((x): x is string => !!x)
    });

    const context = await browser.newContext({
        viewport: null
    });
    if (tokens) {
        await context.addInitScript(`
            window.localStorage.setItem('tokens', JSON.stringify(${
                JSON.stringify(tokens)
            }));
        `);
    }
    const page = await context.newPage();
    await page.goto(url);

    return { browser, page };
}

async function recordScreen(
    { top, left, width, height }: { top: number, left: number, width: number, height: number },
    output: string
) {
    zx.$.verbose = true;
    await zx.$`rm -f ${output}`;
    const recording = zx.$`screencapture ${[
        '-v', // Record video
        '-C', // Show cursor
        '-R', `${left},${top},${width},${height}`, // Position and size
        output // Output path
    ]}`;

    // Recording stops on any input, including closing stdin. We have to get stdin here
    // synchronously, or zx won't set up a stdin pipe (it'll inherit instead).
    const recordingInput = recording.stdin;
    return {
        stop: function stopRecording() {
            recordingInput.end();
        }
    }
}

export async function runDemo(
    demo: (page: Page) => Promise<void>,
    cleanup: () => Promise<void>
) {
    const TOP = 200;
    const LEFT = 100;
    const WIDTH = 1440;
    const HEIGHT = 810;
    const CHROME_TOP_HEIGHT = 87;

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

    const RECORD_VIDEO = false;

    const { browser, page } = await launchChrome(
        URL,
        {
            position: { x: LEFT, y: TOP - CHROME_TOP_HEIGHT },
            size: { width: WIDTH, height: HEIGHT + CHROME_TOP_HEIGHT },
            tokens
        }
    );

    const recording = RECORD_VIDEO
        ? await recordScreen({ top: TOP, left: LEFT, width: WIDTH, height: HEIGHT }, 'output.mov')
        : { stop: () => {} };
    console.log("Starting demo");

    try {
        await demo(page);
    } finally {
        await cleanup().catch(() => {});
    }

    console.log("Demo completed");
    browser.close();
    if (RECORD_VIDEO) {
        await delay(1000);
        recording.stop();
    }
}
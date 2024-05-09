import { delay } from '@httptoolkit/util';
import { chromium, Page } from 'playwright';
import * as zx from 'zx';

zx.$.verbose = true; // Log all commands

export async function launchChrome(
    url: string,
    { position, size }: {
        position?: { x: number, y: number },
        size?: { width: number, height: number }
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

export async function runDemo(url: string, demo: (page: Page) => Promise<void>) {
    const TOP = 200;
    const LEFT = 100;
    const WIDTH = 1440;
    const HEIGHT = 810;
    const CHROME_TOP_HEIGHT = 87;

    const RECORD_VIDEO = false;

    const { browser, page } = await launchChrome(
        url,
        {
            position: { x: LEFT, y: TOP - CHROME_TOP_HEIGHT },
            size: { width: WIDTH, height: HEIGHT + CHROME_TOP_HEIGHT }
        }
    );

    const recording = RECORD_VIDEO
        ? await recordScreen({ top: TOP, left: LEFT, width: WIDTH, height: HEIGHT }, 'output.mov')
        : { stop: () => {} };
    console.log("Starting demo");

    await demo(page);

    console.log("Demo completed");
    browser.close();
    if (RECORD_VIDEO) {
        await delay(1000);
        recording.stop();
    }
}
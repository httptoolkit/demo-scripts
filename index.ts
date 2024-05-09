import { chromium } from 'playwright';
import * as zx from 'zx';

async function launchChrome(
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

const TOP = 200;
const LEFT = 100;
const WIDTH = 1440;
const HEIGHT = 810;
const CHROME_TOP_HEIGHT = 87;

const RECORD_VIDEO = false;

console.log("Launching chrome");
const { browser, page } = await launchChrome(
    "https://example.com/",
    {
        position: { x: LEFT, y: TOP - CHROME_TOP_HEIGHT },
        size: { width: WIDTH, height: HEIGHT + CHROME_TOP_HEIGHT }
    }
);

console.log("Launched");

if (RECORD_VIDEO) {
    const OUTPUT_PATH = "/Users/tim/htk/demo-script/output.mov";
    zx.$.verbose = true;
    await zx.$`rm -f ${OUTPUT_PATH}`;
    await zx.$`screencapture ${[
        '-v', // Record video
        '-C', // Show cursor
        '-R', `${LEFT},${TOP},${WIDTH},${HEIGHT}`, // Position and size
        '-V', 10, // Duration
        OUTPUT_PATH // Output path
    ]} &`;
}
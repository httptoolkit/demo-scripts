import * as fs from 'fs/promises';
import { delay } from '@httptoolkit/util';
import { chromium, Page } from 'playwright';
import * as zx from 'zx';

export interface DemoResult {
    clipsToCut: Array<[start: number, end: number]>;
}

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
        viewport: null,
        colorScheme: null
    });
    if (tokens) {
        await context.addInitScript(`
            window.localStorage.setItem('tokens', JSON.stringify(${
                JSON.stringify(tokens)
            }));
        `);
    }
    const page = await context.newPage();
    page.on('dialog', () => console.log('Ignoring dialog')); // <-- Bad playwright, good UI automation
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    return { browser, page };
}

async function recordScreen(
    { top, left, width, height }: { top: number, left: number, width: number, height: number },
    output: string
) {
    await zx.$`rm -f ${output}`;
    const recording = zx.$`ffmpeg ${[
        '-hide_banner', // Quiet start
        '-loglevel', 'error', // Skip the debug noise
        '-stats', // But still give progress to see that it's working
        '-f', 'avfoundation', // Use AVFoundation (Mac) input
        '-capture_cursor', '1', // Show the mouse
        '-i', '0:0', // Capture screen 0
        '-vf', `crop=${width}:${height}:${left}:${top}`, // Crop to the desired area
        output // Output path
    ]}`.stdio('pipe');

    await new Promise<void>((resolve, reject) => {
        setTimeout(() => reject(new Error('Recording failed to start')), 5000);
        recording.stderr.on('data', resolve);
    });
    await delay(200); // Add a tiny bit of slack to let recording start up

    console.log('Recording started');

    return {
        stop: async function stopRecording() {
            recording.stdin.write('q');
            await recording;
            console.log('Recording stopped');
        }
    }
}

const millisToFfmpegTime = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const milliseconds = millis % 1000;
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
}

async function trimVideoParts(filename: string, partsToRemove: [start: number, end: number][]) {
    // Build an array of [0, firstStart], [firstEnd, secondStart], ...,
    const partsToKeep = partsToRemove.reduce((acc, [start, end], i) => {
        const last = acc[acc.length - 1];
        if (end !== Infinity) {
            return [...acc.slice(0, -1), [last[0], start], [end, Infinity]];
        } else {
            if (i !== partsToRemove.length - 1) {
                throw new Error('Only the last cut can be open-ended');
            }
            return [...acc.slice(0, -1), [last[0], start]];
        }
    }, [[0, Infinity]]);

    const ffmpegFilter =
        `[0:v]split${partsToKeep.map((_p, i) => `[v${i}]`).join('')};${
            // ^ Split into N streams called v1, v2, ...
            // v Then, for each stream vX, clip out the correponding video part as vXtrim:
            partsToKeep.map(([start, end], i) => {
                if (end !== Infinity) {
                    return `[v${i}]trim=start=${
                        millisToFfmpegTime(start)
                    }:end=${
                        millisToFfmpegTime(end)
                    },setpts=PTS-STARTPTS[v${i}trim]`;
                } else {
                    return `[v${i}]trim=start=${
                        millisToFfmpegTime(start)
                    },setpts=PTS-STARTPTS[v${i}trim]`;
                }
        }).join(';')
    };${ // Join all the vXtrim streams into one output stream outv:
        partsToKeep.map((_p, i) => `[v${i}trim]`).join('')
    }concat[outv]`;

    await zx.$`ffmpeg -i ${filename} -filter_complex ${
        ffmpegFilter
    } -map "[outv]" -map 0:a ${filename + '.trimmed.mkv'}`;
}

export async function runDemo(
    name: string,
    demo: (page: Page) => Promise<DemoResult>,
    cleanup: () => Promise<void>
) {
    const TOP = 200;
    const LEFT = 50;
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

    const RECORD_VIDEO = process.env.RECORD_VIDEO === 'true';

    const { browser, page } = await launchChrome(
        URL,
        {
            position: { x: LEFT, y: TOP - CHROME_TOP_HEIGHT },
            size: { width: WIDTH, height: HEIGHT + CHROME_TOP_HEIGHT },
            tokens
        }
    );

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
        demoResults.clipsToCut.push([Date.now() - startTime, Infinity]);
        console.log(demoResults);
        if (RECORD_VIDEO) {
            await fs.writeFile(`${recordingName}.json`, JSON.stringify(demoResults, null, 2));
        }
    } finally {
        console.log("Demo completed");
        if (RECORD_VIDEO) await recording.stop();
        await cleanup().catch(() => {});
    }

    await browser.close();

    if (RECORD_VIDEO && demoResults.clipsToCut?.length) {
        await trimVideoParts(`${recordingName}.mkv`, demoResults.clipsToCut);
        console.log('Trimming complete');
    }
}
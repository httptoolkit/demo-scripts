import * as path from 'path';
import * as zx from 'zx';

zx.$.verbose = true;

const outputDir = path.join(process.cwd(), 'output');

async function concatVideos(videos: string[], outputName: string) {
    const videoOutput = path.join(outputDir, `${outputName}.mp4`);
    await zx.$`ffmpeg ${[
        '-hide_banner',
        '-loglevel', 'error',
        '-an', // No audio
        // Re-encode concat with a video filter:
        ...videos.flatMap(v => ['-i', v]),
        '-filter_complex', `concat=n=${videos.length}:v=1`,
        '-y', // Overwrite output file
        videoOutput,
    ]}`;
}

async function getMatchingFile(pattern: string) {
    const files = await zx.glob(path.join(outputDir, pattern));
    if (files.length !== 1) throw new Error(`Unexpected match result for ${pattern}: ${JSON.stringify(files)}`);
    return files[0];
}

await Promise.all(([
    ['chrome-dark', ['chrome/dark/*.trimmed.mkv', 'android/dark/android-demo*.mp4', 'node/dark/*.trimmed.mkv']],
    ['chrome-light', ['chrome/light/*.trimmed.mkv', 'android/light/android-demo*.mp4', 'node/light/*.trimmed.mkv']],
    ['node-dark', ['node/dark/*.trimmed.mkv', 'chrome/dark/*.trimmed.mkv', 'android/dark/android-demo*.mp4']],
    ['node-light', ['node/light/*.trimmed.mkv', 'chrome/light/*.trimmed.mkv', 'android/light/android-demo*.mp4']],
    ['python-dark', ['python/dark/*.trimmed.mkv', 'chrome/dark/*.trimmed.mkv', 'android/dark/android-demo*.mp4']],
    ['python-light', ['python/light/*.trimmed.mkv', 'chrome/light/*.trimmed.mkv', 'android/light/android-demo*.mp4']],
    ['ruby-dark', ['ruby/dark/*.trimmed.mkv', 'chrome/dark/*.trimmed.mkv', 'android/dark/android-demo*.mp4']],
    ['ruby-light', ['ruby/light/*.trimmed.mkv', 'chrome/light/*.trimmed.mkv', 'android/light/android-demo*.mp4']],
] as const).map(async ([outputName, patterns]) => {
    const videos = await Promise.all(patterns.map(getMatchingFile));
    await concatVideos(videos, outputName);
}));

import { delay } from '@httptoolkit/util';
import * as zx from 'zx';

export async function recordScreen(
    { top, left, width, height }: { top: number, left: number, width: number, height: number },
    output: string
) {
    await zx.$`rm -f ${output}`;
    const recording = zx.$`ffmpeg ${[
        '-hide_banner', // Quiet start
        '-loglevel', 'error', // Skip the debug noise
        '-f', 'avfoundation', // Use AVFoundation (Mac) input
        '-capture_cursor', '1', // Show the mouse
        '-i', '0:0', // Capture screen 0
        '-vf', `crop=${width}:${height}:${left}:${top}`, // Crop to the desired area
        output // Output path
    ]}`.stdio('pipe');
    await delay(100);

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

export async function trimVideoParts(filename: string, partsToRemove: [start: number, end: number][]) {
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

    await zx.$`ffmpeg -hide_banner -loglevel error -i ${filename} -filter_complex ${
        ffmpegFilter
    } -map "[outv]" -map 0:a ${filename + '.trimmed.mkv'}`;
}
import { delay } from '@httptoolkit/util';
import * as zx from 'zx';
import { Dimensions } from '../browser-utils.js';

async function wmctrl(...args: string[]) {
    const result = await zx.$`wmctrl ${args}`;
    if (result.exitCode !== 0) {
        throw new Error(`wmctrl failed with exit code ${result.exitCode}`);
    }
    return result.stdout;
}

async function getCurrentDesktopId() {
    const desktopData = await wmctrl('-d');
    const desktopLines = desktopData.split('\n');
    const currentDesktopLine = desktopLines.find((line) => line.match(/\d+\s+\*/))!;
    const desktopId = currentDesktopLine.split(/\s+/)[0];
    return desktopId;
}

async function getAllOpenWindows() {
    const windowLines = (await wmctrl('-lG')).split('\n');
    return windowLines.map((win) => {
        const [id, desktop, x, y, h, w, _hostname, ...appname] = win.split(/\s+/);
        return {
            id,
            desktop,
            name: appname.join(' '),
            position: {
                x: parseInt(x, 10),
                y: parseInt(y, 10)
            },
            size: {
                height: parseInt(h, 10),
                width: parseInt(w, 10)
            }
        }
    });
}

export async function getVisibleOpenWindows() {
    const currentDesktopId = await getCurrentDesktopId();
    const windows = await getAllOpenWindows();
    return windows.filter((win) => win.desktop === currentDesktopId);
}

export async function focusWindow(id: string) {
    await wmctrl('-i', '-a', id);
}

export async function closeWindow(id: string) {
    await wmctrl('-i', '-c', id);
}

export async function setWindowDimensions(
    id: string,
    { x, y, width, height }: Dimensions
) {
    await wmctrl('-i', '-r', id, '-e', `0,${x},${y},${width},${height}`);
}

// Robot.js has issues with chars that require shift on Linux so we setup
// alternate solutions to this here:
export async function enterString(text: string) {
    await zx.$`xdotool type --delay 0 ${text}`;
}

export async function typeString(text: string, duration: number) {
    const chars = text.length;
    const durationPerChar = Math.floor(duration / chars);
    const xDotDelay = 2*durationPerChar; // Very oddly, xdot seems to half its given delay? Workaround
    await zx.$`xdotool type --delay ${xDotDelay} ${text}`;
}
import { delay } from '@httptoolkit/util';
import * as zx from 'zx';

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

async function getOpenWindows() {
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
                h: parseInt(h, 10),
                w: parseInt(w, 10)
            }
        }
    });
}

export async function getOpenWindowsOnCurrentDesktop() {
    const currentDesktopId = await getCurrentDesktopId();
    const windows = await getOpenWindows();
    return windows.filter((win) => win.desktop === currentDesktopId);
}

export async function getNextNewWindow() {
    const initialWindows = await getOpenWindowsOnCurrentDesktop();

    while (true) {
        await delay(500);
        const currentWindows = await getOpenWindowsOnCurrentDesktop();
        const newWindows = currentWindows.filter((win) =>
            !initialWindows.find((initialWin) => initialWin.id === win.id)
        );
        if (newWindows.length > 0) return newWindows[0];
    }
}

export async function getWindowByName(name: string) {
    const windows = await getOpenWindowsOnCurrentDesktop();
    const window = windows.find((win) => win.name === name);
    if (!window) throw new Error(`${name} window could not be found`);
    return window;
}

export async function getWindowById(id: string) {
    const windows = await getOpenWindowsOnCurrentDesktop();
    const window = windows.find((win) => win.id === id);
    if (!window) throw new Error(`${id} window could not be found`);
    return window;
}

export async function focusWindow(id: string) {
    await wmctrl('-i', '-a', id);
}

export async function closeWindow(id: string) {
    await wmctrl('-i', '-c', id);
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
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
    const windowLines = (await wmctrl('-l')).split('\n');
    return windowLines.map((win) => {
        const parts = win.split(/\s+/);
        return {
            id: parts[0],
            desktop: parts[1],
            name: parts.slice(3).join(' ')
        }
    });
}

export async function getOpenWindowsOnCurrentDesktop() {
    const currentDesktopId = await getCurrentDesktopId();
    const windows = await getOpenWindows();
    return windows.filter((win) => win.desktop === currentDesktopId);
}

export async function getNextNewWindowId() {
    const initialWindows = await getOpenWindowsOnCurrentDesktop();

    while (true) {
        await delay(10);
        const currentWindows = await getOpenWindowsOnCurrentDesktop();
        const newWindows = currentWindows.filter((win) =>
            !initialWindows.find((initialWin) => initialWin.id === win.id)
        );
        if (newWindows.length > 0) return newWindows[0].id;
    }
}

export async function getWindowIdByName(name: string) {
    const windows = await getOpenWindowsOnCurrentDesktop();
    const window = windows.find((win) => win.name === name);
    if (!window) throw new Error(`${name} window could not be found`);
    return window.id;
}

export async function focusWindow(id: string) {
    await wmctrl('-i', '-a', id);
}

export async function closeWindow(id: string) {
    await wmctrl('-i', '-c', id);
}

// Robot.js has issues with chars that require shift on Linux so we setup
// an alternate solution to this here:
export async function typeStringDelayed(text: string, cpm: number) {
    const cps = cpm / 60;
    const delayBetweenChars = 1 / cps;
    const delayMillis = delayBetweenChars * 1000;

    await zx.$`xdotool type --delay ${delayMillis} ${text}`;
}
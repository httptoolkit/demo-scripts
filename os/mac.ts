import * as zx from 'zx';
import { Dimensions } from '../browser-utils.js';

export async function getVisibleOpenWindows() {
    const result = await zx.$`osascript os/applescripts/list-windows.applescript`.catch((e) => {
        console.log(e);
        return null;
    });
    if (!result || result.exitCode !== 0) {
        console.error(result?.stderr);
        console.error(`Window listing failed with exit code ${result?.exitCode}`);
        return [];
    }
    const output = result.stderr;
    const windows = output.split('---').slice(0, -1);

    return windows.map((win) => {
        const [id, name, position, size] = win.trim().split('\n')
            .map((line) => line.split(':').slice(1).join(':'));

        const [x, y] = position.split('x').map((n) => parseInt(n, 10));
        const [w, h] = size.split('x').map((n) => parseInt(n, 10));

        return {
            id,
            desktop: '1',
            name,
            position: { x, y },
            size: { width: w, height: h }
        };
    });
}

export async function focusWindow(windowId: string) {
    const [procId, windowIndex] = windowId.split('-');
    await zx.$`osascript os/applescripts/focus-window.applescript ${procId} ${windowIndex}`;
}

export async function closeWindow(windowId: string) {
    const [procId, windowIndex] = windowId.split('-');
    await zx.$`osascript os/applescripts/close-window.applescript ${procId} ${windowIndex}`;
}

export async function setWindowDimensions(
    windowId: string,
    { x, y, width, height }: Dimensions
) {
    const [procId, windowIndex] = windowId.split('-');
    await zx.$`osascript os/applescripts/set-window-dimensions.applescript ${
        procId
    } ${
        windowIndex
    } ${x} ${y} ${width} ${height}`;
}

export async function keyTap(key: string) {
    const keyCode = ({
        'enter': '36'
    } as const)[key];
    if (!keyCode) throw new Error(`Unrecognized Mac keyname: ${key}`);

    await zx.$`osascript os/applescripts/key-tap.applescript ${keyCode}`;
}

export async function enterString(text: string) {
    await zx.$`osascript os/applescripts/enter-string.applescript ${text}`;
}

export async function typeString(text: string, duration: number) {
    const chars = text.length;
    const durationPerChar = Math.floor(duration / chars);
    await zx.$`osascript os/applescripts/type-string.applescript ${text} ${durationPerChar}`;
}
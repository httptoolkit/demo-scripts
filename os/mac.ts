import * as zx from 'zx';

export async function getVisibleOpenWindows() {
    const result = await zx.$`osascript os/applescripts/list-windows.applescript`;
    if (result.exitCode !== 0) {
        console.error(result.stderr);
        console.error(`Window listing failed with exit code ${result.exitCode}`);
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
            size: { w, h }
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

export async function enterString(text: string) {
    await zx.$`osascript os/applescripts/enter-string.applescript ${text}`;
}

export async function typeString(text: string, duration: number) {
    const chars = text.length;
    const durationPerChar = Math.floor(duration / chars);
    await zx.$`osascript os/applescripts/type-string.applescript ${text} ${durationPerChar}`;
}
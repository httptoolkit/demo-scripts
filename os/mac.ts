import * as zx from 'zx';

export async function getVisibleOpenWindows() {
    const result = await zx.$`osascript os/applescripts/list-windows.applescript`;
    if (result.exitCode !== 0) {
        console.error(result.stderr);
        throw new Error(`Window listing failed with exit code ${result.exitCode}`);
    }
    const output = result.stderr;
    const windows = output.split('---').slice(0, -1);

    return windows.map((win) => {
        const [id, name, position, size] = win.split('\n')
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

export async function focusWindow(id: string) {
    await zx.$`osascript -e 'tell application "System Events" to set frontmost of first process whose id is ${id} to true'`;
}

export async function closeWindow(id: string) {
    await zx.$`osascript -e 'tell application "System Events" to close first window of first process whose id is ${id}'`;
}

export async function enterString(text: string) {
    const osaScript = zx.$`osascript`.stdio('pipe');
    osaScript.stdin.end(
        `tell application "System Events" to keystroke "${text}"`
    );
    await osaScript;
}

export async function typeString(text: string, duration: number) {
    const chars = text.length;
    const durationPerChar = Math.floor(duration / chars);

    const osaScript = zx.$`osascript`.stdio('pipe');
    osaScript.stdin.end(`
        tell application "System Events"
            set theText to "${text}"
            repeat with i from 1 to length of theText
                set c to text i of theText
                delay ${durationPerChar / 1000}
                keystroke c
            end repeat
        end tell
    `);
    await osaScript;
}
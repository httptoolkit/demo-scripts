import * as os from 'os';
import robot from '@jitsi/robotjs';

import * as linuxMethods from './linux.js';
import * as macMethods from './mac.js';
import { delay } from '@httptoolkit/util';

export interface OsWindow {
    id: string;
    desktop: string;
    name: string;
    position: { x: number, y: number };
    size: { height: number, width: number };
}

interface OsControls {
    getNextNewWindow(): Promise<OsWindow>;
    getWindowByName(name: RegExp): Promise<OsWindow>;
    getWindowById(id: string): Promise<OsWindow>;

    focusWindow(id: string): Promise<void>;
    closeWindow(id: string): Promise<void>;

    setMouse(x: number, y: number): Promise<void>;
    slideMouse(x: number, y: number, duration: number): Promise<void>;
    mouseClick(button: 'left' | 'right'): void;

    enterString(text: string): Promise<void>;
    typeString(text: string, duration: number): Promise<void>;
    keyTap(key: string): void;
}

export function getOsControls(): OsControls {
    const osMethods = os.platform() === 'linux'
            ? linuxMethods
        : os.platform() === 'darwin'
            ? macMethods
        : (() => { throw new Error(`Unsupported platform: ${os.platform()}`) })();

    return {
        ...osMethods,
        async setMouse(x: number, y: number) {
            robot.moveMouse(x, y);
            await delay(0);
        },
        async slideMouse(x: number, y: number, duration: number) {
            const currentMousePos = robot.getMousePos();
            const dx = x - currentMousePos.x;
            const dy = y - currentMousePos.y;

            const stepDuration = 10;
            const steps = duration / stepDuration;

            // Move the mouse from current position to the target x/y with gentle easing:
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                // For all except the last step, we include a small jitter factor for realism:
                const easedT = 0.5 - 0.5 * Math.cos(t * Math.PI) + (i === steps - 1 ? 0 : Math.random() * 0.01);
                robot.moveMouse(currentMousePos.x + dx * easedT, currentMousePos.y + dy * easedT);
                await delay(stepDuration);
            }
        },
        mouseClick(button: 'left' | 'right') {
            robot.mouseClick(button);
        },
        keyTap(key: string) {
            robot.keyTap(key);
        },
        async getNextNewWindow() {
            const initialWindows = await osMethods.getVisibleOpenWindows();

            while (true) {
                await delay(500);
                const currentWindows = await osMethods.getVisibleOpenWindows();
                const newWindows = currentWindows.filter((win) =>
                    !initialWindows.find((initialWin) => initialWin.id === win.id)
                );
                if (newWindows.length > 0) return newWindows[0];
            }
        },
        async getWindowByName(name: RegExp) {
            const windows = await osMethods.getVisibleOpenWindows();
            const window = windows.find((win) => win.name.match(name));
            if (!window) throw new Error(`${name} window could not be found`);
            return window;
        },
        async getWindowById(id: string) {
            const windows = await osMethods.getVisibleOpenWindows();
            const window = windows.find((win) => win.id === id);
            if (!window) throw new Error(`${id} window could not be found`);
            return window;
        }
    };
}
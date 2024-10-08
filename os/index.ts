import * as os from 'os';
import * as zx from 'zx';
import robot from '@jitsi/robotjs';
import { delay } from '@httptoolkit/util';

import * as linuxMethods from './linux.js';
import * as macMethods from './mac.js';
import { Dimensions } from '../setup/browser.js';

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
    setWindowDimensions(id: string, dimensions: Dimensions): Promise<void>;
    killProcess(procId: string): Promise<void>;

    setMouse(x: number, y: number): Promise<void>;
    slideMouse(x: number, y: number, duration: number): Promise<void>;
    mouseClick(button: 'left' | 'right' | 'double'): void;
    scrollMouse(distance: { x?: number, y?: number }, duration: number): Promise<void>;

    enterString(text: string): Promise<void>;
    typeString(text: string, options?: {
        duration?: number,
        restoreCursor?: boolean // Only relevant on Mac
    }): Promise<void>;
    keyTap(key: string, options?: {
        restoreCursor?: boolean // Only relevant on Mac
    }): Promise<void>;
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
            const steps = Math.floor(duration / stepDuration);

            // Move the mouse from current position to the target x/y with gentle easing:
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const easedT = 0.5 - 0.5 * Math.cos(t * Math.PI);
                robot.moveMouse(currentMousePos.x + dx * easedT, currentMousePos.y + dy * easedT);
                await delay(stepDuration);
            }
            // Make sure we always always end exactly at position
            robot.moveMouse(x, y);
        },
        mouseClick(button: 'left' | 'right' | 'double') {
            if (button === 'double') {
                robot.mouseClick('left', true);
            } else {
                robot.mouseClick(button);
            }
        },
        async scrollMouse(distance: { x?: number, y?: number }, duration) {
            const x = distance.x ?? 0;
            const y = distance.y ?? 0;

            const stepDuration = 10;
            const steps = Math.ceil(duration / stepDuration);

            const xPerStep = x / steps;
            const yPerStep = y / steps;

            for (let i = 0; i <= steps; i++) {
                robot.scrollMouse(xPerStep, yPerStep);
                await delay(stepDuration);
            }
        },
        async getNextNewWindow() {
            const initialWindows = await osMethods.getVisibleOpenWindows();

            while (true) {
                await delay(250);
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
        },
        async killProcess(procId: string) {
            await zx.$`kill ${procId}`;
        }
    };
}
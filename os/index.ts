import * as os from 'os';
import robot from '@jitsi/robotjs';

import * as linuxMethods from './linux.js';
import { delay } from '@httptoolkit/util';

export interface OsWindow {
    id: string;
    desktop: string;
    name: string;
    position: { x: number, y: number };
    size: { h: number, w: number };
}

interface OsControls {
    getNextNewWindow(): Promise<OsWindow>;
    getWindowByName(name: string): Promise<OsWindow>;
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
    const baseMethods = {
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
    };

    if (os.platform() === 'linux') {
        return {
            ...baseMethods,
            ...linuxMethods
        };
    }

    throw new Error(`Unsupported platform: ${os.platform()}`);
}
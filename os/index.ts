import * as os from 'os';
import robot from '@jitsi/robotjs';

import * as linux from './linux.js';

type OsControls = typeof robot & {
    getNextNewWindowId(): Promise<string>;
    getWindowIdByName(name: string): Promise<string>;

    focusWindow(id: string): Promise<void>;
    closeWindow(id: string): Promise<void>;
}

export function getOsControls(): OsControls {
    if (os.platform() === 'linux') {
        return Object.assign({}, robot, linux);
    }

    throw new Error(`Unsupported platform: ${os.platform()}`);
}
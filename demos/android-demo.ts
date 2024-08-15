import { delay } from '@httptoolkit/util';

import { runDemo } from '../setup/run-demo.js';
import { buildMouseMoveClickHelper } from '../setup/browser.js';
import {
    AndroidSession,
    getAppiumSession,
    startAppium,
    stopAppium,
    startAndroidRecording,
    stopAndroidRecording,
    setAndroidDarkMode,
    disconnectVpn
} from '../setup/android.js';
import { getDarkModeState } from '../setup/dark-mode.js';

import { OsWindow, getOsControls } from '../os/index.js';
import { HttpToolkit } from '../pages/httptoolkit.js';
import { AndroidDevice } from '../pages/android-device.js';


const osControls = getOsControls();
let htkWindow: OsWindow;
let androidSession: AndroidSession;
let android: AndroidDevice;

const RECORD_DEVICE = process.env.RECORD_VIDEO === 'true';

await runDemo('android', async (page) => {
    const startTime = Date.now();
    const results: {
        clipsToCut: [start: number, end: number][]
    } = { clipsToCut: [] };

    const htk = new HttpToolkit(page);

    htkWindow = await osControls.getWindowByName(/HTTP Toolkit - Chromium/);
    const moveToAndClick = buildMouseMoveClickHelper(htkWindow);
    android = new AndroidDevice(androidSession);

    await htk.isLoaded();
    osControls.setMouse(htkWindow.position.x - 20, htkWindow.position.y + 150);
    results.clipsToCut.push([0, Date.now() - startTime]);

    await delay(500);

    // --- Intercept device ---

    const interceptPage = await htk.goTo('intercept');

    await moveToAndClick(interceptPage.getInterceptorFilterInput(), {
        moveDuration: 400
    });

    await osControls.typeString('android');

    await moveToAndClick(interceptPage.getInterceptorButton('Android Device via ADB'), {
        clickPause: 400
    });

    await delay(5_000);

    // --- Create some traffic on-device ---

    await android.pressHomeButton();

    await delay(1000);

    const netflixHomeIcon = await android.getByText("Netflix");
    await netflixHomeIcon.click();

    await delay(500);

    return results;
}, {
    setup: async () => {
        const darkMode = await getDarkModeState();
        if (darkMode !== undefined) {
            setAndroidDarkMode(darkMode);
        }
        await startAppium();
        androidSession = await getAppiumSession();
        console.log('Initial activity', await androidSession.getCurrentActivity());
        if (RECORD_DEVICE) await startAndroidRecording();
    },
    cleanup: async () => {
        if (RECORD_DEVICE) await stopAndroidRecording();

        // Reset the connected device to the initial state
        if (android) {
            await disconnectVpn();
            await delay(50);
            await android.pressHomeButton();
        }

        if (androidSession) {
            console.log('Closing session...');
            await androidSession.deleteSession({}).catch(console.log);
            console.log('Closed android session');
        }
        console.log('Stopping appium...');
        await stopAppium().catch(console.log);
        console.log('Stopped appium');

        if (htkWindow) await osControls.closeWindow(htkWindow.id);
    }
});
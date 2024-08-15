import * as path from 'path';
import { delay } from '@httptoolkit/util';

import { runDemo } from '../setup/run-demo.js';
import { buildMouseMoveClickHelper } from '../setup/browser.js';
import { HttpToolkit } from '../pages/httptoolkit.js';
import { OsWindow, getOsControls } from '../os/index.js';

const osControls = getOsControls();
let htkWindow: OsWindow;
let terminalWindow: OsWindow;

await runDemo('curl', async (page) => {
    const startTime = Date.now();
    const results: {
        clipsToCut: [start: number, end: number][]
    } = { clipsToCut: [] };

    const htk = new HttpToolkit(page);

    htkWindow = await osControls.getWindowByName(/HTTP Toolkit - Chromium/);
    const moveToAndClick = buildMouseMoveClickHelper(htkWindow);
    const typeCommand = (input: string, duration: number) => osControls.typeString(input, {
        duration,
        // Restoring the cursor is rarely relevant, since we usually keep typing or switch back
        // to the UI anyway, so we avoid this to avoid UI flicker:
        restoreCursor: false
    });

    await htk.isLoaded();
    osControls.setMouse(htkWindow.position.x - 20, htkWindow.position.y + 150);
    results.clipsToCut.push([0, Date.now() - startTime]);

    await delay(500);

    // --- Intercept Terminal ---

    const interceptPage = await htk.goTo('intercept');

    const terminalPromise = osControls.getNextNewWindow();

    await moveToAndClick(interceptPage.getInterceptorFilterInput(), {
        moveDuration: 400
    });

    await osControls.typeString('shell');

    await moveToAndClick(interceptPage.getInterceptorButton('Fresh Terminal'), {
        moveDuration: 200,
        clickPause: 400
    });

    const terminalLaunchTime = Date.now();
    terminalWindow = await terminalPromise;
    await osControls.setWindowDimensions(terminalWindow.id, {
        x: htkWindow.position.x + 400,
        y: htkWindow.position.y + 200,
        width: htkWindow.size.width - 425,
        height: htkWindow.size.height - 250
    });
    await osControls.focusWindow(terminalWindow.id);
    await osControls.enterString(`cd ${path.join(process.cwd(), 'home')}`);
    await osControls.keyTap('enter');
    await osControls.enterString('clear');
    await osControls.keyTap('enter');

    const terminalReadyTime = Date.now();
    results.clipsToCut.push([terminalLaunchTime - startTime, terminalReadyTime - startTime]);

    await delay(1000);
    await typeCommand("curl https://example.com", 500);
    await delay(500);
    await osControls.keyTap('enter');
    await delay(1500);

    await osControls.focusWindow(htkWindow.id);

    await delay(500);
    const viewPage = await htk.goTo('view');

    const githubRow = viewPage.getRowByIndex(1);
    await moveToAndClick(githubRow, { moveDuration: 150 });
    await delay(500);

    await moveToAndClick(viewPage.getCard('Request').getTitle(), {
        moveDuration: 150,
        clickPause: 500
    });

    await delay(500);

    await moveToAndClick(viewPage.getCard('Response').getTitle(), {
        moveDuration: 100,
        clickPause: 500
    });

    await delay(1000);

    return results;
}, {
    cleanup: async () => {
        if (terminalWindow) {
            await osControls.closeWindow(terminalWindow.id);

            // On Mac, closing the last window doesn't kill the process:
            if (process.platform === 'darwin') {
                await osControls.killProcess(terminalWindow.id.split('-')[0]);
            }
        }
        if (htkWindow) await osControls.closeWindow(htkWindow.id);
    }
});
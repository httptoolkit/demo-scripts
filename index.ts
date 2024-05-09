import { delay } from '@httptoolkit/util';

import { runDemo } from './setup.js';
import { HttpToolkit } from './pages/httptoolkit.js';
import { getOsControls } from './os/index.js';

const osControls = getOsControls();

await runDemo("http://localhost:8080", async (page) => {
    const htk = new HttpToolkit(page);
    const htkWindowId = await osControls.getWindowIdByName('HTTP Toolkit - Chromium');
    await htk.isLoaded();

    await delay(500);

    const interceptPage = await htk.goTo('intercept');

    const terminalIdPromise = osControls.getNextNewWindowId();
    await interceptPage.clickInterceptor('Fresh Terminal');

    await delay(1000);

    const terminalId = await terminalIdPromise;
    osControls.focusWindow(terminalId);

    await delay(100);
    console.log(osControls);
    osControls.typeStringDelayed('curl https://google.com', 800);
    await delay(1000);
    osControls.keyTap('enter');

    await delay(1000);
    await osControls.closeWindow(terminalId);
    await osControls.focusWindow(htkWindowId);
    await delay(5000);
});
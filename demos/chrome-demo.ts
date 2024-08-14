import { delay } from '@httptoolkit/util';

import { runDemo } from '../setup/run-demo.js';
import {
    getOptionDimensions,
    getUrlBarCoords,
    getRefreshButtonCoords,
    buildMouseMoveClickHelper,
    moveMouseTo
} from '../setup/browser.js';
import { HttpToolkit } from '../pages/httptoolkit.js';
import { OsWindow, getOsControls } from '../os/index.js';

const osControls = getOsControls();
let htkWindow: OsWindow;
let chromeWindow: OsWindow;

await runDemo('chrome', async (page) => {
    const startTime = Date.now();
    const results: {
        clipsToCut: [start: number, end: number][]
    } = { clipsToCut: [] };

    const htk = new HttpToolkit(page);

    htkWindow = await osControls.getWindowByName(/HTTP Toolkit - Chromium/);
    const moveToAndClick = buildMouseMoveClickHelper(htkWindow);

    await htk.isLoaded();
    osControls.setMouse(htkWindow.position.x - 20, htkWindow.position.y + 150);

    await delay(500);

    // --- Intercept Chrome in one click ---

    const interceptPage = await htk.goTo('intercept');

    const chromePromise = osControls.getNextNewWindow();

    await moveToAndClick(interceptPage.getInterceptorButton('Chrome'), {
        moveDuration: 400,
        clickPause: 400
    });

    // Wait for Chrome, and position it once it appears:
    const chromeLaunchTime = Date.now();
    chromeWindow = await chromePromise;
    await osControls.setWindowDimensions(chromeWindow.id, {
        x: htkWindow.position.x + 400,
        y: htkWindow.position.y + 200,
        width: htkWindow.size.width - 425,
        height: htkWindow.size.height - 250
    });
    const chromeReadyTime = Date.now();
    results.clipsToCut.push([chromeLaunchTime - startTime, chromeReadyTime - startTime]);

    await delay(100);
    chromeWindow = await osControls.getWindowById(chromeWindow.id);
    await osControls.focusWindow(chromeWindow.id);
    await moveToAndClick(getUrlBarCoords(chromeWindow), { window: 'screen' });

    await delay(100);
    await osControls.typeString('https://github.com', { duration: 500 });
    await delay(500);
    await osControls.keyTap('enter');
    await delay(2500);

    // --- Filter & view traffic ---

    await osControls.focusWindow(htkWindow.id);

    await delay(500);
    const viewPage = await htk.goTo('view');

    await moveToAndClick(viewPage.getFilterBox());
    await delay(500);

    await osControls.typeString('hostname=github.com', { duration: 1000 });
    await delay(1000);
    await osControls.keyTap('enter');

    await delay(500);
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

    // --- Explore response body ---

    const responseBody = viewPage.getCard('Response Body');

    await delay(100);
    await moveToAndClick(responseBody.getExpandButton(), {
        moveDuration: 250,
        clickPause: 500
    });

    await delay(500);
    const foldButtonPosition = await responseBody.getEditor().getFoldButtons().nth(1).boundingBox();
    await moveToAndClick(foldButtonPosition!);

    await delay(1000);

    const edgeOfEditorPosition = { ...foldButtonPosition!, x: foldButtonPosition!.x + 100 };

    await moveToAndClick(edgeOfEditorPosition, { moveDuration: 100, clickPause: 0 });

    await delay(50);
    await htk.openFind();
    await delay(1000);
    await osControls.typeString('Build from', { duration: 500 });
    await delay(500);
    await moveToAndClick(responseBody.getEditor().getNextMatchButton());
    await moveToAndClick(responseBody.getEditor().getNextMatchButton(), { moveDuration: 250 });
    await moveToAndClick(responseBody.getEditor().getNextMatchButton(), { moveDuration: 250 });
    await delay(2000);

    // --- Create a mock rule ---

    await moveToAndClick(htk.getSidebarButton('modify'));
    const modifyPage = await htk.goTo('modify');

    await delay(1000);
    await moveToAndClick(modifyPage.getNewRuleButton());

    await delay(100);
    const newRule = (await modifyPage.getRules())[0];

    const matcherDropdown = newRule.getBaseMatcherDropdown();
    const getOption = await getOptionDimensions(matcherDropdown, 'GET');
    await moveToAndClick(matcherDropdown);

    await delay(250);
    await moveToAndClick(getOption);

    const extraMatcherDropdown = newRule.getAdditionalMatcherDropdown();
    await moveToAndClick(extraMatcherDropdown);

    await delay(250);
    await moveToAndClick(await getOptionDimensions(extraMatcherDropdown, 'simple-path'));

    await delay(100);
    await moveToAndClick(newRule.getAdditionalMatcherInput());
    await osControls.typeString('https://github.com/', { duration: 250 });
    await moveToAndClick(newRule.getAdditionalMatcherAddButton());

    await delay(250);
    const handlerDropdown = newRule.getBaseHandlerDropdown();
    await moveToAndClick(handlerDropdown);

    delay(100);
    await moveToAndClick(await getOptionDimensions(handlerDropdown, 'req-res-transformer'), {
        moveDuration: 750
    });

    await delay(500);
    const responseBodyTransformDropdown = newRule.handlerSection.getByLabel('how the response body should be transformed');

    await moveToAndClick(responseBodyTransformDropdown);

    delay(100);
    await moveToAndClick(await getOptionDimensions(responseBodyTransformDropdown, 'matchReplaceBody'), {
        moveDuration: 750
    });

    const matchInput = newRule.handlerSection.getByPlaceholder('expression to match');
    const resultInput = newRule.handlerSection.getByPlaceholder('Replacement value');

    await moveToAndClick(matchInput);
    let resultPosition = await resultInput.boundingBox(); // Need to grab before we create a new row
    await osControls.typeString('build from');
    await moveToAndClick(resultPosition!);
    await osControls.typeString('modify anything');

    await moveToAndClick(matchInput);
    resultPosition = await resultInput.boundingBox(); // Grab before we create a new row
    await osControls.typeString('The world’s leading AI-powered developer platform',
        { duration: 1200 }
    );
    await moveToAndClick(resultPosition!);
    await osControls.typeString('with HTTP Toolkit');

    await delay(300);
    await moveToAndClick(newRule.getSaveButton());

    // --- See the mock rule working ---

    await delay(500);

    await osControls.focusWindow(chromeWindow.id);
    await delay(1000);
    await moveToAndClick(getRefreshButtonCoords(chromeWindow), { window: 'screen', clickPause: 1000 });
    await delay(4000); // Crowd goes wild, clap clap clap, FIN

    await osControls.focusWindow(htkWindow.id);
    await moveMouseTo(htkWindow, htk.getSidebarButton('intercept'), 500);

    return results;
}, {
    cleanup: async () => {
        if (chromeWindow) {
            await osControls.closeWindow(chromeWindow.id);

            // On Mac, closing the last window doesn't kill the process:
            if (process.platform === 'darwin') {
                await osControls.killProcess(chromeWindow.id.split('-')[0]);
            }
        }
        if (htkWindow) await osControls.closeWindow(htkWindow.id);
    }
});
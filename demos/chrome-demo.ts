import { Locator } from 'playwright';
import { delay } from '@httptoolkit/util';

import { runDemo } from '../setup.js';
import { HttpToolkit } from '../pages/httptoolkit.js';
import { OsWindow, getOsControls } from '../os/index.js';
import {
    Dimensions,
    getOptionDimensions,
    getUrlBarCoords,
    moveMouseTo,
    getRefreshButtonCoords
} from '../browser-utils.js';

const osControls = getOsControls();
let htkWindow: OsWindow;
let chromeWindow: OsWindow;

await runDemo(async (page) => {
    const htk = new HttpToolkit(page);

    htkWindow = await osControls.getWindowByName(/HTTP Toolkit - Chromium/);

    const moveToAndClick = async (elem: Locator | Dimensions, options?: {
        moveDuration?: number,
        clickPause?: number,
        window?: OsWindow | 'screen'
    }) => {
        await moveMouseTo(
            options?.window ?? htkWindow,
            elem,
            options?.moveDuration || 300
        );
        await delay(options?.clickPause || 100);
        osControls.mouseClick('left');
    }

    osControls.setMouse(htkWindow.position.x + 35, htkWindow.position.y + 35);

    await htk.isLoaded();
    await delay(500);

    // --- Intercept Chrome in one click ---

    const interceptPage = await htk.goTo('intercept');

    const chromePromise = osControls.getNextNewWindow();

    await moveToAndClick(interceptPage.getInterceptorButton('Chrome'));
    chromeWindow = await chromePromise;
    await osControls.setWindowDimensions(chromeWindow.id, {
        x: htkWindow.position.x + 400,
        y: htkWindow.position.y + 200,
        width: htkWindow.size.width - 425,
        height: htkWindow.size.height - 250
    });
    await delay(100);
    chromeWindow = await osControls.getWindowById(chromeWindow.id);
    await osControls.focusWindow(chromeWindow.id);
    await moveToAndClick(getUrlBarCoords(chromeWindow), { window: 'screen' });

    await delay(100);
    await osControls.typeString('https://github.com', 500);
    await delay(500);
    osControls.keyTap('enter');
    await delay(2000);

    // --- Filter & view traffic ---

    await osControls.focusWindow(htkWindow.id);

    await delay(500);
    const viewPage = await htk.goTo('view');

    await moveToAndClick(viewPage.getFilterBox());
    await delay(500);

    await osControls.typeString('hostname=github.com', 1000);
    await delay(1000);
    osControls.keyTap('enter');

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
    await osControls.typeString('Build from', 500);
    await delay(1000);

    // --- Create a mock rule ---

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
    await osControls.typeString('https://github.com/', 250);
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
    await osControls.typeString('build from', 400);
    await moveToAndClick(resultPosition!);
    await osControls.typeString('modify anything', 400);

    await moveToAndClick(matchInput);
    resultPosition = await resultInput.boundingBox(); // Grab before we create a new row
    await osControls.typeString('The world’s leading AI-powered developer platform', 1200);
    await moveToAndClick(resultPosition!);
    await osControls.typeString('with HTTP Toolkit', 400);

    await delay(300);
    await moveToAndClick(newRule.getSaveButton());

    // --- See the mock rule working ---

    await delay(500);

    await osControls.focusWindow(chromeWindow.id);
    await delay(1000);
    await moveToAndClick(getRefreshButtonCoords(chromeWindow), { window: 'screen', clickPause: 1000 });
    await delay(500); // Crowd goes wild, clap clap clap, FIN
}, async () => {
    if (chromeWindow) {
        await osControls.closeWindow(chromeWindow.id);

        // On Mac, closing the last window doesn't kill the process:
        if (process.platform === 'darwin') {
            await osControls.killProcess(chromeWindow.id.split('-')[0]);
        }
    }
    if (htkWindow) await osControls.closeWindow(htkWindow.id);
});
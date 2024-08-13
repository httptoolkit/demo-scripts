import * as path from 'path';
import { delay } from '@httptoolkit/util';

import { runDemo } from '../setup.js';
import { HttpToolkit } from '../pages/httptoolkit.js';
import { OsWindow, getOsControls } from '../os/index.js';
import {
    buildMouseMoveClickHelper,
    getOptionDimensions
} from '../browser-utils.js';

const osControls = getOsControls();
let htkWindow: OsWindow;
let terminalWindow: OsWindow;

await runDemo('node', async (page) => {
    const startTime = Date.now();
    const results: {
        clipsToCut: [start: number, end: number][]
    } = { clipsToCut: [] };

    const htk = new HttpToolkit(page);

    htkWindow = await osControls.getWindowByName(/HTTP Toolkit - Chromium/);
    const moveToAndClick = buildMouseMoveClickHelper(htkWindow);


    // Restoring the cursor is rarely relevant, since we usually keep typing or switch back
    // to the UI anyway, so we use wrappers to easily avoid UI flicker:
    const typeCommand = (input: string, duration: number) => osControls.typeString(input, {
        duration,
        restoreCursor: false
    });
    const tapKey = (key: string) => osControls.keyTap(key, {
        restoreCursor: false
    });

    await htk.isLoaded();
    osControls.setMouse(htkWindow.position.x - 20, htkWindow.position.y + 100);

    await delay(500);

    // --- Intercept Terminal ---

    const interceptPage = await htk.goTo('intercept');

    const terminalPromise = osControls.getNextNewWindow();

    await moveToAndClick(interceptPage.getInterceptorFilterInput(), {
        moveDuration: 400
    });

    await osControls.typeString('Node.js');

    await moveToAndClick(interceptPage.getInterceptorButton('Fresh Terminal'), {
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
    await tapKey('enter');
    await osControls.enterString('clear');
    await tapKey('enter');

    const terminalReadyTime = Date.now();
    results.clipsToCut.push([terminalLaunchTime - startTime, terminalReadyTime - startTime]);

    await delay(1000);
    await typeCommand("node ./my-node-script.js", 500);
    await delay(500);
    await tapKey('enter');
    await delay(3000);

    // --- Look at intercepted traffic ---

    await osControls.focusWindow(htkWindow.id);

    await delay(500);
    const viewPage = await htk.goTo('view');

    const githubRow = viewPage.getRowByIndex(1);
    await moveToAndClick(githubRow, { moveDuration: 150 });
    await delay(500);

    await moveToAndClick(viewPage.getCard('Request').getTitle(), {
        clickPause: 500
    });

    await delay(500);

    const responseDetailSections = viewPage.getCard('Response').getExpandableSections();
    const altSvcHeaderButton = responseDetailSections.nth(4).getByRole('button');

    await moveToAndClick(altSvcHeaderButton, {
        moveDuration: 400,
        clickPause: 500
    });

    await delay(1000);

    await moveToAndClick(viewPage.getCard('Response').getTitle(), {
        moveDuration: 100,
        clickPause: 500
    });

    // --- Explore response body ---

    const responseBody = viewPage.getCard('Response Body');

    await delay(100);
    await moveToAndClick(responseBody.getExpandButton(), {
        clickPause: 500
    });

    await delay(500);
    let foldButtonPosition = await responseBody.getEditor().getFoldButtons().nth(2).boundingBox();
    await moveToAndClick(foldButtonPosition!);
    await delay(300);
    foldButtonPosition = await responseBody.getEditor().getFoldButtons().nth(3).boundingBox();
    await moveToAndClick(foldButtonPosition!);
    await delay(300);
    foldButtonPosition = await responseBody.getEditor().getFoldButtons().nth(4).boundingBox();
    await moveToAndClick(foldButtonPosition!);
    await delay(1000);

    await moveToAndClick(responseBody.getShrinkButton(), {
        clickPause: 500
    });

    // --- Create a breakpoint rule ---

    await delay(250);
    await moveToAndClick(viewPage.getCreateRuleButton());

    const modifyPage = await htk.goTo('modify');
    const newRule = (await modifyPage.getRules())[0];

    await delay(500);
    const handlerDropdown = newRule.getBaseHandlerDropdown();
    await moveToAndClick(handlerDropdown);

    delay(100);
    await moveToAndClick(await getOptionDimensions(handlerDropdown, 'response-breakpoint'), {
        moveDuration: 500,
        clickPause: 500
    });

    await delay(300);
    await moveToAndClick(newRule.getSaveButton(), {
        clickPause: 750
    });

    // --- Trigger and use the breakpoint

    await delay(250);
    await osControls.focusWindow(terminalWindow.id);
    await delay(100);
    await tapKey('up');
    await delay(250);
    await tapKey('enter');
    await delay(100);

    await osControls.focusWindow(htkWindow.id);

    await delay(500);
    await moveToAndClick(responseBody.getFormatButton());

    await delay(500);
    const bulbasaurChunk = responseBody.getEditor().getEditorChunk('bulbasaur');
    await moveToAndClick(bulbasaurChunk, {
        clickPause: 500
    });
    await delay(100);
    osControls.mouseClick('double'); // Double click to select entire string

    await osControls.typeString('Httptoolkitasaur');

    const urlChunkDimensions = (await (
        responseBody.getEditor().getEditorChunk('https://pokeapi.co/api/v2/pokemon/1/').boundingBox()
    ))!;
    const editUrlPosition = {
        ...urlChunkDimensions,
        x: urlChunkDimensions.x + urlChunkDimensions.width - 10,
        width: 0
    };

    await moveToAndClick(editUrlPosition);
    await delay(10);
    await tapKey('backspace');
    await delay(50);
    await typeCommand('9999', 250);

    await moveToAndClick(viewPage.getResumeButton());
    await osControls.focusWindow(terminalWindow.id);

    await delay(1000000);

    return results;
}, async () => {
    if (terminalWindow) {
        await osControls.closeWindow(terminalWindow.id);

        // On Mac, closing the last window doesn't kill the process:
        if (process.platform === 'darwin') {
            await osControls.killProcess(terminalWindow.id.split('-')[0]);
        }
    }
    if (htkWindow) await osControls.closeWindow(htkWindow.id);
});
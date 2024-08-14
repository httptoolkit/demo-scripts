import * as path from 'path';
import { delay } from '@httptoolkit/util';

import { runDemo } from '../setup/run-demo.js';
import {
    buildMouseMoveClickHelper,
    getOptionDimensions,
    moveMouseTo
} from '../setup/browser.js';
import { HttpToolkit } from '../pages/httptoolkit.js';
import { OsWindow, getOsControls } from '../os/index.js';

const osControls = getOsControls();
let htkWindow: OsWindow;
let terminalWindow: OsWindow;

const language = process.argv[2];

const { filterString, scriptCommand } = ({
    node: {
        filterString: 'node.js',
        scriptCommand: 'node ./my-node-script.js'
    },
    python: {
        filterString: 'python',
        scriptCommand: 'python3 my-python-script.py'
    },
    ruby: {
        filterString: 'ruby',
        scriptCommand: 'ruby my-ruby-script.rb'
    }
} as const)[language]!;

console.log(`Running terminal demo for ${language} (${filterString}) with '${scriptCommand}'`);

await runDemo(language, async (page) => {
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
    osControls.setMouse(htkWindow.position.x - 20, htkWindow.position.y + 150);

    await delay(500);

    // --- Intercept Terminal ---

    const interceptPage = await htk.goTo('intercept');

    const terminalPromise = osControls.getNextNewWindow();

    await moveToAndClick(interceptPage.getInterceptorFilterInput(), {
        moveDuration: 400
    });

    await osControls.typeString(filterString);

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
    await typeCommand(scriptCommand, 600);
    await delay(500);
    await tapKey('enter');
    await delay(3000);

    // --- Look at intercepted traffic ---

    await osControls.focusWindow(htkWindow.id);

    await delay(500);
    const viewPage = await htk.goTo('view');

    const firstRow = viewPage.getRowByIndex(1);
    await moveToAndClick(firstRow, { moveDuration: 150 });
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

    await delay(1500);

    await moveToAndClick(viewPage.getCard('Response').getTitle(), {
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

    await delay(1500);
    const handlerDropdown = newRule.getBaseHandlerDropdown();
    await moveToAndClick(handlerDropdown);

    delay(100);
    await moveToAndClick(await getOptionDimensions(handlerDropdown, 'response-breakpoint'), {
        moveDuration: 500,
        clickPause: 1250
    });

    await delay(500);

    await moveToAndClick(newRule.getSaveButton(), {
        clickPause: 500
    });

    // --- Trigger and use the breakpoint

    await delay(250);
    await osControls.focusWindow(terminalWindow.id);
    await delay(100);
    await tapKey('up');
    await delay(1000);
    await tapKey('enter');
    await delay(250);

    await osControls.focusWindow(htkWindow.id);

    await delay(1000);
    await moveToAndClick(responseBody.getFormatButton());

    await delay(500);
    const bulbasaurChunk = responseBody.getEditor().getEditorChunk('bulbasaur');
    await moveToAndClick(bulbasaurChunk, {
        clickPause: 500
    });
    await delay(100);
    osControls.mouseClick('double'); // Double click to select entire string

    await osControls.typeString('Httptoolkitasaur', { duration: 1000 });

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

    await delay(1000);
    await moveToAndClick(viewPage.getResumeButton(), {
        clickPause: 500
    });

    await delay(250);
    await osControls.focusWindow(terminalWindow.id);

    await delay(2000);

    // --- Resend & tweak the request

    await osControls.focusWindow(htkWindow.id);

    await delay(1000);
    await moveToAndClick(viewPage.getFilterBox());

    await delay(500);
    await osControls.typeString('status=404', { duration: 600 });
    await delay(500);
    await osControls.keyTap('enter');

    await delay(1000);
    const failedRequestRow = viewPage.getRowByIndex(1);
    await moveToAndClick(failedRequestRow, { moveDuration: 150 });
    await delay(1000);

    await moveToAndClick(viewPage.getResendButton());

    const sendPage = await htk.goTo('send');

    await delay(1000);
    await moveToAndClick(sendPage.getSendButton());

    await delay(500);

    await moveToAndClick(sendPage.getUrlInput());
    await tapKey('end');
    await tapKey('backspace');
    await tapKey('backspace');
    await tapKey('backspace');
    await tapKey('backspace');
    await tapKey('backspace');
    await osControls.typeString('1');

    await delay(500);
    await moveToAndClick(sendPage.getSendButton());

    await moveToAndClick(sendPage.getResponseHeadersTitle());

    const sendEditor = sendPage.getResponseBodyEditor();

    await delay(500);
    foldButtonPosition = await sendEditor.getFoldButtons().nth(1).boundingBox();
    const edgeOfEditorPosition = { ...foldButtonPosition!, x: foldButtonPosition!.x + 50 };

    await moveToAndClick(edgeOfEditorPosition, { moveDuration: 100, clickPause: 0 });
    await delay(50);
    await htk.openFind();
    await delay(1000);
    await osControls.typeString('Bulbasaur', { duration: 500 });

    await delay(300);
    foldButtonPosition = await sendEditor.getFoldButtons().nth(1).boundingBox();
    await moveToAndClick(foldButtonPosition!);

    await delay(500);
    await moveToAndClick(responseBody.getEditor().getNextMatchButton());
    await responseBody.getEditor().getNextMatchButton().click();

    await delay(1500);
    await moveMouseTo(htkWindow, htk.getSidebarButton('intercept'), 500);
    return results;
}, {
    cleanup: async () => {
        if (terminalWindow) {
            await osControls.closeWindow(terminalWindow.id);

            // On Mac, closing the last window doesn't kill the process:
            if (process.platform === 'darwin') {
                await delay(500);
                await osControls.killProcess(terminalWindow.id.split('-')[0]);
            }
        }
        if (htkWindow) await osControls.closeWindow(htkWindow.id);
    }
});
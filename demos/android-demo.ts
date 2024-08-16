import { delay } from '@httptoolkit/util';

import { runDemo } from '../setup/run-demo.js';
import {
    buildMouseMoveClickHelper,
    getOptionDimensions,
    moveMouseTo
} from '../setup/browser.js';
import {
    AndroidSession,
    getAppiumSession,
    startAppium,
    stopAppium,
    startAndroidRecording,
    stopAndroidRecording,
    setAndroidDarkMode,
    disconnectVpn,
    resetApp
} from '../setup/android.js';
import { getDarkModeState } from '../setup/dark-mode.js';

import { OsWindow, getOsControls } from '../os/index.js';
import { HttpToolkit } from '../pages/httptoolkit.js';
import { AndroidDevice, By } from '../pages/android-device.js';


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
    await osControls.keyTap('up'); // Tap a key just to make sure the mouse is restored
    await android.pressHomeButton();
    const moveToAndClick = buildMouseMoveClickHelper(htkWindow);

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

    const androidButton = interceptPage.getInterceptorButton('Android Device via ADB');
    const androidButtonDimensions = await androidButton.boundingBox();
    await moveToAndClick({
        ...androidButtonDimensions!,
        // We very mildly tweak the positioning to avoid tooltips later
        x: androidButtonDimensions!.x - 5
    }, {
        clickPause: 400
    });

    await delay(8000);

    // --- Create some traffic on-device ---

    await android.pressHomeButton();

    await delay(1000);

    const netflixHomeIcon = await android.get(By.text("Netflix"));
    await netflixHomeIcon.click();
    await delay(2300);

    const netflixOpenTime = Date.now();
    await (await android.get(By.contentDescription("select Tim"))).click();
    await delay(1000);
    const netflixReadyTime = Date.now();
    results.clipsToCut.push([netflixOpenTime - startTime, netflixReadyTime - startTime]);

    await delay(3000);

    const screenSize = await android.getScreenSize();
    await android.touchMove(
        { x: screenSize.width / 2, y: 2000 },
        { x: screenSize.width / 2, y: 500 },
        { duration: 250 }
    );
    await android.touchMove(
        { x: screenSize.width / 2, y: 2000 },
        { x: screenSize.width / 2, y: 500 },
        { duration: 250 }
    );

    await delay(500);
    let rows = await android.getAll(By.widgetChain("android.widget.GridView"));

    let rowDimensions = await android.getElementDimensions(rows[3]);
    await android.touchMove(
        {
            x: rowDimensions.x + rowDimensions.width * 3/4,
            y: rowDimensions.y + rowDimensions.height / 2
        },
        {
            x: rowDimensions.x + rowDimensions.width * 1/4,
            y: rowDimensions.y + rowDimensions.height / 2
        },
        { duration: 500 }
    );

    await delay(500);

    await android.touchMove(
        {
            x: rowDimensions.x + rowDimensions.width * 3/4,
            y: rowDimensions.y + rowDimensions.height / 2
        },
        {
            x: rowDimensions.x + rowDimensions.width * 1/4,
            y: rowDimensions.y + rowDimensions.height / 2
        },
        { duration: 500 }
    );

    // --- Look at intercepted traffic ---

    const viewPage = await htk.goTo('view');

    await moveToAndClick(viewPage.getFilterBox());
    await delay(500);
    await osControls.typeString('method=POST');
    await delay(1000);
    await osControls.keyTap('enter');

    await delay(500);
    const graphQlRow = viewPage.getRows('android.prod.ftl.netflix.com').nth(2);
    await moveToAndClick(graphQlRow);

    await delay(500);
    const requestCard = viewPage.getCard('Request');
    const urlSection = (await requestCard.getExpandableSections().all())[1];
    const urlSectionButton = urlSection.getByRole('button');
    await moveToAndClick(urlSectionButton);

    await delay(500);
    await osControls.scrollMouse({ y: -200 }, 200);

    await delay(2000);

    await osControls.scrollMouse({ y: 200 }, 100);
    await moveToAndClick(requestCard.getTitle());
    await delay(1000);

    let responseCollapsed = false;

    const editor = viewPage.getCard('Request Body').getEditor();
    if (await editor.getEditorChunk('currentCountryQuery').isVisible()) {
        await moveToAndClick(viewPage.getCard('Response').getTitle());
        responseCollapsed = true;
    } else {
        await moveToAndClick(editor.getFoldButtons().nth(2));
    }

    await delay(2000);

    await moveToAndClick(viewPage.getFilterBox());
    await delay(500);
    await osControls.keyTap('backspace');
    await osControls.typeString('category=websocket');
    await delay(1000);
    await osControls.keyTap('enter');

    await delay(250);
    await moveToAndClick(viewPage.getRowByIndex(1));

    if (!responseCollapsed) {
        await delay(500);
        await moveToAndClick(viewPage.getCard('Response').getTitle());
        responseCollapsed = true;
    }

    await delay(500);
    const webSocketCard = viewPage.getCard('Web Socket Messages');
    await moveToAndClick(webSocketCard.getMessageRowByIndex(1));
    await delay(2000);

    await moveToAndClick(viewPage.getFilterBox());
    await delay(500);
    await osControls.keyTap('backspace');
    await osControls.typeString('path*=webp');
    await delay(1000);
    await osControls.keyTap('enter');

    await delay(100);
    const imageRow = viewPage.getRowByIndex(35);
    await moveToAndClick(imageRow);
    await delay(500);
    await osControls.keyTap('down');
    await delay(500);
    await osControls.keyTap('down');

    await delay(2000);

    // --- Create a rule to mock images

    await moveToAndClick(htk.getSidebarButton('modify'));
    const modifyPage = await htk.goTo('modify');

    await delay(250);
    await moveToAndClick(modifyPage.getNewRuleButton(), {
        moveDuration: 500
    });

    await delay(500);
    const newRule = (await modifyPage.getRules())[0];

    const matcherDropdown = newRule.getBaseMatcherDropdown();
    const getOption = await getOptionDimensions(matcherDropdown, 'GET');
    await moveToAndClick(matcherDropdown, {
        moveDuration: 500
    });

    await delay(750);
    await moveToAndClick(getOption, {
        clickPause: 750
    });

    const extraMatcherDropdown = newRule.getAdditionalMatcherDropdown();
    await moveToAndClick(extraMatcherDropdown);

    await delay(750);
    await moveToAndClick(await getOptionDimensions(extraMatcherDropdown, 'regex-path'), {
        clickPause: 750
    });

    await delay(100);
    await moveToAndClick(newRule.getAdditionalMatcherInput());
    await osControls.typeString('.*\.(webp|png)', { duration: 750 });
    await delay(250);
    await moveToAndClick(newRule.getAdditionalMatcherAddButton());

    await delay(250);
    const handlerDropdown = newRule.getBaseHandlerDropdown();
    await moveToAndClick(handlerDropdown);

    await delay(750);
    await moveToAndClick(await getOptionDimensions(handlerDropdown, 'file'), {
        clickPause: 750
    });

    await delay(250);
    await moveToAndClick(newRule.getHandlerInputs().nth(2));
    await osControls.typeString('content-type', { duration: 500 });

    await delay(250);
    await moveToAndClick(newRule.getHandlerInputs().nth(3));
    await osControls.typeString('image/png', { duration: 500 });

    // --- IMPORTANT ---
    // This file selection doesn't actually work in Chrome with the normal UI
    // build, since it requires path picking. It requires a UI patch to hardcode
    // the file path, which is easy (FromFileResponseHandlerConfig->selectFile,
    // change to arraybuffer + then hardcode a path as result) but it's not
    // expected to work totally automatically unfortunately.
    // ------------
    await delay(250);
    await moveToAndClick(newRule.getHandlerButton('Select file'));

    await delay(500);
    await osControls.typeString('b', { restoreCursor: false });
    await delay(1000);
    await osControls.keyTap('enter');

    await delay(500);
    await moveToAndClick(newRule.getRenameButton());
    await delay(250);
    await osControls.typeString('Swap all images for smiley faces', { duration: 1000 });
    await moveToAndClick(newRule.getSaveButton(), {
        clickPause: 1000
    });

    await delay(1000);

    // --- Scroll through more images

    await moveToAndClick(htk.getSidebarButton('view'));

    await delay(500);

    const clearFilterButton = viewPage.getClearFilterButton();
    const clearFilterButtonBounds = (await clearFilterButton.boundingBox())!;
    await moveToAndClick(clearFilterButtonBounds);

    await delay(1000);

    await android.touchMove(
        { x: screenSize.width / 2, y: 2000 },
        { x: screenSize.width / 2, y: 500 },
        { duration: 250 }
    );

    await delay(1000);

    rows = (await android.getAll(By.widgetChain("android.widget.GridView")));
    rowDimensions = await android.getElementDimensions(rows[3]);
    await android.touchMove(
        {
            x: rowDimensions.x + rowDimensions.width * 3/4,
            y: rowDimensions.y + rowDimensions.height / 2
        },
        {
            x: rowDimensions.x + rowDimensions.width * 1/4,
            y: rowDimensions.y + rowDimensions.height / 2
        },
        { duration: 500 }
    );

    await delay(2000);
    await moveMouseTo(htkWindow, htk.getSidebarButton('intercept'), 500);
    await delay(1000);
    return results;
}, {
    setup: async () => {
        const darkMode = await getDarkModeState();
        if (darkMode !== undefined) {
            setAndroidDarkMode(darkMode);
        }
        await startAppium();
        androidSession = await getAppiumSession();
        android = new AndroidDevice(androidSession);

        await android.pressHomeButton();
        await resetApp('com.netflix.mediaclient');

        if (RECORD_DEVICE) await startAndroidRecording();
    },
    cleanup: async () => {
        if (RECORD_DEVICE) await stopAndroidRecording();

        // Reset the connected device to the initial state
        if (android) {
            console.log('Resetting Android device...');
            await disconnectVpn().catch(() => {});
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
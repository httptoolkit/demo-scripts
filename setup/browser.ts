import { chromium, Locator } from "playwright";
import { delay } from "@httptoolkit/util";

import { getOsControls, OsWindow } from "../os/index.js";

export async function launchChrome(
    url: string,
    { position, size, tokens }: {
        position?: { x: number, y: number },
        size?: { width: number, height: number },
        tokens?: { refreshToken: string, accessToken: string }
    } = {}
) {
    const browser = await chromium.launch({
        headless: false,
        args: [
            position && `--window-position=${position.x},${position.y}`,
            size && `--window-size=${size.width},${size.height}`
        ].filter((x): x is string => !!x)
    });

    const context = await browser.newContext({
        viewport: null,
        colorScheme: null
    });
    if (tokens) {
        await context.addInitScript(`
            window.localStorage.setItem('tokens', JSON.stringify(${
                JSON.stringify(tokens)
            }));
        `);
    }
    const page = await context.newPage();
    page.on('dialog', () => console.log('Ignoring dialog')); // <-- Bad playwright, good UI automation
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    return { browser, page };
}

export const CHROME_TOP_HEIGHT = 87;

const CHROME_URL_Y = 44;
const CHROME_URL_BAR_HEIGHT = 40;
const CHROME_URL_X = 150;
const CHROME_REFRESH_X_CENTER = 92;

export type Dimensions = { x: number, y: number, width: number, height: number };

const osControls = getOsControls();

export function getUrlBarCoords(browserWindow: OsWindow) {
    return {
        x: browserWindow.position.x + CHROME_URL_X + 50,
        y: browserWindow.position.y + CHROME_URL_Y,
        width: 0,
        height: CHROME_URL_BAR_HEIGHT
    };
}

export function getRefreshButtonCoords(browserWindow: OsWindow) {
    return {
        x: browserWindow.position.x + CHROME_REFRESH_X_CENTER,
        y: browserWindow.position.y + CHROME_URL_Y,
        width: 0,
        height: CHROME_URL_BAR_HEIGHT
    };
}

async function getScreenDimensions(
    browserWindow: OsWindow,
    locatorOrDimensions: Locator | Dimensions
) {
    const dimensions = ('x' in locatorOrDimensions && 'y' in locatorOrDimensions)
        ? locatorOrDimensions
        : (await locatorOrDimensions.boundingBox())!;

    const page = { x: browserWindow.position.x, y: browserWindow.position.y + CHROME_TOP_HEIGHT };

    return {
        x: page.x + dimensions.x,
        y: page.y + dimensions.y,
        width: dimensions.width,
        height: dimensions.height
    };
}

export async function moveMouseTo(browserWindow: OsWindow | 'screen', elem: Locator | Dimensions, duration: number) {
    const elemDimensions = browserWindow === 'screen'
        ? elem as Dimensions
        : await getScreenDimensions(browserWindow, elem);

    await osControls.slideMouse(
        elemDimensions.x + elemDimensions.width / 2,
        elemDimensions.y + elemDimensions.height / 2,
        duration
    );
}

export async function getOptionDimensions(selectLocator: Locator, value: string) {
    const isMac = process.platform === 'darwin';

    return selectLocator.evaluate((
        selectElem: HTMLSelectElement,
        { value, isMac }
    ) => {
        const options = [...selectElem.querySelectorAll('option')];
        const targetOptionIndex = options.findIndex((opt) => opt.value === value);
        if (targetOptionIndex === -1) throw new Error(`Option ${value} not found`);

        const rect = selectElem.getBoundingClientRect();
        let optionHeight: number;
        let baseOptionIndex: number;
        if (isMac) {
            // On Mac, where there is enough space, the currently selected option is centered,
            // so we need to count height difference from that point, not the top of the options:
            baseOptionIndex = options.findIndex((opt) => opt.value === selectElem.value);
            if (baseOptionIndex === -1) baseOptionIndex = 0;
            optionHeight = 30; // Fixed UI - seems approximately correct
        } else {
            // Assume it's a straight dropdown from the select (generally true, as long as
            // there's space on the screen, but we ignore the upwards case for now)
            baseOptionIndex = 0;

            const styles = window.getComputedStyle(selectElem);
            const wrappers = [
                styles.paddingTop,
                styles.borderTopWidth,
                styles.paddingBottom,
                styles.borderBottomWidth,
            ].map(p => parseInt(p.replace('px', ''), 10));

            // We assume that the height of each option is the inner height of the select content
            // (seems correct ish for easy cases on Linux at least))
            const verticalWrapping = wrappers.reduce((total, n) => total + n, 0);
            optionHeight = rect.height - verticalWrapping;
        }

        return {
            x: rect.left,
            y: rect.top + optionHeight * (targetOptionIndex - baseOptionIndex),
            width: rect.width,
            height: optionHeight
        };
    }, { value, isMac });
}

export function buildMouseMoveClickHelper(targetWindow: OsWindow) {
    return async (elem: Locator | Dimensions, options?: {
        moveDuration?: number,
        clickPause?: number,
        window?: OsWindow | 'screen'
    }) => {
        await moveMouseTo(
            options?.window ?? targetWindow,
            elem,
            options?.moveDuration || 200
        );
        await delay(options?.clickPause || 200);
        osControls.mouseClick('left');
    }
}
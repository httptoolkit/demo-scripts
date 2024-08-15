import { AndroidSession } from '../setup/android.js';
import { Dimensions } from '../setup/browser.js';

const uiSelector = (selector: string) => `new UiSelector().${selector}`;

export abstract class By {

    static text(text: string) {
        return uiSelector(`text("${text}")`);
    }

    static contentDescription(description: string) {
        return uiSelector(`description("${description}")`);
    }

    static widgetChain(...widgetTypes: string[]) {
        return [
            uiSelector(`className("${widgetTypes[0]}")`),
            widgetTypes.slice(1).map((type) =>
                `childSelector(${uiSelector(`className("${type}")`)})`
            )
        ].join('.');
    }

}

export class AndroidDevice {
    constructor(
        private session: AndroidSession
    ) {}

    getScreenSize() {
        return this.session.getWindowSize();
    }

    async getElementDimensions(elem: WebdriverIO.Element): Promise<Dimensions> {
        const [position, size] = await Promise.all([
            elem.getLocation(),
            elem.getSize()
        ]);

        return {
            ...position,
            ...size
        };
    }

    async pressHomeButton() {
        await this.session.pressKeyCode(3);
    }

    async touchMove(
        from: { x: number, y: number },
        to: { x: number, y: number },
        options: { duration?: number } = {}
    ) {
        await this.session.action('pointer', { parameters: { pointerType: 'touch' } })
            .move(from)
            .down()
            .move({ ...to, duration: options.duration })
            .up()
            .perform();
    }

    async get(selector: string) {
        return this.session.$(`android=${selector}`);
    }

    async getAll(selector: string) {
        return this.session.$$(`android=${selector}`);
    }

    async getWithin(parent: WebdriverIO.Element, selector: string) {
        return parent.$(`android=${selector}`);
    }

}
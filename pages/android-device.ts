import { AndroidSession } from '../setup/android.js';

const uiSelector = (selector: string) => `android=new UiSelector().${selector}`;

export class AndroidDevice {
    constructor(
        private session: AndroidSession
    ) {}

    async pressHomeButton() {
        await this.session.pressKeyCode(3);
    }

    async getByText(text: string) {
        return this.session.$(uiSelector(`text("${text}")`));
    }

}
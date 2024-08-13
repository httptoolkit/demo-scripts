import { Page } from "playwright";

import { Editor } from "./editor-element.js";

export class SendPage {

    constructor(
        private page: Page
    ) {}

    getUrlInput() {
        return this.page.locator('input[type="url"]');
    }

    getSendButton() {
        return this.page.getByRole('button', { name: 'Send this request' });
    }

    getResponseHeadersTitle() {
        return this.page.getByRole('heading', { name: 'Response headers' });
    }

    getResponseBodyEditor() {
        return new Editor(
            this.page.locator('section[aria-label="Response Body section"] .monaco-editor')
        );
    }

}
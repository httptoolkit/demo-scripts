import { Locator, Page } from "playwright";

import { Editor } from "./editor-element.js";

type CardName =
    | 'Request'
    | 'Response'
    | 'Request Body'
    | 'Response Body'
    | 'Web Socket Messages';

export class ViewPage {

    constructor(
        private page: Page
    ) {}

    // N.b. 1-indexed
    getRowByIndex(index: number) {
        return this.page.locator(`[role=table] [aria-rowindex="${index}"]`);
    }

    getRows(hostname: string) {
        return this.page.locator(`[role=row]:has(div:nth-child(6)[title='${hostname}'])`);
    }

    getFilterBox() {
        return this.page.getByLabel('filter the requests');
    }

    getCard(name: CardName) {
        return new Card(this.page.locator(`section[aria-label="${name} section"]`));
    }

    getCreateRuleButton() {
        return this.page.getByTitle("Create a modify rule");
    }

    getResendButton() {
        return this.page.getByTitle("Resend");
    }

    getResumeButton() {
        return this.page.getByRole('button', { name: 'Resume' });
    }

}

class Card {

    constructor(
        private card: Locator
    ) {}

    getTitle() {
        return this.card.locator('header > h1');
    }

    getExpandButton() {
        return this.card.getByTitle('Expand this area');
    }

    getShrinkButton() {
        return this.card.getByTitle('Shrink this area');
    }

    getFormatButton() {
        return this.card.getByTitle('Format as');
    }

    getEditor() {
        return new Editor(this.card.locator('.monaco-editor'));
    }

    getExpandableSections() {
        return this.card.locator("> div > section header");
    }

    getMessageRowByIndex(index: number) {
        return this.card.getByRole('row').nth(index);
    }

}


import { Locator } from "playwright";

export class Editor {

    constructor(
        private editor: Locator
    ) {}

    getFoldButtons() {
        return this.editor.locator(':is(.codicon-folding-expanded, .codicon-folding-collapsed)');
    }

    getEditArea() {
        return this.editor.locator('.monaco-scrollable-element').first();
    }

    getNextMatchButton() {
        return this.editor.getByLabel('Next Match').first();
    }

    getEditorChunk(text: string) {
        return this.editor.getByText(text);
    }

}
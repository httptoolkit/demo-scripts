import { Locator, Page } from "playwright";

export class ModifyPage {

    constructor(
        private page: Page
    ) {}

    getNewRuleButton() {
        return this.page.getByRole('button', { name: 'Add a new rule' }).first();
    }

    async getRules() {
        const ruleLocators = await this.page.locator(
            '[data-rbd-droppable-id="modify-rule-list"] > section[data-rbd-draggable-context-id]'
        ).all();

        return ruleLocators.map((rule) => new Rule(rule));
    }

}

class Rule {

    constructor(
        private rule: Locator
    ) {}

    get matcherSection() {
        return this.rule.locator('section').first();
    }

    getBaseMatcherDropdown() {
        return this.matcherSection.getByLabel('Select the base matcher');
    }

    getAdditionalMatcherDropdown() {
        return this.matcherSection.getByLabel('Select another type of matcher');
    }

    getAdditionalMatcherInput() {
        return this.matcherSection.locator('ul > li:last-child input');
    }

    getAdditionalMatcherAddButton() {
        return this.matcherSection.locator('ul > li:last-child > button');
    }

    get handlerSection() {
        return this.rule.locator('section').last();
    }

    getBaseHandlerDropdown() {
        return this.handlerSection.getByLabel('Select how matching requests should be handled');
    }

    getSaveButton() {
        return this.rule.getByTitle('Save changes');
    }

    getRenameButton() {
        return this.rule.getByTitle('Give this rule a custom name');
    }

    getHandlerInputs() {
        return this.handlerSection.locator('input');
    }

    getHandlerButton(text: string) {
        return this.handlerSection.getByRole('button', { name: text });
    }

}
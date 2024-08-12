import { Page } from "playwright";

export class InterceptPage {

    constructor(
        private page: Page
    ) {}

    getInterceptorFilterInput() {
        return this.page.getByLabel('Filter the list of intercept options').first();
    }

    getInterceptorButton(name: string) {
        return this.page.getByRole('button', { name: name })
            // Match the heading specifically:
            .filter({ has: this.page.getByRole('heading', { name, exact: true }) })
            .first();
    }

}
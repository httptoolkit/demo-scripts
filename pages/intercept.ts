import { Page } from "playwright";

export class InterceptPage {

    constructor(
        private page: Page
    ) {}

    getInterceptorButton(name: string) {
        return this.page.getByRole('button', { name: name })
            // Match the heading specifically:
            .filter({ has: this.page.getByRole('heading', { name, exact: true }) })
            .first();
    }

}
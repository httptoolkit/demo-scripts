import { Page } from "playwright";

export class InterceptPage {

    constructor(
        private page: Page
    ) {}

    clickInterceptor(name: string) {
        this.page.getByRole('button', { name: name }).click();
    }

}
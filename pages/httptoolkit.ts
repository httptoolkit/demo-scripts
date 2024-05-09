import { delay } from "@httptoolkit/util";
import {
    Page,
    Locator
} from "playwright";

import { InterceptPage } from "./intercept";
import { ViewPage } from "./view";
import { ModifyPage } from "./modify";
import { SendPage } from "./send";
import { SettingsPage } from "./settings";

const PAGES = {
    intercept: {
        link: 'Intercept',
        pageRoot: '/intercept',
        PageClass: InterceptPage
    },
    view: {
        link: 'View',
        pageRoot: '/view',
        PageClass: ViewPage
    },
    modify: {
        link: 'Modify',
        pageRoot: '/modify',
        PageClass: ModifyPage
    },
    send: {
        link: 'Send',
        pageRoot: '/send',
        PageClass: SendPage
    },
    settings: {
        link: 'Settings',
        pageRoot: '/settings',
        PageClass: SettingsPage
    }
};

type PageId = keyof typeof PAGES;

export class HttpToolkit {
    constructor(
        private page: Page
    ) {}

    get url() {
        return new URL(this.page.url());
    }

    async isLoaded() {
        let loadingBar: Locator;
        console.log('Waiting for page to load...');
        do {
            await delay(50);
            loadingBar = this.page.locator("#app-loading-placeholder");
        } while (await loadingBar.isVisible());

        console.log('HTTP Toolkit ready');
    }

    async goTo<P extends PageId>(pageId: P): Promise<InstanceType<typeof PAGES[P]['PageClass']>> {
        const page = PAGES[pageId];
        if (!this.url.pathname.startsWith(page.pageRoot)) {
            console.log(`Navigating to ${pageId} page`);
            await this.page.getByRole('link', { name: PAGES[pageId].link }).click();
        }

        return new page.PageClass(this.page) as InstanceType<typeof PAGES[P]['PageClass']>;
    }
}
import { delay } from '@httptoolkit/util';

import { runDemo } from './setup';
import { HttpToolkit } from './pages/httptoolkit';

await runDemo("http://localhost:8080", async (page) => {
    const htk = new HttpToolkit(page);
    await htk.isLoaded();

    await delay(500);

    const interceptPage = await htk.goTo('intercept');
    await interceptPage.clickInterceptor('Fresh Terminal');

    await delay(5000);
});
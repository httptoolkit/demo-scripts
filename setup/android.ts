import * as zx from 'zx';
import appium from 'appium';
import { remote as webdriverRemote } from 'webdriverio';
import { delay } from '@httptoolkit/util';

let server: Awaited<ReturnType<typeof appium.main>> | undefined;

export async function startAppium() {
    server = await appium.main({
        port: 4723,
        address: 'localhost',
        loglevel: 'warn'
    });
}

export async function stopAppium() {
    server!.closeAllConnections();
    server!.close();
    server!.unref();
}

export type AndroidSession = WebdriverIO.Browser;

export function getAppiumSession(): Promise<AndroidSession> {
    return webdriverRemote({
        protocol: 'http',
        hostname: 'localhost',
        port: 4723,
        path: "/",
        capabilities: {
            platformName: "android",
            "appium:automationName": "uiautomator2",
            "appium:noReset": true,
            "appium:fullReset": false,
            // Don't stop the session after 60 seconds:
            "appium:newCommandTimeout": 999999,
        }
    });
}
let pendingRecording: zx.ProcessPromise | undefined;

export async function startAndroidRecording() {
    await zx.$`adb shell rm /data/local/tmp/video.mp4`.catch((e) => console.log(e.message));
    pendingRecording = zx.$`adb shell screenrecord --time-limit 0 /data/local/tmp/video.mp4`;
    await delay(250); // There's a brief pause before recording starts
}

export async function stopAndroidRecording() {
    await zx.$`adb shell killall -SIGINT screenrecord`;
    await pendingRecording?.catch(() => {});
    console.log('Android recording stopped');
    await zx.$`adb pull /data/local/tmp/video.mp4 ./android-device-${new Date().toISOString().replace(/:/g, '-')}.mp4`;
}

export async function setAndroidDarkMode(state: boolean | undefined) {
    if (state === undefined) return;
    await zx.$`adb shell cmd uimode night ${state ? 'yes' : 'no'}`;
}

export async function resetApp(appPkgName: string) {
    await zx.$`adb shell su -c pm clear --cache-only ${appPkgName}`;
    await zx.$`adb shell am force-stop ${appPkgName}`;
}

export async function disconnectVpn() {
    await zx.$`adb shell am start --activity-single-top tech.httptoolkit.android.v1/tech.httptoolkit.android.MainActivity`;
    await zx.$`adb shell am start -a tech.httptoolkit.android.DEACTIVATE`;
}
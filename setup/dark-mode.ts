// Note that both of these only work on Mac!

const getExpectedMode = () => process.env.DARK_MODE
    ? process.env.DARK_MODE === 'true'
    : undefined;

export async function setDarkMode() {
    const state = getExpectedMode();
    if (state === undefined) return; // Use existing system state

    const darkMode = (await import('dark-mode' as any)).default; // annoyingly untyped module
    await darkMode.toggle(state);
}

export async function getDarkModeState(): Promise<boolean | undefined> {
    const state = getExpectedMode();
    if (state === undefined) return; // Use existing system state - don't check it (for non Macs)

    const darkMode = (await import('dark-mode' as any)).default; // annoyingly untyped module
    return await darkMode.isEnabled();
}
import { BackgroundEventNames } from '../eventnames'

export async function callMethod(
    eventType: keyof typeof BackgroundEventNames,
    methodName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    const browser = (await import('webextension-polyfill')).default
    const callPromise = (async () => {
        const resp = (await browser.runtime.sendMessage({
            type: BackgroundEventNames[eventType],
            method: methodName,
            args: args,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as { result?: any; error?: string } | undefined
        if (resp?.error) {
            throw new Error(resp.error)
        }
        return resp?.result
    })()

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Background service call [${eventType}.${methodName}] timed out`)), 5000)
    )

    return Promise.race([callPromise, timeoutPromise])
}

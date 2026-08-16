import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, Page } from '@playwright/test'
import { popupThumbID } from '../src/browser-extension/content_script/consts'

// package.json is `"type": "module"`, so there is no `__dirname` here.
export const e2eDir = path.dirname(fileURLToPath(import.meta.url))

export const testPageUrl = `file:${path.join(e2eDir, 'test.html')}`

export function getOptionsPageUrl(extensionId: string) {
    return `chrome-extension://${extensionId}/src/browser-extension/options/index.html`
}

export function getPopupPageUrl(extensionId: string) {
    return `chrome-extension://${extensionId}/src/browser-extension/popup/index.html`
}

export async function selectExampleText(page: Page) {
    const textLocator = page.getByTestId('example-text')
    // The content script registers its `mouseup` listener from an async bootstrap, so a drag that
    // starts right after `goto` can finish before anything is listening and be dropped silently.
    // Retry until the popup thumb shows up, collapsing the selection first: dragging across text
    // that is already selected does not select anything anew, so a retry would never recover.
    // Waiting on the container rather than the thumb would not work either -- `getContainer()`
    // appends an empty one as a side effect of merely querying it.
    await expect(async () => {
        await page.mouse.click(400, 400)
        const boundingBox = await textLocator.boundingBox()
        if (boundingBox) {
            // select text
            await page.mouse.move(boundingBox.x, boundingBox.y)
            await page.mouse.down()
            await page.mouse.move(boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height)
            await page.mouse.up()
        }
        await expect(page.locator(`#${popupThumbID}`)).toBeVisible({ timeout: 3000 })
    }).toPass({ timeout: 30000 })
}

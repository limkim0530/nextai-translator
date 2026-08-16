import { expect, test } from './fixtures'
import { getOptionsPageUrl, getPopupPageUrl, selectExampleText, testPageUrl } from './common'
import {
    containerID,
    popupThumbID,
    popupCardID,
    popupCardInnerContainerId,
} from '../src/browser-extension/content_script/consts'

test('popup card should be visible', async ({ page }) => {
    await page.goto(testPageUrl)
    await selectExampleText(page)

    const container = page.locator(`#${containerID}`)
    const thumb = container.locator(`#${popupThumbID}`)
    await expect(thumb).toBeVisible()
    await thumb.click()
    const popupCard = container.locator(`#${popupCardID}`)
    await expect(popupCard).toBeAttached()
    await expect(page.locator(`#${popupCardInnerContainerId}`)).toBeVisible()
})

test('popup page should be opened', async ({ page, extensionId }) => {
    await page.goto(getPopupPageUrl(extensionId))
    await expect(page.getByTestId('popup-container')).toBeVisible()
})

test('options page should be opened', async ({ page, extensionId }) => {
    await page.goto(getOptionsPageUrl(extensionId))
    await expect(page.getByTestId('settings-container')).toBeVisible()
})

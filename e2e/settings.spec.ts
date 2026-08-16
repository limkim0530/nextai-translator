import { expect, test } from './fixtures'
import { selectExampleText, testPageUrl } from './common'
import { containerID, popupThumbID } from '../src/browser-extension/content_script/consts'

test.describe('popup card settings', () => {
    test('scrolls itself instead of the host page', async ({ page }) => {
        await page.goto(testPageUrl)
        // The host page has to be scrollable, otherwise a wheel event that leaks
        // out of the card looks exactly like one the card swallowed.
        await page.addStyleTag({ content: 'body { height: 5000px }' })
        await selectExampleText(page)
        await page.locator(`#${containerID} #${popupThumbID}`).click()

        await page.getByTestId('settings-toggle-btn').click()
        const settings = page.getByTestId('settings-container')
        await expect(settings).toBeVisible()

        // The settings pane is far taller than the card, so it must overflow.
        const overflows = await settings.evaluate((el) => el.scrollHeight - el.clientHeight)
        expect(overflows).toBeGreaterThan(0)

        const box = await settings.boundingBox()
        expect(box).not.toBeNull()
        await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
        await page.mouse.wheel(0, 400)

        await expect.poll(() => settings.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
        expect(await page.evaluate(() => window.scrollY)).toBe(0)
    })
})

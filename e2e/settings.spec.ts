import { expect, test } from './fixtures'
import { selectExampleText, testPageUrl } from './common'
import { containerID, popupThumbID } from '../src/browser-extension/content_script/consts'

test.describe('popup card settings', () => {
    test('opens options page in a new tab', async ({ page, context }) => {
        await page.goto(testPageUrl)
        await selectExampleText(page)
        await page.locator(`#${containerID} #${popupThumbID}`).click()

        const pagePromise = context.waitForEvent('page')
        await page.getByTestId('settings-toggle-btn').click()
        const optionsPage = await pagePromise
        await expect(optionsPage.getByTestId('settings-container')).toBeVisible()
    })
})

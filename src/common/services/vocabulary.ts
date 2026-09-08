import { backgroundVocabularyService } from '../background/services/vocabulary'
import { IVocabularyInternalService, vocabularyInternalService } from '../internal-services/vocabulary'
import { isDesktopApp, isUserscript } from '../utils'

const canUseBackgroundService = (): boolean => {
    if (isDesktopApp() || isUserscript()) {
        return false
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof chrome !== 'undefined' && Boolean((chrome as any)?.runtime?.sendMessage)
}

const getService = (): IVocabularyInternalService =>
    canUseBackgroundService() ? backgroundVocabularyService : vocabularyInternalService

export const vocabularyService: IVocabularyInternalService = {
    putItem(item) {
        return getService().putItem(item)
    },
    getItem(word) {
        return getService().getItem(word)
    },
    deleteItem(word) {
        return getService().deleteItem(word)
    },
    countItems() {
        return getService().countItems()
    },
    listItems() {
        return getService().listItems()
    },
    listRandomItems(limit) {
        return getService().listRandomItems(limit)
    },
    listFrequencyItems(limit) {
        return getService().listFrequencyItems(limit)
    },
    isCollected(word) {
        return getService().isCollected(word)
    },
}

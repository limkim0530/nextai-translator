import { IVocabularyInternalService } from '../internal-services/vocabulary'
import { IHistoryInternalService } from '../internal-services/history'
import { ISnapshotInternalService } from '../internal-services/snapshot'

export const BackgroundEventNames = {
    fetch: 'fetch',
    vocabularyService: 'vocabularyService',
    actionService: 'actionService',
    historyService: 'historyService',
    snapshotService: 'snapshotService',
}

export type BackgroundVocabularyServiceMethodNames = keyof IVocabularyInternalService
export type BackgroundHistoryServiceMethodNames = keyof IHistoryInternalService
export type BackgroundSnapshotServiceMethodNames = keyof ISnapshotInternalService

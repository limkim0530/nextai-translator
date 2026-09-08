import { useEffect } from 'react'
import { vocabularyService } from '../services/vocabulary'
import { useAppStore } from '../store'

export function useCollectedWordTotal() {
    const collectedWordTotal = useAppStore((state) => state.collectedWordTotal)
    const setCollectedWordTotal = useAppStore((state) => state.setCollectedWordTotal)

    useEffect(() => {
        vocabularyService.countItems().then(setCollectedWordTotal)
    }, [setCollectedWordTotal])

    return { collectedWordTotal, setCollectedWordTotal }
}

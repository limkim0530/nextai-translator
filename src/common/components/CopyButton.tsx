import { Tooltip } from './Tooltip'
import { RxCopy } from 'react-icons/rx'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast/headless'

export function CopyButton({ text, styles }: { text: string; styles: { actionButton: string } }) {
    const { t } = useTranslation()
    return (
        <Tooltip content={t('Copy to clipboard')} placement='bottom'>
            <div
                className={styles.actionButton}
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(text)
                        toast(t('Copy to clipboard'), {
                            duration: 3000,
                            icon: '👏',
                        })
                    } catch (error) {
                        console.error(error)
                        toast(t('Copy failed'), {
                            duration: 3000,
                        })
                    }
                }}
            >
                <RxCopy size={13} />
            </div>
        </Tooltip>
    )
}

import { useActions, ACTIONS_SWR_KEY } from '../hooks/useActions'
import { mutate } from 'swr'
import icon from '../assets/images/icon.png'
import { actionService } from '../services/action'
import { FiEdit } from 'react-icons/fi'
import { createUseStyles } from '@/common/styles'
import { IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Button, List, arrayMove, Modal, ModalHeader, ModalBody, ModalFooter, ModalButton, Skeleton } from './ui'
import { RiDeleteBinLine } from 'react-icons/ri'
import { IoMdAdd } from 'react-icons/io'
import { createElement, useCallback, useReducer, useState } from 'react'
import * as mdIcons from 'react-icons/md'
import { Action } from '../internal-services/db'
import { ActionForm } from './ActionForm'
import { IconType } from 'react-icons'
import { isDesktopApp, getAssetUrl } from '../utils'
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md'
import { useSettings } from '../hooks/useSettings'
import { getProviderLabel } from '../providers'
import { emit } from '@tauri-apps/api/event'

interface IActionManagerStyleProps extends IThemedStyleProps {
    embedded?: boolean
}

const useStyles = createUseStyles({
    root: (props: IActionManagerStyleProps) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: props.embedded ? 0 : isDesktopApp() ? '40px 20px 20px 20px' : 0,
        boxSizing: 'border-box',
        width: props.embedded ? '100%' : isDesktopApp() ? '100%' : '600px',
    }),
    header: (props: IActionManagerStyleProps) => ({
        width: '100%',
        color: props.theme.colors.contentPrimary,
        padding: props.embedded ? '0 0 16px 0' : isDesktopApp() ? '40px 24px 20px 24px' : 20,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        position: props.embedded ? 'static' : isDesktopApp() ? 'fixed' : 'block',
        backdropFilter: props.embedded ? 'none' : 'blur(20px)',
        WebkitBackdropFilter: props.embedded ? 'none' : 'blur(20px)',
        zIndex: 1,
        left: 0,
        top: 0,
        background: props.embedded
            ? 'transparent'
            : props.themeType === 'dark'
              ? 'rgba(31, 31, 31, 0.65)'
              : 'rgba(255, 255, 255, 0.65)',
        flexFlow: 'row nowrap',
        cursor: props.embedded ? 'default' : 'move',
        borderBottom: props.embedded
            ? `1px solid ${props.theme.colors.borderOpaque}`
            : `1px solid ${props.themeType === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        transition: 'background 0.3s ease',
    }),
    iconContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
        marginRight: 'auto',
        lineHeight: 1,
    },
    icon: {
        'display': 'block',
        'width': '16px',
        'height': '16px',
        '-ms-user-select': 'none',
        '-webkit-user-select': 'none',
        'user-select': 'none',
    },
    iconText: (props: IThemedStyleProps) => ({
        'color': props.themeType === 'dark' ? props.theme.colors.contentSecondary : props.theme.colors.contentPrimary,
        'fontSize': '14px',
        'fontWeight': 600,
        'cursor': 'unset',
        'lineHeight': 1,
        'display': 'inline-flex',
        'alignItems': 'center',
        '@media screen and (max-width: 570px)': {
            display: props.isDesktopApp ? 'none' : undefined,
        },
    }),
    operationList: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionList: (props: IActionManagerStyleProps) => ({
        paddingTop: props.embedded ? 12 : isDesktopApp() ? 70 : 0,
        width: '100%',
    }),
    actionItem: (props: IActionManagerStyleProps) => ({
        'width': '100%',
        'padding': '10px 14px',
        'display': 'flex',
        'flexDirection': 'row',
        'alignItems': 'center',
        'gap': '14px',
        'borderRadius': '6px',
        'transition': 'background 0.2s ease',
        '&:hover': {
            backgroundColor: props.themeType === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
        },
        '&:hover $actionOperation': {
            opacity: 1,
        },
    }),
    actionContent: () => ({
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        width: '100%',
        overflow: 'hidden',
    }),
    actionOperation: {
        flexShrink: 0,
        display: 'flex',
        opacity: 0.85,
        transition: 'opacity 0.2s ease',
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        gap: 6,
    },
    name: {
        fontSize: '16px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        lineHeight: 1,
    },
    prompts: (props: IThemedStyleProps) => ({
        'color': props.theme.colors.contentSecondary,
        'fontSize': '12px',
        'display': 'flex',
        'flexDirection': 'column',
        'gap': '3px',
        '& > div': {
            'display': '-webkit-box',
            'overflow': 'hidden',
            'lineHeight': '1.5',
            'maxWidth': '400px',
            'textOverflow': 'ellipsis',
            '-webkit-line-clamp': 2,
            '-webkit-box-orient': 'vertical',
        },
    }),
    metadata: (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentSecondary,
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '6px',
    }),
})

export interface IActionManagerProps {
    draggable?: boolean
    embedded?: boolean
}

export function ActionManager({ draggable = true, embedded = false }: IActionManagerProps) {
    const [refreshActionsFlag, changeRefreshActionsFlag] = useReducer((x: number) => x + 1, 0)
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType, isDesktopApp: isDesktopApp(), embedded })
    const actions = useActions(refreshActionsFlag)
    const [showActionForm, setShowActionForm] = useState(false)
    const [updatingAction, setUpdatingAction] = useState<Action>()
    const [deletingAction, setDeletingAction] = useState<Action>()
    const { settings } = useSettings()

    const refreshActions = useCallback(() => {
        if (!isDesktopApp()) {
            changeRefreshActionsFlag()
            return
        }
        emit('refresh-actions', {})
    }, [])

    const handleReorder = useCallback(
        async (reordered: Action[]) => {
            const updated = reordered.map((a, idx) => ({
                ...a,
                idx,
            }))
            void mutate(ACTIONS_SWR_KEY, updated, false)
            try {
                await actionService.bulkPut(updated)
            } catch (err) {
                console.error('Failed to save reordered actions:', err)
            } finally {
                refreshActions()
            }
        },
        [refreshActions]
    )

    return (
        <div
            className={styles.root}
            style={{
                width: embedded ? '100%' : !draggable ? '800px' : undefined,
            }}
        >
            <div
                className={styles.header}
                data-tauri-drag-region={!embedded ? '' : undefined}
                style={{
                    backgroundColor: settings.enableBackgroundBlur && !embedded ? 'transparent' : undefined,
                }}
            >
                <div className={styles.iconContainer}>
                    {!embedded && (
                        <img data-tauri-drag-region className={styles.icon} src={getAssetUrl(icon)} alt='icon' />
                    )}
                    <div className={styles.iconText}>
                        {embedded
                            ? `${t('All Actions')}${actions !== undefined ? ` (${actions.length})` : ''}`
                            : t('Action Manager')}
                    </div>
                </div>
                <div
                    style={{
                        marginRight: 'auto',
                    }}
                />
                <div className={styles.operationList}>
                    <Button
                        type='button'
                        size='mini'
                        startEnhancer={<IoMdAdd size={14} />}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setUpdatingAction(undefined)
                            setShowActionForm(true)
                        }}
                    >
                        {t('Create')}
                    </Button>
                </div>
            </div>
            <div className={styles.actionList}>
                {actions === undefined ? (
                    <div style={{ padding: '20px 14px' }}>
                        <Skeleton rows={4} height='160px' width='100%' animation />
                    </div>
                ) : actions.length === 0 ? (
                    <div
                        style={{
                            padding: '40px 14px',
                            textAlign: 'center',
                            color: theme.colors.contentSecondary,
                        }}
                    >
                        {t('No actions')}
                    </div>
                ) : (
                    <List
                        overrides={{
                            Item: {
                                style: {
                                    backgroundColor: 'transparent',
                                    // backgroundColor: color(theme.colors.backgroundPrimary).alpha(0.9).lighten(0.8).string(),
                                },
                            },
                        }}
                        onChange={async ({ oldIndex, newIndex }) => {
                            if (!actions) return
                            const newActions = arrayMove(actions, oldIndex, newIndex)
                            await handleReorder(newActions)
                        }}
                        items={actions?.map((action, idx) => {
                            const createdAtTime = +action?.createdAt
                            const displayTime =
                                !isNaN(createdAtTime) && createdAtTime > 0
                                    ? format(createdAtTime, 'yyyy-MM-dd HH:mm:ss')
                                    : format(new Date(), 'yyyy-MM-dd HH:mm:ss')

                            return (
                                <div key={action.id} className={styles.actionItem}>
                                    <div className={styles.actionContent}>
                                        <div className={styles.name}>
                                            {action.icon && (mdIcons as Record<string, IconType>)[action.icon] && (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        lineHeight: 1,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {createElement((mdIcons as Record<string, IconType>)[action.icon], {
                                                        size: 16,
                                                    })}
                                                </span>
                                            )}
                                            <span
                                                style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
                                            >
                                                {action.mode ? t(action.name) : action.name}
                                            </span>
                                            {action.mode && (
                                                <div
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        fontSize: '12px',
                                                        lineHeight: 1,
                                                        background: theme.colors.backgroundTertiary,
                                                        padding: '2px 4px',
                                                        borderRadius: '2px',
                                                    }}
                                                >
                                                    {t('built-in')}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.prompts}>
                                            <div>{action.rolePrompt}</div>
                                            <div>{action.commandPrompt}</div>
                                        </div>
                                        {action.providerId && (
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    background: theme.colors.backgroundTertiary,
                                                    padding: '1px 6px',
                                                    borderRadius: '6px',
                                                    marginTop: '2px',
                                                    color: theme.colors.contentSecondary,
                                                }}
                                            >
                                                {settings
                                                    ? (getProviderLabel(settings, action.providerId) ??
                                                      t('Deleted provider'))
                                                    : action.providerId}
                                                {action.apiModel && ` / ${action.apiModel}`}
                                            </div>
                                        )}
                                        <div className={styles.metadata}>
                                            <div>
                                                {t('Created at')} {displayTime}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.actionOperation}>
                                        <Button
                                            type='button'
                                            size='mini'
                                            kind='tertiary'
                                            disabled={idx === 0}
                                            onClick={async (e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                const newActions = arrayMove(actions, idx, idx - 1)
                                                await handleReorder(newActions)
                                            }}
                                        >
                                            <MdArrowUpward size={12} />
                                        </Button>
                                        <Button
                                            type='button'
                                            size='mini'
                                            kind='tertiary'
                                            disabled={idx === actions.length - 1}
                                            onClick={async (e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                const newActions = arrayMove(actions, idx, idx + 1)
                                                await handleReorder(newActions)
                                            }}
                                        >
                                            <MdArrowDownward size={12} />
                                        </Button>
                                        <Button
                                            type='button'
                                            size='mini'
                                            startEnhancer={<FiEdit size={12} />}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setUpdatingAction(action)
                                                setShowActionForm(true)
                                            }}
                                        >
                                            {t('Update')}
                                        </Button>
                                        <Button
                                            type='button'
                                            size='mini'
                                            startEnhancer={<RiDeleteBinLine size={12} />}
                                            disabled={!!action.mode}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setDeletingAction(action)
                                            }}
                                        >
                                            {t('Delete')}
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    />
                )}
            </div>
            <Modal
                isOpen={showActionForm}
                onClose={() => {
                    setShowActionForm(false)
                    setUpdatingAction(undefined)
                }}
                closeable
                size='default'
                autoFocus
                animate
                role='dialog'
                overrides={{
                    Dialog: {
                        style: {
                            width: '560px',
                            maxWidth: '90vw',
                        },
                    },
                }}
            >
                <ModalHeader>
                    {updatingAction
                        ? `${t('Update sth', [t('Action')])} - ${updatingAction.mode ? t(updatingAction.name) : updatingAction.name}`
                        : t('Create sth', [t('Action')])}
                </ModalHeader>
                <ModalBody>
                    <ActionForm
                        action={updatingAction}
                        onSubmit={() => {
                            setShowActionForm(false)
                            refreshActions()
                        }}
                    />
                </ModalBody>
            </Modal>
            <Modal
                isOpen={!!deletingAction}
                onClose={() => {
                    setDeletingAction(undefined)
                }}
                closeable
                size='default'
                autoFocus
                animate
                role='dialog'
                overrides={{
                    Dialog: {
                        style: {
                            width: '480px',
                            maxWidth: '90vw',
                        },
                    },
                }}
            >
                <ModalHeader>{t('Delete sth', [t('Action')])}</ModalHeader>
                <ModalBody>{t('Are you sure to delete sth?', [`${t('Action')} ${deletingAction?.name}`])}</ModalBody>
                <ModalFooter>
                    <ModalButton
                        size='compact'
                        kind='tertiary'
                        onClick={() => {
                            setDeletingAction(undefined)
                        }}
                    >
                        {t('Cancel')}
                    </ModalButton>
                    <ModalButton
                        size='compact'
                        onClick={async () => {
                            await actionService.delete(deletingAction?.id as number)
                            refreshActions()
                            setDeletingAction(undefined)
                        }}
                    >
                        {t('Ok')}
                    </ModalButton>
                </ModalFooter>
            </Modal>
        </div>
    )
}

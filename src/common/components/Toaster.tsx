import toastHeadless, {
    resolveValue,
    useToaster,
    type ToastOptions,
    type Toast,
    type Renderable,
    type ValueOrFunction,
} from 'react-hot-toast/headless'
import { createUseStyles } from '@/common/styles'
import clsx from 'clsx'
import { IoWarning, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5'
import { useTheme } from '../hooks/useTheme'
import { TTSDownloadNotifier } from './TTSDownloadNotifier'

const useStyles = createUseStyles({
    'rootContainer': {
        pointerEvents: 'none',
        zIndex: 2147483647,
        position: 'fixed',
        inset: '16px',
    },
    'container': {
        left: '0px',
        right: '0px',
        top: '0px',
        position: 'absolute',
        transition: 'all 230ms cubic-bezier(0.21, 1.02, 0.73, 1)',
        justifyContent: 'center',
        display: 'flex',
    },
    '@keyframes enter': {
        '0%': { transform: 'translate3d(0,-100%,0) scale(.6)', opacity: '.5' },
        '100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '1' },
    },
    '@keyframes exit': {
        '0%': { transform: 'translate3d(0,0,-1px) scale(1)', opacity: '1' },
        '100%': { transform: 'translate3d(0,-100%,-1px) scale(.6)', opacity: '0' },
    },
    '@keyframes icon-anim': {
        '0%': {
            transform: 'scale(0.6)',
            opacity: '0.4',
        },
        '100%': {
            transform: 'scale(1)',
            opacity: 1,
        },
    },
    'innerContainer': {
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        lineHeight: 1.45,
        willChange: 'transform',
        maxWidth: '480px',
        pointerEvents: 'auto',
        padding: '12px 18px',
        borderRadius: '12px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        fontSize: '13px',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        border: '1px solid transparent',
        transition: 'all 0.2s cubic-bezier(0.21, 1.02, 0.73, 1)',
    },
    'variantDefault': {
        background: 'rgba(255, 255, 255, 0.94)',
        color: '#1a1a1a',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.04)',
    },
    'variantDefaultDark': {
        background: 'rgba(30, 30, 30, 0.94)',
        color: '#f3f4f6',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    },
    'variantWarning': {
        background: 'rgba(254, 243, 199, 0.96)',
        color: '#92400e',
        borderColor: 'rgba(245, 158, 11, 0.45)',
        boxShadow: '0 6px 24px rgba(217, 119, 6, 0.18), 0 2px 6px rgba(0, 0, 0, 0.04)',
    },
    'variantWarningDark': {
        background: 'rgba(50, 28, 5, 0.96)',
        color: '#fef3c7',
        borderColor: 'rgba(245, 158, 11, 0.5)',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(245, 158, 11, 0.3)',
    },
    'variantError': {
        background: 'rgba(254, 226, 226, 0.96)',
        color: '#991b1b',
        borderColor: 'rgba(239, 68, 68, 0.45)',
        boxShadow: '0 6px 24px rgba(220, 38, 38, 0.18), 0 2px 6px rgba(0, 0, 0, 0.04)',
    },
    'variantErrorDark': {
        background: 'rgba(50, 10, 10, 0.96)',
        color: '#fee2e2',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(239, 68, 68, 0.3)',
    },
    'variantSuccess': {
        background: 'rgba(220, 252, 231, 0.96)',
        color: '#166534',
        borderColor: 'rgba(34, 197, 94, 0.45)',
        boxShadow: '0 6px 24px rgba(22, 163, 74, 0.18), 0 2px 6px rgba(0, 0, 0, 0.04)',
    },
    'variantSuccessDark': {
        background: 'rgba(6, 40, 20, 0.96)',
        color: '#dcfce7',
        borderColor: 'rgba(34, 197, 94, 0.5)',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(34, 197, 94, 0.3)',
    },
    'enterAnimation': {
        animation: '$enter 0.35s cubic-bezier(.21,1.02,.73,1) forwards',
    },
    'exitAnimation': {
        animation: '$exit 0.4s forwards cubic-bezier(.06,.71,.55,1)',
    },
    'icon': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginRight: '10px',
        animation: '$icon-anim 0.3s 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
    },
    'message': {
        display: 'flex',
        alignItems: 'center',
        margin: '0',
        color: 'inherit',
        fontWeight: 500,
        lineHeight: 1.45,
        flex: '1 1 auto',
        whiteSpace: 'pre-line',
        wordBreak: 'break-word',
    },
})

type Message = ValueOrFunction<Renderable, Toast>

export const toast = Object.assign(
    (message: Message, opts?: ToastOptions) => toastHeadless(message, opts),
    toastHeadless,
    {
        warning: (message: Message, opts?: ToastOptions) =>
            toastHeadless(message, {
                className: 'toast-warning',
                duration: 5000,
                ...opts,
            }),
    }
)

export default function Toaster() {
    const { toasts, handlers } = useToaster()
    const { startPause, endPause, calculateOffset, updateHeight } = handlers
    const { themeType } = useTheme()
    const isDark = themeType === 'dark'
    const styles = useStyles()

    return (
        <>
            <TTSDownloadNotifier />
            <div onMouseEnter={startPause} onMouseLeave={endPause} className={styles.rootContainer}>
                {toasts.map((toast) => {
                    const offset = calculateOffset(toast, {
                        reverseOrder: false,
                        gutter: 8,
                    })

                    const ref = (el: HTMLDivElement | null) => {
                        if (el && typeof toast.height !== 'number') {
                            const height = el.getBoundingClientRect().height
                            updateHeight(toast.id, height)
                        }
                    }

                    const isWarning = toast.className === 'toast-warning' || toast.icon === '⚠️'
                    const isError = toast.type === 'error' || toast.className === 'toast-error'
                    const isSuccess = toast.type === 'success' || toast.className === 'toast-success'

                    const variant: 'warning' | 'error' | 'success' | 'default' = isWarning
                        ? 'warning'
                        : isError
                          ? 'error'
                          : isSuccess
                            ? 'success'
                            : 'default'

                    let icon = toast.icon
                    if (!icon || icon === '⚠️' || icon === '❌' || icon === '✅') {
                        if (variant === 'warning') {
                            icon = (
                                <IoWarning size={18} color={isDark ? '#fbbf24' : '#d97706'} style={{ flexShrink: 0 }} />
                            )
                        } else if (variant === 'error') {
                            icon = (
                                <IoCloseCircle
                                    size={18}
                                    color={isDark ? '#f87171' : '#dc2626'}
                                    style={{ flexShrink: 0 }}
                                />
                            )
                        } else if (variant === 'success') {
                            icon = (
                                <IoCheckmarkCircle
                                    size={18}
                                    color={isDark ? '#4ade80' : '#16a34a'}
                                    style={{ flexShrink: 0 }}
                                />
                            )
                        }
                    }

                    const variantClass = isDark
                        ? variant === 'warning'
                            ? styles.variantWarningDark
                            : variant === 'error'
                              ? styles.variantErrorDark
                              : variant === 'success'
                                ? styles.variantSuccessDark
                                : styles.variantDefaultDark
                        : variant === 'warning'
                          ? styles.variantWarning
                          : variant === 'error'
                            ? styles.variantError
                            : variant === 'success'
                              ? styles.variantSuccess
                              : styles.variantDefault

                    return (
                        <div
                            key={toast.id}
                            ref={ref}
                            {...toast.ariaProps}
                            className={styles.container}
                            style={{ transform: `translateY(${offset}px)` }}
                        >
                            <div
                                className={clsx(styles.innerContainer, variantClass, {
                                    [styles.enterAnimation]: toast.visible,
                                    [styles.exitAnimation]: !toast.visible,
                                })}
                            >
                                {icon && <div className={styles.icon}>{icon}</div>}
                                <div className={styles.message} role='status' aria-live='polite'>
                                    {resolveValue(toast.message, toast)}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}

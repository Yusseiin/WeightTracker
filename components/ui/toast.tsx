'use client'
import { toast } from 'sonner'

export const showErrorToast = (message: string = 'Oops, there was an error processing your request.', description?: string) => {
    return toast.error(message, {
        description: description,
        position: 'top-center',
        classNames: {
            //description: "!text-muted-foreground",
        },
        style: {
            '--normal-bg':
                'light-dark(var(--destructive), color-mix(in oklab, var(--destructive) 80%, var(--background)))',
            '--normal-text': 'var(--color-white)',
            '--normal-border': 'transparent'
        } as React.CSSProperties
    })
}

export const showSuccessToast = (message: string = 'Success!', description?: string) => {
    return toast.success(message, {
        description: description,
        position: 'top-center',
        classNames: {
            description: "!text-muted-foreground",
        },
        style: {
            '--normal-bg': 'light-dark(var(--color-green-600), var(--color-green-400))',
            '--normal-text': 'var(--color-black)',
            '--normal-border': 'light-dark(var(--color-green-600), var(--color-green-400))'
        } as React.CSSProperties
    })
}

export const showInfoToast = (message: string = 'Info', description?: string) => {
    return toast.info(message, {
        description: description,
        position: 'top-center',
        classNames: {
            description: "!text-muted-foreground",
        },
        style: {
            '--normal-bg': 'light-dark(var(--color-sky-600), var(--color-sky-400))',
            '--normal-text': 'var(--color-black)',
            '--normal-border': 'light-dark(var(--color-sky-600), var(--color-sky-400))'
        } as React.CSSProperties
    })
}

export const showWarningToast = (message: string = 'Warning', description?: string) => {
    return toast.warning(message, {
        description: description,
        position: 'top-center',
        classNames: {
            description: "!--color-black)",
        },
        style: {
            '--normal-bg': 'light-dark(var(--color-amber-600), var(--color-amber-400))',
            '--normal-text': 'var(--color-black)',
            '--normal-border': 'light-dark(var(--color-amber-600), var(--color-amber-400))'
        } as React.CSSProperties
    })
}
export function oneLine(strings: TemplateStringsArray | string, ...values: unknown[]): string {
    if (typeof strings === 'string') {
        return strings.replace(/(?:\r\n|\n|\r)\s*/g, ' ').trim()
    }
    let result = ''
    for (let i = 0; i < strings.length; i++) {
        result += strings[i]
        if (i < values.length) {
            result += String(values[i])
        }
    }
    return result.replace(/(?:\r\n|\n|\r)\s*/g, ' ').trim()
}

export function oneLineTrim(strings: TemplateStringsArray | string, ...values: unknown[]): string {
    if (typeof strings === 'string') {
        return strings.replace(/(?:\r\n|\n|\r)\s*/g, '')
    }
    let result = ''
    for (let i = 0; i < strings.length; i++) {
        result += strings[i]
        if (i < values.length) {
            result += String(values[i])
        }
    }
    return result.replace(/(?:\r\n|\n|\r)\s*/g, '')
}

export function codeBlock(strings: TemplateStringsArray | string, ...values: unknown[]): string {
    let raw = ''
    if (typeof strings === 'string') {
        raw = strings
    } else {
        for (let i = 0; i < strings.length; i++) {
            raw += strings[i]
            if (i < values.length) {
                raw += String(values[i])
            }
        }
    }
    const lines = raw.split(/\r?\n/)
    if (lines.length && lines[0].trim() === '') lines.shift()
    if (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
    const indents = lines.filter((line) => line.trim().length > 0).map((line) => line.match(/^(\s*)/)?.[1].length ?? 0)
    const minIndent = indents.length ? Math.min(...indents) : 0
    return lines.map((line) => line.slice(minIndent)).join('\n')
}

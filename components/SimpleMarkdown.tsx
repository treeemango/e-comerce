import React from 'react';

type InlineToken =
    | { type: 'text'; value: string }
    | { type: 'bold'; value: string };

function tokenizeBold(text: string): InlineToken[] {
    const tokens: InlineToken[] = [];
    const re = /\*\*(.+?)\*\*/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;

        if (start > lastIndex) {
            tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
        }

        const boldText = match[1] ?? '';
        if (boldText) {
            tokens.push({ type: 'bold', value: boldText });
        }

        lastIndex = end;
    }

    if (lastIndex < text.length) {
        tokens.push({ type: 'text', value: text.slice(lastIndex) });
    }

    return tokens.length ? tokens : [{ type: 'text', value: text }];
}

function renderInline(text: string) {
    return tokenizeBold(text).map((t, idx) => {
        if (t.type === 'bold') {
            return (
                <strong key={idx} className="font-black text-slate-900 dark:text-white">
                    {t.value}
                </strong>
            );
        }
        return <React.Fragment key={idx}>{t.value}</React.Fragment>;
    });
}

function isListLine(line: string) {
    return /^\s*(-|•)\s+/.test(line);
}

function stripListMarker(line: string) {
    return line.replace(/^\s*(-|•)\s+/, '').trim();
}

export function SimpleMarkdown({ text }: { text?: string | null }) {
    const input = (text ?? '').trim();
    if (!input) return null;

    const lines = input.split(/\r?\n/);

    const blocks: Array<
        | { type: 'p'; lines: string[] }
        | { type: 'ul'; items: string[] }
    > = [];

    let currentParagraph: string[] = [];
    let currentList: string[] = [];

    const flushParagraph = () => {
        const joined = currentParagraph.join(' ').trim();
        if (joined) blocks.push({ type: 'p', lines: [joined] });
        currentParagraph = [];
    };

    const flushList = () => {
        if (currentList.length) blocks.push({ type: 'ul', items: currentList });
        currentList = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (!line.trim()) {
            flushList();
            flushParagraph();
            continue;
        }

        if (isListLine(line)) {
            flushParagraph();
            currentList.push(stripListMarker(line));
            continue;
        }

        flushList();
        currentParagraph.push(line.trim());
    }

    flushList();
    flushParagraph();

    return (
        <div className="space-y-4">
            {blocks.map((b, idx) => {
                if (b.type === 'ul') {
                    return (
                        <ul key={idx} className="list-disc pl-5 space-y-2">
                            {b.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="text-slate-600 dark:text-slate-300">
                                    {renderInline(item)}
                                </li>
                            ))}
                        </ul>
                    );
                }

                return (
                    <p key={idx} className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {renderInline(b.lines.join(' '))}
                    </p>
                );
            })}
        </div>
    );
}

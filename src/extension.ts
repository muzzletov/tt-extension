import * as vscode from 'vscode';

const TIMEOUT = 800; //MS

interface State {
    lastUpdate: number;
    timeout?: NodeJS.Timeout;
    decorators: {type: vscode.TextEditorDecorationType, options: vscode.DecorationOptions[]}[];
}

const state: State = {
    lastUpdate: Date.now(),
    decorators: [],
}

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => {
        update(printRangeChanges);
    }));

    context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(() => {
        update(printRangeChanges);
    }));

}

function printRangeChanges() {
    const editor = vscode.window.activeTextEditor!;
    const startingLine = editor.visibleRanges[0]!.start.line!
    const endingLine = editor.visibleRanges[0]!.end.line!

    let diff = 0;
    let lastLine = 0;
    let skipRender = false;

    for (let i = startingLine; i < endingLine + 1; i++) {
        const line = editor.document.lineAt(i).text

        if (line.startsWith("#")) continue;

        const [start, end] = line?.split("-") ?? [];
        const [, month] = line?.split(".") ?? [];

        if (end !== undefined) {
            const startMin = parseInt(start.substring(0, 2)) * 60 + parseInt(start.substring(2))
            const endMin = parseInt(end.substring(0, 2)) * 60 + parseInt(end.substring(2))

            diff += computeDiff(startMin, endMin)
            lastLine = i;
        } else if (month !== undefined) {
            const result = format(diff)
            if (diff > 0 && result) skipRender ||= addDecorator(result, lastLine + 2);
            diff = 0;
        }
    }

    const result = format(diff);
    const invalid = diff <= 0 || result === null
    
    if (invalid) {
        return;
    }

    const atEnd = editor.document.lineCount <= lastLine+1
    skipRender ||= addDecorator(result, atEnd ? lastLine + 1 : lastLine+2, atEnd);
    if(!skipRender) {
        state.decorators.forEach(decorator=>editor.setDecorations(decorator.type, decorator.options))
    }

}

function format(diff: number): string | null {
    const hours = (diff - diff % 60) / 60;
    const minutes = diff % 60;

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return `[${hours}h ${minutes}m]`;
}

function addDecorator(contentText: string, line: number, atEnd = false) {
    
    if (line - 1 !== 0 && !atEnd) {
        line -= 1;
    }

    const editor = vscode.window.activeTextEditor!;
    const prevLineText = atEnd ? editor.document.lineAt(line-1) : editor.document.lineAt(line).text
    const skipRender = prevLineText !== "\n" && prevLineText !== "";

    if (skipRender) {
        editor.edit(builder => builder.insert(new vscode.Position(line, atEnd? prevLineText!.toString.length : 0), "\n"))
    }

    const gutterDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText,
            margin: '0 0 60px 5px',
            width: '60px',
            height: '60px',
            fontWeight: 'bold',
            color: "#aabbaa",
            textDecoration: '; font-size: 0.9em;'
        }
    });
    
    state.decorators.push({type: gutterDecorationType, options: [{ range: new vscode.Range(line, 0, line, 0) }]})

    return skipRender
}

function update(callback: () => void) {
    state.decorators.forEach(decorator => decorator.type.dispose());
    state.decorators.length = 0;
    clearTimeout(state.timeout)
    state.timeout = setTimeout(callback, TIMEOUT);
}

function computeDiff(startMin: number, endMin: number) {
    if (startMin > endMin)
        return (24 * 60 - startMin) + endMin
    else if (endMin === startMin)
        return 60 * 24;

    return endMin - startMin
}

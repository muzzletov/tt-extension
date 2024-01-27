import * as vscode from 'vscode';

interface State {
    lastUpdate: number;
    timeout?: NodeJS.Timeout;
    decorators:     vscode.TextEditorDecorationType[];
    editorChange: boolean;
    resetTimeout?: NodeJS.Timeout;
}

const state: State = {
    lastUpdate: Date.now(), 
    decorators: [],
    editorChange: false
}

export function activate(context: vscode.ExtensionContext) {
  
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        update(printRangeChanges);
    }));

    context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        update(printRangeChanges);
    }));

}

function printRangeChanges () {

    const startingLine = vscode.window.activeTextEditor!.visibleRanges[0]!.start.line!
    const endingLine = vscode.window.activeTextEditor!.visibleRanges[0]!.end.line!
    let diff = 0;
    let lastLine = 0;
    for (let i = startingLine; i < endingLine+1; i++) {
        const line = vscode.window.activeTextEditor!.document.lineAt(i).text
        
        if(line.startsWith("#")) continue;

        const [start, end] = line?.split("-") ?? [];
        const [day, month] = line?.split(".") ?? [];
  
        if (end !== undefined) {
            const startMin = parseInt(start.substring(0, 2))*60 + parseInt(start.substring(2))
            const endMin = parseInt(end.substring(0, 2))*60 + parseInt(end.substring(2))

            if (startMin > endMin)
                diff += (24 * 60 - startMin) + endMin
            else if (endMin === startMin) 
                diff += 60*24;
             else 
                diff += endMin-startMin
            lastLine = i;
        } else if(month !== undefined) {
            const result = format(diff)
            if(diff > 0 && result) state.decorators.push(addDecorator(result, lastLine+2));
            diff = 0;
        }
    }

    const result = format(diff);
    const invalid = diff <= 0 || result === null
    if (invalid) {
            return;
    }
    state.decorators.push(addDecorator(result, lastLine+1, true));

}

function format(diff: number): string | null {
    const hours = (diff-diff%60)/60;
    const minutes = diff%60;

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return `[${hours}h ${minutes}m]`;
}

function addDecorator(contentText: string, line: number, atEnd = false) {
    if (line-1 !== 0 && !atEnd) {
        line -= 1;
    } 
    const prevLineText = vscode.window.activeTextEditor?.document.lineAt(line).text
    if ((prevLineText !== "\n" && prevLineText !== "")) {
        state.editorChange = true
        vscode.window.activeTextEditor!.edit(builder=>builder.insert(new vscode.Position(line, 0), "\n"))
    }
    const decorationOptions: vscode.DecorationOptions[] = []
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
    decorationOptions.push({range: new vscode.Range(line, 0, line, 0)});
    vscode.window.activeTextEditor!.setDecorations(gutterDecorationType, decorationOptions);

    return gutterDecorationType;
}

function update(callback: ()=>void) {
    if(state.editorChange) {
        clearTimeout(state.resetTimeout)
        state.resetTimeout = setTimeout(()=>state.editorChange = false, 200);
        return;
    }
    state.decorators.forEach(decorator=>decorator.dispose());
    state.decorators.length = 0;
    clearTimeout(state.timeout)
    state.timeout = setTimeout(callback, 2000);
}
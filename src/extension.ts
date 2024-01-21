import * as vscode from 'vscode';

interface State {
    lastUpdate: number;
    timeout?: NodeJS.Timeout;
    decorators:     vscode.TextEditorDecorationType[];
}

const state: State = {
    lastUpdate: Date.now(), 
    decorators: []
}

export function activate(context: vscode.ExtensionContext) {
  
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        state.decorators.forEach(decorator=>decorator.dispose());
        state.decorators.length = 0;
        update(printRangeChanges);
    }));

    context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        update(printRangeChanges);
    }));

}

function printRangeChanges () {
    const startingLine = vscode.window.activeTextEditor!.visibleRanges[0]!.start.line!
    const endingLine = vscode.window.activeTextEditor!.visibleRanges[0]!.end.line!
    const decorationOptions: vscode.DecorationOptions[] = []
    let diff = 0;

    for (let i = startingLine; i < endingLine+1; i++) {
        const line = vscode.window.activeTextEditor!.document.lineAt(i).text
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

        } else if(month !== undefined) {
          diff = 0;
        }
  
    }
    const hours = (diff-diff%60)/60;
    const minutes = diff%60;

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

    const result = `${hours}h ${minutes}m`;
    const gutterDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: result,
            margin: '0 0 0 5px',
            width: '20px',
            height: '20px',
            fontWeight: 'bold',
            color: "#aabbaa",
            textDecoration: '; font-size: 0.9em;'
        }
    });

    decorationOptions.push({range: new vscode.Range(endingLine+1, 0, endingLine+1, 0)});
    vscode.window.activeTextEditor!.setDecorations(gutterDecorationType, decorationOptions);
    state.decorators.push(gutterDecorationType);

}

function update(callback: ()=>void) {
    clearTimeout(state.timeout)
    state.timeout = setTimeout(callback, 800);
}
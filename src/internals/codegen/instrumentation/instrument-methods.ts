import {Method} from '../../../interface/multimethod';
import {MMInfo} from '../../mm-info';
import {andThen, debug, repeat} from '../../util';




// TODO: doc...
export function instrumentMethods(mminfo: MMInfo) {

    // Update all `exactMethods` elements in-place.
    mminfo.allNodes.forEach(node => {
        for (let i = 0; i < node.exactMethods.length; ++i) {
            let name = `${node.identifier}${repeat('ᐟ', i)}`;
            node.exactMethods[i] = instrumentMethod(mminfo, node.exactMethods[i], name);
        }
    });
}




// TODO: doc...
function instrumentMethod(mminfo: MMInfo, method: Function, name: string) {
    let isDecorator = mminfo.isDecorator(method);
    let methodInfo = `${isDecorator ? 'decorator' : 'method'}=${name}`;
    let instrumentedMethod: Method<unknown[], unknown> = (patternBindings, ...args) => {
        debug(`${debug.DISPATCH} |-->| %s   pattern bindings=%o`, methodInfo, patternBindings);
        return andThen(() => method(patternBindings, ...args), (result, error, isAsync) => {
            let resultInfo = error ? 'result=ERROR' : '';
            debug(`${debug.DISPATCH} |<--| %s   %s   %s`, methodInfo, isAsync ? 'async' : 'sync', resultInfo);
            if (error) throw error; else return result;
        });
    };
    if (isDecorator) {
        // TODO: this is rather inefficient... revise...
        const oldIsDecorator = mminfo.isDecorator;
        mminfo.isDecorator = m => m === instrumentedMethod || oldIsDecorator(m);
    }
    return instrumentedMethod;
}

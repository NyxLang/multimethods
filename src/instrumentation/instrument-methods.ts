import {MMInfo, MMNode} from '../analysis';
import {Method} from '../multimethod';
import andThen from '../util/and-then';
import debug, {DISPATCH} from '../util/debug';
import isMetaMethod from '../util/is-meta-method';
import repeatString from '../util/string-repeat';




// TODO: doc...
export default function instrumentMethods(mminfo: MMInfo<MMNode>) {

    // Update all `exactMethods` elements in-place.
    mminfo.allNodes.forEach(node => {
        for (let i = 0; i < node.exactMethods.length; ++i) {
            let name = `${node.identifier}${repeatString('ᐟ', i)}`;
            node.exactMethods[i] = instrumentMethod(node.exactMethods[i], name);
        }
    });
}




// TODO: doc...
function instrumentMethod(method: Function, name: string) {
    let isMeta = isMetaMethod(method);
    let methodInfo = `${isMeta ? 'decorator' : 'method'}=${name}`;
    let instrumentedMethod: Method<unknown[], unknown> = function (...args: any[]) {
        debug(`${DISPATCH} |-->| %s   pattern bindings=%o`, methodInfo, this.pattern);
        return andThen(() => method.apply(this, args), (result, error, isAsync) => {
            let resultInfo = error ? 'result=ERROR' : '';
            debug(`${DISPATCH} |<--| %s   %s   %s`, methodInfo, isAsync ? 'async' : 'sync', resultInfo);
            if (error) throw error; else return result;
        });
    };
    if (isMeta) isMetaMethod(instrumentedMethod, true);
    return instrumentedMethod;
}

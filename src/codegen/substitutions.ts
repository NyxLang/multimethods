import {MethodSequenceEntry, MMInfo, MMNode} from '../analysis';
import {hasNamedCaptures} from '../math/predicates';
import {repeat} from '../util';




export function forMultimethod(mminfo: MMInfo<MMNode>) {
    return {
        NAME: mminfo.config.name,
        ARITY: String(mminfo.config.discriminator.length || 1),
        PARAMS: makeParameterList(mminfo.config.discriminator.length || 1),
        NAMEOF_SELECT_THUNK: 'selectThunk',
        DUMMY_CODE: false, // use with if statements to elide dummy code from the template
    };
}




export function forNode(node: MMNode, nodeIndex?: number) {
    return {
        INDEX: nodeIndex,
        NAMEOF_IS_MATCH: `isMatchː${node.identifier}`,
        HAS_PATTERN_BINDINGS: hasNamedCaptures(node.exactPredicate),
        NAMEOF_GET_PATTERN_BINDINGS: `getPatternBindingsː${node.identifier}`,
        NAMEOF_ENTRYPOINT_THUNK: getThunkName([node.entryPoint], 0),
    };
}




export function forMethod(node: MMNode, methodIndex: number) {
    return {
        NAME: getMethodName(node, methodIndex),
        INDEX: methodIndex,
    };
}




export function forMatch(seq: Array<MethodSequenceEntry<MMNode>>, index: number) {
    let {fromNode, methodIndex} = seq[index];

    // TODO: temp testing... explain these calcs!!
    let isLeastSpecificMethod = index === seq.length - 1;
    let innerMethod = seq.filter((entry, j) => (j === 0 || entry.isMeta) && j < index).pop();

    return {
        NAMEOF_THUNK: getThunkName(seq, index),
        NAMEOF_METHOD: getMethodName(fromNode, methodIndex),
        HAS_NO_THIS_REFERENCE_IN_METHOD: !/\bthis\b/g.test(fromNode.exactMethods[methodIndex].toString()),
        HAS_OUTER_MATCH: !isLeastSpecificMethod && !seq[index + 1].isMeta,
        NAMEOF_OUTER_THUNK: isLeastSpecificMethod ? '' : getThunkName(seq, index + 1),
        HAS_INNER_MATCH: innerMethod != null,
        NAMEOF_INNER_THUNK: innerMethod ? getThunkName([innerMethod], 0) : '',
    };
}




function getThunkName(seq: Array<MethodSequenceEntry<MMNode>>, index: number) {
    return `thunkː${seq[index].identifier}`;
}




function getMethodName(node: MMNode, methodIndex: number) {
    return `methodː${node.identifier}${repeat('ᐟ', methodIndex)}`;
}




// TODO: doc
// replaces rest/spread forms `...XXX` with something like `$0, $1`
// use when there is a known fixed arity
function makeParameterList(arity: number, prefix = '$') {
    let paramNames = [] as string[];
    for (let i = 0; i < arity; ++i) paramNames.push(prefix + i);
    return paramNames.join(', ');
}
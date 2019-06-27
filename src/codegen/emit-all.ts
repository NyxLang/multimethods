import {MMInfo, MMNode} from '../analysis';
import {hasNamedCaptures, toMatchFunction, toNormalPredicate} from '../math/predicates';
import * as fatalError from '../util/fatal-error';
import repeat from '../util/string-repeat';
import emitDispatchFunction from './emit-dispatch-function';
import emitSelectorFunction from './emit-selector-function';
import emitThunkFunction from './emit-thunk-function';
import Emitter, {createEmitter, EmitEnvironment, EmitNode, EnvNames as names} from './emitter';





/** TODO: doc... */
export default function emitAll(mminfo: MMInfo<MMNode>) {
    let env = createEmitEnvironment(mminfo);
    let emit = createEmitter(env);

    // Generate the combined source code for the multimethod. This includes local variable declarations for
    // all predicates and methods, as well as the interdependent thunk function declarations that perform
    // the cascading, and possibly asynchronous, evaluation of each multimethod call.
    emitBanner(emit, 'MULTIMETHOD DISPATCHER');
    emitDispatchFunction(emit, env, names);

    emitBanner(emit, 'THUNK SELECTOR');
    emitSelectorFunction(emit, env, names);

    emitBanner(emit, 'THUNKS');
    env.allNodes.forEach(node => {
        emit(`\n// -------------------- ${node.exactPredicate} --------------------`);
        node.methodSequence.forEach((_, i, seq) => {
            emitThunkFunction(emit, env, seq, i, names);
        });
    });

    emitBanner(emit, 'ENVIRONMENT');
    emit(`var ${names.UNHANDLED} = ${names.ENV}.${names.UNHANDLED};`);
    emit(`var ${names.DISCRIMINATOR} = ${names.ENV}.${names.CONFIG}.${names.DISCRIMINATOR};`);
    emit(`var ${names.EMPTY_OBJECT} = Object.freeze({});`);
    emit(`var ${names.COPY_ARRAY} = function (els) { return Array.prototype.slice.call(els); };`);
    env.allNodes.forEach((node, i) => {
        const NODE_REF = `${names.ENV}.${names.ALL_NODES}[${i}]`;
        emit(`\n// -------------------- ${node.exactPredicate} --------------------`);
        emit(`var ${names.IS_MATCH}ː${node.identifier} = ${NODE_REF}.${names.IS_MATCH};`);
        if (node.hasPatternBindings) {
            emit(`var ${names.GET_PATTERN_BINDINGS}ː${node.identifier} = ${NODE_REF}.${names.GET_PATTERN_BINDINGS};`);
        }
        node.exactMethods.forEach((_, j) => {
            emit(`var ${names.METHOD}ː${node.identifier}${repeat('ᐟ', j)} = ${NODE_REF}.${names.EXACT_METHODS}[${j}];`);
        });
    });

    return emit;
}





// TODO: doc...
function createEmitEnvironment(mminfo: MMInfo<MMNode>): EmitEnvironment {
    let result = mminfo.addProps((node) => {
        let isMatch = toMatchFunction(toNormalPredicate(node.exactPredicate));
        let hasPatternBindings = hasNamedCaptures(node.exactPredicate);
        let getPatternBindings = toMatchFunction(node.exactPredicate) as EmitNode['getPatternBindings'];
        return {isMatch, hasPatternBindings, getPatternBindings};
    }) as EmitEnvironment;
    result.unhandled = mminfo.config.unhandled || fatalError.UNHANDLED;
    return result;
}





// TODO: doc...
function emitBanner(emit: Emitter, text: string) {
    let filler = text.replace(/./g, '=');
    emit(`\n\n/*====================${filler}====================*`);
    emit(` *                    ${text}                    *`);
    emit(` *====================${filler}====================*/`);
}

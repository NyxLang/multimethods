import Options from '../../options';
import defaultDiscriminator from './default-discriminator';
import NormalOptions from './normal-options';
import normaliseMethods from './normalise-methods';





// TODO: doc...
export default function normaliseOptions(options: Options) {
    let name = options.name || `Ɱ${++multimethodCounter}`;
    let arity = options.arity;
    let async = options.async;
    let strict = options.strict || false;
    let toDiscriminant = options.toDiscriminant || defaultDiscriminator;
    let methods = normaliseMethods(options.methods);

    return {name, arity, async, strict, toDiscriminant, methods} as NormalOptions;
}





// TODO: doc...
let multimethodCounter = 0;

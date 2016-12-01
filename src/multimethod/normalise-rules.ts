import Rule from './rule';
import MultimethodOptions from './multimethod-options';





// TODO: ...
export default function normaliseRules(rules: MultimethodOptions['rules']) {
    let result = Object.keys(rules).map(patternSource => new Rule(patternSource, rules[patternSource]));
    return result;
}



// TODO: move rule validation into here...? like with normaliseOptions...
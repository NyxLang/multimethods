



// TODO: doc...
// TODO: revise suitability of this default behaviour in actual usage
// TODO: better to specialise for MM arity for perf/strict checks?
export function defaultDiscriminator(...args: unknown[]) {
    return args.map(arg => '/' + stringify(arg)).join('');
}




function stringify(value: unknown) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    return Object.getPrototypeOf(value).constructor.name;

    // TODO: consider a more sophistocated approach like the following?
    // let t = typeof value;
    // if (t === 'symbol') value = Symbol.keyFor(value) || String(value).slice(7, -1) || 'undefined';
    // if (typeof value === 'string') value = encodeURIComponent(value);
    // return  `${t}:${t === 'object' ? value.constructor.name : value}`;
}

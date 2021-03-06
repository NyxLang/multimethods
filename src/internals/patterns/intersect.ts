import {memoise} from '../util';
import {isSubsetOf} from './is-subset-of';
import {NONE} from './none';
import {NormalisedPattern} from './normalised-pattern';
import {Unreachable} from './unreachable';




/**
 * Computes the intersection of the two given patterns. The intersection matches a string if and only if that
 * string is matched by *both* given patterns. Because intersections cannot in general be expressed as a single
 * pattern, the result is given as an array of normalized patterns, to be interpreted as follows:
 * (1) An empty array. This means arguments `a` and `b` represent disjoint patterns.
 *     That is, there are no strings that are matched by both `a` and `b`.
 *     Example: 'foo' ∩ 'bar' = []
 * (2) An array with one element. This means the intersection may be represented
 *     by a single pattern, whose normalized pattern is contained in the array.
 *     Example: 'a*' ∩ '*b' = ['a*b']
 * (3) An array with multiple elements. The array contains a list of mutually disjoint patterns, the union
 *     of whose matched strings are precisely those strings that are recognized by both `a` and `b`.
 *     Example: 'test.*' ∩ '*.js' = ['test.js', 'test.*.js']
 * @param {NormalisedPattern} a - lhs pattern to be intersected.
 * @param {NormalisedPattern} b - rhs pattern to be intersected.
 * @returns {NormalisedPattern} - The normalized pattern representing the intersection of `a` and `b`.
 */
export let intersect: (a: NormalisedPattern, b: NormalisedPattern, unreachable?: Unreachable) => NormalisedPattern;
intersect = memoise((a: NormalisedPattern, b: NormalisedPattern, unreachable?: Unreachable): NormalisedPattern => {

    // If no `unreachable` callback is given, use a default that indicates all patterns are reachable.
    unreachable = unreachable || alwaysReachable;

    // Compute the intersections of every alternative of `a` with every alternative of `b`.
    let aAlts = a === NONE ? [] : a.split('|') as NormalisedPattern[];
    let bAlts = b === NONE ? [] : b.split('|') as NormalisedPattern[];
    let allIntersections = [] as NormalisedPattern[];
    for (let altA of aAlts) {
        for (let altB of bAlts) {
            let moreIntersections = getAllIntersections('', altA, altB, unreachable);
            allIntersections = allIntersections.concat(moreIntersections);
        }
    }

    // Finalise the result.
    if (allIntersections.length === 0) return NONE;
    let result = NormalisedPattern(allIntersections.join('|'));

    return result;
});




/**
 * Computes all patterns that may be formed by unifying wildcards/globstars from one pattern with
 * substitutable substrings of the other pattern, such that all characters from both patterns are
 * present and in order in the result. All the patterns computed in this way represent valid
 * intersections of `a` and `b`. However, some may be duplicates or subsets of others.
 * @param {NormalisedPattern} a - a normalised pattern.
 * @param {NormalisedPattern} b - a normalised pattern.
 * @returns {NormalisedPattern[]} - a list of normalised patterns that represent valid intersections of `a` and `b`.
 */
let getAllIntersections: (commonPrefix: string, a: NormalisedPattern, b: NormalisedPattern, unreachable: Unreachable) => NormalisedPattern[];
getAllIntersections = memoise((commonPrefix: string, a: NormalisedPattern, b: NormalisedPattern, unreachable: Unreachable) => {

    // Ensure `a` always precedes `b` lexicographically. Intersection is commutative,
    // so sorting `a` and `b` reduces the solution space without affecting the result.
    if (a > b) return getAllIntersections(commonPrefix, b, a, unreachable);

    // If either of the two given patterns are unreachable, then there are no reachable intersections.
    if (unreachable(commonPrefix + a as NormalisedPattern)) return [];
    if (unreachable(commonPrefix + b as NormalisedPattern)) return [];

    // CASE 1: Either pattern is empty. An empty pattern intersects only with
    // another empty pattern or a single wildcard/globstar. Since an empty string
    // precedes all other strings lexicographically, we just check if `a` is empty.
    if (a === '') {
        if (b === '' || b === '*' || b === '**') {
            let resultA = [commonPrefix as NormalisedPattern];
            return resultA.filter(p => !unreachable(p));
        }
        else {
            return [];
        }
    }

    // CASE 2: Either pattern is found to be a subset of the other. The result in this case is the subset pattern.
    if (isSubsetOf(a, b)) {
        let resultA = [commonPrefix + a] as NormalisedPattern[];
        return resultA.filter(p => !unreachable(p));
    }
    if (isSubsetOf(b, a)) {
        let resultA = [commonPrefix + b] as NormalisedPattern[];
        return resultA.filter(p => !unreachable(p));
    }

    // CASE 3: Both patterns start with at least one literal character. If the starting
    // literals have no common prefix, the patterns are disjoint. Otherwise, we determine
    // the intersection by recursively intersecting everything after the common prefix.
    let aFirstToken = getFirstToken(a);
    let bFirstToken = getFirstToken(b);
    if (aFirstToken.charAt(0) !== '*' && bFirstToken.charAt(0) !== '*') {
        let commonPrefix2 = longestCommonPrefix(aFirstToken, bFirstToken);
        if (commonPrefix2.length === 0) return []; // Patterns are disjoint

        let aSuffix = a.slice(commonPrefix2.length) as NormalisedPattern;
        let bSuffix = b.slice(commonPrefix2.length) as NormalisedPattern;
        let resultA = getAllIntersections(commonPrefix + commonPrefix2, aSuffix, bSuffix, unreachable);
        let resultB = resultA.filter(p => !unreachable(p));
        return resultB;
    }

    // CASE 4: At least one of the patterns starts with a wildcard or globstar. Let's call this pattern p1, and
    // the other pattern p2. We split p1 into a [prefix, suffix] pair, where p1.prefix is p1's leading wildcard or
    // globstar, and p1.suffix is the remainder of p1. We now consider *every* [prefix, suffix] pair of p2 such that
    // p1.prefix unifies with p2.prefix. We now determine the intersection by recursively intersecting p1.suffix
    // against every p2.suffix, and accumulating the results.
    let [p1, p2] = aFirstToken === '**' || bFirstToken.charAt(0) !== '*' ? [a, b] : [b, a];
    let p1Prefix = (p1 === a ? aFirstToken : bFirstToken) as string as '*'|'**';
    let p1Suffix = p1.slice(p1Prefix.length) as NormalisedPattern;

    // Obtain all [prefix, suffix] pairs of p2 that potentially unify with p1.
    let p2Pairs = getUnifiableSplits(p2, p1Prefix);

    // Compute and return intersections for all valid unifications. This is a recursive operation.
    let result1 = [] as NormalisedPattern[];
    for (let [p2Prefix, p2Suffix] of p2Pairs) {
        let more = getAllIntersections(commonPrefix + p2Prefix, p1Suffix, p2Suffix, unreachable);
        result1 = result1.concat(more);
    }

    // TODO: temp testing... dedupe
    let result2 = result1.length === 0 ? [] : NormalisedPattern(result1.join('|')).split('|') as NormalisedPattern[];

    // TODO: temp testing... remove unreachables... but these are pattern fragments!
    // - is it reliable anyway? What would make it reliable?
    // - reinstate the `commonPrefix` parameter so we always generate full patterns for testing reachability?
    let result3 = result2.filter(p => !unreachable(p));

    return result3;
});




// TODO: doc helper...
function getFirstToken(p: NormalisedPattern) {
    if (p.length === 0) return p;
    let literalCount = p.indexOf('*');
    if (literalCount === -1) return p; // The whole of p is a literal
    if (literalCount === 0) return (p.length > 1 && p.charAt(1) === '*' ? '**' : '*') as NormalisedPattern;
    if (literalCount === 1) return p.charAt(0) as NormalisedPattern;
    return p.slice(0, literalCount) as NormalisedPattern;
}




// TODO: doc helper...
function longestCommonPrefix(p1: NormalisedPattern, p2: NormalisedPattern) {
    let shorter = p1.length < p2.length ? p1 : p2;
    let shorterLength = shorter === p1 ? p1.length : p2.length;
    for (let i = 0; i < shorterLength; ++i) {
        if (p1.charAt(i) === p2.charAt(i)) continue;
        return p1.slice(0, i) as NormalisedPattern;
    }
    return shorter;
}




/**
 * Returns an array of all the [prefix, suffix] pairs into which the pattern `p` may be split, such that `prefix`
 * is a subset of `prefixUnifier`. Splits that occur on a wildcard/globstar have the wildcard/globstar on both sides
 * of the split (i.e. as the last character(s) of the prefix and the first character(s) of the suffix).
 * E.g., 'ab**c' splits into: ['','ab**c'], ['a','b**c'], ['ab**','**c'], and ['ab**c',''].
 */
let getUnifiableSplits: (p: NormalisedPattern, prefixUnifier: '*'|'**') => Array<[NormalisedPattern, NormalisedPattern]>;
getUnifiableSplits = memoise((p: NormalisedPattern, prefixUnifier: '*'|'**') => {
    let result = [] as string[][];
    let prefix = '';
    let suffix = p as string;
    while (true) {

        // Before we issue the next [prefix, suffix] pair, check whether `suffix` starts with a wildcard or globstar.
        let splitType: ''|'*'|'**';
        splitType = suffix.charAt(0) !== '*' ? '' : suffix.charAt(1) === '*' ? '**' : '*';

        // If so, the wildcard/globstar needs to *also* appear at the end of the prefix for this pair. Furthermore,
        // if the prefix is being unified with a wildcard (not a globstar), then we strenth-reduce globstars to
        // wildcards on appending them to the prefix, so that the prefix always unifies with `prefixUnifier`.
        if (splitType) prefix += (prefixUnifier === '*' ? '*' : splitType);

        // Now we can issue the pair.
        result.push([prefix, suffix]);

        // If the pair just issued was split on a wildcard/globstar, the next split comes *after* the char following it.
        if (splitType) suffix = suffix.slice(splitType.length);

        // There are two possible stopping conditions:
        // 1. we just issued the last possible pair (i.e. `suffix` is empty)
        // 2. the remaining prefixes cannot possibly unify with `prefixUnifier`
        if (suffix === '' || (prefixUnifier === '*' && suffix.charAt(0) === '/')) break;

        // If we get here, we know the suffix is non-empty. Furthermore, the suffix must start with a literal, since:
        // - if the just-issued suffix *did* start with a wildcard/globstar, we sliced it off right after issuing it
        // - a wildcard/globstar cannot be followed by another wildcard/globstar
        // - the suffix is non-empty, so the only possibility left is that it starts with a literal.
        // We transfer this literal from the start of the suffix to the end of the prefix, and iterate again.
        prefix += suffix.charAt(0);
        suffix = suffix.slice(1);
    }
    return result as Array<[NormalisedPattern, NormalisedPattern]>;
});




// TODO: doc...
function alwaysReachable() {
    return false;
}

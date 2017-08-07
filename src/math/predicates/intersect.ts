import NONE from './none';
import NormalPredicate from './normal-predicate';
import toNormalPredicate from './to-normal-predicate';





/**
 * Computes the intersection of the two given predicates. The intersection recognizes a string if and only if that
 * string is recognized by *both* given predicates. Because intersections cannot in general be expressed as a single
 * predicate, the result is given as an array of normalized predicates, to be interpreted as follows:
 * (1) An empty array. This means the arguments represent disjoint predicates.
 *     That is, there are no strings that are recognized by both arguments.
 *     Example: 'foo' ∩ 'bar' = []
 * (2) An array with one element. This means the intersection may be represented
 *     by a single predicate, whose normalized predicate is contained in the array.
 *     Example: 'a*' ∩ '*b' = ['a*b']
 * (3) An array with multiple elements. The array contains a list of mutually disjoint predicates, the union
 *     of whose recognized strings are precisely those strings that are recognized by both of the arguments.
 *     Example: 'test.*' ∩ '*.js' = ['test.js', 'test.*.js']
 * @param {NormalPredicate} a - lhs predicate to be intersected.
 * @param {NormalPredicate} b - rhs predicate to be intersected.
 * @returns {NormalPredicate} - The normalized predicate representing the intersection of `a` and `b`.
 */
export default function intersect(a: NormalPredicate, b: NormalPredicate): NormalPredicate {

    // TODO: temp testing...
    let t0 = Date.now();

    // Compute the intersections of every alternative of `a` with every alternative of `b`.
    let aAlts = a === NONE ? [] : simplify(a).split('|');
    let bAlts = b === NONE ? [] : simplify(b).split('|');
    let allIntersections = [] as SimplePredicate[];
    for (let altA of aAlts) {
        for (let altB of bAlts) {
            let moreIntersections = getAllIntersections(altA as SimplePredicate, altB as SimplePredicate);
            allIntersections = allIntersections.concat(moreIntersections);
        }
    }

    // TODO: temp testing...
    let t1 = Date.now();

    // Finalise the result.
    if (allIntersections.length === 0) return NONE;
    let result = toNormalPredicate(allIntersections.map(expand).join('|'));

    // TODO: temp testing...
    let t2 = Date.now();
    let d1 = (t1 - t0) / 1000.0;
    let d2 = (t2 - t1) / 1000.0;
    if (d1 + d2 > 1) {
        console.log(`\n\n\n${a} ∩ ${b}`);
        console.log(`intersection count: ${allIntersections.length}`);
        console.log(`getAllIntersections time: ${d1}s`);
        console.log(`toNormalPredicate time: ${d2}s`);

        // let alts = new SetOfAlternatives();
        // alts.addAll(allIntersections);
        // console.log(alts.values());
    }

    console.log('CALL COUNT: ' + CALL_COUNT);
    return result;
}





// TODO: temp testing...
const CACHE = new Map<string, SimplePredicate[]>();
let CALL_COUNT = 0;





/**
 * Computes all predicates that may be formed by unifying wildcards from one predicate with
 * substitutable substrings of the other predicate, such that all characters from both predicates
 * are present and in order in the result. All the predicates computed in this way represent
 * valid intersections of `a` and `b`. However, some may be duplicates or subsets of others.
 * @param {SimplePredicate} a - a simplified predicate.
 * @param {SimplePredicate} b - a simplified predicate.
 * @returns {SimplePredicate[]} - a list of simplified predicates that represent valid intersections of `a` and `b`.
 */
function getAllIntersections(a: SimplePredicate, b: SimplePredicate): SimplePredicate[] {
    let result = [] as string[];

    // TODO: temp testing...
    let cached = CACHE.get(a < b ? a + '∩' + b : b + '∩' + a);
    if (cached) return cached;
    ++CALL_COUNT;

    // An empty predicate intersects only with another empty predicate or a single wildcard.
    if (a === '' || b === '') {
        let other = a || b;
        result = other === '' || other === '*' || other === 'ᕯ' ? ['' as SimplePredicate] : [];
    }

    // `a` starts with a wildcard. Generate all possible intersections by unifying
    // the wildcard with all substitutable prefixes of `b`, then intersecting the remainders.
    else if (a[0] === 'ᕯ' || (a[0] === '*' && b[0] !== 'ᕯ')) {

        // Obtain all splits. When unifying splits against '*', do strength
        // reduction on split prefixes containing 'ᕯ' (ie replace 'ᕯ' with '*').
        let splits = getAllPredicateSplits(b);
        if (a[0] === '*') splits.forEach(pair => pair[0] = pair[0].replace(/ᕯ/g, '*') as SimplePredicate);

        // Compute and return intersections for all valid unifications. This is a recursive operation.
        result = splits
            .filter(pair => a[0] === 'ᕯ' || (pair[0].indexOf('/') === -1 && pair[0].indexOf('ᕯ') === -1))
            .map(pair => getAllIntersections(a.slice(1) as SimplePredicate, pair[1]).map(u => pair[0] + u))
            .reduce((ar, el) => (ar.push.apply(ar, el), ar), []);
    }

    // `b` starts with a wildcard. Delegate to previous case by swapping arguments (since intersection is commutative).
    else if (b[0] === 'ᕯ' || b[0] === '*') {
         result = getAllIntersections(b, a);
    }

    // Both predicates start with the same literal. Intersect their remainders recursively.
    else if (a[0] === b[0]) {
        result = getAllIntersections(a.slice(1) as SimplePredicate, b.slice(1) as SimplePredicate)
            .map(u => a[0] + u);
    }

    // If we get here, `a` and `b` must be disjoint.
    else {
        // no-op
    }

    // TODO: temp testing...
    let result2 = new SetOfAlternatives().addAll(result as SimplePredicate[]).values();
    CACHE.set(a < b ? a + '∩' + b : b + '∩' + a, result2);
    return result2;
}





/**
 * Returns an array of all the [prefix, suffix] pairs into which `predicate` may be split. Splits that occur on a
 * wildcard character have the wildcard on both sides of the split (i.e. as the last character of the prefix and the
 * first character of the suffix). E.g., 'abᕯc' splits into: ['','abᕯc'], ['a','bᕯc'], ['abᕯ','ᕯc'], and ['abᕯc',''].
 */
function getAllPredicateSplits(predicate: SimplePredicate): Array<[SimplePredicate, SimplePredicate]> {
    let result = [] as Array<[SimplePredicate, SimplePredicate]>;
    for (let i = 0; i <= predicate.length; ++i) {
        let pair = [predicate.substring(0, i), predicate.substring(i)];
        if (predicate[i] === 'ᕯ' || predicate[i] === '*') {
            pair[0] += predicate[i];
            ++i; // skip next iteration
        }
        result.push(pair as any);
    }
    return result;
}





// TODO: doc...
class SetOfAlternatives {

    // Returns true if something added, false otherwise
    add(value: SimplePredicate) {
        if (this.former.has(value)) return this;

        let rejected = false;
        let subsetRecogniser = makeSubsetRecogniser(value);
        this.current.forEach((regex, pred) => {
            rejected = rejected || regex.test(value);
            if (rejected) return;

            if (subsetRecogniser.test(pred)) {
                this.current.delete(pred);
                this.former.add(pred);
            }
        });
        if (rejected) {
            this.former.add(value);
        }
        else {
            this.current.set(value, subsetRecogniser);
// TODO: was... if (this.current.size > 10) console.log(this.current.size, this.former.size);
        }
        return this;
    }

    // Returns list of predicates actually added
    addAll(values: SimplePredicate[]) {
        values.filter(value => this.add(value));
        return this;
    }

    values() {
        let result = [] as SimplePredicate[];
        this.current.forEach((_, pred) => result.push(pred));
        return result;
    }

    private current = new Map<SimplePredicate, RegExp>();

    private former = new Set<SimplePredicate>();
}





// TODO: copypasta with code in to-normal-predicate.ts
// TODO: doc... Build a regex that matches all predicates that are proper or improper subsets of the specified predicate.
function makeSubsetRecogniser(predicate: SimplePredicate) {
    let re = predicate.split('').map(c => {
        if (c === '*') return '[^\\/ᕯ]*';
        if (c === 'ᕯ') return '.*';
        if (' /._-'.indexOf(c) !== -1) return `\\${c}`; // NB: these chars need escaping in a regex
        return c;
    }).join('');
    return new RegExp(`^${re}$`);
}





// TODO: temp testing... internal concept; makes the algos in this file simpler
// TODO: doc... a simplified predicate is normalised with multichar symbols replaced by single chars (ie, ** => ᕯ).
type SimplePredicate = NormalPredicate & { __simplePredicateBrand: any };
function simplify(p: NormalPredicate) {
    return p.replace(/\*\*/g, 'ᕯ') as SimplePredicate;
}
function expand(p: SimplePredicate) {
    return p.replace(/ᕯ/g, '**') as NormalPredicate;
}

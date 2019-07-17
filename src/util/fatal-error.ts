import {format} from 'util';  // TODO: ensure this node.js dep doesn't prevent clientside use (eg via webpack)
import {debug} from './debug';




// TODO: rename these - they shouldn't be all caps...
export function DUPLICATE_PREDICATE(normalised: string, predicates: string) {
    let fmt = `The predicate '%s' is duplicated across multiple methods: %s. To resolve this, use a method chain.`;
    return error(format(fmt, normalised, predicates));
}

export function INVALID_NAME_OPTION(value: any) {
    let fmt = `Expected a valid identifier or undefined value for options.name, but found %j.`;
    return error(format(fmt, value));
}

export function INVALID_DISCRIMINATOR_OPTION() {
    let fmt = `Expected a function or undefined value for options.discriminator.`;
    return error(format(fmt));
}

export function INVALID_UNREACHABLE_OPTION() {
    let fmt = `Expected a function or undefined value for options.unreachable.`;
    return error(format(fmt));
}

export function MIXED_CHAIN(predicate: string) {
    let fmt = `Chain for predicate '%s' has decorator(s) to the right`
            + ` of regular method(s). Decorators must be leftmost in the chain.`;
    return error(format(fmt, predicate));
}

export function MULTIPLE_FALLBACKS_FROM(predicate: string, fallbacks: string) {
    let fmt = `Multiple possible fallbacks from '%s': %s`;
    return error(format(fmt, predicate, fallbacks));
}

export function MULTIPLE_PATHS_TO(predicate: string) {
    let fmt = `Multiple paths to '%s' with different decorators`;
    return error(format(fmt, predicate));
}

export function PREDICATE_SYNTAX(message: string) {
    let fmt = `Predicate syntax error: %s`;
    return error(format(fmt, message));
}

export function TOO_COMPLEX() {
    let fmt = `Method table is too complex. Try reducing the number of predicates or their degree of overlap.`;
    return error(format(fmt));
}

export function UNHANDLED(discriminant: string) {
    let fmt = `Multimethod dispatch failure: call was unhandled for the given arguments (discriminant = '%s').`;
    return error(format(fmt, discriminant));
}




function error(message: string): never {
    debug(`${debug.FATAL} %s`, message);
    throw new Error(message);
}

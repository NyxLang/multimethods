export {default as create} from './create';
export {default as Options} from './options';
export {CONTINUE, AMBIGUOUS_DISPATCH, UNHANDLED_DISPATCH} from './sentinels';
export {meta} from './decorators';




// TODO: temp testing...
import {CONTINUE} from './sentinels';
export const next = CONTINUE as never;
export {Multimethod} from './multimethod-impl';

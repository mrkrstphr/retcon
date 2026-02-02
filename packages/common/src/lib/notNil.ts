import { isNotNil } from 'ramda';

export const notNil = <T>(value: T) => isNotNil(value);

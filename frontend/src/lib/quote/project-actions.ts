import type {QuoteFormValues} from './form';
import {recordProjectForm,type ProjectHistory} from './project';
/** Refuse history travel if live text cannot be represented by a valid snapshot. */
export function travelProjectFromForm(history:ProjectHistory,values:QuoteFormValues,action:(history:ProjectHistory)=>ProjectHistory):ProjectHistory {
 return action(recordProjectForm(history,values));
}

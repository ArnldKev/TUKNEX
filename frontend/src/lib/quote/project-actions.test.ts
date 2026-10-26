import assert from 'node:assert/strict';
import test from 'node:test';
import {quoteDefaults} from './form';
import {createProjectHistory,createQuoteProject,recordProjectForm,undoProject} from './project';
import * as actions from './project-actions';
test('history action refuses invalid live text instead of resetting to an older snapshot',()=>{
 const travel=actions.travelProjectFromForm;assert.equal(typeof travel,'function');
 const history=recordProjectForm(createProjectHistory(createQuoteProject()),{...quoteDefaults,offering:'Café'});
 assert.throws(()=>travel(history,{...quoteDefaults,offering:'x'.repeat(400)},undoProject));
 const undone=travel(history,{...quoteDefaults,offering:'Café',email:'private@example.test'},undoProject);
 assert.equal(undone.present.answers.offering,'');assert.equal(history.present.answers.offering,'Café');
});

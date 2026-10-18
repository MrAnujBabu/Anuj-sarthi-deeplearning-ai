import { beforeEach, describe, expect, it } from 'vitest';
import { savedPractice, reviewSavedCard } from '@/lib/practice';
import { classifyAiFailure, displayAiError, encodeAiFailure } from '@/lib/ai/errors';
import { parseStudyBackup, importStudy } from '@/lib/backup';
import { resolveModel, DEFAULT_MODEL } from '@/lib/models';
import type { Card } from '@/lib/srs';
const card: Card = {id:'c1',q:'Powerhouse of the cell?',a:'Mitochondria',topic:'Cell',box:2,due:0,reviews:1,lastCorrect:true};
beforeEach(()=>localStorage.clear());
describe('saved practice without new AI',()=>{
  it('includes saved answers alongside revision cards',()=>{
    const deck=savedPractice([card],[{id:'t',title:'Physics',updatedAt:1,messages:[{id:'u',role:'user',parts:[{type:'text',text:'Force formula?'}]},{id:'a',role:'assistant',parts:[{type:'text',text:'F = ma'}]}]}]);
    expect(deck.map(c=>c.a)).toEqual(['Mitochondria','F = ma']);
  });
  it('does not turn a blocked answer into study material',()=>{
    expect(savedPractice([],[{id:'t',title:'Blocked',updatedAt:1,messages:[{id:'u',role:'user',parts:[{type:'text',text:'Q?'}]},{id:'a',role:'assistant',parts:[{type:'text',text:'[AI_CREDITS] Add credits'}]}]}])).toHaveLength(0);
  });
  it('saves remembered review with a seven-day due date',()=>{
    localStorage.setItem('snapsolve.cards.v1',JSON.stringify([card]));
    reviewSavedCard(card,true,100);
    expect(JSON.parse(localStorage.getItem('snapsolve.cards.v1') ?? '[]')[0]).toMatchObject({box:3,due:100+7*86400000,reviews:2});
  });
  it('saves forgotten review for tomorrow',()=>{
    expect(reviewSavedCard(card,false,100)[0]).toMatchObject({box:1,due:100+86400000});
  });
});
describe('AI terminal errors',()=>{
  it('shows the upstream balance remedy',()=>{
    const failure=classifyAiFailure(402,{message:'Your AI balance is exhausted. Upgrade to continue.'});
    expect(failure.kind).toBe('credits');
    expect(displayAiError(encodeAiFailure(failure))).toBe('Your AI balance is exhausted. Upgrade to continue.');
  });
  it('does not classify provider denial as insufficient credits',()=>{
    expect(classifyAiFailure(403,{error:{type:'permission_error',message:'Provider denied access'}})).toEqual({status:403,kind:'denied',message:'Provider denied access'});
  });
  it('classifies workspace spending caps as paused credit work',()=>{
    expect(classifyAiFailure(403,{type:'credit_limit_reached',message:'Raise the workspace limit'}).kind).toBe('credits');
  });
  it('keeps the existing Sonnet default and rejects unknown selections',()=>{
    expect(resolveModel(undefined)?.id).toBe(DEFAULT_MODEL);
    expect(resolveModel('not-a-model')).toBeUndefined();
  });
});
describe('study backup',()=>{
  it('restores saved cards without replacing existing cards',()=>{
    const backup=parseStudyBackup(JSON.stringify({format:'snapsolve-study',version:1,createdAt:'2026-10-18',threads:[],cards:[card]}));
    importStudy(backup); importStudy(backup);
    expect(JSON.parse(localStorage.getItem('snapsolve.cards.v1') ?? '[]')).toEqual([card]);
  });
  it('rejects invalid backup format before writing',()=>{
    expect(()=>parseStudyBackup('{"cards":[]}')).toThrow();
    expect(localStorage.getItem('snapsolve.cards.v1')).toBeNull();
  });
});
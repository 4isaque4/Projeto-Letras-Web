import assert from 'node:assert/strict';
import test from 'node:test';

import { canOpenLesson, getLessonActionLabel, shouldShowStageConclusion } from './learnerAccessPolicy.js';

test('completed available lessons remain replayable', () => {
  const lesson = { accessStatus: 'available', progressStatus: 'completed' };
  assert.equal(canOpenLesson(lesson), true);
  assert.equal(getLessonActionLabel(lesson), 'Refazer');
});

test('locked lessons cannot be opened even after a previous completion', () => {
  assert.equal(canOpenLesson({ accessStatus: 'locked', progressStatus: 'completed' }), false);
});

test('lesson completion does not imply stage completion', () => {
  assert.equal(shouldShowStageConclusion({ lessonCompleted: true, stageCompleted: false }), false);
  assert.equal(shouldShowStageConclusion({ lessonCompleted: true, stageCompleted: true }), true);
});
